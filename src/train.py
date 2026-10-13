"""
RiskGuard AI - Model Training Entrypoint
Usage: python src/train.py
"""

import os
import sys

# Ensure root directory in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.models.train import train_and_compare_models

if __name__ == "__main__":
    train_and_compare_models()
