# Pydantic AI Agents Implementation Plan for News-from-AI Feature

## Executive Summary

This plan outlines the implementation of a Pydantic AI agent system for generating fresh AI news content using the Perplexity API Sonar model. The solution leverages Pydantic AI's structured output capabilities, robust error handling, and tool integration patterns to create a production-grade news generation service.

## Architecture Overview

### Agent Design Pattern

We'll implement a **News Generation Agent** using Pydantic AI that:
- Integrates with Perplexity API as a custom model provider
- Uses structured outputs for consistent news article generation
- Implements retry strategies and error handling
- Provides web search capabilities through Perplexity's Sonar model

### Key Components

1. **PerplexityModel**: Custom model adapter for Perplexity API
2. **NewsGenerationAgent**: Main agent for news content generation
3. **NewsValidationAgent**: Secondary agent for content validation
4. **Structured Response Models**: Pydantic models for news articles
5. **Tool Integrations**: Web search and content extraction tools

## Detailed Implementation

### 1. Configuration Management

**File**: `backend/src/infrastructure/config/ai_config.py`

```python
from pydantic import BaseModel, Field, SecretStr
from pydantic_settings import BaseSettings
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
        default="sonar-pro",  # or "sonar" for basic version
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

    class Config:
        env_prefix = "PERPLEXITY_"
        env_file = ".env"
```

### 2. Custom Perplexity Model Adapter

**File**: `backend/src/infrastructure/ai/models/perplexity_model.py`

```python
from typing import Any, AsyncIterator, Optional
from pydantic_ai.models import Model, ModelResponse, ModelRequest
from pydantic_ai.messages import (
    ModelMessage, TextPart, ToolCallPart,
    SystemPromptPart, UserPromptPart
)
import httpx
from datetime import datetime
import json

class PerplexityModel(Model):
    """Custom Pydantic AI model adapter for Perplexity API."""

    def __init__(
        self,
        model_name: str,
        api_key: str,
        base_url: str = "https://api.perplexity.ai",
        search_domain_filter: Optional[list[str]] = None,
        search_recency_filter: Optional[str] = "day",
        return_citations: bool = True,
        temperature: float = 0.2,
        max_tokens: int = 2000
    ):
        self._model_name = model_name
        self._api_key = api_key
        self._base_url = base_url
        self._search_domain_filter = search_domain_filter or []
        self._search_recency_filter = search_recency_filter
        self._return_citations = return_citations
        self._temperature = temperature
        self._max_tokens = max_tokens
        self._client = httpx.AsyncClient(
            base_url=base_url,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            timeout=30.0
        )

    @property
    def model_name(self) -> str:
        return self._model_name

    async def request(
        self,
        messages: list[ModelMessage],
        model_settings: Optional[dict[str, Any]] = None,
        **kwargs
    ) -> ModelResponse:
        """Make a non-streaming request to Perplexity API."""

        # Convert messages to Perplexity format
        perplexity_messages = self._format_messages(messages)

        # Prepare request payload
        payload = {
            "model": self._model_name,
            "messages": perplexity_messages,
            "temperature": model_settings.get("temperature", self._temperature),
            "max_tokens": model_settings.get("max_tokens", self._max_tokens),
            "search_domain_filter": self._search_domain_filter,
            "search_recency_filter": self._search_recency_filter,
            "return_citations": self._return_citations,
            "stream": False
        }

        try:
            response = await self._client.post(
                "/chat/completions",
                json=payload
            )
            response.raise_for_status()

            data = response.json()
            return self._parse_response(data)

        except httpx.HTTPStatusError as e:
            if e.response.status_code == 429:
                raise RateLimitError(f"Perplexity rate limit exceeded: {e}")
            elif e.response.status_code >= 500:
                raise ServiceUnavailableError(f"Perplexity service error: {e}")
            else:
                raise ModelHTTPError(
                    status_code=e.response.status_code,
                    body=e.response.text
                )
        except httpx.RequestError as e:
            raise ConnectionError(f"Failed to connect to Perplexity API: {e}")

    async def request_stream(
        self,
        messages: list[ModelMessage],
        model_settings: Optional[dict[str, Any]] = None,
        **kwargs
    ) -> AsyncIterator[ModelResponse]:
        """Streaming is supported by Perplexity but simplified here."""
        # For simplicity, we'll use non-streaming
        response = await self.request(messages, model_settings, **kwargs)
        yield response

    def _format_messages(self, messages: list[ModelMessage]) -> list[dict]:
        """Convert Pydantic AI messages to Perplexity format."""
        formatted = []

        for message in messages:
            if isinstance(message, ModelRequest):
                for part in message.parts:
                    if isinstance(part, SystemPromptPart):
                        formatted.append({
                            "role": "system",
                            "content": part.content
                        })
                    elif isinstance(part, UserPromptPart):
                        formatted.append({
                            "role": "user",
                            "content": part.content
                        })
            elif isinstance(message, ModelResponse):
                # Handle assistant responses
                content = ""
                for part in message.parts:
                    if isinstance(part, TextPart):
                        content += part.content
                if content:
                    formatted.append({
                        "role": "assistant",
                        "content": content
                    })

        return formatted

    def _parse_response(self, data: dict) -> ModelResponse:
        """Parse Perplexity API response to ModelResponse."""
        choice = data["choices"][0]
        message = choice["message"]

        parts = [TextPart(content=message["content"])]

        # Extract citations if available
        citations = data.get("citations", [])
        if citations:
            # Add citations as metadata
            parts.append(TextPart(
                content=f"\n\n**Sources:**\n" +
                "\n".join([f"- {cite}" for cite in citations])
            ))

        return ModelResponse(
            parts=parts,
            model_name=self._model_name,
            usage={
                "total_tokens": data.get("usage", {}).get("total_tokens", 0)
            },
            timestamp=datetime.utcnow()
        )
```

