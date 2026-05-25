import json
from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from app.dependencies import get_current_user
from app.database import get_db
from app.services.chat import get_chat_service
from app.limiter import limiter

router = APIRouter(tags=["chat"])


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = []


@router.post("/chat")
@limiter.limit("30/hour")
def chat(
    request: Request,
    body: ChatRequest,
    user_id: str = Depends(get_current_user),
):
    chat_service = get_chat_service()

    def generate():
        full_response: list[str] = []
        source_list: list[dict] = []

        for event in chat_service.stream_response(
            body.message,
            [m.model_dump() for m in body.history[-6:]],
            user_id,
        ):
            if event["type"] == "delta":
                full_response.append(event["text"])
            elif event["type"] == "sources":
                source_list = event["urls"]
            yield f"data: {json.dumps(event)}\n\n"

        yield "data: [DONE]\n\n"

        db = get_db()
        db.table("chat_messages").insert({
            "user_id": user_id,
            "role": "user",
            "content": body.message,
            "video_sources": [],
        }).execute()
        db.table("chat_messages").insert({
            "user_id": user_id,
            "role": "assistant",
            "content": "".join(full_response),
            "video_sources": source_list,
        }).execute()

    return StreamingResponse(generate(), media_type="text/event-stream")
