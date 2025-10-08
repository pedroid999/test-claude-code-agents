"""Delete All User News Use Case."""

from src.application.ports.news_repository import NewsRepository


class DeleteAllUserNewsUseCase:
    """Use case for deleting all news items for a user."""

    def __init__(self, news_repository: NewsRepository):
        """Initialize use case with repository.

        Args:
            news_repository: The news repository
        """
        self.news_repository = news_repository

    async def execute(self, user_id: str) -> int:
        """Delete all news items for a user.

        Args:
            user_id: The ID of the user

        Returns:
            Count of deleted items
        """
        deleted_count = await self.news_repository.delete_all_by_user_id(user_id)
        return deleted_count
