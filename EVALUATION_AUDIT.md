# Evaluation audit: 14 October 2026

## Public benchmark

Source: [ULB/Worldline Credit Card Fraud Detection](https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud).
Download: [TensorFlow mirror](https://storage.googleapis.com/download.tensorflow.org/data/creditcard.csv).
Usage terms are on the original dataset page. The complete 284,807 rows contain
492 frauds, without resampling. [Provenance](data/benchmark/creditcard_full.provenance.json)
records the download URL and SHA-256. Time is elapsed seconds, Amount is EUR,
V1-V28 are anonymized PCA components with undisclosed semantics, Class is the label.
No merchant-feature semantics are inferred. This independently retrained model-family
benchmark does not externally validate the deployed merchant model.
Seed 42 stratified 70/15/15 train/validation/test splits reserve 42,722 test rows
with 74 frauds. Validation selects early stopping and the exact F1 threshold.
Test PR-AUC: 0.8355, precision: 0.9464, recall: 0.7162.
[Synthetic stress results](artifacts/metrics/synthetic_stress_test.json) are separate
and also use a distinct early-stopping validation fold.

## Merchant calibration and policy

Merchant data remains synthetic. Training uses 35,000 rows. The original validation
partition is split chronologically into 2,500 model-selection, 2,500 calibration,
and 2,500 policy-selection rows. Test labels fit neither calibrator nor thresholds.
The planted ORD-10239 demo persona is excluded, leaving 7,499 evaluated rows.
Uniform 10-bin ECE: 0.01209574; Brier: 0.06282822. The
[calibration report](artifacts/metrics/calibration_metrics.json) contains occupied-bin
counts, full precision ECE and quantile-bin diagnostics. Low aggregate ECE is not
proof of perfect calibration or subgroup reliability.

The operational threshold is now 0.35 (replacing 0.30), selected to maximize
policy-fold savings subject to FPR <= 10%. The cost-minimizing threshold is 0.15.
Both single and batch scoring use the operational cutoff for review eligibility.
On held-out data:

| Threshold | False positives | Fraud capture | Reviews | Estimated cost INR |
|---|---:|---:|---:|---:|
| Cost minimum 0.15 | 910 | 93.2% | 2,418 | 589,720 |
| Operational 0.35 | 563 | 86.2% | 1,958 | 693,220 |

All flagged transactions count as reviews; high-risk is a subset of that queue.
No staffed review-capacity limit has been established. Test curves only describe
frozen choices. They do not select policy.

## Verification and limitations

Frontend production build, backend TypeScript build and Python compilation passed.
The Python suite passed 21 tests, including API transaction/merchant-decision
integration and stable, deliberately shifted, constant-feature and schema-mismatch
drift checks. Docker Compose build was attempted, but Docker Desktop's Linux engine
pipe was absent. Container images and the backend/Postgres transaction flow remain
unverified. The in-process Python workflow is not full-stack proof.

The drift comparison uses the same six raw numeric features and units. Account age
averages 445 days in training and 660 days in test; the chronological synthetic
population ages over time. Critical drift is retained for investigation, not treated
as proof that retraining improves accuracy. Production readiness is not established.

## Reproduction

```powershell
python -m src.data.download_public_benchmark
python -m src.evaluation.benchmark_real_world
python -m src.models.train
python -m src.evaluation.evaluate
python -m src.monitoring.drift_monitor
python -m pytest -q
docker compose build
docker compose up -d
```
