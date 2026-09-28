from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")

    CORS_ALLOWED_ORIGINS: list[str]


@lru_cache
def get_settings():
    return Settings()  # type: ignore
