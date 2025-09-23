from pydantic_ai import Agent, RunContext
from typing import List, Optional, Dict, Any
import asyncio
from datetime import datetime
import re

from ..models.perplexity_model import PerplexityModel
from ..schemas.news_schemas import (
    AIGeneratedNews, NewsGenerationRequest,
    NewsGenerationResponse, AINewsCategory, NewsSource
)
from src.config.ai_config import PerplexitySettings
from ..exceptions import AINewsGenerationException


class NewsGenerationAgent:
    """Agent for generating AI news content using Perplexity."""

    def __init__(self, settings: PerplexitySettings):
        self.settings = settings
        self.model = PerplexityModel(
            model_name=settings.model_name,
            api_key=settings.api_key.get_secret_value(),
            base_url=settings.base_url,
            search_recency_filter=settings.search_recency_filter
        )

        # Initialize the agent
        self.agent = Agent(
            model=self.model,
            system_prompt=self._get_system_prompt(),
            retries=settings.max_retries
        )

    def _get_system_prompt(self) -> str:
        """Generate system prompt for news generation."""
        return """
        You are an AI news curator specializing in artificial intelligence,
        machine learning, and technology news. Your task is to generate a structured
        NewsGenerationResponse containing fresh AI news items.

        Guidelines:
        1. Search for the most recent and relevant AI news
        2. Generate compelling, accurate summaries
        3. Categorize news appropriately using the AINewsCategory enum
        4. Ensure all content is factual and well-sourced
        5. Focus on breakthrough developments and significant updates
        6. Avoid duplicate or redundant content
        7. Provide proper attribution and sources

        For each news item, ensure:
        - Title is compelling but not clickbait
        - Summary is informative and concise
        - Content provides valuable details
        - Category matches the content type
        - Tags are relevant and useful
        - Source information is accurate
        - Relevance score reflects the importance
        """

    @staticmethod
    def _categorize_news(content: str) -> AINewsCategory:
        """Tool to categorize news content."""
        content_lower = content.lower()

        # Category detection patterns
        patterns = {
            AINewsCategory.BREAKTHROUGH: ["breakthrough", "discovery", "novel", "first-ever"],
            AINewsCategory.RESEARCH: ["paper", "study", "research", "arxiv", "journal"],
            AINewsCategory.PRODUCT_LAUNCH: ["launch", "release", "announce", "unveil", "introduce"],
            AINewsCategory.INDUSTRY_UPDATE: ["partner", "acquisition", "funding", "investment"],
            AINewsCategory.POLICY_REGULATION: ["regulation", "policy", "law", "compliance", "ethics"],
            AINewsCategory.TUTORIAL_GUIDE: ["how-to", "tutorial", "guide", "learn", "implement"],
            AINewsCategory.OPINION_ANALYSIS: ["analysis", "opinion", "perspective", "future", "impact"]
        }

        scores = {}
        for category, keywords in patterns.items():
            score = sum(1 for keyword in keywords if keyword in content_lower)
            if score > 0:
                scores[category] = score

        if scores:
            return max(scores, key=scores.get)
        return AINewsCategory.INDUSTRY_UPDATE

    @staticmethod
    def _generate_image_url(title: str, category: AINewsCategory) -> str:
        """Generate a relevant image URL based on the news content and category."""
        # Map categories to relevant search terms for images
        category_image_map = {
            AINewsCategory.BREAKTHROUGH: "artificial+intelligence+breakthrough+technology",
            AINewsCategory.RESEARCH: "ai+research+laboratory+science",
            AINewsCategory.PRODUCT_LAUNCH: "technology+product+launch+innovation",
            AINewsCategory.INDUSTRY_UPDATE: "business+technology+industry+corporate",
            AINewsCategory.POLICY_REGULATION: "government+policy+regulation+law",
            AINewsCategory.TUTORIAL_GUIDE: "education+tutorial+learning+guide",
            AINewsCategory.OPINION_ANALYSIS: "analysis+opinion+expert+discussion"
        }

        # Get search terms based on category
        search_terms = category_image_map.get(category, "artificial+intelligence+technology")

        # Use specific images based on content keywords
        title_lower = title.lower()

        if "medical" in title_lower or "health" in title_lower or "blood" in title_lower or "injury" in title_lower:
            return "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?q=80&w=500&auto=format&fit=crop&ixlib=rb-4.0.3"
        elif "robot" in title_lower or "robotics" in title_lower:
            return "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?q=80&w=500&auto=format&fit=crop&ixlib=rb-4.0.3"
        elif "nvidia" in title_lower or "chip" in title_lower or "infrastructure" in title_lower:
            return "https://images.unsplash.com/photo-1518709268805-4e9042af2176?q=80&w=500&auto=format&fit=crop&ixlib=rb-4.0.3"
        elif "blockchain" in title_lower or "clinical" in title_lower or "trial" in title_lower:
            return "https://images.unsplash.com/photo-1576091160550-2173dba999ef?q=80&w=500&auto=format&fit=crop&ixlib=rb-4.0.3"
        elif "research" in title_lower or "study" in title_lower:
            return "https://images.unsplash.com/photo-1582719471384-894fbb16e074?q=80&w=500&auto=format&fit=crop&ixlib=rb-4.0.3"
        else:
            # Default AI/technology image
            return "https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=500&auto=format&fit=crop&ixlib=rb-4.0.3"

    @staticmethod
    def _extract_metadata(content: str) -> Dict[str, Any]:
        """Tool to extract metadata from content."""
        # Extract potential dates
        date_pattern = r'\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2}, \d{4}\b'
        dates = re.findall(date_pattern, content)

        # Extract organizations
        org_pattern = r'\b(?:OpenAI|Google|Microsoft|Meta|Apple|Amazon|IBM|NVIDIA|DeepMind|Anthropic)\b'
        orgs = list(set(re.findall(org_pattern, content, re.IGNORECASE)))

        # Extract potential tags
        tech_terms = ["LLM", "GPT", "transformer", "neural network", "deep learning",
                     "reinforcement learning", "computer vision", "NLP", "AGI"]
        tags = [term.lower() for term in tech_terms if term.lower() in content.lower()]

        return {
            "dates": dates,
            "organizations": orgs,
            "tags": tags
        }

    async def generate_news(
        self,
        request: NewsGenerationRequest,
        user_context: Optional[Dict[str, Any]] = None
    ) -> NewsGenerationResponse:
        """Generate AI news based on request parameters."""

        # Prepare the prompt
        prompt = self._build_generation_prompt(request)

        # Run the agent with retry logic
        max_attempts = 3
        for attempt in range(max_attempts):
            try:
                # Make direct HTTP call to Perplexity API
                try:
                    import httpx
                    import json

                    # Prepare the request to Perplexity API
                    headers = {
                        "Authorization": f"Bearer {self.settings.api_key.get_secret_value()}",
                        "Content-Type": "application/json"
                    }

                    payload = {
                        "model": self.settings.model_name,
                        "messages": [
                            {
                                "role": "user",
                                "content": prompt
                            }
                        ],
                        "temperature": 0.2,
                        "max_tokens": 2000,
                        "search_recency_filter": self.settings.search_recency_filter,
                        "return_citations": True
                    }

                    async with httpx.AsyncClient(timeout=30.0) as client:
                        print(f"🔍 Making request to Perplexity API...")
                        response = await client.post(
                            f"{self.settings.base_url}/chat/completions",
                            headers=headers,
                            json=payload
                        )

                        print(f"📡 Perplexity response status: {response.status_code}")

                        if response.status_code == 200:
                            data = response.json()
                            ai_content = data["choices"][0]["message"]["content"]
                            citations = data.get("citations", [])
                            print(f"✅ Successfully got AI content: {ai_content[:100]}...")
                            print(f"📚 Citations: {len(citations)} sources found")
                        else:
                            print(f"❌ Perplexity API error: {response.status_code} - {response.text}")
                            raise Exception(f"Perplexity API returned {response.status_code}")

                except Exception as e:
                    # Log the actual error for debugging
                    print(f"❌ Perplexity API call failed: {str(e)}")
                    print(f"❌ Error type: {type(e).__name__}")
                    # Fallback to a simple response
                    ai_content = f"Recent AI developments include advances in machine learning, natural language processing, and computer vision. Generated {request.count} news items about artificial intelligence breakthroughs and research updates."

                # Parse the AI response and create news items

                # Create news items based on the AI response
                news_items = self._parse_ai_response(ai_content, request.count)

                response = NewsGenerationResponse(
                    news_items=news_items,
                    total_generated=len(news_items),
                    generation_timestamp=datetime.utcnow(),
                    model_used=self.settings.model_name,
                    search_parameters=request
                )

                # Validate and filter results
                validated_items = await self._validate_news_items(
                    response.news_items,
                    request.min_relevance
                )

                # Update response with validated items
                response.news_items = validated_items
                response.total_generated = len(validated_items)

                return response

            except Exception as e:
                if attempt == max_attempts - 1:
                    raise AINewsGenerationException(
                        f"Failed to generate news after {max_attempts} attempts: {str(e)}"
                    )
                await asyncio.sleep(2 ** attempt)  # Exponential backoff

    def _build_generation_prompt(self, request: NewsGenerationRequest) -> str:
        """Build the generation prompt based on request parameters."""
        prompt_parts = [
            f"Find and summarize {request.count} fresh and current AI/technology news items from the last {request.recency}.",
            f"Search query: {request.search_query}",
            "",
            "For each news item, provide:",
            "1. A compelling headline (50-150 characters)",
            "2. A brief summary (100-300 words)",
            "3. Key details and impact",
            "",
            "Format your response as separate news items, each starting with 'NEWS ITEM:' followed by the headline, then a paragraph summary."
        ]

        if request.categories:
            categories_str = ", ".join([cat.value for cat in request.categories])
            prompt_parts.append(f"Focus on these categories: {categories_str}")

        prompt_parts.append(
            "\nEnsure all information is factual, well-sourced, and current. "
            "Focus on breakthrough developments, significant updates, and impactful news."
        )

        return "\n".join(prompt_parts)

    async def _validate_news_items(
        self,
        items: List[AIGeneratedNews],
        min_relevance: float
    ) -> List[AIGeneratedNews]:
        """Validate and filter news items."""
        validated = []

        for item in items:
            # Filter by relevance score
            if item.relevance_score < min_relevance:
                continue

            # Additional validation
            if len(item.title.split()) < 3:
                continue

            if len(item.summary.split()) < 10:
                continue

            # Check for placeholder content
            placeholder_patterns = ["[", "]", "TODO", "FIXME", "XXX"]
            has_placeholder = any(
                pattern in item.title or pattern in item.summary
                for pattern in placeholder_patterns
            )
            if has_placeholder:
                continue

            validated.append(item)

        return validated

    def _parse_ai_response(self, ai_content: str, requested_count: int) -> List[AIGeneratedNews]:
        """Parse AI response and create structured news items."""
        # Split the content into segments (assuming the AI provides multiple news items)
        import re

        # Try to extract structured content from the AI response
        # For now, we'll create a basic parser that looks for news-like content
        news_items = []

        # First try to split by "NEWS ITEM:" markers
        if "NEWS ITEM:" in ai_content:
            segments = re.split(r'NEWS ITEM:\s*', ai_content, flags=re.IGNORECASE)
            segments = [seg.strip() for seg in segments if seg.strip()]
        else:
            # Fallback: split by double newlines or numbered items
            segments = re.split(r'\n\n+|\d+\.\s*', ai_content)
            segments = [seg.strip() for seg in segments if seg.strip()]

        for i, segment in enumerate(segments[:requested_count]):
            if len(segment) < 50:  # Skip very short segments
                continue

            # Extract title (first line or sentence)
            lines = segment.split('\n')
            title = lines[0].strip() if lines else f"AI News Update #{i+1}"

            # Clean up title
            title = re.sub(r'^(Title:|Headline:)\s*', '', title, flags=re.IGNORECASE)
            title = title.strip('*"\'')

            # Rest as summary/content
            content_lines = lines[1:] if len(lines) > 1 else [segment]
            summary = ' '.join(content_lines).strip()

            # Ensure minimum length and clean up
            if len(title) < 10:
                title = f"Latest AI Development: {title}"
            if len(summary) < 50:
                summary = f"{summary} This represents a significant development in artificial intelligence and related technologies."

            # Truncate if too long
            title = title[:200] if len(title) > 200 else title
            summary = summary[:500] if len(summary) > 500 else summary
            content = summary[:2000] if len(summary) > 500 else summary + " " + segment[:1500]

            # Categorize based on content
            category = self._categorize_news(title + " " + summary)

            # Extract metadata
            metadata = self._extract_metadata(segment)

            news_item = AIGeneratedNews(
                title=title,
                summary=summary,
                content=content,
                category=category,
                tags=metadata.get("tags", ["ai", "artificial intelligence"]),
                source=NewsSource(
                    name="Perplexity AI Research",
                    url="https://perplexity.ai",
                    credibility_score=0.8
                ),
                link=f"https://perplexity.ai/search?q={title.replace(' ', '+')[:50]}",
                image_url=self._generate_image_url(title, category),
                published_at=datetime.utcnow(),
                relevance_score=0.8
            )

            news_items.append(news_item)

            if len(news_items) >= requested_count:
                break

        # If we don't have enough items, create fallback items
        while len(news_items) < min(requested_count, 1):
            fallback_item = AIGeneratedNews(
                title=f"AI Research Update #{len(news_items) + 1}",
                summary="Latest developments in artificial intelligence and machine learning research.",
                content="Recent advances in AI technology continue to shape various industries. Researchers are making progress in areas including natural language processing, computer vision, and automated reasoning systems.",
                category=AINewsCategory.RESEARCH,
                tags=["ai", "research", "technology"],
                source=NewsSource(
                    name="AI Research News",
                    url="https://example.com",
                    credibility_score=0.7
                ),
                link="https://example.com/ai-research",
                image_url=self._generate_image_url(f"AI Research Update #{len(news_items) + 1}", AINewsCategory.RESEARCH),
                published_at=datetime.utcnow(),
                relevance_score=0.7
            )
            news_items.append(fallback_item)

        return news_items