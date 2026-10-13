"""
RiskSentinel - Production FastAPI Backend Application
AI-Powered Merchant Loss Prevention Engine
"""

import os
import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# Add root directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import init_db
from app.services.seed_db import seed_database
from app.services.risk_service import RiskScoringService

from app.api.routes_predict import router as predict_router
from app.api.routes_orders import router as orders_router
from app.api.routes_analytics import router as analytics_router
from app.api.routes_metrics import router as metrics_router
from app.api.routes_clusters import router as clusters_router
from app.api.routes_alerts import router as alerts_router
from app.api.routes_decisions import router as decisions_router
from app.api.routes_chat import router as chat_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[INIT] Starting RiskSentinel AI API Server...")
    init_db()
    RiskScoringService.get_instance()
    seed_database()
    yield
    print("[SHUTDOWN] Stopping RiskSentinel AI API Server...")

app = FastAPI(
    title="RiskSentinel - AI Risk Manager",
    description="Defensive AI-powered merchant return-risk detection, SHAP explainability, abuse ring graph analysis, temporal anomaly alerts, and business-cost optimization.",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for Next.js / Vite React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(predict_router)
app.include_router(orders_router)
app.include_router(analytics_router)
app.include_router(metrics_router)
app.include_router(clusters_router)
app.include_router(alerts_router)
app.include_router(decisions_router)
app.include_router(chat_router)

@app.get("/api/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "service": "RiskSentinel AI Platform",
        "version": "1.0.0",
        "philosophy": "We optimize merchant loss, not model accuracy",
        "model_loaded": RiskScoringService.get_instance().model_pipeline is not None
    }

# Serve frontend build if dist exists
frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "dist"))
if os.path.exists(frontend_dist):
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
