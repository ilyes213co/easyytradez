import httpx
import os
import asyncio
import logging
import base64
from datetime import datetime
from supabase import create_client

logger = logging.getLogger("storegen.deployer")

VERCEL_TOKEN   = os.getenv("VERCEL_TOKEN", "")
GITHUB_TOKEN   = os.getenv("GITHUB_TOKEN", "")
GITHUB_ORG     = os.getenv("GITHUB_ORG", "")
GITHUB_OWNER   = os.getenv("GITHUB_OWNER", "") or GITHUB_ORG
PLATFORM_DOMAIN = os.getenv("PLATFORM_DOMAIN", "yourdomain.com")

GITHUB_HEADERS = {
    "Authorization": f"token {GITHUB_TOKEN}",
    "Accept": "application/vnd.github.v3+json",
    "Content-Type": "application/json",
}
VERCEL_HEADERS = {
    "Authorization": f"Bearer {VERCEL_TOKEN}",
    "Content-Type": "application/json",
}

def get_supabase():
    return create_client(
        os.getenv("NEXT_PUBLIC_SUPABASE_URL"),
        os.getenv("SUPABASE_SERVICE_KEY"),
    )

# ─── Vercel.json template ─────────────────────────────────────────────────────

VERCEL_JSON = """{
  "version": 2,
  "builds": [{ "src": "index.html", "use": "@vercel/static" }],
  "routes": [{ "src": "/(.*)", "dest": "/index.html" }]
}"""

# ─── Main deployer ────────────────────────────────────────────────────────────

