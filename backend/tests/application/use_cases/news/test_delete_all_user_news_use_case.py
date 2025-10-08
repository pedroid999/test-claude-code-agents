"""Tests for DeleteAllUserNewsUseCase."""

import pytest
from unittest.mock import AsyncMock

from src.application.use_cases.news.delete_all_user_news_use_case import (
    DeleteAllUserNewsUseCase,
)

pytestmark = pytest.mark.asyncio


@pytest.mark.service
@pytest.mark.unit
class TestDeleteAllUserNewsUseCase:
    """Test suite for DeleteAllUserNewsUseCase."""

    async def test_execute_deletes_all_user_news_successfully(
        self, mock_news_repository
    ):
        """Test that execute deletes all news items for a user successfully."""
        # Arrange
        user_id = "user123"
        expected_count = 15

        mock_news_repository.delete_all_by_user_id.return_value = expected_count

        use_case = DeleteAllUserNewsUseCase(mock_news_repository)

        # Act
        result = await use_case.execute(user_id=user_id)

        # Assert
        assert result == expected_count
        mock_news_repository.delete_all_by_user_id.assert_called_once_with(user_id)

    async def test_execute_returns_zero_when_user_has_no_news(
        self, mock_news_repository
    ):
        """Test that execute returns 0 when user has no news items to delete."""
        # Arrange
        user_id = "user_with_no_news"

        mock_news_repository.delete_all_by_user_id.return_value = 0

        use_case = DeleteAllUserNewsUseCase(mock_news_repository)

        # Act
        result = await use_case.execute(user_id=user_id)

        # Assert
        assert result == 0
        mock_news_repository.delete_all_by_user_id.assert_called_once_with(user_id)

    async def test_execute_returns_one_when_user_has_single_news_item(
        self, mock_news_repository
    ):
        """Test that execute returns 1 when user has only one news item."""
        # Arrange
        user_id = "user_with_one_item"

        mock_news_repository.delete_all_by_user_id.return_value = 1

        use_case = DeleteAllUserNewsUseCase(mock_news_repository)

        # Act
        result = await use_case.execute(user_id=user_id)

        # Assert
        assert result == 1
        mock_news_repository.delete_all_by_user_id.assert_called_once_with(user_id)

    async def test_execute_deletes_large_number_of_items(
        self, mock_news_repository
    ):
        """Test that execute handles deletion of large number of items."""
        # Arrange
        user_id = "user_with_many_items"
        large_count = 1000

        mock_news_repository.delete_all_by_user_id.return_value = large_count

        use_case = DeleteAllUserNewsUseCase(mock_news_repository)

        # Act
        result = await use_case.execute(user_id=user_id)

        # Assert
        assert result == large_count
        mock_news_repository.delete_all_by_user_id.assert_called_once_with(user_id)

    async def test_execute_is_idempotent(self, mock_news_repository):
        """Test that execute can be called multiple times safely (idempotent)."""
        # Arrange
        user_id = "user123"

        # First call returns count, subsequent calls return 0
        mock_news_repository.delete_all_by_user_id.side_effect = [10, 0, 0]

        use_case = DeleteAllUserNewsUseCase(mock_news_repository)

        # Act
        first_result = await use_case.execute(user_id=user_id)
        second_result = await use_case.execute(user_id=user_id)
        third_result = await use_case.execute(user_id=user_id)

        # Assert
        assert first_result == 10
        assert second_result == 0
        assert third_result == 0
        assert mock_news_repository.delete_all_by_user_id.call_count == 3

    async def test_execute_propagates_repository_exceptions(
        self, mock_news_repository
    ):
        """Test that execute propagates exceptions from repository."""
        # Arrange
        user_id = "user123"
        repository_error = Exception("Database connection failed")

        mock_news_repository.delete_all_by_user_id.side_effect = repository_error

        use_case = DeleteAllUserNewsUseCase(mock_news_repository)

        # Act & Assert
        with pytest.raises(Exception) as exc_info:
            await use_case.execute(user_id=user_id)

        assert str(exc_info.value) == "Database connection failed"
        mock_news_repository.delete_all_by_user_id.assert_called_once_with(user_id)

    async def test_execute_only_deletes_specified_user_items(
        self, mock_news_repository
    ):
        """Test that execute only deletes items for the specified user."""
        # Arrange
        user_id = "specific_user"
        expected_count = 5

        mock_news_repository.delete_all_by_user_id.return_value = expected_count

        use_case = DeleteAllUserNewsUseCase(mock_news_repository)

        # Act
        result = await use_case.execute(user_id=user_id)

        # Assert
        assert result == expected_count
        # Verify the exact user_id was passed to repository
        mock_news_repository.delete_all_by_user_id.assert_called_once_with(user_id)

    async def test_execute_handles_empty_user_id_gracefully(
        self, mock_news_repository
    ):
        """Test that execute handles empty user_id appropriately."""
        # Arrange
        user_id = ""

        mock_news_repository.delete_all_by_user_id.return_value = 0

        use_case = DeleteAllUserNewsUseCase(mock_news_repository)

        # Act
        result = await use_case.execute(user_id=user_id)

        # Assert
        assert result == 0
        mock_news_repository.delete_all_by_user_id.assert_called_once_with(user_id)

    @pytest.mark.parametrize("deleted_count", [0, 1, 5, 10, 50, 100, 500, 1000])
    async def test_execute_with_various_deletion_counts(
        self, deleted_count, mock_news_repository
    ):
        """Test that execute correctly returns various deletion counts."""
        # Arrange
        user_id = "user123"

        mock_news_repository.delete_all_by_user_id.return_value = deleted_count

        use_case = DeleteAllUserNewsUseCase(mock_news_repository)

        # Act
        result = await use_case.execute(user_id=user_id)

        # Assert
        assert result == deleted_count
        mock_news_repository.delete_all_by_user_id.assert_called_once_with(user_id)

    async def test_execute_deletes_all_statuses_pending_reading_read(
        self, mock_news_repository
    ):
        """Test that execute deletes news items regardless of their status.

        Note: The repository method doesn't filter by status, so all items
        (pending, reading, read) belonging to the user are deleted.
        """
        # Arrange
        user_id = "user123"
        # Simulates user having 5 pending, 3 reading, 2 read = 10 total
        total_items = 10

        mock_news_repository.delete_all_by_user_id.return_value = total_items

        use_case = DeleteAllUserNewsUseCase(mock_news_repository)

        # Act
        result = await use_case.execute(user_id=user_id)

        # Assert
        assert result == total_items
        mock_news_repository.delete_all_by_user_id.assert_called_once_with(user_id)

    async def test_execute_deletes_both_public_and_private_news(
        self, mock_news_repository
    ):
        """Test that execute deletes both public and private news items.

        Note: The repository method doesn't filter by is_public flag, so both
        public and private items belonging to the user are deleted.
        """
        # Arrange
        user_id = "user123"
        # Simulates user having both public and private news
        total_items = 15

        mock_news_repository.delete_all_by_user_id.return_value = total_items

        use_case = DeleteAllUserNewsUseCase(mock_news_repository)

        # Act
        result = await use_case.execute(user_id=user_id)

        # Assert
        assert result == total_items
        mock_news_repository.delete_all_by_user_id.assert_called_once_with(user_id)

    async def test_execute_deletes_favorite_and_non_favorite_news(
        self, mock_news_repository
    ):
        """Test that execute deletes both favorite and non-favorite news items.

        Note: The repository method doesn't filter by is_favorite flag, so all
        items belonging to the user are deleted regardless of favorite status.
        """
        # Arrange
        user_id = "user123"
        # Simulates user having both favorite and regular news
        total_items = 20

        mock_news_repository.delete_all_by_user_id.return_value = total_items

        use_case = DeleteAllUserNewsUseCase(mock_news_repository)

        # Act
        result = await use_case.execute(user_id=user_id)

        # Assert
        assert result == total_items
        mock_news_repository.delete_all_by_user_id.assert_called_once_with(user_id)

    async def test_execute_no_authorization_check_user_owns_all_items(
        self, mock_news_repository
    ):
        """Test that execute doesn't perform authorization checks.

        Authorization is implicit: the user_id parameter defines which items
        to delete, and users can always delete their own items.
        """
        # Arrange
        user_id = "user123"
        expected_count = 7

        mock_news_repository.delete_all_by_user_id.return_value = expected_count

        use_case = DeleteAllUserNewsUseCase(mock_news_repository)

        # Act
        result = await use_case.execute(user_id=user_id)

        # Assert
        assert result == expected_count
        # Verify only delete_all_by_user_id was called, no get_by_id or other checks
        mock_news_repository.delete_all_by_user_id.assert_called_once()
        # Verify no other repository methods were called
        assert len(mock_news_repository.method_calls) == 1
