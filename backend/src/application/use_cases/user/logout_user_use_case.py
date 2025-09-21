"""Logout user use case."""

import logging
from typing import Optional
from datetime import datetime

from src.domain.entities.user import User

logger = logging.getLogger(__name__)


class LogoutUserUseCase:
    """Use case for user logout operations."""

    def __init__(self):
        """Initialize the logout use case."""
        pass

    async def execute(self, user: User, user_agent: Optional[str] = None) -> None:
        """Execute logout for a user.

        This is a lightweight logout that focuses on audit logging.
        The actual token invalidation happens client-side since we use
        short-lived JWT tokens (30 minutes).

        Args:
            user: The authenticated user logging out
            user_agent: Optional user agent string for audit logging
        """
        try:
            # Log the logout event for audit purposes
            logger.info(
                "User logout",
                extra={
                    "user_id": user.id,
                    "user_email": user.email,
                    "user_agent": user_agent,
                    "timestamp": datetime.utcnow().isoformat(),
                    "event_type": "logout"
                }
            )

            # Note: We don't invalidate the JWT token here since:
            # 1. Tokens are short-lived (30 minutes)
            # 2. Client-side token removal is sufficient
            # 3. Token blacklisting would add unnecessary complexity

        except Exception as e:
            # Never let audit logging failures prevent logout
            logger.error(
                "Failed to log logout event",
                extra={
                    "user_id": user.id,
                    "error": str(e),
                    "timestamp": datetime.utcnow().isoformat()
                }
            )
            # Don't raise the exception - logout must always succeed