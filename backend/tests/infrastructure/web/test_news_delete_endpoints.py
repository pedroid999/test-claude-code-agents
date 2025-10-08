"""Tests for News delete router endpoints."""

import pytest
from unittest.mock import AsyncMock, patch
from fastapi import status
from fastapi.testclient import TestClient

from src.domain.exceptions.news_exceptions import (
    NewsNotFoundException,
    UnauthorizedNewsAccessException,
)


@pytest.fixture
def test_app():
    """Create FastAPI test application with news router."""
    from fastapi import FastAPI
    from src.infrastructure.web.routers.news import router

    app = FastAPI()
    app.include_router(router)
    return app


@pytest.fixture
def client(test_app):
    """Create test client."""
    return TestClient(test_app)


@pytest.fixture
def mock_current_user():
    """Mock authenticated current user."""
    return {
        "id": "user123",
        "email": "test@example.com",
        "username": "testuser",
    }


@pytest.fixture
def other_user():
    """Mock another user for authorization tests."""
    return {
        "id": "other_user_id",
        "email": "other@example.com",
        "username": "otheruser",
    }


@pytest.mark.api
@pytest.mark.unit
class TestDeleteNewsEndpoint:
    """Test suite for DELETE /api/news/{news_id} endpoint."""

    def test_delete_news_returns_204_on_successful_deletion(
        self, test_app, mock_current_user, news_item_with_id
    ):
        """Test that deleting a news item returns 204 No Content."""
        # Arrange
        from src.infrastructure.web.routers.news import (
            get_delete_news_use_case,
        )
        from src.infrastructure.web.dependencies import get_current_active_user

        news_id = news_item_with_id.id

        mock_use_case = AsyncMock()
        mock_use_case.execute.return_value = True

        # Override dependencies
        test_app.dependency_overrides[get_delete_news_use_case] = (
            lambda: mock_use_case
        )
        test_app.dependency_overrides[get_current_active_user] = (
            lambda: mock_current_user
        )

        client = TestClient(test_app)

        # Act
        response = client.delete(f"/api/news/{news_id}")

        # Assert
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert response.text == ""  # No content in response body

        mock_use_case.execute.assert_called_once_with(
            news_id=news_id,
            user_id=mock_current_user["id"],
        )

    def test_delete_news_returns_404_when_news_not_found(
        self, test_app, mock_current_user
    ):
        """Test that deleting non-existent news returns 404."""
        # Arrange
        from src.infrastructure.web.routers.news import (
            get_delete_news_use_case,
        )
        from src.infrastructure.web.dependencies import get_current_active_user

        news_id = "nonexistent_id"

        mock_use_case = AsyncMock()
        mock_use_case.execute.side_effect = NewsNotFoundException(news_id)

        test_app.dependency_overrides[get_delete_news_use_case] = (
            lambda: mock_use_case
        )
        test_app.dependency_overrides[get_current_active_user] = (
            lambda: mock_current_user
        )

        client = TestClient(test_app)

        # Act
        response = client.delete(f"/api/news/{news_id}")

        # Assert
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert "not found" in response.json()["detail"].lower()

    def test_delete_news_returns_403_when_user_not_authorized(
        self, test_app, mock_current_user, news_item_with_id
    ):
        """Test that deleting another user's news returns 403."""
        # Arrange
        from src.infrastructure.web.routers.news import (
            get_delete_news_use_case,
        )
        from src.infrastructure.web.dependencies import get_current_active_user

        news_id = news_item_with_id.id

        mock_use_case = AsyncMock()
        mock_use_case.execute.side_effect = UnauthorizedNewsAccessException(
            mock_current_user["id"], news_id
        )

        test_app.dependency_overrides[get_delete_news_use_case] = (
            lambda: mock_use_case
        )
        test_app.dependency_overrides[get_current_active_user] = (
            lambda: mock_current_user
        )

        client = TestClient(test_app)

        # Act
        response = client.delete(f"/api/news/{news_id}")

        # Assert
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert "not authorized" in response.json()["detail"].lower()

    def test_delete_news_returns_401_when_not_authenticated(
        self, test_app, news_item_with_id
    ):
        """Test that deleting news without authentication returns 401."""
        # Arrange
        from src.infrastructure.web.dependencies import get_current_active_user
        from fastapi import HTTPException

        news_id = news_item_with_id.id

        # Mock authentication to raise 401
        def mock_get_current_user():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated",
            )

        test_app.dependency_overrides[get_current_active_user] = (
            mock_get_current_user
        )

        client = TestClient(test_app)

        # Act
        response = client.delete(f"/api/news/{news_id}")

        # Assert
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_delete_news_calls_use_case_with_correct_parameters(
        self, test_app, mock_current_user, news_item_with_id
    ):
        """Test that delete endpoint passes correct parameters to use case."""
        # Arrange
        from src.infrastructure.web.routers.news import (
            get_delete_news_use_case,
        )
        from src.infrastructure.web.dependencies import get_current_active_user

        news_id = news_item_with_id.id
        user_id = mock_current_user["id"]

        mock_use_case = AsyncMock()
        mock_use_case.execute.return_value = True

        test_app.dependency_overrides[get_delete_news_use_case] = (
            lambda: mock_use_case
        )
        test_app.dependency_overrides[get_current_active_user] = (
            lambda: mock_current_user
        )

        client = TestClient(test_app)

        # Act
        client.delete(f"/api/news/{news_id}")

        # Assert
        mock_use_case.execute.assert_called_once_with(
            news_id=news_id,
            user_id=user_id,
        )

    def test_delete_news_handles_invalid_news_id_format(
        self, test_app, mock_current_user
    ):
        """Test that delete handles invalid news ID format gracefully."""
        # Arrange
        from src.infrastructure.web.routers.news import (
            get_delete_news_use_case,
        )
        from src.infrastructure.web.dependencies import get_current_active_user

        invalid_news_id = "invalid_format"

        mock_use_case = AsyncMock()
        mock_use_case.execute.side_effect = NewsNotFoundException(invalid_news_id)

        test_app.dependency_overrides[get_delete_news_use_case] = (
            lambda: mock_use_case
        )
        test_app.dependency_overrides[get_current_active_user] = (
            lambda: mock_current_user
        )

        client = TestClient(test_app)

        # Act
        response = client.delete(f"/api/news/{invalid_news_id}")

        # Assert
        assert response.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.parametrize(
        "status_value",
        ["pending", "reading", "read"],
    )
    def test_delete_news_works_for_all_statuses(
        self, status_value, test_app, mock_current_user, news_item_with_id
    ):
        """Test that delete works regardless of news status."""
        # Arrange
        from src.infrastructure.web.routers.news import (
            get_delete_news_use_case,
        )
        from src.infrastructure.web.dependencies import get_current_active_user

        news_id = news_item_with_id.id

        mock_use_case = AsyncMock()
        mock_use_case.execute.return_value = True

        test_app.dependency_overrides[get_delete_news_use_case] = (
            lambda: mock_use_case
        )
        test_app.dependency_overrides[get_current_active_user] = (
            lambda: mock_current_user
        )

        client = TestClient(test_app)

        # Act
        response = client.delete(f"/api/news/{news_id}")

        # Assert
        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_delete_news_allows_deletion_of_favorite_items(
        self, test_app, mock_current_user, favorite_news_item_with_id
    ):
        """Test that favorite news items can be deleted."""
        # Arrange
        from src.infrastructure.web.routers.news import (
            get_delete_news_use_case,
        )
        from src.infrastructure.web.dependencies import get_current_active_user

        news_id = favorite_news_item_with_id.id

        mock_use_case = AsyncMock()
        mock_use_case.execute.return_value = True

        test_app.dependency_overrides[get_delete_news_use_case] = (
            lambda: mock_use_case
        )
        test_app.dependency_overrides[get_current_active_user] = (
            lambda: mock_current_user
        )

        client = TestClient(test_app)

        # Act
        response = client.delete(f"/api/news/{news_id}")

        # Assert
        assert response.status_code == status.HTTP_204_NO_CONTENT


