"""User use cases."""

from typing import List, Optional

from src.domain.entities.user import User
from src.domain.exceptions.user import UserNotFoundError, InvalidUserDataError, UserAlreadyExistsError
from src.application.ports.repositories import UserRepositoryPort


class GetAllUsersUseCase:
    """Use case for getting all users."""

    def __init__(self, user_repository: UserRepositoryPort):
        self.user_repository = user_repository

    async def execute(self, limit: int = 100) -> List[User]:
        """Execute the use case."""
        return await self.user_repository.find_all(limit)


class GetUserByIdUseCase:
    """Use case for getting a user by ID."""

    def __init__(self, user_repository: UserRepositoryPort):
        self.user_repository = user_repository

    async def execute(self, user_id: str) -> User:
        """Execute the use case."""
        user = await self.user_repository.find_by_id(user_id)
        if user is None:
            raise UserNotFoundError(user_id)
        return user


class GetUserByEmailUseCase:
    """Use case for getting a user by email."""

    def __init__(self, user_repository: UserRepositoryPort):
        self.user_repository = user_repository

    async def execute(self, email: str) -> User:
        """Execute the use case."""
        user = await self.user_repository.find_by_email(email)
        if user is None:
            raise UserNotFoundError(f"email:{email}")
        return user


class CreateUserUseCase:
    """Use case for creating a new user."""

    def __init__(self, user_repository: UserRepositoryPort):
        self.user_repository = user_repository

    async def execute(self, email: str, username: str, hashed_password: str) -> User:
        """Execute the use case."""
        try:
            user = User(email=email, username=username, hashed_password=hashed_password)
        except ValueError as e:
            raise InvalidUserDataError(str(e))

        # Check if user already exists
        existing_user = await self.user_repository.find_by_email(email)
        if existing_user:
            raise UserAlreadyExistsError("User with this email already exists")
            
        existing_user = await self.user_repository.find_by_username(username)
        if existing_user:
            raise UserAlreadyExistsError("User with this username already exists")

        return await self.user_repository.create(user)


class AuthenticateUserUseCase:
    """Use case for authenticating a user."""

    def __init__(self, user_repository: UserRepositoryPort):
        self.user_repository = user_repository

    async def execute(self, username: str) -> Optional[User]:
        """Execute the use case."""
        # Try to find by username first, then by email
        user = await self.user_repository.find_by_username(username)
        if not user:
            user = await self.user_repository.find_by_email(username)
        return user