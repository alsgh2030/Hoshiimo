from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class Input(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=False)


class Login(Input):
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)

    @field_validator('email')
    @classmethod
    def normalize_email(cls, value):
        return value.lower()

    @field_validator('password')
    @classmethod
    def password_bytes(cls, value):
        if len(value.encode('utf-8')) > 72:
            raise ValueError('Password must be at most 72 UTF-8 bytes; it is never truncated')
        return value


class Signup(Login):
    username: str = Field(min_length=1, max_length=40)

    @field_validator('username')
    @classmethod
    def nonempty_name(cls, value):
        value = value.strip()
        if not value:
            raise ValueError('Name cannot be blank')
        return value


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class UserRead(ORM):
    id: int
    email: str
    username: str
    is_admin: bool
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = 'bearer'
    user: UserRead


Category = Literal['premium', 'standard', 'value', 'offcuts']


class ProductInput(Input):
    slug: str = Field(min_length=1, max_length=100, pattern=r'^[a-z0-9]+(?:-[a-z0-9]+)*$')
    name: str = Field(min_length=1, max_length=120)
    description: str = Field(min_length=1, max_length=4000)
    category: Category
    image_url: str | None = Field(default=None, max_length=500, pattern=r'^/images/[a-zA-Z0-9/_-]+\.(?:jpg|jpeg|png|webp)$')
    source_url: str | None = Field(default=None, max_length=500, pattern=r'^https://t-shoten\.jp/products/[a-zA-Z0-9-]+$')
    weight_g: int = Field(gt=0, le=10000, strict=True)
    price_yen: int = Field(gt=0, le=1000000, strict=True)
    stock: int = Field(ge=0, le=1000000, strict=True)
    is_active: bool = True

    @field_validator('name', 'description')
    @classmethod
    def strip_text(cls, value):
        if not value.strip():
            raise ValueError('Must not be blank')
        return value.strip()


class ProductUpdate(ProductInput):
    expected_version: int = Field(ge=1)


class ProductRead(ORM):
    id: int
    slug: str
    name: str
    description: str
    category: str
    image_url: str | None = None
    source_url: str | None = None
    weight_g: int
    price_yen: int
    stock: int
    is_active: bool
    version: int


class ProductPage(BaseModel):
    items: list[ProductRead]
    total: int
    page: int
    page_size: int


class CartQuantity(Input):
    quantity: int = Field(ge=1, le=20, strict=True)


class CartLine(BaseModel):
    product: ProductRead
    quantity: int
    line_total_yen: int


class CartRead(BaseModel):
    items: list[CartLine]
    subtotal_yen: int
    shipping_yen: int
    total_yen: int


class OrderItemRead(ORM):
    product_id: int
    product_name: str
    unit_price_yen: int
    quantity: int


class OrderRead(ORM):
    id: str
    status: str
    subtotal_yen: int
    shipping_yen: int
    total_yen: int
    created_at: datetime
    items: list[OrderItemRead]


class OrderPage(BaseModel):
    items: list[OrderRead]
    total: int
    page: int
    page_size: int


class StatusInput(Input):
    status: Literal['packed', 'shipped', 'cancelled']


class AuditRead(ORM):
    id: int
    actor_id: int
    action: str
    target: str
    detail: str
    created_at: datetime
