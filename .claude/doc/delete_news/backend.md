# Delete News Feature - Backend Implementation Plan

## Executive Summary

This document provides a comprehensive implementation plan for the delete news feature following the project's hexagonal architecture pattern. The implementation includes individual news deletion and bulk deletion, with proper authorization, error handling, and MongoDB optimization.

## Architecture Analysis

### Current State Review

**Repository Port** (`backend/src/application/ports/news_repository.py`):
- Already has `delete(news_id: str) -> bool` method defined
- Missing: bulk delete method for efficient multi-item deletion

**Existing Use Case Patterns** (verified from codebase):
- Constructor dependency injection
- Single public `execute` method
- Authorization checks before repository operations
- Proper exception raising (NewsNotFoundException, UnauthorizedNewsAccessException)
- Repository update pattern after domain entity modification

**Router Patterns** (verified from `news.py`):
- Thin controllers delegating to use cases
- Domain exceptions mapped to HTTP status codes:
  - `NewsNotFoundException` -> 404 NOT FOUND
  - `UnauthorizedNewsAccessException` -> 403 FORBIDDEN
  - `ValueError` -> 400 BAD REQUEST
- Dependency injection using `Depends()` with factory functions
- Current user obtained via `get_current_active_user` dependency

## Implementation Plan

### Phase 1: Repository Layer Enhancement

#### 1.1 Add Bulk Delete Method to Repository Port

**File**: `backend/src/application/ports/news_repository.py`

Add the following method to the `NewsRepository` abstract class:

```python
@abstractmethod
async def delete_all_by_user_id(self, user_id: str) -> int:
    """Delete all news items for a specific user.

    Args:
        user_id: The user ID

    Returns:
        Count of deleted items
    """
    pass
```

**Rationale**:
- MongoDB supports efficient bulk deletion with `delete_many()` operation
- Single database query is much more efficient than iterating and deleting items one by one
- Follows repository pattern of abstracting data access layer
- Returns count for user feedback (e.g., "Deleted 15 items")

#### 1.2 Implement Bulk Delete in MongoDB Adapter

**File**: `backend/src/infrastructure/adapters/repositories/mongodb_news_repository.py`

Add the implementation after the existing `delete` method:

```python
async def delete_all_by_user_id(self, user_id: str) -> int:
    """Delete all news items for a specific user."""
    try:
        result = await self.collection.delete_many({"user_id": user_id})
        return result.deleted_count
    except Exception:
        return 0
```

**Important Notes**:
- Uses `delete_many()` with user_id filter for atomic bulk deletion
- Returns `deleted_count` from MongoDB result
- Exception handling returns 0 to indicate failure (consistent with existing `delete` method pattern)
- This is a hard delete operation (not soft delete)

### Phase 2: Application Layer - Use Cases

#### 2.1 Create DeleteNewsUseCase

**File**: `backend/src/application/use_cases/news/delete_news_use_case.py`

```python
"""Delete news use case."""

from src.application.ports.news_repository import NewsRepository
from src.domain.exceptions.news_exceptions import (
    NewsNotFoundException,
    UnauthorizedNewsAccessException
)


class DeleteNewsUseCase:
    """Use case for deleting a single news item."""

    def __init__(self, news_repository: NewsRepository):
        """Initialize the use case with repository.

        Args:
            news_repository: The news repository
        """
        self.news_repository = news_repository

    async def execute(
        self,
        news_id: str,
        user_id: str
    ) -> bool:
        """Delete a news item.

        Args:
            news_id: The news item ID to delete
            user_id: The user ID requesting deletion

        Returns:
            True if deleted successfully

        Raises:
            NewsNotFoundException: If news item not found
            UnauthorizedNewsAccessException: If user doesn't own the news
        """
        # Get the news item to verify existence and ownership
        news_item = await self.news_repository.get_by_id(news_id)
        if not news_item:
            raise NewsNotFoundException(news_id)

        # Check authorization - user must own the news item
        if news_item.user_id != user_id:
            raise UnauthorizedNewsAccessException(user_id, news_id)

        # Delete from repository
        return await self.news_repository.delete(news_id)
```

**Design Decisions**:
1. **Authorization First**: Verifies ownership before deletion to prevent unauthorized access
2. **Get Before Delete**: Retrieves item first to:
   - Verify existence (404 if not found)
   - Check ownership (403 if unauthorized)
   - Follow the principle: "fail fast with specific errors"
3. **Return Type**: Returns `bool` for simple success/failure indication
4. **Exception Handling**: Lets domain exceptions bubble up for proper HTTP mapping

**Security Considerations**:
- User can only delete their own news items
- Even if news is public, only owner can delete
- Two-step verification: existence + ownership

#### 2.2 Create DeleteAllUserNewsUseCase