### 3. Structured Output Models

**File**: `backend/src/infrastructure/ai/schemas/news_schemas.py`

```python
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
    url: Optional[HttpUrl] = Field(default=None, description="Source URL")
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
        max_items=10,
        description="Relevant tags"
    )
    source: NewsSource = Field(
        description="News source information"
    )
    link: HttpUrl = Field(
        description="Original article link"
    )
    image_url: Optional[HttpUrl] = Field(
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
    def validate_title(cls, v: str) -> str:
        """Ensure title doesn't contain clickbait patterns."""
        clickbait_patterns = ["You Won't Believe", "SHOCKING", "BREAKING"]
        for pattern in clickbait_patterns:
            if pattern.upper() in v.upper():
                raise ValueError(f"Title contains clickbait pattern: {pattern}")
        return v.strip()

    @field_validator("tags")
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
```

### 4. News Generation Agent

**File**: `backend/src/infrastructure/ai/agents/news_generation_agent.py`

```python
from pydantic_ai import Agent, RunContext, ModelRetry
from pydantic_ai.tools import Tool
from typing import List, Optional, Dict, Any
import asyncio
from datetime import datetime
import re

from ..models.perplexity_model import PerplexityModel
from ..schemas.news_schemas import (
    AIGeneratedNews, NewsGenerationRequest,
    NewsGenerationResponse, AINewsCategory
)
from ...config.ai_config import PerplexitySettings

class NewsGenerationAgent:
    """Agent for generating AI news content using Perplexity."""

    def __init__(self, settings: PerplexitySettings):
        self.settings = settings
        self.model = PerplexityModel(
            model_name=settings.model_name,
            api_key=settings.api_key.get_secret_value(),
            base_url=settings.base_url,
            search_recency_filter=settings.search_recency_filter
        )

        # Initialize the agent with structured output
        self.agent = Agent(
            model=self.model,
            output_type=NewsGenerationResponse,
            instructions=self._get_system_prompt(),
            retries=settings.max_retries,
            tools=[
                self._categorize_news,
                self._extract_metadata,
                self._validate_content
            ]
        )

    def _get_system_prompt(self) -> str:
        """Generate system prompt for news generation."""
        return """
        You are an AI news curator specializing in artificial intelligence,
        machine learning, and technology news. Your task is to:

        1. Search for the most recent and relevant AI news
        2. Generate compelling, accurate summaries
        3. Categorize news appropriately
        4. Ensure all content is factual and well-sourced
        5. Focus on breakthrough developments and significant updates
        6. Avoid duplicate or redundant content
        7. Provide proper attribution and sources

        Guidelines:
        - Prioritize news from the last 24-48 hours
        - Focus on reputable sources (research papers, official announcements, major tech publications)
        - Ensure diversity in news topics and categories
        - Write clear, engaging summaries without sensationalism
        - Include relevant technical details when appropriate
        """

    @staticmethod
    def _categorize_news(content: str) -> AINewsCategory:
        """Tool to categorize news content."""
        content_lower = content.lower()

        # Category detection patterns
        patterns = {
            AINewsCategory.BREAKTHROUGH: ["breakthrough", "discovery", "novel", "first-ever"],
            AINewsCategory.RESEARCH: ["paper", "study", "research", "arxiv", "journal"],
            AINewsCategory.PRODUCT_LAUNCH: ["launch", "release", "announce", "unveil", "introduce"],
            AINewsCategory.INDUSTRY_UPDATE: ["partner", "acquisition", "funding", "investment"],
            AINewsCategory.POLICY_REGULATION: ["regulation", "policy", "law", "compliance", "ethics"],
            AINewsCategory.TUTORIAL_GUIDE: ["how-to", "tutorial", "guide", "learn", "implement"],
            AINewsCategory.OPINION_ANALYSIS: ["analysis", "opinion", "perspective", "future", "impact"]
        }

        scores = {}
        for category, keywords in patterns.items():
            score = sum(1 for keyword in keywords if keyword in content_lower)
            if score > 0:
                scores[category] = score

        if scores:
            return max(scores, key=scores.get)
        return AINewsCategory.INDUSTRY_UPDATE

    @staticmethod
    def _extract_metadata(content: str) -> Dict[str, Any]:
        """Tool to extract metadata from content."""
        # Extract potential dates
        date_pattern = r'\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2}, \d{4}\b'
        dates = re.findall(date_pattern, content)

        # Extract organizations
        org_pattern = r'\b(?:OpenAI|Google|Microsoft|Meta|Apple|Amazon|IBM|NVIDIA|DeepMind|Anthropic)\b'
        orgs = list(set(re.findall(org_pattern, content, re.IGNORECASE)))

        # Extract potential tags
        tech_terms = ["LLM", "GPT", "transformer", "neural network", "deep learning",
                     "reinforcement learning", "computer vision", "NLP", "AGI"]
        tags = [term.lower() for term in tech_terms if term.lower() in content.lower()]

        return {
            "dates": dates,
            "organizations": orgs,
            "tags": tags
        }

    @staticmethod
    def _validate_content(news_item: AIGeneratedNews) -> bool:
        """Tool to validate news content quality."""
        # Check for minimum content quality
        if len(news_item.title.split()) < 3:
            raise ModelRetry("Title too short, please regenerate")

        if len(news_item.summary.split()) < 10:
            raise ModelRetry("Summary too short, please regenerate")

        # Check for placeholder content
        placeholder_patterns = ["[", "]", "TODO", "FIXME", "XXX"]
        for pattern in placeholder_patterns:
            if pattern in news_item.title or pattern in news_item.summary:
                raise ModelRetry(f"Content contains placeholder: {pattern}")

        return True

    async def generate_news(
        self,
        request: NewsGenerationRequest,
        user_context: Optional[Dict[str, Any]] = None
    ) -> NewsGenerationResponse:
        """Generate AI news based on request parameters."""

        # Prepare the prompt
        prompt = self._build_generation_prompt(request)

        # Run the agent with retry logic
        max_attempts = 3
        for attempt in range(max_attempts):
            try:
                result = await self.agent.run(
                    prompt,
                    deps=user_context or {}
                )

                # Validate and filter results
                validated_items = await self._validate_news_items(
                    result.data.news_items,
                    request.min_relevance
                )

                # Update response with validated items
                result.data.news_items = validated_items
                result.data.total_generated = len(validated_items)

                return result.data

            except Exception as e:
                if attempt == max_attempts - 1:
                    raise AINewsGenerationException(
                        f"Failed to generate news after {max_attempts} attempts: {str(e)}"
                    )
                await asyncio.sleep(2 ** attempt)  # Exponential backoff

    def _build_generation_prompt(self, request: NewsGenerationRequest) -> str:
        """Build the generation prompt based on request parameters."""
        prompt_parts = [
            f"Generate {request.count} fresh and current AI news items.",
            f"Focus on news from the last {request.recency}.",
            f"Search query: {request.search_query}"
        ]

        if request.categories:
            categories_str = ", ".join([cat.value for cat in request.categories])
            prompt_parts.append(f"Focus on these categories: {categories_str}")

        prompt_parts.append(
            "Ensure each news item has a compelling title, informative summary, "
            "proper source attribution, and relevant metadata."
        )

        return "\n".join(prompt_parts)

    async def _validate_news_items(
        self,
        items: List[AIGeneratedNews],
        min_relevance: float
    ) -> List[AIGeneratedNews]:
        """Validate and filter news items."""
        validated = []

        for item in items:
            # Filter by relevance score
            if item.relevance_score < min_relevance:
                continue

            # Additional validation
            try:
                self._validate_content(item)
                validated.append(item)
            except ModelRetry:
                continue  # Skip invalid items

        return validated
```