@pytest.mark.api
@pytest.mark.unit
class TestDeleteAllUserNewsEndpoint:
    """Test suite for DELETE /api/news/user/all endpoint."""

    def test_delete_all_news_returns_200_with_count(
        self, test_app, mock_current_user
    ):
        """Test that deleting all news returns 200 with deleted count."""
        # Arrange
        from src.infrastructure.web.routers.news import (
            get_delete_all_user_news_use_case,
        )
        from src.infrastructure.web.dependencies import get_current_active_user

        expected_count = 15

        mock_use_case = AsyncMock()
        mock_use_case.execute.return_value = expected_count

        test_app.dependency_overrides[get_delete_all_user_news_use_case] = (
            lambda: mock_use_case
        )
        test_app.dependency_overrides[get_current_active_user] = (
            lambda: mock_current_user
        )

        client = TestClient(test_app)

        # Act
        response = client.delete("/api/news/user/all")

        # Assert
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["deleted_count"] == expected_count
        assert "message" in data
        assert str(expected_count) in data["message"]

        mock_use_case.execute.assert_called_once_with(
            user_id=mock_current_user["id"]
        )

    def test_delete_all_news_returns_zero_when_no_items(
        self, test_app, mock_current_user
    ):
        """Test that deleting all news with no items returns 0 count."""
        # Arrange
        from src.infrastructure.web.routers.news import (
            get_delete_all_user_news_use_case,
        )
        from src.infrastructure.web.dependencies import get_current_active_user

        mock_use_case = AsyncMock()
        mock_use_case.execute.return_value = 0

        test_app.dependency_overrides[get_delete_all_user_news_use_case] = (
            lambda: mock_use_case
        )
        test_app.dependency_overrides[get_current_active_user] = (
            lambda: mock_current_user
        )

        client = TestClient(test_app)

        # Act
        response = client.delete("/api/news/user/all")

        # Assert
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["deleted_count"] == 0

    def test_delete_all_news_returns_401_when_not_authenticated(
        self, test_app
    ):
        """Test that deleting all news without authentication returns 401."""
        # Arrange
        from src.infrastructure.web.dependencies import get_current_active_user
        from fastapi import HTTPException

        def mock_get_current_user():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated",
            )

        test_app.dependency_overrides[get_current_active_user] = (
            mock_get_current_user
        )

        client = TestClient(test_app)

        # Act
        response = client.delete("/api/news/user/all")

        # Assert
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_delete_all_news_message_uses_singular_for_one_item(
        self, test_app, mock_current_user
    ):
        """Test that message uses singular 'item' when count is 1."""
        # Arrange
        from src.infrastructure.web.routers.news import (
            get_delete_all_user_news_use_case,
        )
        from src.infrastructure.web.dependencies import get_current_active_user

        mock_use_case = AsyncMock()
        mock_use_case.execute.return_value = 1

        test_app.dependency_overrides[get_delete_all_user_news_use_case] = (
            lambda: mock_use_case
        )
        test_app.dependency_overrides[get_current_active_user] = (
            lambda: mock_current_user
        )

        client = TestClient(test_app)

        # Act
        response = client.delete("/api/news/user/all")

        # Assert
        data = response.json()
        assert data["deleted_count"] == 1
        # Message should say "item" not "items" for singular
        assert "1 news item" in data["message"]

    def test_delete_all_news_message_uses_plural_for_multiple_items(
        self, test_app, mock_current_user
    ):
        """Test that message uses plural 'items' when count is not 1."""
        # Arrange
        from src.infrastructure.web.routers.news import (
            get_delete_all_user_news_use_case,
        )
        from src.infrastructure.web.dependencies import get_current_active_user

        mock_use_case = AsyncMock()
        mock_use_case.execute.return_value = 5

        test_app.dependency_overrides[get_delete_all_user_news_use_case] = (
            lambda: mock_use_case
        )
        test_app.dependency_overrides[get_current_active_user] = (
            lambda: mock_current_user
        )

        client = TestClient(test_app)

        # Act
        response = client.delete("/api/news/user/all")

        # Assert
        data = response.json()
        assert data["deleted_count"] == 5
        assert "5 news items" in data["message"]

    def test_delete_all_news_only_deletes_current_user_items(
        self, test_app, mock_current_user
    ):
        """Test that delete all only affects current user's items."""
        # Arrange
        from src.infrastructure.web.routers.news import (
            get_delete_all_user_news_use_case,
        )
        from src.infrastructure.web.dependencies import get_current_active_user

        mock_use_case = AsyncMock()
        mock_use_case.execute.return_value = 10

        test_app.dependency_overrides[get_delete_all_user_news_use_case] = (
            lambda: mock_use_case
        )
        test_app.dependency_overrides[get_current_active_user] = (
            lambda: mock_current_user
        )

        client = TestClient(test_app)

        # Act
        client.delete("/api/news/user/all")

        # Assert
        # Verify use case called with correct user_id
        mock_use_case.execute.assert_called_once_with(
            user_id=mock_current_user["id"]
        )

    def test_delete_all_news_is_idempotent(
        self, test_app, mock_current_user
    ):
        """Test that calling delete all multiple times is safe."""
        # Arrange
        from src.infrastructure.web.routers.news import (
            get_delete_all_user_news_use_case,
        )
        from src.infrastructure.web.dependencies import get_current_active_user

        mock_use_case = AsyncMock()
        # First call deletes items, subsequent calls return 0
        mock_use_case.execute.side_effect = [10, 0, 0]

        test_app.dependency_overrides[get_delete_all_user_news_use_case] = (
            lambda: mock_use_case
        )
        test_app.dependency_overrides[get_current_active_user] = (
            lambda: mock_current_user
        )

        client = TestClient(test_app)

        # Act
        response1 = client.delete("/api/news/user/all")
        response2 = client.delete("/api/news/user/all")
        response3 = client.delete("/api/news/user/all")

        # Assert
        assert response1.status_code == status.HTTP_200_OK
        assert response1.json()["deleted_count"] == 10

        assert response2.status_code == status.HTTP_200_OK
        assert response2.json()["deleted_count"] == 0

        assert response3.status_code == status.HTTP_200_OK
        assert response3.json()["deleted_count"] == 0

    @pytest.mark.parametrize("deleted_count", [0, 1, 5, 10, 50, 100])
    def test_delete_all_news_with_various_counts(
        self, deleted_count, test_app, mock_current_user
    ):
        """Test that delete all correctly handles various deletion counts."""
        # Arrange
        from src.infrastructure.web.routers.news import (
            get_delete_all_user_news_use_case,
        )
        from src.infrastructure.web.dependencies import get_current_active_user

        mock_use_case = AsyncMock()
        mock_use_case.execute.return_value = deleted_count

        test_app.dependency_overrides[get_delete_all_user_news_use_case] = (
            lambda: mock_use_case
        )
        test_app.dependency_overrides[get_current_active_user] = (
            lambda: mock_current_user
        )

        client = TestClient(test_app)

        # Act
        response = client.delete("/api/news/user/all")

        # Assert
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["deleted_count"] == deleted_count
        assert str(deleted_count) in data["message"]

    def test_delete_all_news_response_has_correct_schema(
        self, test_app, mock_current_user
    ):
        """Test that delete all response matches DeleteAllNewsResponseDTO."""
        # Arrange
        from src.infrastructure.web.routers.news import (
            get_delete_all_user_news_use_case,
        )
        from src.infrastructure.web.dependencies import get_current_active_user

        mock_use_case = AsyncMock()
        mock_use_case.execute.return_value = 7

        test_app.dependency_overrides[get_delete_all_user_news_use_case] = (
            lambda: mock_use_case
        )
        test_app.dependency_overrides[get_current_active_user] = (
            lambda: mock_current_user
        )

        client = TestClient(test_app)

        # Act
        response = client.delete("/api/news/user/all")

        # Assert
        data = response.json()
        assert "deleted_count" in data
        assert "message" in data
        assert isinstance(data["deleted_count"], int)
        assert isinstance(data["message"], str)


