"""
RiskSentinel - Database Configuration & Session Management
Supports PostgreSQL with local SQLite automatic fallback.
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    DATABASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data"))
    os.makedirs(DATABASE_DIR, exist_ok=True)
    DATABASE_URL = f"sqlite:///{os.path.join(DATABASE_DIR, 'risksentinel.db')}"

# For SQLite, specify check_same_thread=False
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    # Import all models to register with Base.metadata
    from app.models import Order, PredictionRecord, MerchantDecision, Alert, Cluster, AuditLog
    Base.metadata.create_all(bind=engine)
