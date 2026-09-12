from typing import Any

from pydantic import BaseModel, Field, field_validator


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=100)
    password: str = Field(min_length=6, max_length=128)

    @field_validator("username", mode="before")
    @classmethod
    def normalize_username(cls, value):
        return value.strip() if isinstance(value, str) else value


class LoginRequest(BaseModel):
    username: str
    password: str


class PasswordVerifyRequest(BaseModel):
    password: str


class PasskeyVerifyRequest(BaseModel):
    credential: dict[str, Any]


class PasskeyNameRequest(BaseModel):
    name: str = Field(default="Passkey", min_length=1, max_length=100)
