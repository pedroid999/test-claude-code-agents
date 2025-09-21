"""Toggle favorite use case."""

from src.application.ports.news_repository import NewsRepository
from src.domain.entities.news_item import NewsItem
from src.domain.exceptions.news_exceptions import NewsNotFoundException, UnauthorizedNewsAccessException


class ToggleFavoriteUseCase:
    """Use case for toggling news item favorite status."""

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
    ) -> NewsItem:
        """Toggle the favorite status of a news item.
        
        Args:
            news_id: The news item ID
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

        # Check authorization - users can favorite any news item
        # No authorization check needed for favoriting

        # Toggle favorite
        news_item.toggle_favorite()

        # Save to repository
        return await self.news_repository.update(news_item)