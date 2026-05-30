import json
import logging
from typing import Optional
from anthropic import Anthropic
from pydantic import BaseModel
from app.config import settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a knowledge extractor for a personal knowledge base app. Users save TikTok and Instagram Reels to build a searchable library of useful knowledge.

Given a video transcript (and optionally images), extract structured knowledge.

## Step 1 — Assign a category
- Pick the single most specific topic the video is teaching or demonstrating.
- If existing_categories is provided, you MUST use the closest existing category whenever there is any overlap — even partial. Only create a new category name if absolutely nothing in the list fits.
- Use plural noun phrases: "Workouts" not "Workout", "Recipes" not "Recipe", "Finance Tips" not "Finance Tip".
- Examples of correct mapping:
  - A video showing push-up form → "Workouts" (not "Fitness", not "Health")
  - A video making pasta → "Recipes" (not "Cooking", not "Food")
  - A video about index funds → "Finance" (not "Investing", not "Money")
  - A video about morning routines → "Productivity" (not "Lifestyle", not "Self Improvement")

## Step 2 — Fill structured_data

**Workouts:** {"duration_minutes": null_or_int, "equipment": [], "muscle_groups": [], "exercises": [{"name": str, "sets": null_or_int, "reps": null_or_int, "rest_seconds": null_or_int}]}

**Recipes:** {"prep_time_minutes": null_or_int, "cook_time_minutes": null_or_int, "servings": null_or_int, "cuisine": str, "ingredients": [], "steps": []}

**Finance:** {"topic": str, "key_concepts": [], "action_items": [], "risk_level": "low"|"medium"|"high"|null}

**Any other category:** {"key_concepts": [], "action_items": []}

## Step 3 — Set schema_status
"mapped" for Workouts, Recipes, or Finance. "pending_review" for anything else.

## Output (JSON only, no markdown, always respond even if transcript is minimal or music-only)
{"category": str, "title": str (max 60 chars, specific and descriptive), "summary": str (2-3 sentences), "structured_data": {...}, "schema_status": "mapped"|"pending_review"}"""


class ClassificationResult(BaseModel):
    category: str
    title: str
    summary: str
    structured_data: dict
    schema_status: str


class ClassificationError(Exception):
    pass


class ClassificationService:
    def __init__(self):
        self.client = Anthropic(api_key=settings.anthropic_api_key)
        self.model = "claude-haiku-4-5-20251001"

    def classify(
        self,
        transcript: str | None,
        images: list[str] | None = None,
        existing_categories: list[str] | None = None,
    ) -> ClassificationResult:
        if not transcript and not images:
            raise ClassificationError("Must provide transcript or images")

        user_content = []

        if images:
            for b64 in images:
                user_content.append({
                    "type": "image",
                    "source": {"type": "base64", "media_type": "image/jpeg", "data": b64},
                })

        parts = []
        if existing_categories:
            parts.append(f"Existing user categories: {', '.join(existing_categories)}")
        if transcript:
            parts.append(f"Transcript:\n{transcript[:2500]}")
        else:
            parts.append("No transcript available. Classify from images only.")
        user_content.append({"type": "text", "text": "\n\n".join(parts)})

        logger.info("[classifier] transcript length: %d", len(transcript) if transcript else 0)
        last_error: Exception | None = None
        for attempt in range(2):
            try:
                response = self.client.messages.create(
                    model=self.model,
                    max_tokens=2048,
                    temperature=0,
                    system=SYSTEM_PROMPT,
                    messages=[{"role": "user", "content": user_content}],
                )
                logger.info("[classifier] stop_reason: %s content blocks: %d", response.stop_reason, len(response.content))
                raw = response.content[0].text.strip() if response.content else ""
                logger.info("[classifier] raw response (attempt %d): %s", attempt, raw[:300])
                if not raw:
                    last_error = ValueError("Empty response from classifier")
                    continue
                # strip markdown code fences if present
                if raw.startswith("```"):
                    raw = raw.split("```")[1]
                    if raw.startswith("json"):
                        raw = raw[4:]
                    raw = raw.strip()
                data = json.loads(raw)
                return ClassificationResult(**data)
            except Exception as e:
                last_error = e
                logger.error("[classifier] attempt %d failed: %s", attempt, e)

        raise ClassificationError(f"Classification failed after 2 attempts: {str(last_error)}")


_classification_service: Optional[ClassificationService] = None


def get_classification_service() -> ClassificationService:
    global _classification_service
    if _classification_service is None:
        _classification_service = ClassificationService()
    return _classification_service
