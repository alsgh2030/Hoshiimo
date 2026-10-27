from pathlib import Path

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import URL


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parents[2] / '.env', extra='ignore'
    )
    secret_key: str = Field(min_length=32)
    db_user: str = 'hoshiimo'
    db_password: str = ''
    db_host: str = '127.0.0.1'
    db_port: int = 3306
    db_name: str = 'hoshiimo'
    database_url: str | None = None
    db_ssl: bool = False
    db_ssl_ca: str | None = None
    cors_origins: list[str] = ['http://localhost:5173', 'http://127.0.0.1:5173']
    cookie_secure: bool = False
    environment: str = 'development'
    access_token_seconds: int = Field(default=900, ge=60, le=3600)
    refresh_token_seconds: int = Field(default=604800, ge=3600)
    auth_rate_limit: int = Field(default=20, ge=1)

    @model_validator(mode='after')
    def validate_production(self):
        if self.secret_key.lower().startswith(('change', 'replace', 'example')):
            raise ValueError('SECRET_KEY must be generated with secrets.token_urlsafe(48)')
        if self.environment == 'production' and not self.cookie_secure:
            raise ValueError('Production requires COOKIE_SECURE=true and HTTPS')
        if self.environment == 'production' and not str(self.db_url).startswith('mysql'):
            raise ValueError('Production requires persistent MySQL storage')
        if '*' in self.cors_origins:
            raise ValueError('CORS_ORIGINS must contain explicit origins')
        return self

    @property
    def db_url(self):
        if self.database_url:
            return self.database_url.replace('mysql://', 'mysql+asyncmy://', 1)
        return URL.create(
            'mysql+asyncmy', username=self.db_user, password=self.db_password,
            host=self.db_host, port=self.db_port, database=self.db_name,
            query={'charset': 'utf8mb4'},
        )


settings = Settings()
