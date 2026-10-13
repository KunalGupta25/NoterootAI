from typing import Any

from pydantic import BaseModel, EmailStr, Field


class Credentials(BaseModel):
    name: str = ""
    email: EmailStr
    password: str


class LoginCredentials(BaseModel):
    email: EmailStr
    password: str


class SettingsUpdate(BaseModel):
    provider_keys: dict[str, str] | None = Field(default=None, alias="providerKeys")
    custom_providers: list[dict[str, Any]] | None = Field(default=None, alias="customProviders")
    plugin_settings: dict[str, Any] | None = Field(default=None, alias="pluginSettings")
    installed_community_plugins: list[str] | None = Field(default=None, alias="installedCommunityPlugins")
    theme: str | None = None
    active_provider: str | None = Field(default=None, alias="activeProvider")

    model_config = {"populate_by_name": True}
