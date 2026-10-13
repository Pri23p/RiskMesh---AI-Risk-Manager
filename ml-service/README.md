# RiskSentinel — ML Service

This directory is designated for the Python Machine Learning service of the RiskSentinel platform.

## Architecture
- **Inference Server**: FastAPI / Uvicorn (Port 8000)
- **Model Frameworks**: Scikit-Learn, LightGBM, SHAP (Explainability)
- **Responsibilities**:
  - Real-time fraud probability prediction
  - Feature engineering & vectorization
  - SHAP value extraction for risk factor attribution
  - Batch risk re-training pipelines

## Integration
The Node.js Fastify backend (`backend/`) communicates with this service via asynchronous HTTP / REST RPC or gRPC.