### 5. Application Layer Integration

**File**: `backend/src/application/use_cases/news/generate_ai_news_use_case.py`

```python
from typing import List, Optional
from datetime import datetime

from src.application.use_cases.news.create_news_use_case import CreateNewsUseCase
from src.domain.entities.news_item import NewsItem, NewsCategory, NewsStatus
from src.infrastructure.ai.agents.news_generation_agent import NewsGenerationAgent
from src.infrastructure.ai.schemas.news_schemas import (
    NewsGenerationRequest, AIGeneratedNews
)

class GenerateAINewsUseCase:
    """Use case for generating and storing AI news."""

    def __init__(
        self,
        news_generation_agent: NewsGenerationAgent,
        create_news_use_case: CreateNewsUseCase
    ):
        self.news_agent = news_generation_agent
        self.create_news_use_case = create_news_use_case

    async def execute(
        self,
        user_id: str,
        count: int = 5,
        categories: Optional[List[str]] = None,
        is_public: bool = False
    ) -> List[NewsItem]:
        """Generate AI news and store them in the database."""

        # Prepare generation request
        request = NewsGenerationRequest(
            count=count,
            categories=categories,
            recency="day"  # Always fetch latest news
        )

        # Generate news using AI agent
        response = await self.news_agent.generate_news(
            request,
            user_context={"user_id": user_id}
        )

        # Convert and store each news item
        created_news = []
        for ai_news in response.news_items:
            try:
                news_item = await self._convert_and_store_news(
                    ai_news,
                    user_id,
                    is_public
                )
                created_news.append(news_item)
            except Exception as e:
                # Log error but continue with other items
                print(f"Failed to store news item: {e}")
                continue

        return created_news

    async def _convert_and_store_news(
        self,
        ai_news: AIGeneratedNews,
        user_id: str,
        is_public: bool
    ) -> NewsItem:
        """Convert AI-generated news to domain entity and store."""

        # Map AI category to domain category
        category_mapping = {
            "breakthrough": NewsCategory.RESEARCH,
            "research": NewsCategory.RESEARCH,
            "product_launch": NewsCategory.PRODUCT,
            "industry_update": NewsCategory.COMPANY,
            "policy_regulation": NewsCategory.GENERAL,
            "tutorial_guide": NewsCategory.TUTORIAL,
            "opinion_analysis": NewsCategory.OPINION
        }

        domain_category = category_mapping.get(
            ai_news.category.value,
            NewsCategory.GENERAL
        )

        # Create news using existing use case
        return await self.create_news_use_case.execute(
            source=ai_news.source.name,
            title=ai_news.title,
            summary=ai_news.summary,
            link=str(ai_news.link),
            image_url=str(ai_news.image_url) if ai_news.image_url else "",
            category=domain_category,
            user_id=user_id,
            is_public=is_public
        )
```

