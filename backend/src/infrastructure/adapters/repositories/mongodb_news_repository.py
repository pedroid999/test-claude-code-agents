"""MongoDB News Repository Adapter."""

from datetime import datetime
from typing import List, Optional

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import DESCENDING

from src.application.ports.news_repository import NewsRepository
from src.domain.entities.news_item import NewsItem, NewsCategory, NewsStatus


class MongoDBNewsRepository(NewsRepository):
    """MongoDB implementation of News Repository."""

    def __init__(self, database: AsyncIOMotorDatabase):
        """Initialize the repository with database.
        
        Args:
            database: The MongoDB database instance
        """
        self.collection = database["news_items"]
        self._ensure_indexes()

    def _ensure_indexes(self):
        """Ensure proper indexes for performance."""
        # Create indexes for common queries
        self.collection.create_index([("user_id", 1)])
        self.collection.create_index([("is_public", 1)])
        self.collection.create_index([("status", 1)])
        self.collection.create_index([("category", 1)])
        self.collection.create_index([("created_at", DESCENDING)])
        self.collection.create_index([("link", 1), ("user_id", 1)], unique=True)

    def _to_domain(self, doc: dict) -> Optional[NewsItem]:
        """Convert MongoDB document to domain entity."""
        if not doc:
            return None

        return NewsItem(
            id=str(doc["_id"]),
            source=doc["source"],
            title=doc["title"],
            summary=doc["summary"],
            link=doc["link"],
            image_url=doc.get("image_url", ""),
            category=NewsCategory(doc["category"]),
            user_id=doc["user_id"],
            is_public=doc.get("is_public", False),
            status=NewsStatus(doc["status"]),
            is_favorite=doc.get("is_favorite", False),
            created_at=doc.get("created_at"),
            updated_at=doc.get("updated_at")
        )

    def _to_document(self, news_item: NewsItem) -> dict:
        """Convert domain entity to MongoDB document."""
        doc = {
            "source": news_item.source,
            "title": news_item.title,
            "summary": news_item.summary,
            "link": news_item.link,
            "image_url": news_item.image_url,
            "category": news_item.category.value,
            "user_id": news_item.user_id,
            "is_public": news_item.is_public,
            "status": news_item.status.value,
            "is_favorite": news_item.is_favorite,
            "updated_at": news_item.updated_at or datetime.utcnow()
        }

        if news_item.created_at:
            doc["created_at"] = news_item.created_at
        else:
            doc["created_at"] = datetime.utcnow()

        return doc

    async def create(self, news_item: NewsItem) -> NewsItem:
        """Create a new news item."""
        doc = self._to_document(news_item)
        result = await self.collection.insert_one(doc)
        news_item.id = str(result.inserted_id)
        return news_item

    async def get_by_id(self, news_id: str) -> Optional[NewsItem]:
        """Get a news item by ID."""
        try:
            doc = await self.collection.find_one({"_id": ObjectId(news_id)})
            return self._to_domain(doc)
        except Exception:
            return None

    async def get_by_user_id(
        self,
        user_id: str,
        status: Optional[NewsStatus] = None,
        category: Optional[NewsCategory] = None,
        is_favorite: Optional[bool] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[NewsItem]:
        """Get news items for a specific user with optional filters."""
        query = {"user_id": user_id}

        if status:
            query["status"] = status.value
        if category:
            query["category"] = category.value
        if is_favorite is not None:
            query["is_favorite"] = is_favorite
        if date_from or date_to:
            date_query = {}
            if date_from:
                date_query["$gte"] = date_from
            if date_to:
                date_query["$lte"] = date_to
            query["created_at"] = date_query

        cursor = self.collection.find(query).sort("created_at", DESCENDING).skip(offset).limit(limit)
        docs = await cursor.to_list(length=limit)
        return [self._to_domain(doc) for doc in docs]

    async def get_public_news(
        self,
        category: Optional[NewsCategory] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[NewsItem]:
        """Get public news items with optional filters."""
        query = {"is_public": True}

        if category:
            query["category"] = category.value
        if date_from or date_to:
            date_query = {}
            if date_from:
                date_query["$gte"] = date_from
            if date_to:
                date_query["$lte"] = date_to
            query["created_at"] = date_query

        cursor = self.collection.find(query).sort("created_at", DESCENDING).skip(offset).limit(limit)
        docs = await cursor.to_list(length=limit)
        return [self._to_domain(doc) for doc in docs]

    async def update(self, news_item: NewsItem) -> NewsItem:
        """Update an existing news item."""
        doc = self._to_document(news_item)
        doc.pop("created_at", None)  # Don't update created_at
        
        await self.collection.update_one(
            {"_id": ObjectId(news_item.id)},
            {"$set": doc}
        )
        return news_item

    async def delete(self, news_id: str) -> bool:
        """Delete a news item."""
        try:
            result = await self.collection.delete_one({"_id": ObjectId(news_id)})
            return result.deleted_count > 0
        except Exception:
            return False

    async def exists_by_link_and_user(self, link: str, user_id: str) -> bool:
        """Check if a news item already exists for a user with the given link."""
        count = await self.collection.count_documents({
            "link": link,
            "user_id": user_id
        })
        return count > 0

    async def count_by_user_and_status(self, user_id: str, status: NewsStatus) -> int:
        """Count news items for a user by status."""
        return await self.collection.count_documents({
            "user_id": user_id,
            "status": status.value
        })

    async def delete_all_by_user_id(self, user_id: str) -> int:
        """Delete all news items for a specific user."""
        try:
            result = await self.collection.delete_many({"user_id": user_id})
            return result.deleted_count
        except Exception:
            return 0