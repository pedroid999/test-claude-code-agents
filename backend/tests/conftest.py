"""Shared test configuration and fixtures."""

import pytest
from datetime import datetime
from typing import List
from unittest.mock import AsyncMock, Mock
from bson import ObjectId

from src.domain.entities.user import User
from src.application.ports.repositories import UserRepositoryPort


# Domain Entity Fixtures
@pytest.fixture
def valid_user_data():
    """Valid user data for creating User entities."""
    return {
        "email": "test@example.com",
        "username": "testuser",
        "hashed_password": "hashed_password_123"
    }


@pytest.fixture
def user_entity(valid_user_data):
    """Create a valid User entity."""
    return User(**valid_user_data)


@pytest.fixture
def user_entity_with_id(valid_user_data):
    """Create a User entity with ID set."""
    data = valid_user_data.copy()
    data.update({
        "id": "507f1f77bcf86cd799439011",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    })
    return User(**data)


@pytest.fixture
def invalid_emails():
    """List of invalid email formats for testing."""
    return ["", "   ", "invalid.email", "@example.com", "test@", "test"]


@pytest.fixture
def invalid_usernames():
    """List of invalid usernames for testing."""
    return ["", "   "]


@pytest.fixture
def invalid_passwords():
    """List of invalid passwords for testing."""
    return ["", "   "]


# MongoDB Test Data Fixtures
@pytest.fixture
def user_document():
    """MongoDB document representation of a user."""
    return {
        "_id": ObjectId(),
        "email": "test@example.com", 
        "username": "testuser",
        "hashed_password": "hashed_123",
        "is_active": True,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }


@pytest.fixture
def user_documents_list():
    """List of MongoDB user documents."""
    return [
        {
            "_id": ObjectId(),
            "email": "user1@example.com",
            "username": "user1",
            "hashed_password": "hashed_123",
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "_id": ObjectId(),
            "email": "user2@example.com", 
            "username": "user2",
            "hashed_password": "hashed_456",
            "is_active": False,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
    ]


# HTTP Test Data Fixtures
@pytest.fixture
def user_create_data():
    """Valid data for user creation API."""
    return {
        "email": "test@example.com",
        "username": "testuser", 
        "password": "password123"
    }


@pytest.fixture
def user_login_data():
    """Valid data for user login API."""
    return {
        "username": "testuser",
        "password": "password123"
    }


@pytest.fixture
def invalid_user_create_data():
    """Invalid data for testing user creation validation."""
    return [
        {"email": "invalid.email", "username": "test", "password": "password123"},  # Invalid email
        {"email": "test@example.com", "username": "", "password": "password123"},  # Empty username
        {"email": "test@example.com", "username": "test", "password": "123"},      # Password too short
        {"email": "", "username": "test", "password": "password123"},             # Empty email
    ]


# Repository Mock Fixtures
@pytest.fixture
def mock_user_repository():
    """Mock UserRepositoryPort for testing use cases."""
    mock = AsyncMock(spec=UserRepositoryPort)
    
    # Configure default return values
    mock.find_all.return_value = []
    mock.find_by_id.return_value = None
    mock.find_by_email.return_value = None
    mock.find_by_username.return_value = None
    mock.create.return_value = None
    mock.update.return_value = None
    mock.delete.return_value = False
    mock.exists.return_value = False
    
    return mock


# MongoDB Collection Mock Fixtures
@pytest.fixture
def mock_mongo_collection():
    """Mock MongoDB collection for repository testing."""
    mock = Mock()
    
    # Configure sync cursor mock for find() - find() returns cursor immediately
    cursor_mock = Mock()
    cursor_mock.limit.return_value = cursor_mock  # Support method chaining
    cursor_mock.to_list = AsyncMock(return_value=[])  # to_list is async
    mock.find.return_value = cursor_mock
    
    # Configure async methods
    mock.find_one = AsyncMock(return_value=None)
    mock.insert_one = AsyncMock(return_value=Mock(inserted_id=ObjectId()))
    mock.update_one = AsyncMock(return_value=Mock(modified_count=1))
    mock.delete_one = AsyncMock(return_value=Mock(deleted_count=1))
    mock.count_documents = AsyncMock(return_value=0)
    
    return mock


@pytest.fixture
def mock_database(mock_mongo_collection):
    """Mock MongoDB database instance."""
    mock_db = Mock()
    mock_db.__getitem__ = Mock(return_value=mock_mongo_collection)
    return mock_db


# Web Layer Mock Fixtures  
@pytest.fixture
def mock_get_database(mock_database):
    """Mock get_database function."""
    return Mock(return_value=mock_database)


# Authentication Fixtures
@pytest.fixture
def sample_jwt_token():
    """Sample JWT token for testing."""
    return "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0dXNlciIsImV4cCI6MTYwOTQ1OTIwMH0.sample_signature"


@pytest.fixture
def mock_current_user(user_entity_with_id):
    """Mock current authenticated user."""
    return user_entity_with_id


# Use Case Mock Factory
@pytest.fixture
def create_mock_use_case():
    """Factory for creating mock use cases."""
    def _create_mock(return_value=None, side_effect=None):
        mock = AsyncMock()
        if side_effect:
            mock.execute.side_effect = side_effect
        else:
            mock.execute.return_value = return_value
        return mock
    return _create_mock


# Test User Collections
@pytest.fixture
def test_users_list(valid_user_data):
    """List of test User entities."""
    users = []
    for i in range(3):
        data = valid_user_data.copy()
        data.update({
            "id": f"507f1f77bcf86cd79943901{i}",
            "email": f"user{i}@example.com",
            "username": f"user{i}",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        })
        users.append(User(**data))
    return users


# Error Scenarios Fixtures
@pytest.fixture
def database_error_scenarios():
    """Common database error scenarios for testing."""
    return {
        "connection_error": Exception("Database connection failed"),
        "invalid_object_id": Exception("Invalid ObjectId"),
        "duplicate_key": Exception("Duplicate key error"),
        "timeout_error": Exception("Database timeout")
    }


# Async Test Configuration
@pytest.fixture(scope="session")
def event_loop_policy():
    """Configure asyncio event loop policy for testing."""
    import asyncio
    return asyncio.DefaultEventLoopPolicy()


# Test Markers Helper
def pytest_configure(config):
    """Configure pytest markers."""
    config.addinivalue_line(
        "markers", "unit: mark test as a unit test"
    )
    config.addinivalue_line(
        "markers", "integration: mark test as an integration test"
    )
    config.addinivalue_line(
        "markers", "slow: mark test as slow running"
    )
    config.addinivalue_line(
        "markers", "auth: mark test as authentication related"
    )
    config.addinivalue_line(
        "markers", "api: mark test as API endpoint test"
    )
    config.addinivalue_line(
        "markers", "repository: mark test as repository test"
    )
    config.addinivalue_line(
        "markers", "domain: mark test as domain entity test"
    )
    config.addinivalue_line(
        "markers", "service: mark test as service/use case test"
    )