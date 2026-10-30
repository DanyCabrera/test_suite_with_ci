import os

os.environ["TESTCONTAINERS_RYUK_DISABLED"] = "true"

from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete
from testcontainers.postgres import PostgresContainer

from app.models import Appointment, Service, User


def _psycopg_url(url: str) -> str:
    if "+psycopg2" in url:
        return url.replace("+psycopg2", "+psycopg", 1)
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+psycopg://", 1)
    return url


@pytest.fixture(scope="session")
def client() -> Generator[TestClient, None, None]:
    container = PostgresContainer(
        "postgres:16-alpine",
        username="barberia",
        password="barberia",
        dbname="barberia",
        driver="psycopg",
    )
    container.start()
    os.environ["DATABASE_URL"] = _psycopg_url(container.get_connection_url())
    os.environ["JWT_SECRET"] = "integration-test-secret"
    os.environ["SEED_ON_STARTUP"] = "true"
    os.environ["SEED_ADMIN_EMAIL"] = "admin@example.com"
    os.environ["SEED_ADMIN_PASSWORD"] = "admin-dev-pass"
    os.environ["SEED_BARBER_PASSWORD"] = "barber-dev-pass"
    os.environ["SEED_BARBER1_EMAIL"] = "barbero1@example.com"
    os.environ["SEED_BARBER2_EMAIL"] = "barbero2@example.com"

    from app.config import get_settings

    get_settings.cache_clear()
    from app.main import app

    with TestClient(app) as test_client:
        yield test_client
    container.stop()


@pytest.fixture(autouse=True)
def reset_database(client: TestClient) -> None:
    from app.main import app
    from app.seed import seed

    db = app.state.session_factory()
    try:
        db.execute(delete(Appointment))
        db.execute(delete(Service))
        db.execute(delete(User).where(User.role == "client"))
        seed(db)
        db.commit()
    finally:
        db.close()
