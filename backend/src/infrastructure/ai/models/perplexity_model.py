from typing import Any, AsyncIterator, Optional, List
from pydantic_ai.models import Model
from pydantic_ai.messages import ModelMessage, ModelRequest, ModelResponse, TextPart
import httpx
from datetime import datetime
import json

from ..exceptions import RateLimitError, ServiceUnavailableError, ModelHTTPError


class PerplexityModel(Model):
    """Custom Pydantic AI model adapter for Perplexity API."""

    def __init__(
        self,
        model_name: str,
        api_key: str,
        base_url: str = "https://api.perplexity.ai",
        search_domain_filter: Optional[List[str]] = None,
        search_recency_filter: Optional[str] = "day",
        return_citations: bool = True,
        temperature: float = 0.2,
        max_tokens: int = 2000
    ):
        self._model_name = model_name
        self._api_key = api_key
        self._base_url = base_url
        self._search_domain_filter = search_domain_filter or []
        self._search_recency_filter = search_recency_filter
        self._return_citations = return_citations
        self._temperature = temperature
        self._max_tokens = max_tokens
        self._client = httpx.AsyncClient(
            base_url=base_url,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            timeout=30.0
        )

    @property
    def model_name(self) -> str:
        return self._model_name

    async def system(self) -> str:
        """Return the system prompt for this model."""
        return "You are a helpful AI assistant specialized in generating structured news content."

    async def request(
        self,
        messages: List[ModelMessage],
        model_settings: Optional[dict[str, Any]] = None,
        **kwargs: Any
    ) -> ModelResponse:
        """Make a non-streaming request to Perplexity API."""

        # Convert messages to Perplexity format
        perplexity_messages = self._format_messages(messages)

        # Prepare request payload
        payload = {
            "model": self._model_name,
            "messages": perplexity_messages,
            "temperature": model_settings.get("temperature", self._temperature) if model_settings else self._temperature,
            "max_tokens": model_settings.get("max_tokens", self._max_tokens) if model_settings else self._max_tokens,
            "search_domain_filter": self._search_domain_filter,
            "search_recency_filter": self._search_recency_filter,
            "return_citations": self._return_citations,
            "stream": False
        }

        try:
            response = await self._client.post(
                "/chat/completions",
                json=payload
            )
            response.raise_for_status()

            data = response.json()
            return self._parse_response(data)

        except httpx.HTTPStatusError as e:
            if e.response.status_code == 429:
                raise RateLimitError(f"Perplexity rate limit exceeded: {e}")
            elif e.response.status_code >= 500:
                raise ServiceUnavailableError(f"Perplexity service error: {e}")
            else:
                raise ModelHTTPError(
                    status_code=e.response.status_code,
                    body=e.response.text
                )
        except httpx.RequestError as e:
            raise ConnectionError(f"Failed to connect to Perplexity API: {e}")

    async def request_stream(
        self,
        messages: List[ModelMessage],
        model_settings: Optional[dict[str, Any]] = None,
        **kwargs: Any
    ) -> AsyncIterator[ModelResponse]:
        """Streaming is supported by Perplexity but simplified here."""
        # For simplicity, we'll use non-streaming
        response = await self.request(messages, model_settings, **kwargs)
        yield response

    def _format_messages(self, messages: List[ModelMessage]) -> List[dict]:
        """Convert Pydantic AI messages to Perplexity format."""
        formatted = []

        for message in messages:
            if isinstance(message, ModelRequest):
                if message.parts:
                    content = ""
                    for part in message.parts:
                        if hasattr(part, 'content'):
                            content += str(part.content)

                    if content:
                        # For Perplexity, we'll use user role for requests
                        formatted.append({
                            "role": "user",
                            "content": content
                        })

        return formatted

    def _parse_response(self, data: dict) -> ModelResponse:
        """Parse Perplexity API response to ModelResponse."""
        choice = data["choices"][0]
        message = choice["message"]

        parts = [TextPart(content=message["content"])]

        # Extract citations if available
        citations = data.get("citations", [])
        if citations:
            # Add citations as metadata
            parts.append(TextPart(
                content=f"\n\n**Sources:**\n" +
                "\n".join([f"- {cite}" for cite in citations])
            ))

        return ModelResponse(
            parts=parts,
            timestamp=datetime.utcnow()
        )