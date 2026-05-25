import os
import pytest
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()


@pytest.fixture(scope="session")
def supabase() -> Client:
    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_KEY"]
    return create_client(url, key)


@pytest.fixture(scope="session")
def test_users(supabase: Client):
    users = []
    for i in range(2):
        response = supabase.auth.admin.create_user({
            "email": f"testuser{i}@reelactions.test",
            "password": "testpassword123",
            "email_confirm": True,
        })
        users.append(response.user.id)
    yield users
    for uid in users:
        try:
            supabase.auth.admin.delete_user(uid)
        except Exception:
            pass


@pytest.fixture(scope="session")
def test_user_id(test_users) -> str:
    return test_users[0]


@pytest.fixture(scope="session")
def test_user_id_2(test_users) -> str:
    return test_users[1]
