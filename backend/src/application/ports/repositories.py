"""Repository port interfaces."""

from abc import ABC, abstractmethod
from typing import List, Optional

from src.domain.entities.user import User

class UserRepositoryPort(ABC):
    """Port for user repository operations."""

    @abstractmethod
    async def find_all(self, limit: int = 100) -> List[User]:
        """Find all users."""
        pass

    @abstractmethod
    async def find_by_id(self, user_id: str) -> Optional[User]:
        """Find a user by ID."""
        pass

    @abstractmethod
    async def find_by_email(self, email: str) -> Optional[User]:
        """Find a user by email."""
        pass

    @abstractmethod
    async def find_by_username(self, username: str) -> Optional[User]:
        """Find a user by username."""
        pass

    @abstractmethod
    async def create(self, user: User) -> User:
        """Create a new user."""
        pass

    @abstractmethod
    async def update(self, user: User) -> User:
        """Update an existing user."""
        pass

    @abstractmethod
    async def delete(self, user_id: str) -> bool:
        """Delete a user by ID."""
        pass

    @abstractmethod
    async def exists(self, user_id: str) -> bool:
        """Check if a user exists."""
        pass