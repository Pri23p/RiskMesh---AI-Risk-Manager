"""Integration Tests for FastAPI Prediction & Explainability Endpoints."""

import pytest
from fastapi.testclient import TestClient
from src.app import app


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_health_endpoint(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "riskmesh-ml-service"
    assert "modelVersion" in data


def test_predict_endpoint_high_risk(client):
    # High risk profile: high amount ratio, novel device/IP, velocity burst
    payload = {
        "features": {
            "amount": 95000.0,
            "currency": "INR",
            "paymentMethod": "CARD",
            "customerAvgAmount": 4000.0,
            "transactionsLast10Min": 5,
            "transactionsLast24Hours": 8,
            "failedAttempts": 3,
            "accountAge": 5,
            "isNewDevice": 1,
            "isNewIp": 1,
            "previousFraudCount": 2,
        }
    }

    response = client.post("/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "fraudProbability" in data
    assert "riskScore" in data
    assert "modelVersion" in data
    assert 0.0 <= data["fraudProbability"] <= 1.0
    assert 0 <= data["riskScore"] <= 100
    assert data["riskScore"] > 50  # Should be flagged high risk


def test_predict_endpoint_low_risk(client):
    # Low risk profile: small amount matching average, established account, no new device/IP
    payload = {
        "features": {
            "amount": 250.0,
            "currency": "INR",
            "paymentMethod": "UPI",
            "customerAvgAmount": 260.0,
            "transactionsLast10Min": 0,
            "transactionsLast24Hours": 2,
            "failedAttempts": 0,
            "accountAge": 365,
            "isNewDevice": 0,
            "isNewIp": 0,
            "previousFraudCount": 0,
        }
    }

    response = client.post("/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["riskScore"] < 30  # Should be low risk


def test_explain_endpoint_shap_factors(client):
    payload = {
        "features": {
            "amount": 120000.0,
            "currency": "INR",
            "paymentMethod": "CARD",
            "customerAvgAmount": 5000.0,
            "transactionsLast10Min": 4,
            "transactionsLast24Hours": 10,
            "failedAttempts": 2,
            "accountAge": 12,
            "isNewDevice": 1,
            "isNewIp": 1,
            "previousFraudCount": 1,
        }
    }

    response = client.post("/explain", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "riskFactors" in data
    assert isinstance(data["riskFactors"], list)
    assert len(data["riskFactors"]) > 0

    for factor in data["riskFactors"]:
        assert "feature" in factor
        assert factor["impact"] in ["high", "medium", "low"]
