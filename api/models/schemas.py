from pydantic import BaseModel, Field, field_validator
from typing import Optional, Literal, Any
from datetime import datetime
import re

# ─── Shared ───────────────────────────────────────────────────────────────────

class ProductImage(BaseModel):
    url: str
    public_id: str
    width: int
    height: int
    alt: Optional[str] = None

# ─── Store ────────────────────────────────────────────────────────────────────

class StoreCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=60)
    slug: str = Field(..., min_length=2, max_length=60, pattern=r"^[a-z0-9\-]+$")
    category: Optional[str] = None
    description: Optional[str] = Field(None, max_length=300)
    primary_color: str = Field(default="#534AB7", pattern=r"^#[0-9A-Fa-f]{6}$")
    font_family: str = "modern"
    logo_url: Optional[str] = None
    whatsapp_phone: Optional[str] = None
    theme: Literal["modern", "luxury", "minimal", "colorful", "tech", "nature"] = "modern"
    animation_style: Literal["none", "soft", "dynamic", "spectacular"] = "soft"
    special_effects: list[str] = Field(default_factory=list)

    @field_validator("whatsapp_phone")
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        cleaned = re.sub(r"\D", "", v)
        if len(cleaned) < 9:
            raise ValueError("Numéro de téléphone invalide")
        return cleaned

class StoreUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=60)
    category: Optional[str] = None
    description: Optional[str] = None
    primary_color: Optional[str] = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    font_family: Optional[str] = None
    logo_url: Optional[str] = None
    whatsapp_phone: Optional[str] = None
    theme: Optional[Literal["modern", "luxury", "minimal", "colorful", "tech", "nature"]] = None
    animation_style: Optional[Literal["none", "soft", "dynamic", "spectacular"]] = None
    special_effects: Optional[list[str]] = None
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    seo_metadata: Optional[dict] = None

class StoreResponse(BaseModel):
    id: str
    owner_id: str
    name: str
    slug: str
    category: Optional[str]
    description: Optional[str]
    primary_color: str
    font_family: str
    logo_url: Optional[str]
    whatsapp_phone: Optional[str]
    theme: str
    animation_style: str
    special_effects: list[str]
    status: str
    subdomain: Optional[str]
    published_url: Optional[str]
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    seo_metadata: dict = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime

# ─── Product ──────────────────────────────────────────────────────────────────

class ProductCreate(BaseModel):
    store_id: str
    name: str = Field(..., min_length=1, max_length=120)
    description: Optional[str] = Field(None, max_length=2000)
    price: float = Field(..., gt=0)
    original_price: Optional[float] = Field(None, gt=0)
    category: Optional[str] = None
    stock_quantity: int = Field(default=0, ge=0)
    images: list[ProductImage] = Field(default_factory=list)
    is_featured: bool = False
    position: int = 0

class ProductUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=120)
    description: Optional[str] = None
    price: Optional[float] = Field(None, gt=0)
    original_price: Optional[float] = None
    category: Optional[str] = None
    stock_quantity: Optional[int] = Field(None, ge=0)
    images: Optional[list[ProductImage]] = None
    is_featured: Optional[bool] = None
    position: Optional[int] = None

class ReorderItem(BaseModel):
    id: str
    position: int

class ReorderRequest(BaseModel):
    store_id: str
    items: list[ReorderItem]

# ─── AI Generation ────────────────────────────────────────────────────────────

class GenerateRequest(BaseModel):
    store_id: str
    force_regenerate: bool = False

class GenerateResponse(BaseModel):
    job_id: str
    status: str
    message: str

class GenerateStatusResponse(BaseModel):
    status: Literal["pending", "generating", "deploying", "ready", "error"]
    url: Optional[str] = None
    error: Optional[str] = None
    progress: int = 0

# ─── Deploy ───────────────────────────────────────────────────────────────────

class DeployResponse(BaseModel):
    job_id: str
    message: str

class DeployStatusResponse(BaseModel):
    status: Literal["pending", "generating", "pushing", "deploying", "configuring", "ready", "error"]
    url: Optional[str] = None
    error: Optional[str] = None
    warning: Optional[str] = None

# ─── Analytics ───────────────────────────────────────────────────────────────

class TrackEventRequest(BaseModel):
    store_id: str
    event_type: Literal["view", "product_view", "whatsapp_click", "cart_open"]
    product_id: Optional[str] = None
    metadata: dict[str, Any] = Field(default_factory=dict)

class AnalyticsSummary(BaseModel):
    views: int
    whatsapp_clicks: int
    product_views: int
    conversion_rate: float
    period_days: int