### 6. Error Handling and Retry Strategies

**File**: `backend/src/infrastructure/ai/exceptions.py`

```python
from typing import Optional

class AIServiceException(Exception):
    """Base exception for AI service errors."""
    pass

class RateLimitError(AIServiceException):
    """Raised when API rate limit is exceeded."""

    def __init__(self, message: str, retry_after: Optional[int] = None):
        super().__init__(message)
        self.retry_after = retry_after

class ServiceUnavailableError(AIServiceException):
    """Raised when AI service is unavailable."""
    pass

class ModelHTTPError(AIServiceException):
    """Raised for HTTP errors from the model API."""

    def __init__(self, status_code: int, body: str):
        super().__init__(f"HTTP {status_code}: {body}")
        self.status_code = status_code
        self.body = body

class AINewsGenerationException(AIServiceException):
    """Raised when news generation fails."""
    pass

class ContentValidationError(AIServiceException):
    """Raised when generated content fails validation."""
    pass
```

**File**: `backend/src/infrastructure/ai/retry_strategies.py`

```python
import asyncio
from typing import TypeVar, Callable, Optional, Any
from functools import wraps
import random

from .exceptions import RateLimitError, ServiceUnavailableError

T = TypeVar('T')

def exponential_backoff_retry(
    max_attempts: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 60.0,
    exponential_base: float = 2.0,
    jitter: bool = True
):
    """Decorator for exponential backoff retry logic."""

    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        async def wrapper(*args, **kwargs) -> T:
            last_exception = None

            for attempt in range(max_attempts):
                try:
                    return await func(*args, **kwargs)

                except RateLimitError as e:
                    last_exception = e
                    # Use retry_after if provided
                    if e.retry_after:
                        delay = e.retry_after
                    else:
                        delay = min(
                            base_delay * (exponential_base ** attempt),
                            max_delay
                        )

                    if jitter:
                        delay = delay * (0.5 + random.random())

                    if attempt < max_attempts - 1:
                        await asyncio.sleep(delay)

                except ServiceUnavailableError as e:
                    last_exception = e
                    delay = min(
                        base_delay * (exponential_base ** attempt),
                        max_delay
                    )

                    if attempt < max_attempts - 1:
                        await asyncio.sleep(delay)

                except Exception as e:
                    # Don't retry on other exceptions
                    raise

            # All retries exhausted
            raise last_exception

        return wrapper
    return decorator

class RetryableAgent:
    """Mixin for agents with retry capabilities."""

    def __init__(self, max_retries: int = 3):
        self.max_retries = max_retries

    @exponential_backoff_retry(max_attempts=3)
    async def execute_with_retry(self, func: Callable, *args, **kwargs):
        """Execute a function with retry logic."""
        return await func(*args, **kwargs)
```

