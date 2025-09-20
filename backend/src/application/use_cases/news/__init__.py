"""News use cases."""

from .create_news_use_case import CreateNewsUseCase
from .get_public_news_use_case import GetPublicNewsUseCase
from .get_user_news_use_case import GetUserNewsUseCase
from .toggle_favorite_use_case import ToggleFavoriteUseCase
from .update_news_status_use_case import UpdateNewsStatusUseCase

__all__ = [
    "CreateNewsUseCase",
    "GetPublicNewsUseCase",
    "GetUserNewsUseCase",
    "ToggleFavoriteUseCase",
    "UpdateNewsStatusUseCase",
]