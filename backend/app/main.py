from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.config import get_settings
from app.migrate import run_migrations
from app.routers import appointments, auth, barbers, services
from app.seed import seed


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    engine = create_engine(settings.database_url, pool_pre_ping=True)
    app.state.engine = engine
    app.state.session_factory = sessionmaker(
        bind=engine,
        autoflush=False,
        autocommit=False,
        expire_on_commit=False,
    )
    run_migrations()
    if settings.seed_on_startup:
        db = app.state.session_factory()
        try:
            seed(db)
            db.commit()
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()
    yield
    engine.dispose()


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="Barbería Norte API",
        description="Reservas de citas para barbería.",
        version="1.0.0",
        lifespan=lifespan,
    )
    origins = [origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(auth.router)
    app.include_router(services.router)
    app.include_router(barbers.router)
    app.include_router(appointments.router)

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()
