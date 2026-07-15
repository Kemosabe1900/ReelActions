import jwt
from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address


def user_or_ip(request: Request) -> str:
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        try:
            payload = jwt.decode(auth.removeprefix("Bearer "), options={"verify_signature": False})
            sub = payload.get("sub")
            if sub:
                return f"user:{sub}"
        except jwt.InvalidTokenError:
            pass
    return get_remote_address(request)


limiter = Limiter(key_func=user_or_ip)