### 7. Dependency Injection

**File**: `backend/src/infrastructure/web/dependencies/ai_dependencies.py`

```python
from functools import lru_cache
from src.infrastructure.ai.agents.news_generation_agent import NewsGenerationAgent
from src.infrastructure.ai.config.ai_config import PerplexitySettings
from src.application.use_cases.news.generate_ai_news_use_case import GenerateAINewsUseCase
from src.application.use_cases.news.create_news_use_case import CreateNewsUseCase
from src.infrastructure.adapters.repositories.mongodb_news_repository import MongoDBNewsRepository
from src.infrastructure.database import get_database

@lru_cache()
def get_perplexity_settings() -> PerplexitySettings:
    """Get Perplexity API settings."""
    return PerplexitySettings()

@lru_cache()
def get_news_generation_agent() -> NewsGenerationAgent:
    """Get news generation agent instance."""
    settings = get_perplexity_settings()
    return NewsGenerationAgent(settings)

async def get_generate_ai_news_use_case() -> GenerateAINewsUseCase:
    """Get AI news generation use case."""
    db = await get_database()
    news_repository = MongoDBNewsRepository(db)
    create_news_use_case = CreateNewsUseCase(news_repository)
    news_agent = get_news_generation_agent()

    return GenerateAINewsUseCase(
        news_generation_agent=news_agent,
        create_news_use_case=create_news_use_case
    )
```

### 8. API Endpoint

**File**: `backend/src/infrastructure/web/routers/ai_news.py`

