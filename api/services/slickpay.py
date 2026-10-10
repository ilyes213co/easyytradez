"""
SlickPay Service — Client async pour l'API SlickPay (Passerelle SATIM / BaridiMob / CIB en Algérie).

Documentation officielle: https://developers.slick-pay.com/
API Base (prod): https://prodapi.slick-pay.com/api/v2/
API Base (dev):  https://devapi.slick-pay.com/api/v2/

Auth: Authorization: Bearer {PUBLIC_KEY}
"""

import os
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
import httpx
from pydantic import BaseModel

logger = logging.getLogger("storegen.slickpay")

# Grille tarifaire officielle des abonnements SaaS
PLANS_PRICING = {
    "free": {
        "name": "Gratuit",
        "monthly": 0,
        "yearly": 0,
        "stores_limit": 1,
        "products_limit": 10,
        "features": [
            "1 Boutique active",
            "Jusqu'à 10 produits",
            "Thèmes standards",
            "Paiement à la livraison (COD)",
            "Support communautaire",
        ],
    },
    "pro": {
        "name": "Pro",
        "monthly": 2000,   # 2 000 DZD / mois
        "yearly": 20000,  # 20 000 DZD / an (2 mois offerts)
        "stores_limit": 5,
        "products_limit": -1, # illimité
        "popular": True,
        "features": [
            "Jusqu'à 5 Boutiques actives",
            "Produits & Commandes illimités",
            "Tous les thèmes premium",
            "Génération de landing pages par IA",
            "Tarifs de livraison personnalisés (58 wilayas)",
            "Nom de domaine personnalisé",
            "Support prioritaire WhatsApp",
        ],
    },
    "business": {
        "name": "Business",
        "monthly": 5000,   # 5 000 DZD / mois
        "yearly": 50000,  # 50 000 DZD / an (2 mois offerts)
        "stores_limit": -1, # illimité
        "products_limit": -1, # illimité
        "features": [
            "Boutiques & Tunnels illimités",
            "Tout le plan Pro inclus",
            "Multi-utilisateurs & permissions d'équipe",
            "Génération IA prioritaire & illimitée",
            "Accès API & Webhooks avancés",
            "Bande passante & déploiements haute vitesse",
            "Gestionnaire de compte dédié 24/7",
        ],
    },
}


class SlickPayInvoiceResult(BaseModel):
    invoice_id: str
    payment_url: str
    is_simulation: bool = False
    raw_response: Dict[str, Any] = {}


class SlickPayStatusResult(BaseModel):
    invoice_id: str
    is_paid: bool
    status_raw: str
    is_simulation: bool = False
    raw_response: Dict[str, Any] = {}


class SlickPayError(Exception):
    """Erreur levée lors d'un appel à l'API SlickPay."""
    def __init__(self, message: str, status_code: int = 0, response_body: str = ""):
        super().__init__(message)
        self.status_code = status_code
        self.response_body = response_body


