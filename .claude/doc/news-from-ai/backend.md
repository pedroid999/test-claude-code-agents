# News-from-AI Backend Implementation Plan

## Overview
This document provides a detailed implementation plan for integrating Perplexity API Sonar into our hexagonal architecture backend to generate fresh AI news content. The feature will leverage our existing `CreateNewsUseCase` while adding a new use case for AI news generation.

## Architecture Analysis

### Current State
- Existing `CreateNewsUseCase` handles news creation with domain validation
- News entities support all required fields (source, title, summary, link, image_url, category)
- Repository pattern already implemented with MongoDB adapter
- Authentication system in place with JWT tokens
- Clean separation between domain, application, and infrastructure layers

### Integration Points
The Perplexity API integration will follow our hexagonal architecture by:
1. Creating a new application port for external AI services
2. Implementing a Perplexity adapter in the infrastructure layer
3. Adding a new use case that orchestrates AI news generation and creation
4. Extending the web layer with new endpoints and DTOs

## Implementation Plan

### 1. Infrastructure Layer - External Service Integration

#### 1.1 Create Perplexity API Port (Application Layer)
**File**: `backend/src/application/ports/ai_news_service.py`
```python
from abc import ABC, abstractmethod
from typing import List
from dataclasses import dataclass

@dataclass
class AINewsRequest:
    """Request for AI news generation."""
    count: int = 5
    search_query: str = "latest AI news technology artificial intelligence machine learning"
    temperature: float = 0.3
    max_tokens: int = 1000

@dataclass
class AINewsItem:
    """AI-generated news item."""
    title: str
    summary: str
    link: str
    source: str
    image_url: str = ""

class AINewsService(ABC):
    """Port for AI news generation services."""

    @abstractmethod
    async def generate_news(self, request: AINewsRequest) -> List[AINewsItem]:
        """Generate fresh AI news items."""
        pass
```

#### 1.2 Create Perplexity API Adapter (Infrastructure Layer)
**File**: `backend/src/infrastructure/adapters/external/perplexity_ai_service.py`
```python
import httpx
import json
from typing import List, Optional
from src.application.ports.ai_news_service import AINewsService, AINewsRequest, AINewsItem
from src.domain.exceptions.base import DomainException

class PerplexityAPIException(DomainException):
    """Exception for Perplexity API errors."""
    pass

class PerplexityAIService(AINewsService):
    """Perplexity API implementation for AI news generation."""

    def __init__(self, api_key: str, base_url: str = "https://api.perplexity.ai"):
        self.api_key = api_key
        self.base_url = base_url
        self.client = httpx.AsyncClient(
            timeout=60.0,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }
        )

    async def generate_news(self, request: AINewsRequest) -> List[AINewsItem]:
        """Generate fresh AI news using Perplexity Sonar."""
        try:
            payload = {
                "model": "llama-3.1-sonar-small-128k-online",
                "messages": [
                    {
                        "role": "system",
                        "content": f"""You are an AI news curator. Generate {request.count} fresh, current AI-related news items.
                        For each news item, provide:
                        1. A compelling title (max 100 chars)
                        2. A 2-3 sentence summary (max 300 chars)
                        3. The source URL if available
                        4. The source name
                        5. An image URL if available

                        Return ONLY a JSON array with this exact structure:
                        [
                          {{
                            "title": "News title here",
                            "summary": "Brief summary here",
                            "link": "https://source-url.com",
                            "source": "Source Name",
                            "image_url": "https://image-url.com/image.jpg"
                          }}
                        ]"""
                    },
                    {
                        "role": "user",
                        "content": f"Find {request.count} latest AI news articles about: {request.search_query}"
                    }
                ],
                "temperature": request.temperature,
                "max_tokens": request.max_tokens,
                "search_domain_filter": ["news"],
                "search_recency_filter": "day"
            }

            response = await self.client.post(
                f"{self.base_url}/chat/completions",
                json=payload
            )

            if response.status_code != 200:
                raise PerplexityAPIException(f"Perplexity API error: {response.status_code} - {response.text}")

            data = response.json()
            content = data["choices"][0]["message"]["content"]

            # Parse JSON response
            try:
                news_items_data = json.loads(content)
                return [
                    AINewsItem(
                        title=item.get("title", ""),
                        summary=item.get("summary", ""),
                        link=item.get("link", ""),
                        source=item.get("source", "AI Source"),
                        image_url=item.get("image_url", "")
                    )
                    for item in news_items_data
                ]
            except json.JSONDecodeError as e:
                raise PerplexityAPIException(f"Failed to parse AI response: {str(e)}")

        except httpx.RequestError as e:
            raise PerplexityAPIException(f"Network error: {str(e)}")
        except Exception as e:
            raise PerplexityAPIException(f"Unexpected error: {str(e)}")

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.client.aclose()
```

