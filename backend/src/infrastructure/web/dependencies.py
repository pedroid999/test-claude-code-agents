"""FastAPI dependency injection."""

from functools import lru_cache
from typing import Optional
from fastapi.security import OAuth2PasswordBearer
from fastapi import Depends, HTTPException, status
from src.infrastructure.adapters.repositories.mongodb_user_repository import MongoDBUserRepository
from src.infrastructure.adapters.repositories.mongodb_news_repository import MongoDBNewsRepository
from src.infrastructure.web.security import decode_access_token
from src.infrastructure.web.dto.user_dto import TokenData
from src.domain.entities.user import User
from src.domain.exceptions.user import UserNotFoundError
from src.application.use_cases.user_use_cases import (
    GetAllUsersUseCase,
    GetUserByIdUseCase,
    GetUserByEmailUseCase,
    CreateUserUseCase,
    AuthenticateUserUseCase
)
from src.application.use_cases.user.logout_user_use_case import LogoutUserUseCase
from src.infrastructure.database import get_database

@lru_cache()
def get_user_repository() -> MongoDBUserRepository:
    """Get user repository instance."""
    return MongoDBUserRepository()

@lru_cache()
def get_news_repository() -> MongoDBNewsRepository:
    """Get news repository instance."""
    return MongoDBNewsRepository(get_database())

# User use case dependencies
def get_all_users_use_case() -> GetAllUsersUseCase:
    """Get all users use case."""
    return GetAllUsersUseCase(get_user_repository())


def get_user_by_id_use_case() -> GetUserByIdUseCase:
    """Get user by ID use case."""
    return GetUserByIdUseCase(get_user_repository())


def get_user_by_email_use_case() -> GetUserByEmailUseCase:
    """Get user by email use case."""
    return GetUserByEmailUseCase(get_user_repository())


def get_create_user_use_case() -> CreateUserUseCase:
    """Get create user use case."""
    return CreateUserUseCase(get_user_repository())


def get_authenticate_user_use_case() -> AuthenticateUserUseCase:
    """Get authenticate user use case."""
    return AuthenticateUserUseCase(get_user_repository())


def get_logout_user_use_case() -> LogoutUserUseCase:
    """Get logout user use case."""
    return LogoutUserUseCase()


# Authentication dependencies
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    user_by_email_use_case: GetUserByEmailUseCase = Depends(get_user_by_email_use_case)
) -> User:
    """Get current authenticated user."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception
        
    username: str = payload.get("sub")
    if username is None:
        raise credentials_exception
    
    try:
        # In JWT, we store the email as the subject
        user = await user_by_email_use_case.execute(email=username)
    except UserNotFoundError:
        raise credentials_exception
        
    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> dict:
    """Get current active user."""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return {
        "id": current_user.id,
        "email": current_user.email,
        "username": current_user.username,
        "is_active": current_user.is_active
    }