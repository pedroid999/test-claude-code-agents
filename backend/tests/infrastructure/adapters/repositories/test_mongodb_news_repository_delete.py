"""Tests for MongoDB News Repository delete operations."""

import pytest
from unittest.mock import AsyncMock, Mock
from bson import ObjectId

from src.infrastructure.adapters.repositories.mongodb_news_repository import (
    MongoDBNewsRepository,
)

pytestmark = pytest.mark.asyncio


@pytest.mark.repository
@pytest.mark.unit
class TestMongoDBNewsRepositoryDelete:
    """Test suite for delete operation in MongoDB News Repository."""

    async def test_delete_returns_true_when_item_deleted_successfully(
        self, mock_database
    ):
        """Test that delete returns True when item is deleted successfully."""
        # Arrange
        news_id = "60f1f77bcf86cd7994390011"
        mock_collection = mock_database["news_items"]

        # Mock successful deletion
        delete_result = Mock()
        delete_result.deleted_count = 1
        mock_collection.delete_one = AsyncMock(return_value=delete_result)

        repository = MongoDBNewsRepository(mock_database)

        # Act
        result = await repository.delete(news_id)

        # Assert
        assert result is True
        mock_collection.delete_one.assert_called_once_with(
            {"_id": ObjectId(news_id)}
        )

    async def test_delete_returns_false_when_item_not_found(self, mock_database):
        """Test that delete returns False when item doesn't exist."""
        # Arrange
        news_id = "60f1f77bcf86cd7994390011"
        mock_collection = mock_database["news_items"]

        # Mock no items deleted
        delete_result = Mock()
        delete_result.deleted_count = 0
        mock_collection.delete_one = AsyncMock(return_value=delete_result)

        repository = MongoDBNewsRepository(mock_database)

        # Act
        result = await repository.delete(news_id)

        # Assert
        assert result is False
        mock_collection.delete_one.assert_called_once_with(
            {"_id": ObjectId(news_id)}
        )

    async def test_delete_returns_false_on_invalid_object_id(self, mock_database):
        """Test that delete returns False when given invalid ObjectId."""
        # Arrange
        invalid_news_id = "invalid_id"
        mock_collection = mock_database["news_items"]

        repository = MongoDBNewsRepository(mock_database)

        # Act
        result = await repository.delete(invalid_news_id)

        # Assert
        assert result is False
        # delete_one should not be called due to ObjectId exception
        mock_collection.delete_one.assert_not_called()

    async def test_delete_returns_false_on_database_exception(self, mock_database):
        """Test that delete returns False when database raises exception."""
        # Arrange
        news_id = "60f1f77bcf86cd7994390011"
        mock_collection = mock_database["news_items"]

        # Mock database exception
        mock_collection.delete_one = AsyncMock(
            side_effect=Exception("Database error")
        )

        repository = MongoDBNewsRepository(mock_database)

        # Act
        result = await repository.delete(news_id)

        # Assert
        assert result is False

    async def test_delete_uses_correct_mongodb_filter(self, mock_database):
        """Test that delete uses correct MongoDB filter with ObjectId."""
        # Arrange
        news_id = "60f1f77bcf86cd7994390011"
        mock_collection = mock_database["news_items"]

        delete_result = Mock()
        delete_result.deleted_count = 1
        mock_collection.delete_one = AsyncMock(return_value=delete_result)

        repository = MongoDBNewsRepository(mock_database)

        # Act
        await repository.delete(news_id)

        # Assert
        call_args = mock_collection.delete_one.call_args[0][0]
        assert "_id" in call_args
        assert isinstance(call_args["_id"], ObjectId)
        assert str(call_args["_id"]) == news_id

    async def test_delete_handles_empty_string_id(self, mock_database):
        """Test that delete handles empty string ID gracefully."""
        # Arrange
        empty_id = ""
        mock_collection = mock_database["news_items"]

        repository = MongoDBNewsRepository(mock_database)

        # Act
        result = await repository.delete(empty_id)

        # Assert
        assert result is False
        mock_collection.delete_one.assert_not_called()


