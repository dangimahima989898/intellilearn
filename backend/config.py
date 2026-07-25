from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import Optional

class Settings(BaseSettings):
    database_url: str
    secret_key: str
    openai_api_key: Optional[str] = None
    groq_api_key: Optional[str] = None
    gemini_api_key: Optional[str] = None
    firebase_credentials_path: Optional[str] = None
    embedding_model: str = "all-MiniLM-L6-v2"
    embedding_dimension: int = 384

    @field_validator("embedding_dimension")
    @classmethod
    def validate_embedding_dimension(cls, v: int) -> int:
        if v < 1 or v > 4096:
            raise ValueError("embedding_dimension must be between 1 and 4096")
        return v

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