class SlickPayService:
    """
    Client pour l'API SlickPay (passerelle de paiement algérienne BaridiMob & CIB via SATIM).
    """

    BASE_URL_PROD = "https://prodapi.slick-pay.com/api/v2"
    BASE_URL_DEV  = "https://devapi.slick-pay.com/api/v2"

    def __init__(
        self,
        api_key: Optional[str] = None,
        env: Optional[str] = None,
    ):
        self.api_key = (api_key or os.getenv("SLICKPAY_API_KEY", "")).strip()
        self.env = (env or os.getenv("SLICKPAY_ENV", "production")).strip().lower()
        self.is_simulation_mode = not bool(self.api_key) or self.api_key.lower().startswith("mock")

        self.base_url = self.BASE_URL_PROD if self.env == "production" else self.BASE_URL_DEV
        if self.is_simulation_mode:
            logger.warning(
                "SlickPayService en mode SIMULATION (clé SLICKPAY_API_KEY non configurée). "
                "Les factures de test seront générées en local."
            )
        else:
            logger.info(f"SlickPayService initialisé — env={self.env}, base_url={self.base_url}")

    def _headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    async def create_invoice(
        self,
        amount: float,
        items: List[Dict[str, Any]],
        return_url: str,
        firstname: str = "Marchand",
        lastname: str = "StoreGen",
        email: str = "marchand@storegen.shop",
        phone: str = "0555000000",
        address: str = "Algérie",
        comment: Optional[str] = None,
    ) -> SlickPayInvoiceResult:
        """
        Crée une facture et retourne l'URL SATIM BaridiMob.
        """
        if amount < 100:
            raise SlickPayError(f"Le montant minimum SlickPay est de 100 DZD. Reçu: {amount} DZD")

        # Mode simulation si aucune clé renseignée
        if self.is_simulation_mode:
            sim_id = f"sim_{int(datetime.now(timezone.utc).timestamp())}"
            separator = "&" if "?" in return_url else "?"
            sim_redirect_url = f"{return_url}{separator}invoice_id={sim_id}&simulated=true"
            logger.info(f"Simulation SlickPay: création facture {sim_id} montant {amount} DZD")
            return SlickPayInvoiceResult(
                invoice_id=sim_id,
                payment_url=sim_redirect_url,
                is_simulation=True,
                raw_response={"simulated": True, "amount": amount, "items": items},
            )

        payload: Dict[str, Any] = {
            "amount": int(amount),
            "url": return_url,
            "firstname": firstname or "Marchand",
            "lastname": lastname or "StoreGen",
            "email": email or "marchand@storegen.shop",
            "phone": phone or "0555000000",
            "address": address or "Algérie",
            "items": items,
        }
        if comment:
            payload["comment"] = comment

        logger.info(f"SlickPay POST /users/invoices: amount={amount}, return_url={return_url}")

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.post(
                    f"{self.base_url}/users/invoices",
                    headers=self._headers(),
                    json=payload,
                )
            except httpx.RequestError as exc:
                logger.error(f"Erreur réseau SlickPay: {exc}")
                raise SlickPayError(f"Erreur de connexion avec SlickPay: {exc}") from exc

        if response.status_code not in (200, 201):
            logger.error(f"SlickPay API error {response.status_code}: {response.text}")
            raise SlickPayError(
                f"SlickPay a renvoyé une erreur (HTTP {response.status_code})",
                status_code=response.status_code,
                response_body=response.text,
            )

        try:
            data = response.json()
        except Exception:
            raise SlickPayError("Réponse invalide de SlickPay (JSON illisible)", response_body=response.text)

        raw_data = data.get("data", data)
        # SlickPay v2 renvoie l'URL SATIM directement dans data["url"] ou data["invoice"]["url"]
        payment_url = (
            data.get("url")
            or raw_data.get("url")
            or raw_data.get("payment_url")
            or (data.get("invoice", {}).get("url") if isinstance(data.get("invoice"), dict) else "")
            or ""
        )
        invoice_id = str(
            data.get("id")
            or raw_data.get("id")
            or raw_data.get("invoice_id")
            or (data.get("invoice", {}).get("id") if isinstance(data.get("invoice"), dict) else "")
            or ""
        )

        if not payment_url:
            raise SlickPayError(
                "SlickPay n'a pas retourné d'URL de paiement valide",
                response_body=str(data),
            )

        logger.info(f"Facture SlickPay créée: id={invoice_id}, url={payment_url[:50]}...")
        return SlickPayInvoiceResult(
            invoice_id=invoice_id,
            payment_url=payment_url,
            is_simulation=False,
            raw_response=data,
        )

    async def get_invoice(self, invoice_id: str) -> SlickPayStatusResult:
        """
        Vérifie le statut d'une facture SlickPay auprès du serveur.
        """
        if self.is_simulation_mode or str(invoice_id).startswith("sim_"):
            logger.info(f"Simulation SlickPay: vérification facture {invoice_id} -> PAYÉ")
            return SlickPayStatusResult(
                invoice_id=str(invoice_id),
                is_paid=True,
                status_raw="completed",
                is_simulation=True,
                raw_response={"simulated": True, "invoice_id": invoice_id, "status": "completed"},
            )

        logger.info(f"SlickPay GET /users/invoices/{invoice_id}")

        async with httpx.AsyncClient(timeout=20.0) as client:
            try:
                response = await client.get(
                    f"{self.base_url}/users/invoices/{invoice_id}",
                    headers=self._headers(),
                )
            except httpx.RequestError as exc:
                raise SlickPayError(f"Erreur réseau SlickPay: {exc}") from exc

        if response.status_code == 404:
            raise SlickPayError(f"Facture SlickPay introuvable: {invoice_id}", status_code=404)

        if response.status_code != 200:
            raise SlickPayError(
                f"Erreur SlickPay statut (HTTP {response.status_code})",
                status_code=response.status_code,
                response_body=response.text,
            )

        try:
            data = response.json()
        except Exception:
            raise SlickPayError("Réponse JSON invalide de SlickPay", response_body=response.text)

        raw_data = data.get("data", data)
        # SlickPay utilise completed (1/0) et pay_status (1/0)
        completed_flag = data.get("completed") if "completed" in data else raw_data.get("completed")
        pay_status = raw_data.get("pay_status")

        status_raw = str(
            raw_data.get("status")
            or raw_data.get("payment_status")
            or raw_data.get("state")
            or "unknown"
        ).lower()

        is_paid = (
            completed_flag == 1
            or pay_status == 1
            or status_raw in (
                "completed", "paid", "success", "settled",
                "payé", "paye", "complété", "complete", "terminé", "termine", "traité", "traite"
            )
        )

        return SlickPayStatusResult(
            invoice_id=str(invoice_id),
            is_paid=is_paid,
            status_raw=status_raw,
            is_simulation=False,
            raw_response=data,
        )

    async def verify_payment(self, invoice_id: str) -> bool:
        """Raccourci booléen pour savoir si une facture est payée."""
        result = await self.get_invoice(invoice_id)
        return result.is_paid


def get_plan_amount(plan: str, billing_period: str = "monthly") -> int:
    pricing = PLANS_PRICING.get(plan, {})
    return int(pricing.get(billing_period, 0))


def get_plan_items(plan: str, billing_period: str = "monthly") -> List[Dict[str, Any]]:
    amount = get_plan_amount(plan, billing_period)
    period_label = "Mensuel" if billing_period == "monthly" else "Annuel"
    plan_info = PLANS_PRICING.get(plan, {})
    plan_name = plan_info.get("name", plan.capitalize())

    return [
        {
            "name": f"Abonnement EasyTrade {plan_name} ({period_label})",
            "price": amount,
            "quantity": 1,
        }
    ]