**File**: `backend/src/application/use_cases/news/delete_all_user_news_use_case.py`

```python
"""Delete all user news use case."""

from src.application.ports.news_repository import NewsRepository


class DeleteAllUserNewsUseCase:
    """Use case for deleting all news items for a user."""

    def __init__(self, news_repository: NewsRepository):
        """Initialize the use case with repository.

        Args:
            news_repository: The news repository
        """
        self.news_repository = news_repository

    async def execute(self, user_id: str) -> int:
        """Delete all news items for a user.

        Args:
            user_id: The user ID

        Returns:
            Count of deleted items
        """
        # Delete all items for the user
        deleted_count = await self.news_repository.delete_all_by_user_id(user_id)
        return deleted_count
```

**Design Decisions**:
1. **Simplified Logic**: No authorization check needed - user can always delete their own items
2. **Single Repository Call**: Uses optimized bulk delete method
3. **Return Count**: Returns number of deleted items for user feedback
4. **No Exceptions**: Won't raise exceptions for empty results (returns 0)
5. **Idempotent**: Safe to call multiple times, even if no items exist

**Performance Considerations**:
- Single MongoDB query using `delete_many()`
- No iteration overhead
- Atomic operation at database level

#### 2.3 Update Use Cases __init__.py

**File**: `backend/src/application/use_cases/news/__init__.py`

Add imports:
```python
from .delete_news_use_case import DeleteNewsUseCase
from .delete_all_user_news_use_case import DeleteAllUserNewsUseCase
```

### Phase 3: Infrastructure Layer - Web Components

#### 3.1 Create Response DTO for Bulk Delete

**File**: `backend/src/infrastructure/web/dtos/news_dto.py`

Add this class after `NewsStatsResponseDTO`:

```python
class DeleteAllNewsResponseDTO(BaseModel):
    """DTO for delete all news response."""
    deleted_count: int
    message: str

    class Config:
        json_schema_extra = {
            "example": {
                "deleted_count": 15,
                "message": "Successfully deleted 15 news items"
            }
        }
```

**Rationale**:
- Provides clear feedback to user about operation result
- Includes both count and human-readable message
- Follows Pydantic validation pattern

#### 3.2 Add Dependency Injection Functions

**File**: `backend/src/infrastructure/web/routers/news.py`

Add these functions after the existing dependency functions (around line 63):

```python
def get_delete_news_use_case() -> DeleteNewsUseCase:
    """Get delete news use case."""
    from src.infrastructure.web.dependencies import get_news_repository
    return DeleteNewsUseCase(get_news_repository())


def get_delete_all_user_news_use_case() -> DeleteAllUserNewsUseCase:
    """Get delete all user news use case."""
    from src.infrastructure.web.dependencies import get_news_repository
    return DeleteAllUserNewsUseCase(get_news_repository())
```

**Important**: Update the imports at the top of the file:
```python
from src.application.use_cases.news import (
    CreateNewsUseCase,
    DeleteAllUserNewsUseCase,  # ADD THIS
    DeleteNewsUseCase,  # ADD THIS
    GetPublicNewsUseCase,
    GetUserNewsUseCase,
    ToggleFavoriteUseCase,
    UpdateNewsStatusUseCase,
)
```

And update the DTO imports:
```python
from src.infrastructure.web.dtos.news_dto import (
    CreateNewsRequestDTO,
    DeleteAllNewsResponseDTO,  # ADD THIS
    NewsCategoryDTO,
    NewsListResponseDTO,
    NewsResponseDTO,
    NewsStatsResponseDTO,
    NewsStatusDTO,
    UpdateNewsStatusRequestDTO,
)
```

#### 3.3 Add DELETE Endpoints

**File**: `backend/src/infrastructure/web/routers/news.py`

Add these endpoints at the end of the file (after the `/stats` endpoint):

```python
@router.delete("/{news_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_news(
    news_id: str,
    current_user: dict = Depends(get_current_active_user),
    use_case: DeleteNewsUseCase = Depends(get_delete_news_use_case),
) -> None:
    """Delete a news item.

    The user must own the news item to delete it.
    Returns 204 No Content on success.
    """
    try:
        await use_case.execute(
            news_id=news_id,
            user_id=current_user["id"],
        )
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


@router.delete("/user/all", response_model=DeleteAllNewsResponseDTO)
async def delete_all_user_news(
    current_user: dict = Depends(get_current_active_user),
    use_case: DeleteAllUserNewsUseCase = Depends(get_delete_all_user_news_use_case),
) -> DeleteAllNewsResponseDTO:
    """Delete all news items for the current user.

    This operation cannot be undone. Returns count of deleted items.
    """
    deleted_count = await use_case.execute(user_id=current_user["id"])

    message = f"Successfully deleted {deleted_count} news item"
    if deleted_count != 1:
        message += "s"

    return DeleteAllNewsResponseDTO(
        deleted_count=deleted_count,
        message=message
    )
```