@pytest.mark.api
@pytest.mark.unit
class TestDeleteNewsRouteOrdering:
    """Test suite for verifying correct route ordering."""

    def test_specific_route_user_all_not_matched_as_news_id(
        self, test_app, mock_current_user
    ):
        """Test that /user/all is not matched by /{news_id} route."""
        # Arrange
        from src.infrastructure.web.routers.news import (
            get_delete_all_user_news_use_case,
        )
        from src.infrastructure.web.dependencies import get_current_active_user

        mock_delete_all_use_case = AsyncMock()
        mock_delete_all_use_case.execute.return_value = 5

        test_app.dependency_overrides[get_delete_all_user_news_use_case] = (
            lambda: mock_delete_all_use_case
        )
        test_app.dependency_overrides[get_current_active_user] = (
            lambda: mock_current_user
        )

        client = TestClient(test_app)

        # Act
        response = client.delete("/api/news/user/all")

        # Assert
        assert response.status_code == status.HTTP_200_OK
        # Should return DeleteAllNewsResponseDTO, not try to delete news with id="all"
        data = response.json()
        assert "deleted_count" in data
        assert "message" in data

    def test_generic_news_id_route_works_with_valid_id(
        self, test_app, mock_current_user
    ):
        """Test that /{news_id} route works for actual news IDs."""
        # Arrange
        from src.infrastructure.web.routers.news import (
            get_delete_news_use_case,
        )
        from src.infrastructure.web.dependencies import get_current_active_user

        news_id = "60f1f77bcf86cd799439011"

        mock_delete_use_case = AsyncMock()
        mock_delete_use_case.execute.return_value = True

        test_app.dependency_overrides[get_delete_news_use_case] = (
            lambda: mock_delete_use_case
        )
        test_app.dependency_overrides[get_current_active_user] = (
            lambda: mock_current_user
        )

        client = TestClient(test_app)

        # Act
        response = client.delete(f"/api/news/{news_id}")

        # Assert
        assert response.status_code == status.HTTP_204_NO_CONTENT
        # Should call delete news use case, not delete all
        mock_delete_use_case.execute.assert_called_once_with(
            news_id=news_id,
            user_id=mock_current_user["id"],
        )