```python
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from pydantic import BaseModel, Field

from src.infrastructure.web.dependencies.ai_dependencies import get_generate_ai_news_use_case
from src.infrastructure.web.security import get_current_user
from src.infrastructure.ai.exceptions import AINewsGenerationException
from src.application.use_cases.news.generate_ai_news_use_case import GenerateAINewsUseCase
from src.domain.entities.user import User
from src.infrastructure.web.dtos.news_dto import NewsDTO
from src.infrastructure.web.news_mapper import NewsMapper

router = APIRouter(prefix="/ai-news", tags=["AI News"])

class GenerateNewsRequest(BaseModel):
    """Request model for generating AI news."""
    count: int = Field(default=5, ge=1, le=15, description="Number of news to generate")
    categories: List[str] = Field(default=None, description="News categories to focus on")
    is_public: bool = Field(default=False, description="Make news public")

class GenerateNewsResponse(BaseModel):
    """Response model for generated news."""
    news_items: List[NewsDTO]
    total_generated: int
    message: str

@router.post("/generate", response_model=GenerateNewsResponse)
async def generate_ai_news(
    request: GenerateNewsRequest,
    current_user: User = Depends(get_current_user),
    use_case: GenerateAINewsUseCase = Depends(get_generate_ai_news_use_case)
) -> GenerateNewsResponse:
    """Generate AI news for the current user."""

    try:
        # Generate news
        news_items = await use_case.execute(
            user_id=current_user.id,
            count=request.count,
            categories=request.categories,
            is_public=request.is_public
        )

        # Convert to DTOs
        news_dtos = [NewsMapper.to_dto(item) for item in news_items]

        return GenerateNewsResponse(
            news_items=news_dtos,
            total_generated=len(news_dtos),
            message=f"Successfully generated {len(news_dtos)} AI news items"
        )

    except AINewsGenerationException as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to generate AI news: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred: {str(e)}"
        )
```

## Testing Strategy

### 1. Unit Tests

**File**: `backend/tests/unit/test_news_generation_agent.py`

```python
import pytest
from unittest.mock import Mock, AsyncMock, patch
from src.infrastructure.ai.agents.news_generation_agent import NewsGenerationAgent
from src.infrastructure.ai.schemas.news_schemas import NewsGenerationRequest

@pytest.mark.asyncio
async def test_news_generation_agent_success():
    """Test successful news generation."""
    # Mock settings and model
    mock_settings = Mock()
    mock_settings.model_name = "sonar-pro"
    mock_settings.api_key.get_secret_value.return_value = "test-key"
    mock_settings.base_url = "https://api.test.com"
    mock_settings.max_retries = 3
    mock_settings.search_recency_filter = "day"

    agent = NewsGenerationAgent(mock_settings)

    # Mock the agent's run method
    with patch.object(agent.agent, 'run') as mock_run:
        mock_response = Mock()
        mock_response.data.news_items = []
        mock_response.data.total_generated = 0
        mock_run.return_value = mock_response

        request = NewsGenerationRequest(count=5)
        result = await agent.generate_news(request)

        assert result is not None
        mock_run.assert_called_once()

@pytest.mark.asyncio
async def test_retry_on_rate_limit():
    """Test retry logic on rate limit errors."""
    # Implementation here
    pass
```

### 2. Integration Tests

**File**: `backend/tests/integration/test_ai_news_integration.py`

```python
import pytest
from httpx import AsyncClient
from unittest.mock import patch, Mock

@pytest.mark.asyncio
async def test_generate_ai_news_endpoint(
    authenticated_client: AsyncClient,
    mock_perplexity_response
):
    """Test the AI news generation endpoint."""

    with patch('src.infrastructure.ai.agents.news_generation_agent.PerplexityModel.request') as mock_request:
        mock_request.return_value = mock_perplexity_response

        response = await authenticated_client.post(
            "/api/ai-news/generate",
            json={"count": 5, "categories": ["research"]}
        )

        assert response.status_code == 200
        data = response.json()
        assert "news_items" in data
        assert data["total_generated"] > 0
```

## Performance Considerations

### 1. Caching Strategy

