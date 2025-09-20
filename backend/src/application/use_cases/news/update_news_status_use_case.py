"""Update news status use case."""

from src.application.ports.news_repository import NewsRepository
from src.domain.entities.news_item import NewsItem, NewsStatus
from src.domain.exceptions.news_exceptions import NewsNotFoundException, UnauthorizedNewsAccessException


class UpdateNewsStatusUseCase:
    """Use case for updating news item status."""

    def __init__(self, news_repository: NewsRepository):
        """Initialize the use case with repository.
        
        Args:
            news_repository: The news repository
        """
        self.news_repository = news_repository

    async def execute(
        self,
        news_id: str,
        status: NewsStatus,
        user_id: str
    ) -> NewsItem:
        """Update the status of a news item.
        
        Args:
            news_id: The news item ID
            status: The new status
            user_id: The user ID making the update
            
        Returns:
            The updated news item
            
        Raises:
            NewsNotFoundException: If news item not found
            UnauthorizedNewsAccessException: If user cannot access the news
        """
        # Get the news item
        news_item = await self.news_repository.get_by_id(news_id)
        if not news_item:
            raise NewsNotFoundException(news_id)

        # Check authorization
        if news_item.user_id != user_id:
            raise UnauthorizedNewsAccessException(user_id, news_id)

        # Update status
        news_item.update_status(status)

        # Save to repository
        return await self.news_repository.update(news_item)