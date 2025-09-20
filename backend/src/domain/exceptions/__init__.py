"""Domain exceptions module."""

from .base import DomainException, EntityNotFoundError, ValidationError, BusinessRuleViolationError
from .user import UserNotFoundError, InvalidUserDataError, UserAlreadyExistsError, InactiveUserError

__all__ = [
    "DomainException",
    "EntityNotFoundError", 
    "ValidationError",
    "BusinessRuleViolationError",
    "InvalidUserDataError",
    "UserAlreadyExistsError",
    "InactiveUserError"
]