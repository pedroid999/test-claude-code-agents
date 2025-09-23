from typing import Optional


class AIServiceException(Exception):
    """Base exception for AI service errors."""
    pass


class RateLimitError(AIServiceException):
    """Raised when API rate limit is exceeded."""

    def __init__(self, message: str, retry_after: Optional[int] = None):
        super().__init__(message)
        self.retry_after = retry_after


class ServiceUnavailableError(AIServiceException):
    """Raised when AI service is unavailable."""
    pass


class ModelHTTPError(AIServiceException):
    """Raised for HTTP errors from the model API."""

    def __init__(self, status_code: int, body: str):
        super().__init__(f"HTTP {status_code}: {body}")
        self.status_code = status_code
        self.body = body


class AINewsGenerationException(AIServiceException):
    """Raised when news generation fails."""
    pass


class ContentValidationError(AIServiceException):
    """Raised when generated content fails validation."""
    pass