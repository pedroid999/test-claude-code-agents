"""Domain exceptions for news-related operations."""


class NewsException(Exception):
    """Base exception for news-related errors."""
    pass


class NewsNotFoundException(NewsException):
    """Exception raised when a news item is not found."""
    def __init__(self, news_id: str):
        self.news_id = news_id
        super().__init__(f"News item with ID {news_id} not found")


class UnauthorizedNewsAccessException(NewsException):
    """Exception raised when a user tries to access a news item they don't have permission for."""
    def __init__(self, user_id: str, news_id: str):
        self.user_id = user_id
        self.news_id = news_id
        super().__init__(f"User {user_id} is not authorized to access news item {news_id}")


class InvalidNewsStatusTransitionException(NewsException):
    """Exception raised when an invalid status transition is attempted."""
    def __init__(self, current_status: str, target_status: str):
        self.current_status = current_status
        self.target_status = target_status
        super().__init__(f"Cannot transition from {current_status} to {target_status}")


class DuplicateNewsException(NewsException):
    """Exception raised when trying to create a duplicate news item."""
    def __init__(self, link: str, user_id: str):
        self.link = link
        self.user_id = user_id
        super().__init__(f"News item with link {link} already exists for user {user_id}")