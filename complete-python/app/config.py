from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Account Login Passkey Example"
    database_url: str = (
        "mysql+pymysql://root:password@127.0.0.1:3306/"
        "account_login_passkey?charset=utf8mb4"
    )

    webauthn_rp_id: str = "localhost"
    webauthn_rp_name: str = "Account Login Passkey Example"
    webauthn_origin: str = "http://localhost:8000"

    session_expire_seconds: int = 86400
    cookie_secure: bool = False

    model_config = SettingsConfigDict(
        # 两种启动入口都读取 Python 示例自己的配置。
        env_file=Path(__file__).resolve().parents[1] / ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )


settings = Settings()