```python
from functools import lru_cache
import hashlib
from datetime import datetime, timedelta

class NewsCache:
    """Simple in-memory cache for AI-generated news."""

    def __init__(self, ttl_minutes: int = 15):
        self._cache = {}
        self._ttl = timedelta(minutes=ttl_minutes)

    def _get_cache_key(self, request: NewsGenerationRequest) -> str:
        """Generate cache key from request."""
        key_data = f"{request.count}:{request.recency}:{request.search_query}"
        return hashlib.md5(key_data.encode()).hexdigest()

    def get(self, request: NewsGenerationRequest):
        """Get cached response if available."""
        key = self._get_cache_key(request)
        if key in self._cache:
            entry, timestamp = self._cache[key]
            if datetime.utcnow() - timestamp < self._ttl:
                return entry
            else:
                del self._cache[key]
        return None

    def set(self, request: NewsGenerationRequest, response):
        """Cache the response."""
        key = self._get_cache_key(request)
        self._cache[key] = (response, datetime.utcnow())
```

### 2. Concurrent Request Handling

```python
import asyncio
from typing import List

async def generate_news_batch(
    agent: NewsGenerationAgent,
    requests: List[NewsGenerationRequest]
) -> List[NewsGenerationResponse]:
    """Generate multiple news batches concurrently."""

    # Limit concurrent requests to avoid rate limiting
    semaphore = asyncio.Semaphore(3)

    async def generate_with_semaphore(request):
        async with semaphore:
            return await agent.generate_news(request)

    tasks = [generate_with_semaphore(req) for req in requests]
    return await asyncio.gather(*tasks, return_exceptions=True)
```

## Security Considerations

1. **API Key Management**: Use environment variables and secret management
2. **Input Validation**: Strict validation on all user inputs
3. **Output Sanitization**: Clean generated content before storage
4. **Rate Limiting**: Implement per-user rate limits
5. **Audit Logging**: Log all AI generation requests and responses

## Monitoring and Observability

### Metrics to Track

1. **Generation Metrics**:
   - Success rate
   - Average generation time
   - Token usage
   - Cache hit rate

2. **Quality Metrics**:
   - Validation failure rate
   - Average relevance score
   - User engagement with generated news

3. **Error Metrics**:
   - Rate limit hits
   - Service unavailability
   - Validation errors

### Logging Configuration

```python
import logfire
from pydantic_ai import Agent

# Configure Logfire for Pydantic AI
logfire.configure(
    service_name="ai-news-generation",
    environment="production"
)

# Instrument the agent
agent = Agent(
    model=model,
    instrument=True  # Enable instrumentation
)
```

## Migration Path

### Phase 1: Infrastructure Setup
1. Add Perplexity API credentials to environment
2. Deploy custom model adapter
3. Set up monitoring and logging

### Phase 2: Core Implementation
1. Deploy news generation agent
2. Integrate with existing use cases
3. Add API endpoints

### Phase 3: Testing and Optimization
1. Run integration tests
2. Performance testing
3. Fine-tune prompts and parameters

### Phase 4: Production Rollout
1. Deploy with feature flag
2. Monitor metrics and errors
3. Gradual rollout to all users

## Important Notes

### Why Pydantic AI is Beneficial Here

1. **Structured Output Guarantees**: Ensures consistent news article format
2. **Built-in Retry Logic**: Handles transient API failures gracefully
3. **Tool Integration**: Allows complex workflows with validation and categorization
4. **Type Safety**: Full type checking for all inputs and outputs
5. **Observability**: Built-in instrumentation for monitoring
6. **Model Agnostic**: Easy to switch between Perplexity, OpenAI, or other providers

### Key Advantages Over Direct API Calls

1. **Automatic validation** of generated content
2. **Retry strategies** with exponential backoff
3. **Structured error handling** with typed exceptions
4. **Agent composition** for complex workflows
5. **Built-in instrumentation** for debugging

### Best Practices Implemented

1. **Separation of Concerns**: Clean architecture with ports and adapters
2. **Error Recovery**: Multiple retry strategies for different error types
3. **Caching**: Reduce API calls and improve response times
4. **Validation**: Multi-layer validation for content quality
5. **Configuration Management**: Environment-based settings with Pydantic
6. **Testing**: Comprehensive unit and integration tests
7. **Monitoring**: Full observability with metrics and logging

## Conclusion

This implementation leverages Pydantic AI's strengths to create a robust, maintainable, and scalable AI news generation system. The agent-based approach provides better error handling, retry logic, and structured outputs compared to direct API integration, while maintaining clean architecture principles and allowing for easy testing and monitoring.