@pytest.mark.repository
@pytest.mark.unit
class TestMongoDBNewsRepositoryDeleteAllByUserId:
    """Test suite for delete_all_by_user_id operation in MongoDB News Repository."""

    async def test_delete_all_by_user_id_returns_count_of_deleted_items(
        self, mock_database
    ):
        """Test that delete_all_by_user_id returns count of deleted items."""
        # Arrange
        user_id = "user123"
        expected_count = 15
        mock_collection = mock_database["news_items"]

        # Mock successful bulk deletion
        delete_result = Mock()
        delete_result.deleted_count = expected_count
        mock_collection.delete_many = AsyncMock(return_value=delete_result)

        repository = MongoDBNewsRepository(mock_database)

        # Act
        result = await repository.delete_all_by_user_id(user_id)

        # Assert
        assert result == expected_count
        mock_collection.delete_many.assert_called_once_with({"user_id": user_id})

    async def test_delete_all_by_user_id_returns_zero_when_no_items_found(
        self, mock_database
    ):
        """Test that delete_all_by_user_id returns 0 when user has no items."""
        # Arrange
        user_id = "user_with_no_news"
        mock_collection = mock_database["news_items"]

        # Mock no items deleted
        delete_result = Mock()
        delete_result.deleted_count = 0
        mock_collection.delete_many = AsyncMock(return_value=delete_result)

        repository = MongoDBNewsRepository(mock_database)

        # Act
        result = await repository.delete_all_by_user_id(user_id)

        # Assert
        assert result == 0
        mock_collection.delete_many.assert_called_once_with({"user_id": user_id})

    async def test_delete_all_by_user_id_deletes_only_specified_user_items(
        self, mock_database
    ):
        """Test that delete_all_by_user_id only deletes items for specified user."""
        # Arrange
        user_id = "specific_user"
        mock_collection = mock_database["news_items"]

        delete_result = Mock()
        delete_result.deleted_count = 5
        mock_collection.delete_many = AsyncMock(return_value=delete_result)

        repository = MongoDBNewsRepository(mock_database)

        # Act
        await repository.delete_all_by_user_id(user_id)

        # Assert
        # Verify the filter contains only user_id
        call_args = mock_collection.delete_many.call_args[0][0]
        assert call_args == {"user_id": user_id}
        assert len(call_args) == 1  # Only one filter field

    async def test_delete_all_by_user_id_deletes_all_statuses(
        self, mock_database
    ):
        """Test that delete_all_by_user_id deletes items regardless of status."""
        # Arrange
        user_id = "user123"
        # Simulates deleting items with different statuses
        expected_count = 20
        mock_collection = mock_database["news_items"]

        delete_result = Mock()
        delete_result.deleted_count = expected_count
        mock_collection.delete_many = AsyncMock(return_value=delete_result)

        repository = MongoDBNewsRepository(mock_database)

        # Act
        result = await repository.delete_all_by_user_id(user_id)

        # Assert
        assert result == expected_count
        # Verify no status filter is applied
        call_args = mock_collection.delete_many.call_args[0][0]
        assert "status" not in call_args

    async def test_delete_all_by_user_id_deletes_public_and_private_news(
        self, mock_database
    ):
        """Test that delete_all_by_user_id deletes both public and private items."""
        # Arrange
        user_id = "user123"
        expected_count = 12
        mock_collection = mock_database["news_items"]

        delete_result = Mock()
        delete_result.deleted_count = expected_count
        mock_collection.delete_many = AsyncMock(return_value=delete_result)

        repository = MongoDBNewsRepository(mock_database)

        # Act
        result = await repository.delete_all_by_user_id(user_id)

        # Assert
        assert result == expected_count
        # Verify no is_public filter is applied
        call_args = mock_collection.delete_many.call_args[0][0]
        assert "is_public" not in call_args

    async def test_delete_all_by_user_id_deletes_favorites_and_non_favorites(
        self, mock_database
    ):
        """Test that delete_all_by_user_id deletes both favorite and regular items."""
        # Arrange
        user_id = "user123"
        expected_count = 18
        mock_collection = mock_database["news_items"]

        delete_result = Mock()
        delete_result.deleted_count = expected_count
        mock_collection.delete_many = AsyncMock(return_value=delete_result)

        repository = MongoDBNewsRepository(mock_database)

        # Act
        result = await repository.delete_all_by_user_id(user_id)

        # Assert
        assert result == expected_count
        # Verify no is_favorite filter is applied
        call_args = mock_collection.delete_many.call_args[0][0]
        assert "is_favorite" not in call_args

    async def test_delete_all_by_user_id_handles_large_deletion(
        self, mock_database
    ):
        """Test that delete_all_by_user_id handles large number of deletions."""
        # Arrange
        user_id = "user_with_many_items"
        large_count = 1000
        mock_collection = mock_database["news_items"]

        delete_result = Mock()
        delete_result.deleted_count = large_count
        mock_collection.delete_many = AsyncMock(return_value=delete_result)

        repository = MongoDBNewsRepository(mock_database)

        # Act
        result = await repository.delete_all_by_user_id(user_id)

        # Assert
        assert result == large_count
        mock_collection.delete_many.assert_called_once()

    async def test_delete_all_by_user_id_returns_zero_on_database_exception(
        self, mock_database
    ):
        """Test that delete_all_by_user_id returns 0 when database raises exception."""
        # Arrange
        user_id = "user123"
        mock_collection = mock_database["news_items"]

        # Mock database exception
        mock_collection.delete_many = AsyncMock(
            side_effect=Exception("Database error")
        )

        repository = MongoDBNewsRepository(mock_database)

        # Act
        result = await repository.delete_all_by_user_id(user_id)

        # Assert
        assert result == 0

    async def test_delete_all_by_user_id_handles_empty_user_id(
        self, mock_database
    ):
        """Test that delete_all_by_user_id handles empty user_id."""
        # Arrange
        user_id = ""
        mock_collection = mock_database["news_items"]

        delete_result = Mock()
        delete_result.deleted_count = 0
        mock_collection.delete_many = AsyncMock(return_value=delete_result)

        repository = MongoDBNewsRepository(mock_database)

        # Act
        result = await repository.delete_all_by_user_id(user_id)

        # Assert
        assert result == 0
        mock_collection.delete_many.assert_called_once_with({"user_id": ""})

    async def test_delete_all_by_user_id_uses_delete_many_not_delete_one(
        self, mock_database
    ):
        """Test that delete_all_by_user_id uses delete_many for efficiency."""
        # Arrange
        user_id = "user123"
        mock_collection = mock_database["news_items"]

        delete_result = Mock()
        delete_result.deleted_count = 10
        mock_collection.delete_many = AsyncMock(return_value=delete_result)

        repository = MongoDBNewsRepository(mock_database)

        # Act
        await repository.delete_all_by_user_id(user_id)

        # Assert
        # Verify delete_many is called (efficient bulk operation)
        mock_collection.delete_many.assert_called_once()
        # Verify delete_one is NOT called (less efficient)
        mock_collection.delete_one.assert_not_called()

    @pytest.mark.parametrize("deleted_count", [0, 1, 5, 10, 50, 100, 500, 1000])
    async def test_delete_all_by_user_id_with_various_counts(
        self, deleted_count, mock_database
    ):
        """Test that delete_all_by_user_id correctly returns various counts."""
        # Arrange
        user_id = "user123"
        mock_collection = mock_database["news_items"]

        delete_result = Mock()
        delete_result.deleted_count = deleted_count
        mock_collection.delete_many = AsyncMock(return_value=delete_result)

        repository = MongoDBNewsRepository(mock_database)

        # Act
        result = await repository.delete_all_by_user_id(user_id)

        # Assert
        assert result == deleted_count

    async def test_delete_all_by_user_id_is_atomic_operation(
        self, mock_database
    ):
        """Test that delete_all_by_user_id is atomic (single database call)."""
        # Arrange
        user_id = "user123"
        mock_collection = mock_database["news_items"]

        delete_result = Mock()
        delete_result.deleted_count = 25
        mock_collection.delete_many = AsyncMock(return_value=delete_result)

        repository = MongoDBNewsRepository(mock_database)

        # Act
        await repository.delete_all_by_user_id(user_id)

        # Assert
        # Verify only one database call (atomic operation)
        assert mock_collection.delete_many.call_count == 1
        # Verify no other delete methods are called
        mock_collection.delete_one.assert_not_called()
