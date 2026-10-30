from pathlib import Path

from alembic import command
from alembic.config import Config

from app.config import get_settings

BACKEND_ROOT = Path(__file__).resolve().parents[1]


def run_migrations() -> None:
    config = Config(str(BACKEND_ROOT / "alembic.ini"))
    config.set_main_option("script_location", (BACKEND_ROOT / "alembic").as_posix())
    url = get_settings().database_url.replace("%", "%%")
    config.set_main_option("sqlalchemy.url", url)
    command.upgrade(config, "head")
