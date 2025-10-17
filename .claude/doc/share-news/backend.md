# Backend Implementation Plan: Share News Feature

## Executive Summary

This document provides architectural recommendations for implementing the Twitter share functionality for news items in the backend. The implementation follows hexagonal architecture principles with minimal changes to existing code, focusing on a read-only endpoint that provides sharing data.

---

## Architectural Decisions & Recommendations

### 1. Should We Track Sharing Events in the Database?

**Recommendation: NO - Do not implement sharing tracking at this time**

**Rationale:**

1. **YAGNI Principle (You Aren't Gonna Need It)**: The requirements specify only the ability to share to Twitter. There's no requirement for analytics, reporting, or business logic based on share counts.

2. **Minimal Implementation**: Following hexagonal architecture's principle of keeping the domain focused on essential business rules, tracking shares adds complexity without immediate business value.

3. **External Analytics Alternative**: Twitter itself provides analytics for shared links. If sharing analytics become needed, they can be implemented through:
   - Frontend analytics tools (Google Analytics, Mixpanel)
   - Twitter's own analytics
   - Backend tracking as a future enhancement

4. **Future-Proof Architecture**: If tracking becomes required later, it can be added as a separate concern:
   - New `ShareEvent` entity in domain layer
   - New `ShareEventRepository` port
   - New `TrackShareUseCase`
   - This would be a clean addition without modifying existing news logic

**What NOT to do:**
- Do NOT add `share_count` field to `NewsItem` entity (violates single responsibility)
- Do NOT create `ShareEvent` entity now (premature optimization)
- Do NOT add tracking endpoints yet (YAGNI)

---

### 2. Best Approach for Generating Canonical URLs

**Recommendation: Configuration-based URL generation with environment variable for frontend base URL**

**Implementation Strategy:**

#### A. Add Frontend URL to Environment Configuration

```python
# backend/.env.example (add this line)
FRONTEND_BASE_URL=http://localhost:5173

# backend/.env (production would be)
FRONTEND_BASE_URL=https://yourapp.com
```

#### B. Create Application Configuration Module

Since the project doesn't have a central `config.py`, create one:

**File: `backend/src/config/app_config.py`**

```python
"""Application configuration."""

from pydantic_settings import BaseSettings
from functools import lru_cache


class AppSettings(BaseSettings):
    """Application settings."""

    # Existing settings (these would be consolidated here eventually)
    mongodb_url: str = "mongodb://localhost:27017"
    database_name: str
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    # New setting for frontend URL
    frontend_base_url: str = "http://localhost:5173"

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_app_settings() -> AppSettings:
    """Get cached application settings."""
    return AppSettings()
```

**Why Pydantic BaseSettings:**
- Already used in `ai_config.py` (consistency)
- Type-safe environment variable loading
- Validation built-in
- Easy to test with override

#### C. URL Generation in Use Case

The URL generation will happen in the use case layer (business logic), not in the web layer or domain:

**Pattern:**
```
https://yourapp.com/news/{news_id}
```

**Why This Pattern:**
- Simple and clean
- RESTful convention
- Shareable and bookmarkable
- Frontend can handle routing to display the news detail

**Important Note:** The frontend currently doesn't have a `/news/:id` route. The frontend developer will need to add this route to display individual news items. This is noted in the implementation requirements.

---

### 3. Required Endpoints and DTOs

**Recommendation: Single read-only endpoint for sharing data**

#### Endpoint Design

```
GET /api/news/{news_id}/share-data
```

**Why This Design:**
1. **RESTful Convention**: Follows REST principles for sub-resource
2. **Clear Intent**: The `/share-data` suffix clearly indicates purpose
3. **Separation of Concerns**: Dedicated endpoint for sharing vs display
4. **Cacheable**: GET requests are cacheable by browsers/CDNs
5. **No Side Effects**: Read-only operation, safe to retry

#### DTO Design

**File: `backend/src/infrastructure/web/dtos/news_dto.py`**

Add this new DTO to the existing file:

```python
class NewsShareDataDTO(BaseModel):
    """DTO for news item sharing data."""

    news_id: str = Field(..., description="The news item ID")
    title: str = Field(..., max_length=280, description="News title (truncated for Twitter)")
    url: str = Field(..., description="Canonical URL to the news item")
    summary: str = Field(..., max_length=200, description="Short summary for sharing")
    hashtags: List[str] = Field(default_factory=list, max_items=3, description="Suggested hashtags")

    class Config:
        json_schema_extra = {
            "example": {
                "news_id": "507f1f77bcf86cd799439011",
                "title": "New AI Breakthrough Announced",
                "url": "https://yourapp.com/news/507f1f77bcf86cd799439011",
                "summary": "Researchers have made a significant breakthrough in AI technology",
                "hashtags": ["AI", "Research", "Technology"]
            }
        }
```

**DTO Design Decisions:**

1. **Title Length (280 chars)**: Twitter's limit is 280 characters. The use case will truncate if needed.

2. **URL Field**: Contains the full canonical URL to the news item (frontend route), not the original article link. This ensures shared links bring users to your app.

3. **Summary (200 chars)**: Short summary suitable for tweet text, leaving room for URL and hashtags.

4. **Hashtags**: Auto-generated from news category, max 3 for Twitter best practices.

5. **Why NOT include original link?**: The frontend already has the full news object with the original link. This DTO is specifically for sharing YOUR APP's link to the news item.

---

### 4. Use Cases Required

**Recommendation: Single use case following the repository pattern**

#### Use Case: `GetNewsShareDataUseCase`

**File: `backend/src/application/use_cases/news/get_news_share_data_use_case.py`**

```python
"""Get news share data use case."""

from typing import List
from src.application.ports.news_repository import NewsRepository
from src.domain.exceptions.news_exceptions import (
    NewsNotFoundException,
    UnauthorizedNewsAccessException
)
from src.config.app_config import AppSettings


class GetNewsShareDataUseCase:
    """Use case for getting news sharing data."""

    def __init__(
        self,
        news_repository: NewsRepository,
        app_settings: AppSettings
    ):
        """Initialize the use case with dependencies.

        Args:
            news_repository: The news repository
            app_settings: Application settings with frontend URL
        """
        self.news_repository = news_repository
        self.app_settings = app_settings

    async def execute(
        self,
        news_id: str,
        user_id: str
    ) -> dict:
        """Get sharing data for a news item.

        Args:
            news_id: The news item ID
            user_id: The requesting user ID (for access control)

        Returns:
            Dictionary with sharing data

        Raises:
            NewsNotFoundException: If news item doesn't exist
            UnauthorizedNewsAccessException: If user can't access the news
        """
        # Fetch the news item
        news_item = await self.news_repository.get_by_id(news_id)

        if not news_item:
            raise NewsNotFoundException(f"News item with ID {news_id} not found")

        # Check access permission (using existing domain method)
        if not news_item.can_be_accessed_by(user_id):
            raise UnauthorizedNewsAccessException(
                f"User {user_id} cannot access news item {news_id}"
            )

        # Generate canonical URL
        canonical_url = f"{self.app_settings.frontend_base_url}/news/{news_id}"

        # Truncate title if needed (Twitter limit: 280 chars)
        title = news_item.title[:277] + "..." if len(news_item.title) > 280 else news_item.title

        # Truncate summary if needed
        summary = news_item.summary[:197] + "..." if len(news_item.summary) > 200 else news_item.summary

        # Generate hashtags from category
        hashtags = self._generate_hashtags(news_item.category.value)

        return {
            "news_id": news_item.id,
            "title": title,
            "url": canonical_url,
            "summary": summary,
            "hashtags": hashtags
        }

    def _generate_hashtags(self, category: str) -> List[str]:
        """Generate relevant hashtags from news category.

        Args:
            category: The news category value

        Returns:
            List of hashtags (without # prefix)
        """
        # Category to hashtag mapping
        category_hashtags = {
            "general": ["News", "Tech"],
            "research": ["Research", "Science", "Innovation"],
            "product": ["Product", "Tech", "Launch"],
            "company": ["Business", "Company", "Tech"],
            "tutorial": ["Tutorial", "HowTo", "Tech"],
            "opinion": ["Opinion", "Tech", "Insights"]
        }

        return category_hashtags.get(category, ["News", "Tech"])[:3]
```

**Use Case Design Decisions:**

1. **Constructor Dependency Injection**: Follows the project's established pattern (see `CreateNewsUseCase`, `UpdateNewsStatusUseCase`)

2. **Single Public Method**: `execute()` is the only public method, maintaining consistency with other use cases

3. **Business Logic Location**: Title truncation and hashtag generation are business logic, so they belong in the use case, not the web layer

4. **Access Control**: Reuses the existing `can_be_accessed_by()` domain method, respecting the principle of leveraging domain logic

5. **Configuration Injection**: `AppSettings` is injected to avoid tight coupling to environment variables

6. **Exception Reuse**: Uses existing domain exceptions (`NewsNotFoundException`, `UnauthorizedNewsAccessException`)

**Why NOT create a domain method on NewsItem?**
- Sharing is an external concern (social media), not intrinsic to the news domain
- URL generation requires infrastructure knowledge (frontend URL)
- Use case layer is the appropriate place for orchestrating this cross-cutting concern

---

### 5. Maintaining Hexagonal Architecture Principles

#### Layer Responsibilities

**Domain Layer** (`src/domain/`)
- **No changes required**
- Existing `NewsItem` entity has `can_be_accessed_by()` method for access control
- Existing exceptions (`NewsNotFoundException`, `UnauthorizedNewsAccessException`) handle error cases
- Domain remains pure and framework-agnostic

**Application Layer** (`src/application/`)
- **New Use Case**: `GetNewsShareDataUseCase` orchestrates sharing data retrieval
- **Existing Port**: `NewsRepository` already has `get_by_id()` method needed
- **No new ports required**: Sharing doesn't require external service integration at this time

**Infrastructure Layer** (`src/infrastructure/`)
- **Adapters**: No changes to repository implementations
- **Web Layer**: New router endpoint, DTO, and dependency injection
- Clean separation: web concerns stay in web layer

#### Dependency Direction (Hexagonal Architecture Core Principle)

```
Web Layer (Router)
    ↓ depends on
Application Layer (Use Case)
    ↓ depends on
Domain Layer (Entities, Exceptions)

Infrastructure (Repository Adapter)
    ↑ implements
Application Layer (Repository Port)
```

**This implementation respects the dependency direction:**
- Router depends on use case (application layer)
- Use case depends on repository port (application layer)
- Use case depends on domain entities and exceptions
- Repository adapter implements the port
- No layer depends on infrastructure details

---

## Implementation Checklist

### Phase 1: Configuration Setup

- [ ] Add `FRONTEND_BASE_URL` to `.env.example` and `.env`
- [ ] Create `backend/src/config/app_config.py` with `AppSettings` class
- [ ] Add dependency injection function for `AppSettings` in `dependencies.py`

### Phase 2: Application Layer

- [ ] Create `backend/src/application/use_cases/news/get_news_share_data_use_case.py`
- [ ] Add import to `backend/src/application/use_cases/news/__init__.py`
- [ ] Write unit tests for the use case

### Phase 3: Infrastructure/Web Layer

- [ ] Add `NewsShareDataDTO` to `backend/src/infrastructure/web/dtos/news_dto.py`
- [ ] Add share data endpoint to `backend/src/infrastructure/web/routers/news.py`
- [ ] Add dependency injection for use case in router or `dependencies.py`
- [ ] Write integration tests for the endpoint

### Phase 4: Documentation

- [ ] Update API documentation (if using tools like Swagger/OpenAPI)
- [ ] Add example curl commands for testing

---

## Detailed File Changes

### 1. `backend/.env.example`

**Action: ADD**

```bash
# Existing environment variables...
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=
SECRET_KEY=
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
OPENAI_API_KEY=
LOGFIRE_TOKEN=
ENVIRONMENT=
SERVICE_NAME=

# Add this line:
FRONTEND_BASE_URL=http://localhost:5173
```

### 2. `backend/.env`

**Action: ADD**

```bash
# Add this line with your actual frontend URL
FRONTEND_BASE_URL=http://localhost:5173
```

### 3. `backend/src/config/app_config.py` (NEW FILE)

**Action: CREATE**

```python
"""Application configuration."""

from pydantic_settings import BaseSettings
from functools import lru_cache


class AppSettings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database
    mongodb_url: str = "mongodb://localhost:27017"
    database_name: str

    # Security
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    # Frontend
    frontend_base_url: str = "http://localhost:5173"

    # Observability
    logfire_token: str = ""
    environment: str = "development"
    service_name: str = "ecommerce-backend"

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_app_settings() -> AppSettings:
    """Get cached application settings instance.

    Returns:
        AppSettings instance loaded from environment
    """
    return AppSettings()
```

**Note:** This consolidates configuration that's currently scattered. Existing code can be migrated to use this over time, but for now it provides the `frontend_base_url`.

### 4. `backend/src/infrastructure/web/dtos/news_dto.py`

**Action: ADD to existing file**

Add these imports at the top:
```python
from typing import List
```

Add this class at the end of the file:

```python
class NewsShareDataDTO(BaseModel):
    """DTO for news item sharing data.

    This DTO provides formatted data specifically for sharing news items
    on social media platforms like Twitter.
    """

    news_id: str = Field(..., description="The news item ID")
    title: str = Field(
        ...,
        max_length=280,
        description="News title, truncated to fit Twitter's limit"
    )
    url: str = Field(
        ...,
        description="Canonical URL to the news item in the frontend app"
    )
    summary: str = Field(
        ...,
        max_length=200,
        description="Short summary suitable for social media"
    )
    hashtags: List[str] = Field(
        default_factory=list,
        max_items=3,
        description="Suggested hashtags based on category"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "news_id": "507f1f77bcf86cd799439011",
                "title": "New AI Breakthrough Announced",
                "url": "https://yourapp.com/news/507f1f77bcf86cd799439011",
                "summary": "Researchers have made a significant breakthrough in AI technology",
                "hashtags": ["AI", "Research", "Technology"]
            }
        }
```

### 5. `backend/src/application/use_cases/news/get_news_share_data_use_case.py` (NEW FILE)

**Action: CREATE**

```python
"""Get news share data use case."""

from typing import List

from src.application.ports.news_repository import NewsRepository
from src.domain.exceptions.news_exceptions import (
    NewsNotFoundException,
    UnauthorizedNewsAccessException,
)
from src.config.app_config import AppSettings


class GetNewsShareDataUseCase:
    """Use case for retrieving formatted news data for social media sharing.

    This use case orchestrates the retrieval of a news item and formats it
    appropriately for sharing on social media platforms, particularly Twitter.
    It handles access control, URL generation, and content formatting.
    """

    def __init__(
        self,
        news_repository: NewsRepository,
        app_settings: AppSettings,
    ):
        """Initialize the use case with dependencies.

        Args:
            news_repository: Repository for news data access
            app_settings: Application settings including frontend base URL
        """
        self.news_repository = news_repository
        self.app_settings = app_settings

    async def execute(
        self,
        news_id: str,
        user_id: str,
    ) -> dict:
        """Get formatted sharing data for a news item.

        This method retrieves a news item, validates the user's access,
        and returns formatted data suitable for social media sharing.

        Args:
            news_id: The ID of the news item to share
            user_id: The ID of the user requesting share data (for access control)

        Returns:
            Dictionary containing:
                - news_id: The news item ID
                - title: Formatted title (truncated if needed)
                - url: Canonical URL to the news item
                - summary: Short summary for sharing
                - hashtags: List of relevant hashtags

        Raises:
            NewsNotFoundException: If the news item doesn't exist
            UnauthorizedNewsAccessException: If the user cannot access the news item

        Example:
            >>> share_data = await use_case.execute(
            ...     news_id="123",
            ...     user_id="user456"
            ... )
            >>> print(share_data["url"])
            'https://yourapp.com/news/123'
        """
        # Retrieve the news item
        news_item = await self.news_repository.get_by_id(news_id)

        if not news_item:
            raise NewsNotFoundException(f"News item with ID {news_id} not found")

        # Verify access permission using domain logic
        if not news_item.can_be_accessed_by(user_id):
            raise UnauthorizedNewsAccessException(
                f"User {user_id} is not authorized to access news item {news_id}"
            )

        # Generate the canonical URL for the news item
        canonical_url = self._generate_canonical_url(news_id)

        # Format title for Twitter (280 character limit)
        formatted_title = self._format_title(news_item.title)

        # Format summary for sharing (keep it concise)
        formatted_summary = self._format_summary(news_item.summary)

        # Generate relevant hashtags based on category
        hashtags = self._generate_hashtags(news_item.category.value)

        return {
            "news_id": news_item.id,
            "title": formatted_title,
            "url": canonical_url,
            "summary": formatted_summary,
            "hashtags": hashtags,
        }

    def _generate_canonical_url(self, news_id: str) -> str:
        """Generate the canonical URL for a news item.

        Args:
            news_id: The news item ID

        Returns:
            Full URL to the news item in the frontend application

        Note:
            The frontend must have a route at /news/:id to handle these URLs
        """
        base_url = self.app_settings.frontend_base_url.rstrip("/")
        return f"{base_url}/news/{news_id}"

    def _format_title(self, title: str) -> str:
        """Format title for Twitter's character limit.

        Args:
            title: The original news title

        Returns:
            Title truncated to 277 chars with ellipsis if needed

        Note:
            Twitter limit is 280 chars, but we reserve 3 for "..."
        """
        max_length = 280
        if len(title) <= max_length:
            return title
        return title[:277] + "..."

    def _format_summary(self, summary: str) -> str:
        """Format summary for social media sharing.

        Args:
            summary: The original news summary

        Returns:
            Summary truncated to 197 chars with ellipsis if needed

        Note:
            Keep summary short to leave room for URL and hashtags in tweets
        """
        max_length = 200
        if len(summary) <= max_length:
            return summary
        return summary[:197] + "..."

    def _generate_hashtags(self, category: str) -> List[str]:
        """Generate relevant hashtags based on news category.

        Args:
            category: The news category value (e.g., "research", "product")

        Returns:
            List of 1-3 hashtags without the # prefix

        Note:
            Hashtags are returned without # so the frontend can format them
            as needed for different platforms (Twitter uses #, some don't)
        """
        # Map categories to relevant hashtags
        # Each category gets 2-3 hashtags, prioritized by relevance
        category_hashtags = {
            "general": ["News", "Tech"],
            "research": ["Research", "Science", "Innovation"],
            "product": ["Product", "Tech", "Launch"],
            "company": ["Business", "Company", "Tech"],
            "tutorial": ["Tutorial", "HowTo", "Tech"],
            "opinion": ["Opinion", "Tech", "Insights"],
        }

        # Default hashtags if category not found
        default_hashtags = ["News", "Tech"]

        hashtags = category_hashtags.get(category, default_hashtags)

        # Return maximum 3 hashtags (Twitter best practice)
        return hashtags[:3]
```

**Key Implementation Notes:**

1. **Private Helper Methods**: All formatting logic is in private methods for testability and clarity
2. **Explicit Error Messages**: Exceptions include context for debugging
3. **Comments**: Extensive docstrings for future maintainability
4. **Domain Logic Reuse**: Uses `news_item.can_be_accessed_by()` instead of reimplementing access control
5. **Configuration-Based URLs**: Uses injected settings instead of hardcoded values

### 6. `backend/src/application/use_cases/news/__init__.py`

**Action: MODIFY**

Add this import:

```python
from .get_news_share_data_use_case import GetNewsShareDataUseCase
```

And add to `__all__`:

```python
__all__ = [
    "CreateNewsUseCase",
    "GetUserNewsUseCase",
    "GetPublicNewsUseCase",
    "UpdateNewsStatusUseCase",
    "ToggleFavoriteUseCase",
    "GenerateAINewsUseCase",
    "DeleteNewsUseCase",
    "DeleteAllUserNewsUseCase",
    "GetNewsShareDataUseCase",  # Add this line
]
```

### 7. `backend/src/infrastructure/web/dependencies.py`

**Action: ADD**

Add these imports at the top:

```python
from src.config.app_config import get_app_settings, AppSettings
from src.application.use_cases.news.get_news_share_data_use_case import GetNewsShareDataUseCase
```

Add this dependency function (following the existing pattern):

```python
@lru_cache()
def get_app_settings_dependency() -> AppSettings:
    """Get application settings dependency.

    Returns:
        Cached application settings instance
    """
    return get_app_settings()


def get_news_share_data_use_case() -> GetNewsShareDataUseCase:
    """Get news share data use case.

    Returns:
        Initialized GetNewsShareDataUseCase with dependencies
    """
    return GetNewsShareDataUseCase(
        news_repository=get_news_repository(),
        app_settings=get_app_settings_dependency(),
    )
```

**Why lru_cache for settings but not for use case?**
- Settings are cacheable (they don't change during runtime)
- Use cases are cheap to instantiate and get fresh repository instances
- This follows the existing pattern in the codebase (see other use case dependencies)

### 8. `backend/src/infrastructure/web/routers/news.py`

**Action: ADD**

Add to imports at the top:

```python
from src.application.use_cases.news import GetNewsShareDataUseCase
from src.infrastructure.web.dtos.news_dto import NewsShareDataDTO
```

Add this endpoint (place it logically with other GET endpoints, perhaps after `get_public_news`):

```python
@router.get("/{news_id}/share-data", response_model=NewsShareDataDTO)
async def get_news_share_data(
    news_id: str,
    current_user: dict = Depends(get_current_active_user),
    use_case: GetNewsShareDataUseCase = Depends(get_news_share_data_use_case),
) -> NewsShareDataDTO:
    """Get formatted sharing data for a news item.

    This endpoint provides data specifically formatted for sharing news items
    on social media platforms, particularly Twitter. It returns a canonical URL
    to the news item, formatted title and summary, and relevant hashtags.

    The endpoint respects access control - users can only get share data for
    news items they have access to (their own news or public news).

    Args:
        news_id: The ID of the news item to get share data for
        current_user: The authenticated user (injected by auth dependency)
        use_case: The GetNewsShareDataUseCase instance (injected)

    Returns:
        NewsShareDataDTO with formatted sharing data

    Raises:
        HTTPException 404: If the news item doesn't exist
        HTTPException 403: If the user doesn't have access to the news item

    Example:
        GET /api/news/507f1f77bcf86cd799439011/share-data

        Response:
        {
            "news_id": "507f1f77bcf86cd799439011",
            "title": "New AI Breakthrough Announced",
            "url": "https://yourapp.com/news/507f1f77bcf86cd799439011",
            "summary": "Researchers have made a significant breakthrough...",
            "hashtags": ["AI", "Research", "Technology"]
        }
    """
    try:
        share_data = await use_case.execute(
            news_id=news_id,
            user_id=current_user["id"],
        )
        return NewsShareDataDTO(**share_data)
    except NewsNotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except UnauthorizedNewsAccessException as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        )
```

Add dependency injection function at the module level (following existing pattern):

```python
def get_news_share_data_use_case() -> GetNewsShareDataUseCase:
    """Get news share data use case."""
    from src.infrastructure.web.dependencies import (
        get_news_repository,
        get_app_settings_dependency,
    )
    return GetNewsShareDataUseCase(
        news_repository=get_news_repository(),
        app_settings=get_app_settings_dependency(),
    )
```

**Router Design Notes:**

1. **Follows Existing Pattern**: Matches the style of other endpoints (see `update_news_status`, `toggle_favorite`)
2. **Thin Controller**: Router only handles HTTP concerns (status codes, error mapping)
3. **Dependency Injection**: Use case injected via FastAPI's `Depends()`
4. **Authentication Required**: Uses `get_current_active_user` dependency
5. **Proper HTTP Status Codes**: 404 for not found, 403 for unauthorized
6. **Exception Mapping**: Domain exceptions cleanly mapped to HTTP exceptions

---

## Testing Strategy

### Unit Tests

#### Test File: `backend/tests/application/use_cases/news/test_get_news_share_data_use_case.py`

**Test Cases:**

1. **test_execute_success_with_public_news**
   - Mock repository to return a public news item
   - Verify canonical URL is generated correctly
   - Verify title and summary are returned as-is (not truncated)
   - Verify hashtags are generated based on category

2. **test_execute_success_with_private_news_owned_by_user**
   - Mock repository to return private news owned by requesting user
   - Verify access is granted
   - Verify share data is returned

3. **test_execute_success_with_long_title_truncation**
   - Mock news item with title > 280 chars
   - Verify title is truncated to 277 chars with "..."
   - Verify summary is truncated correctly

4. **test_execute_raises_not_found_for_nonexistent_news**
   - Mock repository to return None
   - Verify `NewsNotFoundException` is raised

5. **test_execute_raises_unauthorized_for_inaccessible_news**
   - Mock repository to return private news owned by different user
   - Verify `UnauthorizedNewsAccessException` is raised

6. **test_generate_hashtags_for_each_category**
   - Test hashtag generation for each `NewsCategory` enum value
   - Verify correct hashtags are returned
   - Verify max 3 hashtags

7. **test_canonical_url_generation_with_different_base_urls**
   - Test with trailing slash in base URL
   - Test without trailing slash
   - Verify correct URL format in both cases

**Example Test:**

```python
import pytest
from unittest.mock import AsyncMock, Mock

from src.application.use_cases.news.get_news_share_data_use_case import (
    GetNewsShareDataUseCase,
)
from src.domain.entities.news_item import NewsItem, NewsCategory, NewsStatus
from src.domain.exceptions.news_exceptions import (
    NewsNotFoundException,
    UnauthorizedNewsAccessException,
)
from src.config.app_config import AppSettings


@pytest.fixture
def mock_repository():
    """Create a mock news repository."""
    return AsyncMock()


@pytest.fixture
def mock_settings():
    """Create mock application settings."""
    settings = Mock(spec=AppSettings)
    settings.frontend_base_url = "https://example.com"
    return settings


@pytest.fixture
def use_case(mock_repository, mock_settings):
    """Create use case instance with mocks."""
    return GetNewsShareDataUseCase(
        news_repository=mock_repository,
        app_settings=mock_settings,
    )


@pytest.mark.asyncio
async def test_execute_success_with_public_news(use_case, mock_repository):
    """Test successful share data retrieval for public news."""
    # Arrange
    news_item = NewsItem(
        id="123",
        source="TechCrunch",
        title="Test News",
        summary="This is a test summary",
        link="https://original.com/article",
        image_url="https://original.com/image.jpg",
        category=NewsCategory.RESEARCH,
        user_id="owner123",
        is_public=True,
    )
    mock_repository.get_by_id.return_value = news_item

    # Act
    result = await use_case.execute(news_id="123", user_id="different_user")

    # Assert
    assert result["news_id"] == "123"
    assert result["title"] == "Test News"
    assert result["url"] == "https://example.com/news/123"
    assert result["summary"] == "This is a test summary"
    assert "Research" in result["hashtags"]
    mock_repository.get_by_id.assert_called_once_with("123")


@pytest.mark.asyncio
async def test_execute_raises_not_found(use_case, mock_repository):
    """Test that NewsNotFoundException is raised for non-existent news."""
    # Arrange
    mock_repository.get_by_id.return_value = None

    # Act & Assert
    with pytest.raises(NewsNotFoundException, match="News item with ID 123 not found"):
        await use_case.execute(news_id="123", user_id="user456")


@pytest.mark.asyncio
async def test_execute_raises_unauthorized(use_case, mock_repository):
    """Test that UnauthorizedNewsAccessException is raised for private news."""
    # Arrange
    news_item = NewsItem(
        id="123",
        source="TechCrunch",
        title="Private News",
        summary="Private summary",
        link="https://original.com/article",
        image_url="",
        category=NewsCategory.GENERAL,
        user_id="owner123",
        is_public=False,  # Private news
    )
    mock_repository.get_by_id.return_value = news_item

    # Act & Assert
    with pytest.raises(
        UnauthorizedNewsAccessException,
        match="User different_user is not authorized"
    ):
        await use_case.execute(news_id="123", user_id="different_user")


@pytest.mark.asyncio
async def test_title_truncation(use_case, mock_repository):
    """Test that long titles are properly truncated."""
    # Arrange
    long_title = "A" * 300  # Title longer than 280 chars
    news_item = NewsItem(
        id="123",
        source="TechCrunch",
        title=long_title,
        summary="Summary",
        link="https://original.com/article",
        image_url="",
        category=NewsCategory.GENERAL,
        user_id="user123",
        is_public=True,
    )
    mock_repository.get_by_id.return_value = news_item

    # Act
    result = await use_case.execute(news_id="123", user_id="user123")

    # Assert
    assert len(result["title"]) == 280
    assert result["title"].endswith("...")
    assert result["title"][:277] == "A" * 277


def test_generate_hashtags_for_research_category(use_case):
    """Test hashtag generation for research category."""
    # Act
    hashtags = use_case._generate_hashtags("research")

    # Assert
    assert len(hashtags) <= 3
    assert "Research" in hashtags
    assert "Science" in hashtags
```

### Integration Tests

#### Test File: `backend/tests/infrastructure/web/test_news_share_endpoints.py`

**Test Cases:**

1. **test_get_share_data_authenticated_user_public_news**
   - Create public news item in test database
   - Make authenticated GET request to `/api/news/{id}/share-data`
   - Verify 200 OK response
   - Verify response structure matches `NewsShareDataDTO`

2. **test_get_share_data_authenticated_user_own_private_news**
   - Create private news owned by test user
   - Make authenticated request as owner
   - Verify 200 OK and correct share data

3. **test_get_share_data_authenticated_user_others_private_news**
   - Create private news owned by user A
   - Make authenticated request as user B
   - Verify 403 Forbidden

4. **test_get_share_data_unauthenticated_user**
   - Make unauthenticated request
   - Verify 401 Unauthorized

5. **test_get_share_data_nonexistent_news_id**
   - Make authenticated request with invalid news ID
   - Verify 404 Not Found

**Example Integration Test:**

```python
import pytest
from fastapi import status
from httpx import AsyncClient

from src.domain.entities.news_item import NewsCategory


@pytest.mark.integration
@pytest.mark.asyncio
async def test_get_share_data_public_news(
    async_client: AsyncClient,
    test_user_token: str,
    test_public_news_item: dict,
):
    """Test getting share data for public news as authenticated user."""
    # Arrange
    news_id = test_public_news_item["id"]
    headers = {"Authorization": f"Bearer {test_user_token}"}

    # Act
    response = await async_client.get(
        f"/api/news/{news_id}/share-data",
        headers=headers,
    )

    # Assert
    assert response.status_code == status.HTTP_200_OK

    data = response.json()
    assert data["news_id"] == news_id
    assert "title" in data
    assert "url" in data
    assert data["url"].endswith(f"/news/{news_id}")
    assert "summary" in data
    assert "hashtags" in data
    assert isinstance(data["hashtags"], list)
    assert len(data["hashtags"]) <= 3


@pytest.mark.integration
@pytest.mark.asyncio
async def test_get_share_data_unauthorized_access(
    async_client: AsyncClient,
    test_user_token: str,
    test_another_users_private_news: dict,
):
    """Test that users cannot get share data for others' private news."""
    # Arrange
    news_id = test_another_users_private_news["id"]
    headers = {"Authorization": f"Bearer {test_user_token}"}

    # Act
    response = await async_client.get(
        f"/api/news/{news_id}/share-data",
        headers=headers,
    )

    # Assert
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert "not authorized" in response.json()["detail"].lower()
```

---

## Important Notes for Implementation

### 1. Frontend Route Requirement

**CRITICAL**: The frontend currently does NOT have a route for individual news items. The frontend team MUST add this route:

```typescript
// In frontend/src/App.tsx
<Route path="/news/:id" element={<NewsDetailPage />} />
```

This route must:
- Accept a news ID parameter
- Fetch the news item by ID
- Display the full news content
- Handle cases where news doesn't exist or user doesn't have access

**Why this is required:**
- The canonical URL generated by the backend points to `/news/{id}`
- Without this route, shared links will 404
- This is a frontend concern, but the backend assumes it will exist

### 2. Environment Variable Configuration

Update both `.env.example` and `.env`:

```bash
# Development
FRONTEND_BASE_URL=http://localhost:5173

# Production
FRONTEND_BASE_URL=https://yourapp.com
```

**Important**: The URL should NOT include trailing slashes. The use case handles this, but it's cleaner to store without.

### 3. No Database Schema Changes

**Advantage of this approach:**
- No migration required
- No risk of breaking existing data
- Works immediately with existing infrastructure

### 4. Future Enhancements (Out of Scope Now)

If sharing tracking becomes required later, here's how to add it:

**Option A: Separate ShareEvent Entity**
```python
@dataclass
class ShareEvent:
    news_id: str
    user_id: str
    platform: str  # "twitter", "facebook", etc.
    shared_at: datetime
    id: Optional[str] = None
```

**Option B: Add share_count to NewsItem**
```python
# In NewsItem entity, add:
share_count: int = 0

def increment_share_count(self) -> None:
    """Increment the share count."""
    self.share_count += 1
    self.updated_at = datetime.utcnow()
```

Both options maintain hexagonal architecture. Option A is preferred for separation of concerns.

### 5. Hashtag Customization

The hashtag mapping is currently hardcoded in the use case. If hashtags need to be customizable:

**Future Enhancement Options:**
1. Move hashtag mapping to configuration/database
2. Add hashtags field to NewsItem entity
3. Use AI to generate hashtags based on content

For now, hardcoded hashtags are sufficient and maintainable.

### 6. URL Validation

The `NewsShareDataDTO` validates that URLs are properly formatted. The use case generates URLs from a trusted source (configuration), so validation is primarily for documentation.

If custom URLs become a requirement, add validation logic to the use case.

### 7. Authentication

The endpoint requires authentication (`get_current_active_user` dependency). This ensures:
- Only authenticated users can get share data
- Access control works correctly (checking against user_id)
- No public sharing of private news metadata

**Design Decision**: We could make this endpoint public for public news, but that creates complexity. The frontend already has access to authenticated APIs, so requiring auth is simpler and more secure.

---

## Error Handling Summary

### Domain Exceptions → HTTP Status Codes

| Domain Exception | HTTP Status | Use Case |
|-----------------|-------------|----------|
| `NewsNotFoundException` | 404 Not Found | News ID doesn't exist |
| `UnauthorizedNewsAccessException` | 403 Forbidden | User can't access private news |
| `ValueError` (from entity validation) | 400 Bad Request | Invalid data (shouldn't happen in this flow) |

### Error Response Format

FastAPI automatically formats exceptions as:

```json
{
  "detail": "Error message here"
}
```

This matches the existing API error response format.

---

## API Documentation

### Endpoint: Get News Share Data

**URL**: `GET /api/news/{news_id}/share-data`

**Authentication**: Required (Bearer token)

**Path Parameters:**
- `news_id` (string, required): The ID of the news item

**Response**: `NewsShareDataDTO`

```json
{
  "news_id": "507f1f77bcf86cd799439011",
  "title": "New AI Breakthrough Announced",
  "url": "https://yourapp.com/news/507f1f77bcf86cd799439011",
  "summary": "Researchers have made a significant breakthrough in AI technology",
  "hashtags": ["AI", "Research", "Technology"]
}
```

**Status Codes:**
- `200 OK`: Share data retrieved successfully
- `401 Unauthorized`: No valid authentication token provided
- `403 Forbidden`: User doesn't have access to this news item
- `404 Not Found`: News item doesn't exist

**Example Request:**

```bash
curl -X GET \
  "http://localhost:8000/api/news/507f1f77bcf86cd799439011/share-data" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Example Success Response:**

```json
{
  "news_id": "507f1f77bcf86cd799439011",
  "title": "New AI Breakthrough Announced",
  "url": "http://localhost:5173/news/507f1f77bcf86cd799439011",
  "summary": "Researchers have made a significant breakthrough in AI technology",
  "hashtags": ["Research", "Science", "Innovation"]
}
```

**Example Error Response (404):**

```json
{
  "detail": "News item with ID invalid_id not found"
}
```

**Example Error Response (403):**

```json
{
  "detail": "User user123 is not authorized to access news item 507f1f77bcf86cd799439011"
}
```

---

## Implementation Timeline Estimate

**Total Estimated Time: 3-4 hours**

- **Configuration Setup**: 30 minutes
  - Create `app_config.py`
  - Update `.env` files
  - Add dependency injection

- **Application Layer**: 1 hour
  - Create `GetNewsShareDataUseCase`
  - Write comprehensive docstrings
  - Add to `__init__.py`

- **Infrastructure/Web Layer**: 1 hour
  - Add `NewsShareDataDTO`
  - Add router endpoint
  - Wire up dependencies

- **Unit Tests**: 1 hour
  - Test use case with various scenarios
  - Test hashtag generation
  - Test truncation logic

- **Integration Tests**: 30-45 minutes
  - Test endpoint with authentication
  - Test access control
  - Test error cases

---

## Summary

This implementation plan provides a **minimal, clean, and architecturally sound** solution for the share news feature:

### Key Strengths:

1. **Respects Hexagonal Architecture**: Clear separation of concerns across layers
2. **Minimal Changes**: No database schema changes, leverages existing code
3. **YAGNI Principle**: Doesn't implement tracking until it's actually needed
4. **Testable**: Use case has no framework dependencies, easy to unit test
5. **Maintainable**: Well-documented, follows project conventions
6. **Secure**: Proper authentication and access control
7. **Extensible**: Easy to add tracking later if needed

### What This Enables:

- Frontend can fetch share data for any news item the user has access to
- Share data includes properly formatted title, summary, and hashtags
- Canonical URLs point to the app, not the original article
- Twitter sharing will drive traffic to your app

### Critical Requirements for Frontend:

1. **MUST** add `/news/:id` route
2. **MUST** implement `NewsDetailPage` component
3. Use the provided share data to construct Twitter URLs
4. Handle Twitter handle input/storage

This implementation is **ready to build** and maintains the high code quality standards demonstrated in the existing codebase.
