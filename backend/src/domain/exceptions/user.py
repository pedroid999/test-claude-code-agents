"""User domain exceptions."""

from src.domain.exceptions.base import EntityNotFoundError, ValidationError, BusinessRuleViolationError


class UserNotFoundError(EntityNotFoundError):
    """Raised when a user is not found."""
    
    def __init__(self, user_id: str):
        super().__init__("User", user_id)


class InvalidUserDataError(ValidationError):
    """Raised when user data is invalid."""
    pass


class UserAlreadyExistsError(BusinessRuleViolationError):
    """Raised when trying to create a user that already exists."""
    pass


class InactiveUserError(BusinessRuleViolationError):
    """Raised when trying to perform operations on an inactive user."""
    pass