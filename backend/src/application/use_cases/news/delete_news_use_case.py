"""Delete News Use Case."""

from src.application.ports.news_repository import NewsRepository
from src.domain.exceptions.news_exceptions import (
    NewsNotFoundException,
    UnauthorizedNewsAccessException,
)


class DeleteNewsUseCase:
    """Use case for deleting a single news item."""

    def __init__(self, news_repository: NewsRepository):
        """Initialize use case with repository.

        Args:
            news_repository: The news repository
        """
        self.news_repository = news_repository

    async def execute(self, news_id: str, user_id: str) -> bool:
        """Delete a news item.

        Args:
            news_id: The ID of the news item to delete
            user_id: The ID of the user requesting deletion

        Returns:
            True if deleted successfully

        Raises:
            NewsNotFoundException: If news item doesn't exist
            UnauthorizedNewsAccessException: If user doesn't own the news
        """
        # Get the news item
        news_item = await self.news_repository.get_by_id(news_id)

        if not news_item:
            raise NewsNotFoundException(f"News item with ID {news_id} not found")

        # Verify ownership
        if news_item.user_id != user_id:
            raise UnauthorizedNewsAccessException(user_id, news_id)

        # Delete the news item
        result = await self.news_repository.delete(news_id)

        if not result:
            raise NewsNotFoundException(f"Failed to delete news item with ID {news_id}")

        return result
