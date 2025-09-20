"""Database infrastructure module."""

import os
import motor.motor_asyncio
from dotenv import load_dotenv
load_dotenv()

_client = None
_database = None


def get_client():
    """Get MongoDB client singleton."""
    global _client
    if _client is None:
        mongo_uri = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
        _client = motor.motor_asyncio.AsyncIOMotorClient(mongo_uri)
    return _client


def get_database():
    """Get MongoDB database singleton."""
    global _database
    if _database is None:
        client = get_client()
        db_name = os.getenv("DATABASE_NAME")
        _database = client[db_name]
    return _database


async def close_database_connection():
    """Close database connection."""
    global _client, _database
    if _client:
        _client.close()
        _client = None
        _database = None