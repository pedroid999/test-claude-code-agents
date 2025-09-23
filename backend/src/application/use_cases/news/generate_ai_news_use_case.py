"""Generate AI news use case."""

from typing import List, Optional
from datetime import datetime

from src.application.use_cases.news.create_news_use_case import CreateNewsUseCase
from src.domain.entities.news_item import NewsItem, NewsCategory, NewsStatus
from src.infrastructure.ai.agents.news_generation_agent import NewsGenerationAgent
from src.infrastructure.ai.schemas.news_schemas import (
    NewsGenerationRequest, AIGeneratedNews
)


class GenerateAINewsUseCase:
    """Use case for generating and storing AI news."""

    def __init__(
        self,
        news_generation_agent: NewsGenerationAgent,
        create_news_use_case: CreateNewsUseCase
    ):
        self.news_agent = news_generation_agent
        self.create_news_use_case = create_news_use_case

    async def execute(
        self,
        user_id: str,
        count: int = 5,
        categories: Optional[List[str]] = None,
        is_public: bool = False
    ) -> List[NewsItem]:
        """Generate AI news and store them in the database."""

        # Prepare generation request
        request = NewsGenerationRequest(
            count=count,
            categories=categories,
            recency="day"  # Always fetch latest news
        )

        # Generate news using AI agent
        response = await self.news_agent.generate_news(
            request,
            user_context={"user_id": user_id}
        )

        # Convert and store each news item
        created_news = []
        for ai_news in response.news_items:
            try:
                news_item = await self._convert_and_store_news(
                    ai_news,
                    user_id,
                    is_public
                )
                created_news.append(news_item)
            except Exception as e:
                # Log error but continue with other items
                print(f"Failed to store news item: {e}")
                continue

        return created_news

    async def _convert_and_store_news(
        self,
        ai_news: AIGeneratedNews,
        user_id: str,
        is_public: bool
    ) -> NewsItem:
        """Convert AI-generated news to domain entity and store."""

        # Map AI category to domain category
        category_mapping = {
            "breakthrough": NewsCategory.RESEARCH,
            "research": NewsCategory.RESEARCH,
            "product_launch": NewsCategory.PRODUCT,
            "industry_update": NewsCategory.COMPANY,
            "policy_regulation": NewsCategory.GENERAL,
            "tutorial_guide": NewsCategory.TUTORIAL,
            "opinion_analysis": NewsCategory.OPINION
        }

        domain_category = category_mapping.get(
            ai_news.category.value,
            NewsCategory.GENERAL
        )

        # Create news using existing use case
        return await self.create_news_use_case.execute(
            source=ai_news.source.name,
            title=ai_news.title,
            summary=ai_news.summary,
            link=ai_news.link,
            image_url=ai_news.image_url or "",
            category=domain_category,
            user_id=user_id,
            is_public=is_public
        )