#### 1.3 Configuration Updates
**File**: `backend/.env.example` (add line)
```
PERPLEXITY_API_KEY=your_perplexity_api_key_here
```

**File**: `backend/src/infrastructure/config.py` (new file)
```python
import os
from typing import Optional

class Config:
    """Application configuration."""

    # Existing config
    MONGODB_URL: str = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    DATABASE_NAME: str = os.getenv("DATABASE_NAME", "news_app")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

    # New AI service config
    PERPLEXITY_API_KEY: Optional[str] = os.getenv("PERPLEXITY_API_KEY")
    PERPLEXITY_BASE_URL: str = os.getenv("PERPLEXITY_BASE_URL", "https://api.perplexity.ai")

    @classmethod
    def validate_ai_config(cls) -> bool:
        """Validate AI service configuration."""
        return cls.PERPLEXITY_API_KEY is not None

config = Config()
```

### 2. Application Layer - Use Case Implementation

#### 2.1 AI News Generation Use Case
**File**: `backend/src/application/use_cases/news/generate_ai_news_use_case.py`
```python
"""Generate AI news use case."""

from typing import List
from src.application.ports.ai_news_service import AINewsService, AINewsRequest
from src.application.use_cases.news.create_news_use_case import CreateNewsUseCase
from src.domain.entities.news_item import NewsItem, NewsCategory
from src.domain.exceptions.news_exceptions import AINewsGenerationException

class GenerateAINewsUseCase:
    """Use case for generating AI news items."""

    def __init__(
        self,
        ai_news_service: AINewsService,
        create_news_use_case: CreateNewsUseCase
    ):
        """Initialize the use case.

        Args:
            ai_news_service: The AI news service port
            create_news_use_case: The create news use case
        """
        self.ai_news_service = ai_news_service
        self.create_news_use_case = create_news_use_case

    async def execute(
        self,
        user_id: str,
        count: int = 5,
        search_query: str = "latest AI news technology artificial intelligence machine learning",
        is_public: bool = False
    ) -> List[NewsItem]:
        """Generate and create AI news items.

        Args:
            user_id: ID of the user requesting the news
            count: Number of news items to generate (5-15)
            search_query: Search query for AI news
            is_public: Whether the news should be public

        Returns:
            List of created news items

        Raises:
            AINewsGenerationException: If AI news generation fails
            ValueError: If validation fails
        """
        # Validate count
        if count < 1 or count > 15:
            raise ValueError("Count must be between 1 and 15")

        try:
            # Generate AI news
            ai_request = AINewsRequest(
                count=count,
                search_query=search_query,
                temperature=0.3,
                max_tokens=1000
            )

            ai_news_items = await self.ai_news_service.generate_news(ai_request)

            if not ai_news_items:
                raise AINewsGenerationException("No news items generated")

            # Create news items using existing use case
            created_items = []
            for ai_item in ai_news_items:
                try:
                    # Skip items with missing required fields
                    if not ai_item.title or not ai_item.summary:
                        continue

                    # Use a default link if none provided
                    link = ai_item.link if ai_item.link else f"https://ai-generated-news.com/{hash(ai_item.title)}"

                    news_item = await self.create_news_use_case.execute(
                        source=ai_item.source or "AI Generated",
                        title=ai_item.title,
                        summary=ai_item.summary,
                        link=link,
                        image_url=ai_item.image_url,
                        category=NewsCategory.RESEARCH,  # Default to RESEARCH for AI news
                        user_id=user_id,
                        is_public=is_public
                    )
                    created_items.append(news_item)
                except Exception as e:
                    # Log error but continue with other items
                    print(f"Failed to create news item: {e}")
                    continue

            if not created_items:
                raise AINewsGenerationException("Failed to create any news items")

            return created_items

        except Exception as e:
            raise AINewsGenerationException(f"Failed to generate AI news: {str(e)}")
```

