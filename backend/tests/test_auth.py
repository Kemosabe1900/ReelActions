import datetime
import pytest
import jwt
from cryptography.hazmat.primitives.asymmetric import ec
from fastapi import HTTPException
from unittest.mock import patch, MagicMock
from app.dependencies import get_current_user

TEST_USER_ID = "550e8400-e29b-41d4-a716-446655440000"

_test_private_key = ec.generate_private_key(ec.SECP256R1())
_test_public_key = _test_private_key.public_key()


def _make_token(private_key=None, user_id=TEST_USER_ID, expired=False):
    if private_key is None:
        private_key = _test_private_key
    exp = datetime.datetime.utcnow() + datetime.timedelta(hours=-1 if expired else 1)
    return jwt.encode(
        {"sub": user_id, "exp": exp, "aud": "authenticated"},
        private_key,
        algorithm="ES256",
    )


def _mock_signing_key(public_key=None):
    mock_key = MagicMock()
    mock_key.key = public_key or _test_public_key
    return mock_key


def test_valid_token_returns_user_id():
    token = _make_token()
    with patch("app.dependencies._jwks_client") as mock_client:
        mock_client.get_signing_key_from_jwt.return_value = _mock_signing_key()
        result = get_current_user(f"Bearer {token}")
    assert result == TEST_USER_ID


def test_missing_bearer_prefix_raises_401():
    with pytest.raises(HTTPException) as exc:
        get_current_user("notbearer sometoken")
    assert exc.value.status_code == 401


def test_expired_token_raises_401():
    token = _make_token(expired=True)
    with patch("app.dependencies._jwks_client") as mock_client:
        mock_client.get_signing_key_from_jwt.return_value = _mock_signing_key()
        with pytest.raises(HTTPException) as exc:
            get_current_user(f"Bearer {token}")
    assert exc.value.status_code == 401


def test_wrong_key_raises_401():
    wrong_key = ec.generate_private_key(ec.SECP256R1())
    token = _make_token(private_key=wrong_key)
    with patch("app.dependencies._jwks_client") as mock_client:
        mock_client.get_signing_key_from_jwt.return_value = _mock_signing_key()
        with pytest.raises(HTTPException) as exc:
            get_current_user(f"Bearer {token}")
    assert exc.value.status_code == 401
