"""
RiskGuard AI - Held-out Evaluation Entrypoint
Usage: python src/evaluate.py
"""

import os
import sys

# Ensure root directory in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.evaluation.evaluate import evaluate_held_out_test_set

if __name__ == "__main__":
    evaluate_held_out_test_set()
