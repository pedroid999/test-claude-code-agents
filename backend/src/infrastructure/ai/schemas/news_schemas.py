from pydantic import BaseModel, Field, HttpUrl, field_validator
from typing import List, Optional
from datetime import datetime
from enum import Enum


class AINewsCategory(str, Enum):
    """AI-specific news categories."""
    BREAKTHROUGH = "breakthrough"
    RESEARCH = "research"
    PRODUCT_LAUNCH = "product_launch"
    INDUSTRY_UPDATE = "industry_update"
    POLICY_REGULATION = "policy_regulation"
    TUTORIAL_GUIDE = "tutorial_guide"
    OPINION_ANALYSIS = "opinion_analysis"


class NewsSource(BaseModel):
    """News source information."""
    name: str = Field(description="Source publication name")
    url: Optional[str] = Field(default=None, description="Source URL")
    credibility_score: Optional[float] = Field(
        default=None,
        ge=0.0,
        le=1.0,
        description="Source credibility score"
    )


class AIGeneratedNews(BaseModel):
    """Structured output for AI-generated news."""

    title: str = Field(
        min_length=10,
        max_length=200,
        description="Compelling news headline"
    )
    summary: str = Field(
        min_length=50,
        max_length=500,
        description="Concise news summary"
    )
    content: str = Field(
        min_length=100,
        max_length=2000,
        description="Full news content"
    )
    category: AINewsCategory = Field(
        description="News category classification"
    )
    tags: List[str] = Field(
        default_factory=list,
        max_length=10,
        description="Relevant tags"
    )
    source: NewsSource = Field(
        description="News source information"
    )
    link: str = Field(
        description="Original article link"
    )
    image_url: Optional[str] = Field(
        default=None,
        description="News image URL"
    )
    published_at: Optional[datetime] = Field(
        default=None,
        description="Publication timestamp"
    )
    relevance_score: float = Field(
        ge=0.0,
        le=1.0,
        description="Relevance score for the news"
    )

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: str) -> str:
        """Ensure title doesn't contain clickbait patterns."""
        clickbait_patterns = ["You Won't Believe", "SHOCKING", "BREAKING"]
        for pattern in clickbait_patterns:
            if pattern.upper() in v.upper():
                raise ValueError(f"Title contains clickbait pattern: {pattern}")
        return v.strip()

    @field_validator("tags")
    @classmethod
    def validate_tags(cls, v: List[str]) -> List[str]:
        """Normalize and validate tags."""
        return [tag.lower().strip() for tag in v if tag.strip()]


class NewsGenerationRequest(BaseModel):
    """Request model for news generation."""

    count: int = Field(
        default=5,
        ge=1,
        le=20,
        description="Number of news items to generate"
    )
    categories: Optional[List[AINewsCategory]] = Field(
        default=None,
        description="Filter by specific categories"
    )
    search_query: Optional[str] = Field(
        default="latest AI artificial intelligence news breakthroughs",
        description="Custom search query"
    )
    recency: str = Field(
        default="day",
        pattern="^(day|week|month)$",
        description="Recency filter"
    )
    min_relevance: float = Field(
        default=0.7,
        ge=0.0,
        le=1.0,
        description="Minimum relevance score"
    )


class NewsGenerationResponse(BaseModel):
    """Response model for news generation."""

    news_items: List[AIGeneratedNews]
    total_generated: int
    generation_timestamp: datetime
    model_used: str
    search_parameters: NewsGenerationRequest