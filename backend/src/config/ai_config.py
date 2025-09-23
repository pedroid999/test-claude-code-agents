from pydantic import BaseModel, Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


class PerplexitySettings(BaseSettings):
    """Perplexity API configuration settings."""

    api_key: SecretStr = Field(
        default=...,
        description="Perplexity API key"
    )
    base_url: str = Field(
        default="https://api.perplexity.ai",
        description="Perplexity API base URL"
    )
    model_name: str = Field(
        default="sonar",
        description="Perplexity model to use"
    )
    max_retries: int = Field(
        default=3,
        description="Maximum retry attempts"
    )
    timeout: int = Field(
        default=30,
        description="Request timeout in seconds"
    )
    search_recency_filter: Optional[str] = Field(
        default="day",  # "day", "week", "month", "year"
        description="Recency filter for search results"
    )

    model_config = SettingsConfigDict(
        env_prefix="PERPLEXITY_",
        env_file=".env",
        extra="ignore"
    )