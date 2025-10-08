"""News use cases."""

from .create_news_use_case import CreateNewsUseCase
from .delete_all_user_news_use_case import DeleteAllUserNewsUseCase
from .delete_news_use_case import DeleteNewsUseCase
from .get_public_news_use_case import GetPublicNewsUseCase
from .get_user_news_use_case import GetUserNewsUseCase
from .toggle_favorite_use_case import ToggleFavoriteUseCase
from .update_news_status_use_case import UpdateNewsStatusUseCase

__all__ = [
    "CreateNewsUseCase",
    "DeleteAllUserNewsUseCase",
    "DeleteNewsUseCase",
    "GetPublicNewsUseCase",
    "GetUserNewsUseCase",
    "ToggleFavoriteUseCase",
    "UpdateNewsStatusUseCase",
]