from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional


class Settings(BaseSettings):
    # App
    APP_NAME: str = "MediBook"
    DEBUG: bool = False
    BOOKING_FEE_BDT: int = 10
    MAX_SLOTS_PER_DEPT: int = 100
    OTP_EXPIRE_SECONDS: int = 300

    # Database
    DATABASE_URL: str
    SYNC_DATABASE_URL: str

    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # Redis
    REDIS_URL: str = "redis://localhost:6379"

    # bKash
    BKASH_APP_KEY: str
    BKASH_APP_SECRET: str
    BKASH_USERNAME: str
    BKASH_PASSWORD: str
    BKASH_BASE_URL: str = "https://tokenized.sandbox.bka.sh/v1.2.0-beta"

    # QR
    QR_HMAC_SECRET: str
    # SSL Commerz
    SSLCOMMERZ_STORE_ID: str = "not-set"
    SSLCOMMERZ_STORE_PASSWORD: str = "not-set"
    SSLCOMMERZ_BASE_URL: str = "https://sandbox.sslcommerz.com"

    # Email
    MAIL_USERNAME: Optional[str] = None
    MAIL_PASSWORD: Optional[str] = None
    MAIL_FROM: Optional[str] = None
    MAIL_PORT: int = 587
    MAIL_SERVER: str = "smtp.gmail.com"
    MAIL_FROM_NAME: str = "MediBook"
    MAIL_ENABLED: bool = False  # Set to True once email is configured

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()