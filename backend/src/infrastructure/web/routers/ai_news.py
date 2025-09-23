"""AI News generation router."""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from pydantic import BaseModel, Field

from src.infrastructure.web.dependencies import get_generate_ai_news_use_case, get_current_user
from src.infrastructure.ai.exceptions import AINewsGenerationException
from src.application.use_cases.news.generate_ai_news_use_case import GenerateAINewsUseCase
from src.domain.entities.user import User
from src.infrastructure.web.dtos.news_dto import NewsResponseDTO
from src.infrastructure.web.news_mapper import NewsMapper

router = APIRouter(prefix="/ai-news", tags=["AI News"])


class GenerateNewsRequest(BaseModel):
    """Request model for generating AI news."""
    count: int = Field(default=5, ge=1, le=15, description="Number of news to generate")
    categories: List[str] = Field(default=None, description="News categories to focus on")
    is_public: bool = Field(default=False, description="Make news public")


class GenerateNewsResponse(BaseModel):
    """Response model for generated news."""
    news_items: List[NewsResponseDTO]
    total_generated: int
    message: str


@router.post("/generate", response_model=GenerateNewsResponse)
async def generate_ai_news(
    request: GenerateNewsRequest,
    current_user: User = Depends(get_current_user),
    use_case: GenerateAINewsUseCase = Depends(get_generate_ai_news_use_case)
) -> GenerateNewsResponse:
    """Generate AI news for the current user."""

    try:
        # Generate news
        news_items = await use_case.execute(
            user_id=current_user.id,
            count=request.count,
            categories=request.categories,
            is_public=request.is_public
        )

        # Convert to DTOs
        news_dtos = [NewsMapper.to_response_dto(item) for item in news_items]

        return GenerateNewsResponse(
            news_items=news_dtos,
            total_generated=len(news_dtos),
            message=f"Successfully generated {len(news_dtos)} AI news items"
        )

    except AINewsGenerationException as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to generate AI news: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred: {str(e)}"
        )