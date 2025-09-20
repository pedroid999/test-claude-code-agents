"""News repository port interface."""

from abc import ABC, abstractmethod
from datetime import datetime
from typing import List, Optional

from src.domain.entities.news_item import NewsItem, NewsCategory, NewsStatus


class NewsRepository(ABC):
    """Abstract repository interface for news operations."""

    @abstractmethod
    async def create(self, news_item: NewsItem) -> NewsItem:
        """Create a new news item.
        
        Args:
            news_item: The news item to create
            
        Returns:
            The created news item with generated ID
        """
        pass

    @abstractmethod
    async def get_by_id(self, news_id: str) -> Optional[NewsItem]:
        """Get a news item by ID.
        
        Args:
            news_id: The ID of the news item
            
        Returns:
            The news item if found, None otherwise
        """
        pass

    @abstractmethod
    async def get_by_user_id(
        self,
        user_id: str,
        status: Optional[NewsStatus] = None,
        category: Optional[NewsCategory] = None,
        is_favorite: Optional[bool] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[NewsItem]:
        """Get news items for a specific user with optional filters.
        
        Args:
            user_id: The user ID
            status: Optional status filter
            category: Optional category filter
            is_favorite: Optional favorite filter
            date_from: Optional start date filter
            date_to: Optional end date filter
            limit: Maximum number of items to return
            offset: Number of items to skip
            
        Returns:
            List of news items matching the criteria
        """
        pass

    @abstractmethod
    async def get_public_news(
        self,
        category: Optional[NewsCategory] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[NewsItem]:
        """Get public news items with optional filters.
        
        Args:
            category: Optional category filter
            date_from: Optional start date filter
            date_to: Optional end date filter
            limit: Maximum number of items to return
            offset: Number of items to skip
            
        Returns:
            List of public news items matching the criteria
        """
        pass

    @abstractmethod
    async def update(self, news_item: NewsItem) -> NewsItem:
        """Update an existing news item.
        
        Args:
            news_item: The news item with updated values
            
        Returns:
            The updated news item
        """
        pass

    @abstractmethod
    async def delete(self, news_id: str) -> bool:
        """Delete a news item.
        
        Args:
            news_id: The ID of the news item to delete
            
        Returns:
            True if deleted successfully, False otherwise
        """
        pass

    @abstractmethod
    async def exists_by_link_and_user(self, link: str, user_id: str) -> bool:
        """Check if a news item already exists for a user with the given link.
        
        Args:
            link: The news item link
            user_id: The user ID
            
        Returns:
            True if exists, False otherwise
        """
        pass

    @abstractmethod
    async def count_by_user_and_status(self, user_id: str, status: NewsStatus) -> int:
        """Count news items for a user by status.
        
        Args:
            user_id: The user ID
            status: The news status
            
        Returns:
            Count of news items
        """
        pass