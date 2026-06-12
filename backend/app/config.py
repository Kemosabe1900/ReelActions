from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

_ENV_FILE = Path(__file__).parent.parent / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=_ENV_FILE)

    supabase_url: str
    supabase_service_key: str
    openai_api_key: str
    anthropic_api_key: str
    environment: str = "development"
    dev_user_id: str = "a72e67a7-b3b8-4890-9c52-61a7be63639e"
    discord_webhook_url: str = ""
    admin_secret: str = "changeme"
    sentry_dsn: str = ""
    revenuecat_webhook_secret: str = ""
    instagram_username: str = ""
    instagram_password: str = ""


settings = Settings()