class StoreDeployer:

    @staticmethod
    def _require_configured_owner() -> str:
        owner = (GITHUB_OWNER or "").strip()
        if owner:
            return owner
        raise RuntimeError(
            "Configuration GitHub incomplète: définissez GITHUB_ORG ou GITHUB_OWNER avant de lancer un déploiement."
        )

    @staticmethod
    def _ensure_required_tokens() -> None:
        if not GITHUB_TOKEN:
            raise RuntimeError("Configuration GitHub incomplète: GITHUB_TOKEN manquant.")
        if not VERCEL_TOKEN:
            raise RuntimeError("Configuration Vercel incomplète: VERCEL_TOKEN manquant.")

    async def deploy_store(self, store_id: str, html: str, seo: dict) -> dict:
        """
        Full deployment pipeline:
        1. Create/update GitHub repo with generated HTML
        2. Create Vercel project linked to GitHub repo
        3. Trigger deployment and wait for ready
        4. Configure subdomain
        5. Update Supabase store record
        """
        supabase = get_supabase()

        # Fetch store data
        store = supabase.table("stores").select("*").eq("id", store_id).single().execute().data
        if not store:
            raise ValueError(f"Store {store_id} not found")

        self._ensure_required_tokens()
        slug = store["slug"]
        repo_name = f"store-{slug}"
        owner = self._require_configured_owner()
        logger.info("Deploy start store_id=%s owner=%s repo=%s", store_id, owner, repo_name)
        async with httpx.AsyncClient(timeout=60.0) as http:
            # ── Step 1: GitHub repo ───────────────────────────────────────────
            logger.info("Deploy step=github_repo store_id=%s repo=%s", store_id, repo_name)
            await self._ensure_github_repo(http, owner, repo_name, html, seo, store)

            # ── Step 2: Vercel project ────────────────────────────────────────
            logger.info("Deploy step=vercel_project store_id=%s repo=%s", store_id, repo_name)
            project_id = await self._ensure_vercel_project(http, owner, repo_name, store.get("vercel_project_id"))

            # ── Step 3: Trigger deployment ────────────────────────────────────
            logger.info("Deploy step=vercel_build store_id=%s project_id=%s", store_id, project_id)
            await self._trigger_and_wait_deployment(http, project_id)

            # ── Step 4: Configure subdomain ───────────────────────────────────
            subdomain = f"{slug}.{PLATFORM_DOMAIN}"
            logger.info("Deploy step=domain store_id=%s project_id=%s domain=%s", store_id, project_id, subdomain)
            await self._add_vercel_domain(http, project_id, subdomain)

            # ── Step 5: Update Supabase ───────────────────────────────────────
            published_url = f"https://{subdomain}"
            supabase.table("stores").update({
                "vercel_project_id": project_id,
                "subdomain": subdomain,
                "published_url": published_url,
                "status": "published",
            }).eq("id", store_id).execute()

            logger.info(f"Store {store_id} deployed successfully: {published_url}")
            return {"url": published_url, "project_id": project_id}

    # ─── GitHub helpers ───────────────────────────────────────────────────────

    async def _resolve_github_owner(self, http: httpx.AsyncClient) -> str:
        return self._require_configured_owner()

    async def _ensure_github_repo(
        self, http: httpx.AsyncClient, owner: str,
        repo_name: str, html: str, seo: dict, store: dict
    ) -> str:
        # Check if repo exists
        check = await http.get(f"https://api.github.com/repos/{owner}/{repo_name}", headers=GITHUB_HEADERS)

        if check.status_code == 404:
            # Create repo
            resp = await http.post(
                f"https://api.github.com/orgs/{owner}/repos" if GITHUB_ORG else "https://api.github.com/user/repos",
                headers=GITHUB_HEADERS,
                json={"name": repo_name, "private": True, "auto_init": True},
            )
            resp.raise_for_status()
            await asyncio.sleep(2)  # Wait for repo init

        # Push / update files
        await self._upsert_github_file(http, owner, repo_name, "index.html", html)
        await self._upsert_github_file(http, owner, repo_name, "vercel.json", VERCEL_JSON)
        await self._upsert_github_file(
            http, owner, repo_name, "robots.txt",
            f"User-agent: *\nAllow: /\nSitemap: https://{store['slug']}.{PLATFORM_DOMAIN}/sitemap.xml"
        )

        return f"https://github.com/{owner}/{repo_name}"

    async def _upsert_github_file(
        self, http: httpx.AsyncClient, owner: str, repo: str, path: str, content: str
    ):
        encoded = base64.b64encode(content.encode("utf-8")).decode()
        url = f"https://api.github.com/repos/{owner}/{repo}/contents/{path}"

        # Check if file exists (need its SHA for update)
        existing = await http.get(url, headers=GITHUB_HEADERS)
        sha = existing.json().get("sha") if existing.status_code == 200 else None

        payload = {
            "message": f"Update {path} — {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}",
            "content": encoded,
        }
        if sha:
            payload["sha"] = sha

        resp = await http.put(url, headers=GITHUB_HEADERS, json=payload)
        resp.raise_for_status()

    # ─── Vercel helpers ───────────────────────────────────────────────────────

    async def _ensure_vercel_project(
        self, http: httpx.AsyncClient, owner: str, repo_name: str, existing_project_id: str | None
    ) -> str:
        if existing_project_id:
            # Project already exists, just return its id
            check = await http.get(
                f"https://api.vercel.com/v9/projects/{existing_project_id}",
                headers=VERCEL_HEADERS,
            )
            if check.status_code == 200:
                return existing_project_id

        resp = await http.post(
            "https://api.vercel.com/v10/projects",
            headers=VERCEL_HEADERS,
            json={
                "name": repo_name,
                "framework": None,
                "gitRepository": {
                    "type": "github",
                    "repo": f"{owner}/{repo_name}",
                },
                "buildCommand": "",
                "outputDirectory": "/",
                "installCommand": "",
            },
        )

        if resp.status_code not in (200, 201):
            # Project might already exist under different id — fetch by name
            logger.warning(f"Vercel project create returned {resp.status_code}: {resp.text}")
            list_resp = await http.get(
                f"https://api.vercel.com/v9/projects?search={repo_name}",
                headers=VERCEL_HEADERS,
            )
            projects = list_resp.json().get("projects", [])
            if projects:
                return projects[0]["id"]
            resp.raise_for_status()

        return resp.json()["id"]

    async def _trigger_and_wait_deployment(
        self, http: httpx.AsyncClient, project_id: str, timeout_seconds: int = 300
    ) -> str:
        # Trigger deployment
        resp = await http.post(
            "https://api.vercel.com/v13/deployments",
            headers=VERCEL_HEADERS,
            json={"name": project_id, "project": project_id, "target": "production"},
        )
        resp.raise_for_status()
        deploy_id = resp.json()["id"]

        # Poll until ready
        for _ in range(timeout_seconds // 5):
            await asyncio.sleep(5)
            status_resp = await http.get(
                f"https://api.vercel.com/v13/deployments/{deploy_id}",
                headers=VERCEL_HEADERS,
            )
            status_data = status_resp.json()
            state = status_data.get("readyState", "")
            logger.debug(f"Deployment {deploy_id} state: {state}")

            if state == "READY":
                return status_data.get("url", "")
            elif state in ("ERROR", "CANCELED"):
                raise RuntimeError(f"Vercel deployment failed with state: {state}")

        raise TimeoutError(f"Deployment timed out after {timeout_seconds}s")

    async def _add_vercel_domain(
        self, http: httpx.AsyncClient, project_id: str, domain: str
    ):
        resp = await http.post(
            f"https://api.vercel.com/v10/projects/{project_id}/domains",
            headers=VERCEL_HEADERS,
            json={"name": domain},
        )
        if resp.status_code not in (200, 201, 409):  # 409 = already added
            logger.warning(f"Domain add returned {resp.status_code}: {resp.text}")

    # ─── Redeploy (update existing) ───────────────────────────────────────────

    async def redeploy_store(self, store_id: str, html: str, seo: dict) -> str:
        """Update files and trigger a new deployment on an existing project."""
        supabase = get_supabase()
        store = supabase.table("stores").select("*").eq("id", store_id).single().execute().data
        if not store:
            raise ValueError(f"Store {store_id} not found")

        self._ensure_required_tokens()
        slug = store["slug"]
        repo_name = f"store-{slug}"

        async with httpx.AsyncClient(timeout=60.0) as http:
            owner = self._require_configured_owner()
            logger.info("Redeploy start store_id=%s owner=%s repo=%s", store_id, owner, repo_name)
            await self._upsert_github_file(http, owner, repo_name, "index.html", html)
            project_id = store.get("vercel_project_id")
            if project_id:
                url = await self._trigger_and_wait_deployment(http, project_id)
                logger.info(f"Store {store_id} redeployed: {url}")
                return url
            else:
                raise ValueError("No Vercel project linked — run full deploy first")