#### 2.2 Update News Exceptions
**File**: `backend/src/domain/exceptions/news_exceptions.py` (add exception)
```python
# Add to existing exceptions
class AINewsGenerationException(DomainException):
    """Exception raised when AI news generation fails."""

    def __init__(self, message: str):
        """Initialize the exception.

        Args:
            message: Error message
        """
        super().__init__(f"AI news generation failed: {message}")
```

### 3. Infrastructure Layer - Web Components

#### 3.1 Update Dependencies
**File**: `backend/src/infrastructure/web/dependencies.py` (add functions)
```python
# Add these imports at the top
from src.infrastructure.adapters.external.perplexity_ai_service import PerplexityAIService
from src.application.ports.ai_news_service import AINewsService
from src.application.use_cases.news.generate_ai_news_use_case import GenerateAINewsUseCase
from src.infrastructure.config import config

# Add these functions
@lru_cache()
def get_ai_news_service() -> AINewsService:
    """Get AI news service instance."""
    if not config.validate_ai_config():
        raise ValueError("Perplexity API key not configured")
    return PerplexityAIService(
        api_key=config.PERPLEXITY_API_KEY,
        base_url=config.PERPLEXITY_BASE_URL
    )

def get_generate_ai_news_use_case() -> GenerateAINewsUseCase:
    """Get generate AI news use case."""
    from src.infrastructure.web.dependencies import get_news_repository
    create_news_use_case = CreateNewsUseCase(get_news_repository())
    return GenerateAINewsUseCase(
        ai_news_service=get_ai_news_service(),
        create_news_use_case=create_news_use_case
    )
```

#### 3.2 Create AI News DTOs
**File**: `backend/src/infrastructure/web/dtos/ai_news_dto.py`
```python
"""AI news DTOs."""

from typing import Optional
from pydantic import BaseModel, Field, validator

class GenerateAINewsRequestDTO(BaseModel):
    """Request DTO for generating AI news."""

    count: int = Field(default=5, ge=1, le=15, description="Number of news items to generate")
    search_query: Optional[str] = Field(
        default="latest AI news technology artificial intelligence machine learning",
        max_length=200,
        description="Search query for AI news"
    )
    is_public: bool = Field(default=False, description="Whether news should be public")

    @validator('search_query')
    def validate_search_query(cls, v):
        """Validate search query."""
        if v and len(v.strip()) < 3:
            raise ValueError("Search query must be at least 3 characters")
        return v.strip() if v else "latest AI news technology"

class GenerateAINewsResponseDTO(BaseModel):
    """Response DTO for AI news generation."""

    success: bool
    created_count: int
    message: str
    news_items: list  # Will contain NewsResponseDTO items
```

#### 3.3 Update News Router
**File**: `backend/src/infrastructure/web/routers/news.py` (add endpoint)
```python
# Add these imports at the top
from src.application.use_cases.news.generate_ai_news_use_case import GenerateAINewsUseCase
from src.infrastructure.web.dtos.ai_news_dto import (
    GenerateAINewsRequestDTO,
    GenerateAINewsResponseDTO
)
from src.domain.exceptions.news_exceptions import AINewsGenerationException

# Add dependency function
def get_generate_ai_news_use_case() -> GenerateAINewsUseCase:
    """Get generate AI news use case."""
    from src.infrastructure.web.dependencies import get_generate_ai_news_use_case as get_use_case
    return get_use_case()

# Add new endpoint
@router.post("/generate-ai", response_model=GenerateAINewsResponseDTO, status_code=status.HTTP_201_CREATED)
async def generate_ai_news(
    request_data: GenerateAINewsRequestDTO,
    current_user: dict = Depends(get_current_active_user),
    use_case: GenerateAINewsUseCase = Depends(get_generate_ai_news_use_case),
) -> GenerateAINewsResponseDTO:
    """Generate AI news items using Perplexity API."""
    try:
        news_items = await use_case.execute(
            user_id=current_user["id"],
            count=request_data.count,
            search_query=request_data.search_query,
            is_public=request_data.is_public
        )

        response_items = [NewsMapper.to_response_dto(item) for item in news_items]

        return GenerateAINewsResponseDTO(
            success=True,
            created_count=len(news_items),
            message=f"Successfully generated {len(news_items)} AI news items",
            news_items=response_items
        )

    except AINewsGenerationException as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error: {str(e)}"
        )
```

