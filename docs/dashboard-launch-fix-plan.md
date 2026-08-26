# Dashboard Launch Fix Plan + Prompts

## Root cause found
- `useAuth()` was used in dashboard layout, but `AuthProvider` was not mounted globally.
- Result: `loading=true` forever in context default state, so dashboard stayed on spinner.

## Backend <-> Frontend connection check
- API health works: `GET /health` -> `200`.
- Correct products path is `/products` (without `/api`).
- Wrong path `/api/products` returns `404`.

## Fixes already applied
- Added `AuthProvider` wrapper in `platform/components/providers.tsx`.
- Hardened auth init in `platform/components/auth/AuthProvider.tsx` with `try/catch/finally`.
- Replaced wrong API paths:
  - `platform/app/dashboard/products/page.tsx`: `/api/products...` -> `/products...`
  - `platform/components/products/ImageUploader.tsx`: `/api/upload/image` -> `/upload/image`

## Step 1 - Install dependencies
Command:
```bash
cd C:\Users\namgh\Desktop\shopify\shopify-clone
npm run install:all
```
Prompt:
```text
Verify all dependencies are installed in this monorepo and confirm Python venv for api uses Python 3.11.
Return only blocking issues and exact fix commands.
```

## Step 2 - Run all services
Command:
```bash
npm run dev:full
```
Prompt:
```text
Check that all services are running and mapped to correct ports:
- platform: 3000
- store-template: 3001
- api: 8000
If one service fails, give exact command to restart only that service.
```

## Step 3 - Verify API connectivity
Command:
```bash
curl http://127.0.0.1:8000/health
```
Prompt:
```text
Audit frontend->backend endpoint mapping and list every wrong route path.
For each wrong path, return file path, line, and corrected endpoint.
```

## Step 4 - Verify auth flow on dashboard
Command:
```bash
# open in browser
http://localhost:3000/login
http://localhost:3000/dashboard
```
Prompt:
```text
Debug dashboard auth flow and explain why loading state can freeze.
Return a minimal fix with code and where to place provider wrappers.
```

## Step 5 - Smoke test key features
Command:
```bash
# in platform
npm run lint -- --file app/dashboard/products/page.tsx --file components/products/ImageUploader.tsx --file components/auth/AuthProvider.tsx --file components/providers.tsx
```
Prompt:
```text
Run a smoke test for login, dashboard load, product list fetch, and image upload.
Report only failed steps with immediate fix.
```

## Step 6 - Final stability pass
Prompt:
```text
Do a final reliability pass without adding new features.
Focus on:
1) auth provider wiring
2) API base paths
3) startup commands
Return a short changelog and residual risks.
```

