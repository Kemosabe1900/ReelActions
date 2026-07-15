from fastapi import APIRouter, Depends, Request
from app.dependencies import get_current_user
from app.database import get_db
from app.services.embedder import get_embedding_service
from app.services.classifier import get_classification_service
from app.limiter import limiter

router = APIRouter(tags=["admin"])


@router.post("/admin/reembed")
@limiter.limit("3/hour")
def reembed_all(request: Request, user_id: str = Depends(get_current_user)):
    db = get_db()
    embedder = get_embedding_service()

    videos = (
        db.table("videos")
        .select("id,transcript,title,category")
        .eq("user_id", user_id)
        .execute()
    ).data

    results = {"reembedded": 0, "skipped": 0, "failed": 0}

    for video in videos:
        if not video.get("transcript"):
            results["skipped"] += 1
            continue
        try:
            db.table("transcript_chunks").delete().eq("video_id", video["id"]).execute()
            embedder.embed_and_store(
                video["id"],
                video["transcript"],
                user_id,
                title=video.get("title"),
                category=video.get("category"),
            )
            results["reembedded"] += 1
        except Exception:
            results["failed"] += 1

    return results


@router.post("/admin/reclassify")
@limiter.limit("3/hour")
def reclassify_all(request: Request, user_id: str = Depends(get_current_user)):
    db = get_db()
    classifier = get_classification_service()
    embedder = get_embedding_service()

    videos = (
        db.table("videos")
        .select("id,transcript")
        .eq("user_id", user_id)
        .execute()
    ).data

    existing_categories: list[str] = []
    results = {"reclassified": 0, "skipped": 0, "failed": 0}

    for video in videos:
        if not video.get("transcript"):
            results["skipped"] += 1
            continue
        try:
            classification = classifier.classify(
                transcript=video["transcript"],
                existing_categories=existing_categories,
            )
            db.table("videos").update({
                "category": classification.category,
                "title": classification.title,
                "summary": classification.summary,
                "structured_data": classification.structured_data,
                "schema_status": classification.schema_status,
            }).eq("id", video["id"]).execute()

            if classification.category not in existing_categories:
                existing_categories.append(classification.category)

            db.table("transcript_chunks").delete().eq("video_id", video["id"]).execute()
            embedder.embed_and_store(
                video["id"],
                video["transcript"],
                user_id,
                title=classification.title,
                category=classification.category,
            )
            results["reclassified"] += 1
        except Exception as e:
            print(f"[reclassify] failed for {video['id']}: {e}")
            results["failed"] += 1

    return results