### 4. Error Handling and Rate Limiting

#### 4.1 Enhanced Error Handling
- **Domain Layer**: `AINewsGenerationException` for business logic errors
- **Infrastructure Layer**: `PerplexityAPIException` for external service errors
- **Web Layer**: Proper HTTP status code mapping

#### 4.2 Rate Limiting Considerations
- Implement request throttling using FastAPI middleware
- Add retry logic with exponential backoff in the Perplexity adapter
- Consider caching recent requests to avoid duplicate API calls

### 5. Testing Strategy

#### 5.1 Unit Tests
- `tests/test_domain_ai_news.py`: Test AI news request/response entities
- `tests/test_use_case_generate_ai_news.py`: Test use case logic
- `tests/test_perplexity_adapter.py`: Test API adapter with mocked responses

#### 5.2 Integration Tests
- `tests/test_api_ai_news.py`: Test complete endpoint functionality
- `tests/test_ai_news_flow.py`: Test end-to-end news generation flow

### 6. Security Considerations

#### 6.1 API Key Security
- Store Perplexity API key in environment variables
- Validate API key configuration at startup
- Use secure HTTP client with proper timeout settings

#### 6.2 Input Validation
- Validate user input for count (1-15 range)
- Sanitize search queries
- Implement proper authentication for the endpoint

### 7. Performance Optimizations

#### 7.1 Async Implementation
- Use `httpx.AsyncClient` for non-blocking API calls
- Implement proper async context management
- Handle concurrent news creation efficiently

#### 7.2 Caching Strategy
- Consider caching AI responses for short periods
- Use `@lru_cache()` for dependency injection
- Implement request deduplication

## Implementation Priority

1. **Phase 1**: Core Infrastructure
   - Create AI service port and Perplexity adapter
   - Add configuration management
   - Implement basic error handling

2. **Phase 2**: Application Logic
   - Implement `GenerateAINewsUseCase`
   - Add comprehensive error handling
   - Create proper domain exceptions

3. **Phase 3**: Web Layer
   - Add DTOs and endpoint
   - Update dependencies
   - Implement request validation

4. **Phase 4**: Testing & Refinement
   - Add comprehensive tests
   - Implement rate limiting
   - Performance optimization

## Important Notes

### Hexagonal Architecture Compliance
- **Clean Separation**: AI service is abstracted behind a port
- **Dependency Inversion**: Use case depends on abstractions, not implementations
- **Single Responsibility**: Each component has a clear, focused purpose
- **Framework Independence**: Domain logic is isolated from external dependencies

### Integration with Existing Code
- Leverages existing `CreateNewsUseCase` for news persistence
- Uses existing authentication and authorization mechanisms
- Follows established patterns for DTOs, mappers, and error handling
- Maintains consistency with current API design

### Configuration Requirements
- Add `PERPLEXITY_API_KEY` to environment variables
- Ensure proper API key validation at startup
- Configure appropriate timeout values for external API calls

### Error Scenarios to Handle
- Perplexity API unavailability
- Invalid API responses
- Rate limiting from Perplexity
- Network connectivity issues
- Malformed JSON responses
- Duplicate news detection

This implementation plan ensures the news-from-ai feature integrates seamlessly with our existing hexagonal architecture while maintaining clean separation of concerns and following established patterns.