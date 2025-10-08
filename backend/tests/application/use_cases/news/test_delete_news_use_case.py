"""Tests for DeleteNewsUseCase."""

import pytest
from unittest.mock import AsyncMock

from src.application.use_cases.news.delete_news_use_case import DeleteNewsUseCase
from src.domain.exceptions.news_exceptions import (
    NewsNotFoundException,
    UnauthorizedNewsAccessException,
)

pytestmark = pytest.mark.asyncio


@pytest.mark.service
@pytest.mark.unit
class TestDeleteNewsUseCase:
    """Test suite for DeleteNewsUseCase."""

    async def test_execute_deletes_news_successfully_when_user_owns_item(
        self, mock_news_repository, news_item_with_id
    ):
        """Test that execute deletes news successfully when user owns the item."""
        # Arrange
        news_id = news_item_with_id.id
        user_id = news_item_with_id.user_id

        mock_news_repository.get_by_id.return_value = news_item_with_id
        mock_news_repository.delete.return_value = True

        use_case = DeleteNewsUseCase(mock_news_repository)

        # Act
        result = await use_case.execute(news_id=news_id, user_id=user_id)

        # Assert
        assert result is True
        mock_news_repository.get_by_id.assert_called_once_with(news_id)
        mock_news_repository.delete.assert_called_once_with(news_id)

    async def test_execute_raises_news_not_found_exception_when_news_does_not_exist(
        self, mock_news_repository
    ):
        """Test that execute raises NewsNotFoundException when news item doesn't exist."""
        # Arrange
        news_id = "nonexistent_id"
        user_id = "user123"

        mock_news_repository.get_by_id.return_value = None

        use_case = DeleteNewsUseCase(mock_news_repository)

        # Act & Assert
        with pytest.raises(NewsNotFoundException) as exc_info:
            await use_case.execute(news_id=news_id, user_id=user_id)

        assert news_id in str(exc_info.value)
        mock_news_repository.get_by_id.assert_called_once_with(news_id)
        mock_news_repository.delete.assert_not_called()

    async def test_execute_raises_unauthorized_exception_when_user_does_not_own_news(
        self, mock_news_repository, news_item_with_id
    ):
        """Test that execute raises UnauthorizedNewsAccessException when user doesn't own the news."""
        # Arrange
        news_id = news_item_with_id.id
        user_id = "different_user_id"  # Different from news owner

        mock_news_repository.get_by_id.return_value = news_item_with_id

        use_case = DeleteNewsUseCase(mock_news_repository)

        # Act & Assert
        with pytest.raises(UnauthorizedNewsAccessException):
            await use_case.execute(news_id=news_id, user_id=user_id)

        mock_news_repository.get_by_id.assert_called_once_with(news_id)
        mock_news_repository.delete.assert_not_called()

    async def test_execute_raises_news_not_found_exception_when_repository_delete_fails(
        self, mock_news_repository, news_item_with_id
    ):
        """Test that execute raises NewsNotFoundException when repository delete returns False."""
        # Arrange
        news_id = news_item_with_id.id
        user_id = news_item_with_id.user_id

        mock_news_repository.get_by_id.return_value = news_item_with_id
        mock_news_repository.delete.return_value = False  # Simulates deletion failure

        use_case = DeleteNewsUseCase(mock_news_repository)

        # Act & Assert
        with pytest.raises(NewsNotFoundException) as exc_info:
            await use_case.execute(news_id=news_id, user_id=user_id)

        assert "Failed to delete" in str(exc_info.value)
        mock_news_repository.get_by_id.assert_called_once_with(news_id)
        mock_news_repository.delete.assert_called_once_with(news_id)

    async def test_execute_verifies_ownership_before_deletion(
        self, mock_news_repository, news_item_with_id
    ):
        """Test that execute verifies ownership before attempting deletion."""
        # Arrange
        news_id = news_item_with_id.id
        unauthorized_user_id = "unauthorized_user"

        mock_news_repository.get_by_id.return_value = news_item_with_id

        use_case = DeleteNewsUseCase(mock_news_repository)

        # Act & Assert
        with pytest.raises(UnauthorizedNewsAccessException):
            await use_case.execute(news_id=news_id, user_id=unauthorized_user_id)

        # Verify get_by_id was called to check ownership
        mock_news_repository.get_by_id.assert_called_once_with(news_id)
        # Verify delete was NOT called due to authorization failure
        mock_news_repository.delete.assert_not_called()

    async def test_execute_allows_owner_to_delete_public_news(
        self, mock_news_repository, public_news_item_with_id
    ):
        """Test that execute allows owner to delete their public news items."""
        # Arrange
        news_id = public_news_item_with_id.id
        user_id = public_news_item_with_id.user_id

        mock_news_repository.get_by_id.return_value = public_news_item_with_id
        mock_news_repository.delete.return_value = True

        use_case = DeleteNewsUseCase(mock_news_repository)

        # Act
        result = await use_case.execute(news_id=news_id, user_id=user_id)

        # Assert
        assert result is True
        assert public_news_item_with_id.is_public is True  # Verify it was public
        mock_news_repository.delete.assert_called_once_with(news_id)

    async def test_execute_prevents_other_users_from_deleting_public_news(
        self, mock_news_repository, public_news_item_with_id
    ):
        """Test that execute prevents non-owners from deleting public news items."""
        # Arrange
        news_id = public_news_item_with_id.id
        other_user_id = "other_user_id"

        mock_news_repository.get_by_id.return_value = public_news_item_with_id

        use_case = DeleteNewsUseCase(mock_news_repository)

        # Act & Assert
        with pytest.raises(UnauthorizedNewsAccessException):
            await use_case.execute(news_id=news_id, user_id=other_user_id)

        mock_news_repository.delete.assert_not_called()

    async def test_execute_propagates_repository_get_exceptions(
        self, mock_news_repository
    ):
        """Test that execute propagates exceptions from repository get operation."""
        # Arrange
        news_id = "test_id"
        user_id = "user123"
        repository_error = Exception("Database connection failed")

        mock_news_repository.get_by_id.side_effect = repository_error

        use_case = DeleteNewsUseCase(mock_news_repository)

        # Act & Assert
        with pytest.raises(Exception) as exc_info:
            await use_case.execute(news_id=news_id, user_id=user_id)

        assert str(exc_info.value) == "Database connection failed"
        mock_news_repository.delete.assert_not_called()

    @pytest.mark.parametrize("news_status", ["pending", "reading", "read"])
    async def test_execute_deletes_news_regardless_of_status(
        self, news_status, mock_news_repository, news_item_with_id
    ):
        """Test that execute deletes news items regardless of their status."""
        # Arrange
        from src.domain.entities.news_item import NewsStatus

        news_item_with_id.status = NewsStatus(news_status)
        news_id = news_item_with_id.id
        user_id = news_item_with_id.user_id

        mock_news_repository.get_by_id.return_value = news_item_with_id
        mock_news_repository.delete.return_value = True

        use_case = DeleteNewsUseCase(mock_news_repository)

        # Act
        result = await use_case.execute(news_id=news_id, user_id=user_id)

        # Assert
        assert result is True
        mock_news_repository.delete.assert_called_once_with(news_id)

    async def test_execute_deletes_favorite_news_items(
        self, mock_news_repository, favorite_news_item_with_id
    ):
        """Test that execute successfully deletes favorite news items."""
        # Arrange
        news_id = favorite_news_item_with_id.id
        user_id = favorite_news_item_with_id.user_id

        mock_news_repository.get_by_id.return_value = favorite_news_item_with_id
        mock_news_repository.delete.return_value = True

        use_case = DeleteNewsUseCase(mock_news_repository)

        # Act
        result = await use_case.execute(news_id=news_id, user_id=user_id)

        # Assert
        assert result is True
        assert favorite_news_item_with_id.is_favorite is True
        mock_news_repository.delete.assert_called_once_with(news_id)

    async def test_execute_with_empty_news_id_raises_not_found(
        self, mock_news_repository
    ):
        """Test that execute handles empty news_id appropriately."""
        # Arrange
        news_id = ""
        user_id = "user123"

        mock_news_repository.get_by_id.return_value = None

        use_case = DeleteNewsUseCase(mock_news_repository)

        # Act & Assert
        with pytest.raises(NewsNotFoundException):
            await use_case.execute(news_id=news_id, user_id=user_id)

        mock_news_repository.get_by_id.assert_called_once_with(news_id)
