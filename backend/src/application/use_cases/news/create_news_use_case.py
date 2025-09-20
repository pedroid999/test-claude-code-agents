"""Create news use case."""

from datetime import datetime
from typing import Optional

from src.application.ports.news_repository import NewsRepository
from src.domain.entities.news_item import NewsItem, NewsCategory, NewsStatus
from src.domain.exceptions.news_exceptions import DuplicateNewsException


class CreateNewsUseCase:
    """Use case for creating a news item."""

    def __init__(self, news_repository: NewsRepository):
        """Initialize the use case with repository.
        
        Args:
            news_repository: The news repository
        """
        self.news_repository = news_repository

    async def execute(
        self,
        source: str,
        title: str,
        summary: str,
        link: str,
        image_url: str,
        category: NewsCategory,
        user_id: str,
        is_public: bool = False
    ) -> NewsItem:
        """Create a new news item.
        
        Args:
            source: News source
            title: News title
            summary: News summary
            link: News link
            image_url: News image URL
            category: News category
            user_id: User ID who creates the news
            is_public: Whether the news is public
            
        Returns:
            The created news item
            
        Raises:
            DuplicateNewsException: If news with same link already exists for user
            ValueError: If validation fails
        """
        # Check for duplicate
        if await self.news_repository.exists_by_link_and_user(link, user_id):
            raise DuplicateNewsException(link, user_id)

        # Create news item
        news_item = NewsItem(
            source=source,
            title=title,
            summary=summary,
            link=link,
            image_url=image_url,
            category=category,
            user_id=user_id,
            is_public=is_public,
            status=NewsStatus.PENDING,
            is_favorite=False,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )

        # Save to repository
        return await self.news_repository.create(news_item)