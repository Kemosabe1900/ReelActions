import json
import logging
from typing import Optional
from anthropic import Anthropic
from pydantic import BaseModel
from app.config import settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a knowledge extractor for a personal knowledge base app. Users save TikTok and Instagram Reels to build a searchable library of useful knowledge.

Given a video transcript (and optionally images), extract structured knowledge.

Transcripts are spoken language: often fragmented, non-native, or terse ("woman, body build, active three times, muscle gain"). Reconstruct the intended meaning and write it as clear advice ("Women's muscle-building: train about 3x per week..."). Reconstruct only what the words support — do not invent numbers, exercises, or ingredients that are not stated or shown.

## Step 1 — Assign a category
- Every video gets ONE specific real-world topic naming what it teaches or demonstrates. Any actionable domain is valid: Workouts, Recipes, Finance, Books, Relationships, Skincare, Parenting, Productivity, Career, Travel, and anything else that fits.
- The category is ALWAYS a genuine topic. Never output a status, a placeholder, or "Uncategorized" — every video fits some real topic, so pick one.
- If existing_categories is provided, you MUST use the closest existing category whenever there is any overlap — even partial. Only create a new category name if absolutely nothing in the list fits.
- Use plural noun phrases: "Workouts" not "Workout", "Recipes" not "Recipe", "Finance Tips" not "Finance Tip".
- Pick the single most specific topic:
  - A video showing push-up form → "Workouts" (not "Fitness", not "Health")
  - A video making pasta → "Recipes" (not "Cooking", not "Food")
  - A video about index funds → "Finance" (not "Investing", not "Money")
  - A video summarizing a self-help book → "Books" (not "Reading", not "Education")
  - A video on handling conflict with a partner → "Relationships"
  - A video about morning routines → "Productivity" (not "Lifestyle", not "Self Improvement")

## Step 2 — Fill structured_data

**Workouts:** {"duration_minutes": null_or_int, "equipment": [], "muscle_groups": [], "exercises": [{"name": str, "sets": null_or_int, "reps": null_or_int, "rest_seconds": null_or_int}]}

**Recipes:** {"prep_time_minutes": null_or_int, "cook_time_minutes": null_or_int, "servings": null_or_int, "cuisine": str, "ingredients": [], "steps": []}

**Finance:** {"topic": str, "key_concepts": [], "action_items": [], "risk_level": "low"|"medium"|"high"|null}

**Any other category:** {"key_concepts": [], "action_items": []}

**Completeness rule:** structured_data must capture EVERY concrete detail the creator gives that is part of the video's value: every exercise with its sets/reps/rest, every ingredient with its quantity, every step, every tip or warning. Do not summarize or pick highlights inside structured_data — the summary field is the short version, structured_data is the complete version. One entry per distinct piece of advice in key_concepts/action_items.
- Bad: 3 exercises listed when the creator demonstrated 7.
- Good: all 7 exercises, each with the sets/reps the creator stated, null where not stated.

## Writing the title and summary
The title and summary are shown to the user as cards in their library. They must read like content, never like a description of the input.
- Write WHAT THE VIDEO TEACHES: the method, the steps, the takeaway. Not what the video "is about".
- NEVER mention the transcript, the audio, the video itself, or input quality. Words like "transcript", "audio", "appears to", "seems to", "difficult to extract", "with certainty" must not appear.
- Never hedge. If details are sparse, write a shorter summary containing only what is concrete. One confident sentence beats three vague ones.
- Bad summary: "The transcript appears to be focused on exercise techniques, though specific details are difficult to extract."
- Good summary: "Bodyweight conditioning routine built around explosive push-up and squat variations, training to failure on each set."

## Output (JSON only, no markdown, always respond even if input is minimal or music-only)
{"category": str, "title": str (max 60 chars, specific and descriptive), "summary": str (2-3 sentences), "structured_data": {...}}"""

META_LANGUAGE = (
    "transcript", "audio quality", "the audio", "appears to", "seems to",
    "difficult to extract", "difficult to determine", "with certainty",
    "cannot determine", "unclear from", "the video discusses", "the video appears",
)


def _has_meta_language(result: "ClassificationResult") -> bool:
    text = f"{result.title} {result.summary}".lower()
    return any(marker in text for marker in META_LANGUAGE)


class ClassificationResult(BaseModel):
    category: str
    title: str
    summary: str
    structured_data: dict


class ClassificationError(Exception):
    pass


class ClassificationService:
    def __init__(self):
        # Explicit timeout (SDK default is 10 min/call) — classify() can chain
        # up to ~4 sequential calls (2 attempts x meta-language retry), and an
        # unbounded worst case can exceed the job queue's 20-min stale-job
        # reclaim window, letting a second worker double-process a job that
        # isn't actually dead.
        self.client = Anthropic(api_key=settings.anthropic_api_key, timeout=90.0)
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
            parts.append(f"Transcript:\n{transcript[:6000]}")
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
                result = ClassificationResult(**data)
                if _has_meta_language(result):
                    result = self._retry_without_meta(user_content, response, result)
                return result
            except Exception as e:
                last_error = e
                logger.error("[classifier] attempt %d failed: %s", attempt, e)

        raise ClassificationError(f"Classification failed after 2 attempts: {str(last_error)}")

    def _retry_without_meta(self, user_content, first_response, first_result: ClassificationResult) -> ClassificationResult:
        """The first pass described the input instead of the content. Retry once
        with corrective feedback; if it still hedges, alert and keep the retry."""
        from app.services.alerting import alert

        logger.warning("[classifier] meta-language detected, retrying: %s", first_result.summary[:150])
        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=2048,
                temperature=0,
                system=SYSTEM_PROMPT,
                messages=[
                    {"role": "user", "content": user_content},
                    {"role": "assistant", "content": first_response.content[0].text},
                    {"role": "user", "content": (
                        "Your title/summary described the input instead of the content "
                        "(mentions of the transcript, audio, or uncertainty). Rewrite the JSON: "
                        "state only concrete methods, steps, or takeaways, confidently. "
                        "Shorter is fine. Same JSON format, no markdown."
                    )},
                ],
            )
            raw = response.content[0].text.strip()
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
                raw = raw.strip()
            result = ClassificationResult(**json.loads(raw))
            if _has_meta_language(result):
                alert(f"Classifier hedging survived retry: {result.summary[:200]}")
            return result
        except Exception as e:
            logger.error("[classifier] meta-retry failed, keeping first result: %s", e)
            alert(f"Classifier meta-retry failed ({e}); shipped hedged summary: {first_result.summary[:200]}")
            return first_result


_classification_service: Optional[ClassificationService] = None


def get_classification_service() -> ClassificationService:
    global _classification_service
    if _classification_service is None:
        _classification_service = ClassificationService()
    return _classification_service
