# Use this exact connection pattern for Neon DB
# Neon requires SSL and uses asyncpg driver

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker as sync_sessionmaker
from dotenv import load_dotenv
import os

from urllib.parse import urlparse, parse_qs, urlencode, urlunparse

load_dotenv()

# Raw DATABASE_URL (uses postgresql://)
RAW_DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@ep-xxxx.neon.tech/neondb?sslmode=require")

# Async DATABASE_URL (for Neon DB and new routers - requires +asyncpg and clean query params)
DATABASE_URL = RAW_DATABASE_URL
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")

# Clean query parameters for asyncpg (remove sslmode, channel_binding)
parsed = urlparse(DATABASE_URL)
query_params = parse_qs(parsed.query)
query_params.pop("sslmode", None)
query_params.pop("channel_binding", None)
query_params["ssl"] = ["require"]
new_query = urlencode(query_params, doseq=True)
DATABASE_URL = urlunparse((
    parsed.scheme,
    parsed.netloc,
    parsed.path,
    parsed.params,
    new_query,
    parsed.fragment
))

engine = create_async_engine(
    DATABASE_URL,
    pool_size=15,
    max_overflow=15,
    pool_pre_ping=True,  # Required for Neon serverless — connection drops when idle
    pool_recycle=300,    # Recycle connections every 5 mins (Neon idle timeout)
    connect_args={"ssl": "require"}
)

AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def get_db_async():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


# ── BACKWARD COMPATIBILITY SYNC LAYER ───────────────────────────────────────
# Sync connection uses postgresql:// (without +asyncpg)
SYNC_DATABASE_URL = RAW_DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
sync_connect_args = {}
if "sslmode=require" in SYNC_DATABASE_URL or "ssl=require" in SYNC_DATABASE_URL or "neon.tech" in SYNC_DATABASE_URL:
    sync_connect_args["sslmode"] = "require"

sync_engine = create_engine(
    SYNC_DATABASE_URL,
    pool_size=15,
    max_overflow=15,
    pool_pre_ping=True,
    pool_recycle=300,
    connect_args=sync_connect_args
)

SessionLocal = sync_sessionmaker(autocommit=False, autoflush=False, bind=sync_engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

get_db_sync = get_db
