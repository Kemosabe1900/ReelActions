import threading
from supabase import create_client, Client
from app.config import settings

_local = threading.local()


def get_db() -> Client:
    if not hasattr(_local, 'client'):
        _local.client = create_client(settings.supabase_url, settings.supabase_service_key)
    return _local.client