**Endpoint Design Decisions**:

**DELETE /api/news/{news_id}**:
- **Status Code**: 204 No Content (standard for successful DELETE with no response body)
- **Return Type**: `None` (no content)
- **Authentication**: Required (current user)
- **Authorization**: Verified in use case
- **Error Codes**:
  - 404: News item not found
  - 403: User doesn't own the news item
  - 401: Not authenticated (handled by dependency)

**DELETE /api/news/user/all**:
- **Status Code**: 200 OK (has response body with count)
- **Return Type**: `DeleteAllNewsResponseDTO`
- **Path**: `/user/all` to clearly indicate scope (all user's items)
- **No Confirmation Here**: Confirmation should be in frontend (this is a design choice)
- **Idempotent**: Safe to call even if no items exist (returns count: 0)
- **Message**: Grammatically correct singular/plural handling

**Important Path Ordering**:
The specific path `/user/all` MUST come BEFORE the generic path `/{news_id}` in the router, otherwise FastAPI will treat "all" as a news_id. The current order in the implementation above is correct.

## Error Handling Strategy

### Domain Exceptions (Already Exist)

The following exceptions are already defined in `backend/src/domain/exceptions/news_exceptions.py`:

1. **NewsNotFoundException**: Raised when news item doesn't exist
   - Maps to: 404 NOT FOUND
   - Usage: Both delete endpoints

2. **UnauthorizedNewsAccessException**: Raised when user doesn't own news
   - Maps to: 403 FORBIDDEN
   - Usage: Single delete endpoint only

### Exception Flow

```
Use Case Layer (Business Logic)
    ↓ Raises domain exceptions
Web Layer (HTTP)
    ↓ Catches and maps to HTTP status codes
Client
    ↓ Receives appropriate error response
```

### No New Exceptions Needed

The existing domain exceptions cover all delete scenarios:
- Item not found: `NewsNotFoundException`
- Unauthorized access: `UnauthorizedNewsAccessException`
- No special exception needed for bulk delete (returns 0 count for empty results)

## Testing Strategy

### Unit Tests

**File**: `backend/tests/application/use_cases/news/test_delete_news_use_case.py`

Test cases needed:
1. `test_delete_news_success` - Successful deletion
2. `test_delete_news_not_found` - News item doesn't exist
3. `test_delete_news_unauthorized` - User doesn't own news
4. `test_delete_news_repository_failure` - Repository returns False

**File**: `backend/tests/application/use_cases/news/test_delete_all_user_news_use_case.py`

Test cases needed:
1. `test_delete_all_success` - Deletes multiple items
2. `test_delete_all_empty` - No items to delete (returns 0)
3. `test_delete_all_repository_failure` - Repository returns 0

### Integration Tests

**File**: `backend/tests/integration/test_news_api.py`

Test cases needed:
1. `test_delete_news_endpoint_success` - 204 response
2. `test_delete_news_endpoint_not_found` - 404 response
3. `test_delete_news_endpoint_unauthorized` - 403 response
4. `test_delete_news_endpoint_unauthenticated` - 401 response
5. `test_delete_all_news_endpoint_success` - Correct count returned
6. `test_delete_all_news_endpoint_empty` - 0 count for no items
7. `test_delete_all_news_endpoint_unauthenticated` - 401 response

### Repository Tests

**File**: `backend/tests/infrastructure/repositories/test_mongodb_news_repository.py`

Test cases needed:
1. `test_delete_success` - Returns True
2. `test_delete_not_found` - Returns False
3. `test_delete_all_by_user_id_multiple` - Deletes all user items
4. `test_delete_all_by_user_id_empty` - Returns 0 for no items
5. `test_delete_all_by_user_id_only_user_items` - Doesn't delete other users' items

## Security Considerations

### Authorization Model

1. **Individual Delete**:
   - User MUST own the news item
   - Public news items still require ownership to delete
   - Two-step verification: existence check + ownership check

2. **Bulk Delete**:
   - Only deletes items belonging to authenticated user
   - MongoDB query includes user_id filter
   - No risk of deleting other users' items

### Rate Limiting Recommendations

Consider adding rate limiting for bulk delete endpoint:
- Prevent abuse of bulk deletion
- Example: Max 5 bulk delete operations per hour per user
- Implementation: Use FastAPI middleware or external service (Redis)

### Audit Trail (Future Enhancement)

Current implementation is hard delete. Future considerations:
- Soft delete with `deleted_at` timestamp
- Audit log for compliance
- Retention policy for deleted items
- Restore functionality

## Performance Optimization

### MongoDB Operations

1. **Individual Delete**:
   - Two queries: `find_one()` + `delete_one()`
   - Uses indexed `_id` field (fast lookup)
   - Acceptable for single item operation

2. **Bulk Delete**:
   - Single query: `delete_many()`
   - Uses indexed `user_id` field
   - Atomic operation
   - Much more efficient than iteration

### Query Optimization

Current indexes (from repository):
```python
self.collection.create_index([("user_id", 1)])  # Used by bulk delete
self.collection.create_index([("link", 1), ("user_id", 1)], unique=True)
```

The `user_id` index will optimize the bulk delete operation.

### Frontend Optimization Recommendations

1. **Optimistic Updates**: Remove items from UI immediately, rollback on error
2. **Cache Invalidation**: React Query should invalidate relevant queries
3. **Batch Operations**: Consider debouncing if user rapidly deletes items

## API Documentation

### OpenAPI Schema

FastAPI will auto-generate documentation at `/docs`. The endpoints will appear as:

**DELETE /api/news/{news_id}**
```yaml
summary: Delete a news item
description: The user must own the news item to delete it. Returns 204 No Content on success.
parameters:
  - name: news_id
    in: path
    required: true
    schema:
      type: string
responses:
  204:
    description: Successfully deleted
  404:
    description: News item not found
  403:
    description: Not authorized to delete this news item
  401:
    description: Not authenticated
```

**DELETE /api/news/user/all**
```yaml
summary: Delete all news items for the current user
description: This operation cannot be undone. Returns count of deleted items.
responses:
  200:
    description: Successfully deleted
    content:
      application/json:
        schema:
          $ref: '#/components/schemas/DeleteAllNewsResponseDTO'
  401:
    description: Not authenticated
```

## Migration Considerations

### Database Migration

No database migration needed:
- No schema changes
- No new collections
- No index modifications
- Existing indexes support new operations

### Backward Compatibility

This feature is purely additive:
- No existing endpoints modified
- No breaking changes to DTOs
- No changes to domain entities
- Fully backward compatible

## Deployment Checklist

### Pre-deployment
- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] Repository tests passing
- [ ] Code review completed
- [ ] API documentation reviewed

