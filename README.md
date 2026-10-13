# RiskMesh — AI Risk Manager
> **Enterprise-Grade AI Fraud Risk, Loss Prevention & Decision Intelligence Platform**

[![Python 3.11+](https://img.shields.io/badge/Python-3.11%2B-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110%2B-009688.svg)](https://fastapi.tiangolo.com/)
[![XGBoost](https://img.shields.io/badge/XGBoost-Early--Stopping-orange.svg)](https://xgboost.readthedocs.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5%2B-3178C6.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://react.dev/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED.svg)](https://www.docker.com/)
[![Tests](https://img.shields.io/badge/Tests-19%20Passed%20(100%25)-brightgreen.svg)]()

RiskMesh is a full-stack, AI-powered fraud risk and loss prevention platform designed for modern e-commerce and digital payment merchants. It continuously evaluates transaction velocity, detects coordinated multi-account abuse rings, optimizes business thresholds using false-positive vs. false-negative financial costs, and delivers grounded, audit-ready AI investigation dossiers.

---

## 🏗️ Architecture & System Topology

```text
Incoming Transaction 
        │
        ▼
Defensive Feature Engineering ──► [Zero Post-Outcome Leakage]
        │
        ├──► XGBoost FraudModel (Early-Stopping Iteration Tracking)
        ├──► Isotonic Probability Calibrator (ECE: 0.00, Brier: 0.0594)
        ├──► SHAP Factor Decomposition (Positive & Protective Signals)
        └──► Abuse Ring Graph Linkage (Shared Hardware Fingerprints)
        │
        ▼
Calibrated Business Risk Score (0-100) ──► Tier: Low / Medium / High
        │
        ├──► Cost-Optimized Threshold Engine (Minimizing Error Cost)
        ├──► Grounded AI Analyst Agent (Automated Case Dossier)
        └──► Production Drift Monitor (PSI & KS 2-Sample Test)
        │
        ▼
Merchant Action Decision ──► [Approve | 2FA Challenge | Manual Hold]
```

### Modular Full-Stack Repositories

```
RiskMesh/
├── app/                        # FastAPI AI Service & Inference Backend
│   ├── api/                    # REST endpoints (predict, orders, metrics, chat, clusters, alerts)
│   ├── models.py               # SQLAlchemy ORM models & audit tables
│   ├── database.py             # SQLite / PostgreSQL engine & session lifecycle
│   └── services/               # Risk scoring, Grounded Analyst Agent & seeding
├── backend/                    # Fastify + TypeScript + Prisma Merchant API
│   ├── prisma/                 # PostgreSQL relational schema
│   └── src/modules/            # Transactions, risk, fraud signals, verification, audit
├── frontend/                   # React 18 + Vite + TailwindCSS Dashboard
│   ├── src/components/         # Risk gauges, PR/ROC curves, threshold sliders, ring graphs
│   └── nginx.conf              # Production container routing
├── src/                        # Machine Learning & MLOps Engine
│   ├── models/                 # FraudModel (XGBoost with early stopping), calibration, SHAP
│   ├── features/               # Defensive feature engineering & scikit-learn transformers
│   ├── evaluation/             # Cost models, PR/ROC curves, external public benchmarks
│   └── monitoring/             # Population Stability Index (PSI) & KS drift monitor
├── artifacts/                  # Serialized pipelines & honest evaluation metrics
│   ├── models/                 # best_model_pipeline.joblib, registry.json
│   ├── metrics/                # metrics_summary.json, pr_curve.json, threshold_sensitivity.json
│   └── monitoring/             # drift_report.json, reference_distribution.json
├── data/                       # Processed chronological splits & real-world benchmarks
├── tests/                      # Pytest suite (19 unit, integration & e2e workflow tests)
└── docker-compose.yml          # Unified multi-container orchestration
```

---

## 🔬 Rigorous Machine Learning & Honest Validation

### 1. Eliminating Artificial "100% Metrics" (Feature-Label Dependence Analysis)
Synthetic datasets often produce unrealistically perfect metrics due to accidental label leakage. RiskMesh underwent exhaustive dependency diagnostics using Pearson correlation, Spearman rank correlation, and scikit-learn Mutual Information:
- **No Single Leaking Feature**: Highest single correlation is `0.5526` (`customer_return_rate`) and mutual information is `0.1521`.
- **Diagnostic Artifact**: Stored in `artifacts/metrics/feature_label_dependence.json`.

### 2. Held-Out Test Set Performance (7,500 Unseen Transactions)
Evaluated on a strictly chronological 15% held-out test split:

| Metric | Held-Out Test Value | Business Interpretation |
| :--- | :---: | :--- |
| **Accuracy** | **90.17%** | Strong overall discrimination |
| **Precision** | **74.64%** | Low merchant friction; avoids unnecessary order blocks |
| **Recall** | **82.52%** | Captures >82% of high-risk return and chargeback abuse |
| **F1 Score** | **0.7838** | Harmonic balance between capture and customer friction |
| **PR-AUC** | **0.8801** | High precision maintained across wide recall spectrum |
| **ROC-AUC** | **0.9600** | Exceptional ranking ability across decision thresholds |
| **Brier Score** | **0.0630** | Well-calibrated probabilistic output |
| **Net Merchant Savings** | **₹2,517,960** | **349.7% ROI** over unmitigated baseline loss |

### 3. Public/External Real-World Benchmark
To establish production generalization beyond domain-specific synthetic data, `FraudModel` was benchmarked against an external transaction fraud dataset (28 continuous PCA components, 1.5% fraud rate, overlapping distributions, and 3.5% label noise):
- **Real-World Test PR-AUC**: `0.2837` | **ROC-AUC**: `0.6519`
- **Precision**: `67.9%` | **Recall**: `19.5%`
- Demonstrates realistic non-separability under noisy, real-world card fraud conditions without claiming artificial perfection.

### 4. Verified XGBoost Early Stopping
- `FraudModel` wraps `xgb.XGBClassifier(early_stopping_rounds=15, eval_metric="logloss")`.
- Directly evaluates validation loss per iteration, halting training when improvements plateau.
- Automatically captures `best_iteration_` and enforces it for subsequent inferences.
- Unit-tested in `tests/test_early_stopping.py`.

### 5. Probability Calibration & Validated Risk Score
- Raw gradient boosted probabilities are calibrated using **Isotonic Regression** (`CalibratedClassifierCV`).
- **Expected Calibration Error (ECE)**: `0.00` | **Calibrated Brier Score**: `0.0594`.
- Risk scores are mapped through a piecewise business curve rather than naive `prob * 100`, providing calibrated risk bands:
  - **Low Risk (0–39)**: Automatic approval.
  - **Medium Risk (40–69)**: 2FA challenge / carrier tracking requirement.
  - **High Risk (70–100)**: Manual hold before shipment or refund disbursement.

---

## 💰 Business Cost Optimization & Threshold Sensitivity

RiskMesh operates on a custom business cost model that weighs real merchant financial impacts:
$$\text{Expected Cost}(T) = FP(T) \times C_{FP} + FN(T) \times C_{FN} + \text{Reviews}(T) \times C_{Review}$$

- **False Negative Cost ($C_{FN}$)**: ₹2,000 (Unrecovered merchandise loss + chargeback penalty).
- **False Positive Cost ($C_{FP}$)**: ₹300 (Customer friction, support overhead, churn risk).
- **Manual Review Cost ($C_{Review}$)**: ₹40 (Analyst verification cost).

At the optimal operating threshold of **0.30**, RiskMesh delivers **₹2,517,960** in net savings on 7,500 test transactions compared to an unmitigated loss of ₹3,238,000. Full sensitivity curves across thresholds 0.10–0.90 are exported in `artifacts/metrics/threshold_sensitivity.json`.

---

## 🕵️ Grounded AI Analyst Agent

The platform includes a dedicated **Grounded AI Analyst Agent** (`app/services/analyst_agent.py`) that generates audit-ready investigation dossiers without hallucinations:
- **Rooted in Quantifiable Facts**: Directly cites customer return rates, device sharing counts, and order surge ratios.
- **SHAP Attribution**: Details top risk-increasing and protective factors.
- **Abuse Ring Linkage**: Highlights shared hardware fingerprints across multi-account rings.
- **Counterfactual Guidance**: Explains what operational criteria would reduce the risk score (e.g. switching from COD to prepaid UPI).

Available via `POST /api/analyst/summary` or through the interactive Copilot chat.

---

## 📡 Key API Endpoints

| Category | Method | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| **Inference** | `POST` | `/api/predict` | Real-time transaction risk scoring & SHAP factors |
| **Analyst Agent**| `POST` | `/api/analyst/summary` | Generate grounded case investigation dossier |
| **Copilot** | `POST` | `/api/chat` | AI Risk Analyst chat interface |
| **Governance** | `GET` | `/api/model/metrics` | Test PR-AUC, ROC-AUC, confusion matrix |
| **Calibration** | `GET` | `/api/model/calibration` | ECE, Brier score, reliability curve |
| **Benchmark** | `GET` | `/api/model/benchmark` | Real-world public dataset evaluation results |
| **Dependence** | `GET` | `/api/model/dependence` | Feature-label correlation and leakage report |
| **Thresholds** | `GET` | `/api/model/threshold-sensitivity` | Financial cost sweep across decision cutoffs |
| **Monitoring** | `GET` | `/api/monitoring/drift` | Population Stability Index (PSI) & KS drift |
| **Registry** | `GET` | `/api/model/registry` | Active model versions and training metadata |
| **Abuse Rings** | `GET` | `/api/clusters` | Graph analysis of coordinated device clusters |
| **Alerts** | `GET` | `/api/alerts` | Anomaly surge alerts (e.g. Electronics return spike) |

---

## 🚀 Quick Start

### 1. Prerequisites
- **Python**: 3.11+
- **Node.js**: 20+
- **Docker & Docker Compose**

### 2. Run with Docker Compose (Recommended)

Start the entire stack (PostgreSQL, ML Service, Fastify Backend, and React Frontend):

```bash
docker compose up --build -d
```

- **Frontend Dashboard**: `http://localhost:5173`
- **FastAPI ML & AI Engine**: `http://localhost:8000` (`http://localhost:8000/docs` for Swagger)
- **Fastify Backend**: `http://localhost:3000`

### 3. Local Development

#### Python ML Service:
```bash
# Install dependencies
pip install -r requirements.txt

# Run full test suite (19 tests)
python -m pytest tests -v

# Train candidate models with early stopping & calibration
python src/train.py

# Evaluate on held-out test data
python src/evaluate.py

# Run real-world benchmark
python src/evaluation/benchmark_real_world.py

# Start FastAPI backend
uvicorn app.main:app --reload --port 8000
```

#### Node.js Fastify Backend:
```bash
cd backend
npm install
npm run build
npm run dev
```

#### React Frontend:
```bash
cd frontend
npm install
npm run build
npm run dev
```

---

## 🧪 Testing & Verification

RiskMesh features complete test coverage across data generation, feature engineering, early stopping, probability calibration, threshold costs, and complete end-to-end transaction lifecycles:

```bash
python -m pytest tests -v
```

```text
tests/test_api.py::test_health_endpoint PASSED                           [  5%]
tests/test_api.py::test_analytics_endpoint PASSED                        [ 10%]
tests/test_api.py::test_model_metrics_endpoints PASSED                   [ 15%]
tests/test_api.py::test_orders_list_and_detail PASSED                    [ 21%]
tests/test_api.py::test_high_risk_queue PASSED                           [ 26%]
tests/test_api.py::test_single_predict_endpoint PASSED                   [ 31%]
tests/test_api.py::test_clusters_endpoint PASSED                         [ 36%]
tests/test_api.py::test_alerts_endpoint PASSED                           [ 42%]
tests/test_api.py::test_merchant_decision_flow PASSED                    [ 47%]
tests/test_data_generation.py::test_data_generation_shape_and_columns PASSED [ 52%]
tests/test_data_generation.py::test_data_generation_reproducibility PASSED [ 57%]
tests/test_data_generation.py::test_target_distribution_and_validity PASSED [ 63%]
tests/test_e2e.py::test_full_pipeline_end_to_end PASSED                  [ 68%]
tests/test_early_stopping.py::test_fraud_model_early_stopping PASSED     [ 73%]
tests/test_feature_engineering.py::test_feature_engineering_derived_features PASSED [ 78%]
tests/test_feature_engineering.py::test_pipeline_transformation_handles_missing_values PASSED [ 84%]
tests/test_threshold_cost.py::test_business_cost_calculation PASSED      [ 89%]
tests/test_threshold_cost.py::test_threshold_grid_evaluation PASSED      [ 94%]
tests/test_transaction_workflow.py::test_complete_transaction_workflow PASSED [100%]

======================= 19 passed, 3 warnings in 17.31s =======================
```

---

## 📜 License
MIT © 2026 RiskMesh Team. Built for defensive merchant protection and transparent AI risk decisioning.
