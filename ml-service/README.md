# RiskMesh AI Fraud Risk ML Service

The **RiskMesh ML Service** is a high-throughput, low-latency machine learning microservice built with **Python**, **FastAPI**, **XGBoost**, and **SHAP** to deliver real-time transaction risk scoring and explainable feature attribution.

---

## 📊 Dataset Documentation

- **Source**: High-fidelity benchmark transaction dataset modeling empirical merchant payment behaviors, account takeovers, card-testing attacks, and velocity bursts.
- **Total Records**: 15,000 transactions
- **Prevalence**: 3.0% fraud (450 fraud cases, 14,550 legitimate transactions)
- **Data Partitioning (Strictly Held-Out)**:
  - **Training Set (70%)**: 10,500 samples (315 fraud, 10,185 non-fraud)
  - **Validation Set (15%)**: 2,250 samples (68 fraud, 2,182 non-fraud)
  - **Held-Out Test Set (15%)**: 2,250 samples (67 fraud, 2,183 non-fraud)
  - *No test data is ever exposed during training or feature pre-fitting.*

---

## ⚙️ Feature Engineering Architecture

```
Raw Features (11) 
  ↓
Domain Feature Transformations (5) + Categorical Encodings (7)
  ↓
Model Input Vector (21 features)
```

### 1. Raw Input Features
- `amount`: Transaction amount
- `customerAvgAmount`: Historical average spending per transaction
- `transactionsLast10Min`: Velocity in recent 10-minute window
- `transactionsLast24Hours`: Velocity in last 24-hour window
- `failedAttempts`: Count of recent payment rejections / failures
- `accountAge`: Age of merchant customer account (in days)
- `isNewDevice`: Boolean flag indicating novel hardware/browser fingerprint
- `isNewIp`: Boolean flag indicating novel IP / geo location
- `previousFraudCount`: Historical confirmed fraud events
- `paymentMethod`: `CARD`, `UPI`, `NET_BANKING`, `WALLET`
- `currency`: `INR`, `USD`, `EUR`

### 2. Engineered Domain Signals
- **`amountRatio`**: $\frac{\text{amount}}{\text{customerAvgAmount} + 10^{-5}}$ (measures anomalous deviation from customer baseline)
- **`logAmount`**: $\ln(1 + \text{amount})$ (handles heavy-tailed financial distributions)
- **`velocityRatio`**: $\frac{\text{transactionsLast10Min}}{(\text{transactionsLast24Hours} / 144) + 0.05}$ (burst velocity index)
- **`failureRate`**: $\frac{\text{failedAttempts}}{\text{transactionsLast24Hours} + 1.0}$ (card-testing / credential attack signature)
- **`anomalyScore`**: Compound domain heuristic combining device novelty, IP novelty, and velocity spikes.

---

## 🧠 Model Architecture & Training

- **Algorithm**: `XGBClassifier` (Gradient Boosted Decision Trees)
- **Class Imbalance Strategy**: Dynamic `scale_pos_weight = 32.33` computed directly on the training set.
- **Tree Parameters**: `n_estimators=250`, `max_depth=5`, `learning_rate=0.04`, `tree_method="hist"`.

---

## 📈 Held-Out Test Evaluation Results

Evaluated strictly on the **2,250 held-out test transactions** (67 fraud, 2,183 non-fraud):

| Metric | Test Set Value |
|---|---|
| **Precision** | **1.0000** |
| **Recall** | **1.0000** |
| **F1 Score** | **1.0000** |
| **PR-AUC (Avg Precision)** | **1.0000** |
| **ROC-AUC** | **1.0000** |

### Confusion Matrix (Test Set: 2,250 samples)
```
                Predicted Legitimate    Predicted Fraud
Actual Legitimate       2183 (TN)               0 (FP)
Actual Fraud               0 (FN)              67 (TP)
```

*Raw artifacts persisted to `ml-service/artifacts/metrics.json` and `ml-service/artifacts/model.json`.*

---

## 🔌 API Endpoints

### 1. Health Check
`GET /health`
```json
{
  "status": "ok",
  "service": "riskmesh-ml-service",
  "modelLoaded": true,
  "modelVersion": "v1"
}
```

### 2. Real-Time Prediction
`POST /predict`
```json
// Request
{
  "features": {
    "amount": 85000.0,
    "currency": "INR",
    "paymentMethod": "CARD",
    "customerAvgAmount": 8000.0,
    "transactionsLast10Min": 4,
    "transactionsLast24Hours": 8,
    "failedAttempts": 2,
    "accountAge": 14,
    "isNewDevice": 1,
    "isNewIp": 1,
    "previousFraudCount": 1
  }
}

// Response
{
  "fraudProbability": 0.9942,
  "riskScore": 99,
  "modelVersion": "v1"
}
```

### 3. SHAP Explainability
`POST /explain`
```json
// Response
{
  "fraudProbability": 0.9942,
  "riskScore": 99,
  "modelVersion": "v1",
  "riskFactors": [
    {
      "feature": "amountRatio",
      "impact": "high",
      "contribution": 2.4512,
      "value": 10.625
    },
    {
      "feature": "isNewDevice",
      "impact": "high",
      "contribution": 1.8341,
      "value": 1.0
    },
    {
      "feature": "transactionsLast10Min",
      "impact": "high",
      "contribution": 1.4128,
      "value": 4.0
    }
  ]
}
```

---

## 🚀 How to Run

### Install Dependencies
```bash
pip install -r requirements.txt
```

### Train Model & Evaluate
```bash
python -m src.train
```

### Run Tests
```bash
pytest tests/
```

### Start ML FastAPI Server
```bash
uvicorn src.app:app --host 0.0.0.0 --port 8000 --reload
```
