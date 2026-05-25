import jwt
from jwt import PyJWKClient
from fastapi import Header, HTTPException
from typing import Optional

from app.config import settings

_jwks_client = PyJWKClient(f"{settings.supabase_url}/auth/v1/.well-known/jwks.json")


def get_current_user(authorization: Optional[str] = Header(default=None)) -> str:
    if settings.environment == "development" and authorization is None:
        return settings.dev_user_id

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    token = authorization.removeprefix("Bearer ")
    try:
        signing_key = _jwks_client.get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256"],
            audience="authenticated",
        )
        return payload["sub"]
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