### Post-deployment Verification
- [ ] Individual delete works in production
- [ ] Bulk delete works in production
- [ ] Authorization checks working
- [ ] Error responses correct
- [ ] Performance acceptable
- [ ] Monitoring/logging working

## Important Notes for Implementation

### Critical Path Ordering

When adding routes to `news.py`, the order MATTERS:

```python
# CORRECT ORDER - Specific routes BEFORE parameterized routes
@router.delete("/user/all", ...)  # MUST come first
@router.delete("/{news_id}", ...)  # Generic path comes after
```

If reversed, FastAPI will match "/user/all" to "/{news_id}" with news_id="all", causing errors.

### Dependency Injection Pattern

Follow the established pattern in the codebase:

```python
def get_use_case_name() -> UseCaseName:
    """Get use case description."""
    from src.infrastructure.web.dependencies import get_news_repository
    return UseCaseName(get_news_repository())
```

Do NOT use `@lru_cache()` on these functions - the repository factory (`get_news_repository()`) already uses caching.

### HTTP Status Codes

Follow REST conventions:
- **204 No Content**: Successful DELETE with no response body
- **200 OK**: Successful DELETE with response body (bulk delete)
- **404 Not Found**: Resource doesn't exist
- **403 Forbidden**: Resource exists but user lacks permission
- **401 Unauthorized**: User not authenticated

### Common Pitfalls to Avoid

1. **Don't** check authorization in the router - use cases handle it
2. **Don't** iterate through items for bulk delete - use `delete_many()`
3. **Don't** return deleted news item in response - it's deleted!
4. **Don't** forget to update imports in `__init__.py`
5. **Don't** add routes in wrong order (specific before generic)

## Summary

This implementation follows hexagonal architecture principles:

- **Domain Layer**: Reuses existing exceptions, no changes needed
- **Application Layer**: Two focused use cases with clear responsibilities
- **Infrastructure Layer**: MongoDB optimization with bulk delete, thin controllers

Key architectural decisions:
1. Add `delete_all_by_user_id` to repository port for efficiency
2. Separate use cases for single vs bulk operations
3. Authorization in use case, not router
4. Return count for bulk delete (user feedback)
5. 204 No Content for single delete (REST standard)
6. Hard delete (soft delete is future enhancement)

This design is:
- Secure (proper authorization)
- Efficient (optimized MongoDB queries)
- Testable (clear separation of concerns)
- Maintainable (follows established patterns)
- RESTful (proper HTTP semantics)
