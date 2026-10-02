import os
from pathlib import Path
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
UPLOAD_DIR = BASE_DIR / "data" / "uploads"
PROCESSED_DIR = BASE_DIR / "data" / "processed"
REPORTS_DIR = BASE_DIR / "data" / "reports"
MODELS_DIR = BASE_DIR / "data" / "models"
RAW_DIR = BASE_DIR / "data" / "raw"

for directory in [DATA_DIR, UPLOAD_DIR, PROCESSED_DIR, REPORTS_DIR, MODELS_DIR, RAW_DIR]:
    directory.mkdir(parents=True, exist_ok=True)

class Settings(BaseSettings):
    PROJECT_NAME: str = "AquaSentinel Underwater Intelligence Platform"
    VERSION: str = "2.4.0-cloud-stable"
    API_PREFIX: str = "/api"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "aquasentinel-secret-key-sih26057-moes-deep-ocean")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    DATABASE_URL: str = f"sqlite:///{BASE_DIR / 'aquasentinel.db'}"
    DEMO_USER_EMAIL: str = "demo@aquasentinel.ocean"
    DEMO_USER_PASSWORD: str = "AquaSentinel2026!"
    
    class Config:
        env_file = ".env"

settings = Settings()
