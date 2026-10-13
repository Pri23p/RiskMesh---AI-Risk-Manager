"""
RiskSentinel - Business Financial Cost Model
Calculates business costs, fraud losses prevented, customer friction costs, manual review costs,
and net merchant financial savings.
"""

from typing import Dict, Any

class BusinessCostModel:
    """
    Computes business financial impact based on merchant-configurable parameters:
    - fraud_loss_per_order (FN): ₹2,000 (default average unmitigated fraudulent return/chargeback loss)
    - false_positive_cost (FP): ₹300 (customer friction & lost checkout conversion)
    - manual_review_cost: ₹40 (operational human triage cost per flagged order)
    - false_negative_cost: ₹2,000
    """
    def __init__(
        self,
        fraud_loss_per_order: float = 2000.0,
        false_positive_cost: float = 300.0,
        manual_review_cost: float = 40.0,
        false_negative_cost: float = 2000.0,
    ):
        self.fraud_loss_per_order = fraud_loss_per_order
        self.false_positive_cost = false_positive_cost
        self.manual_review_cost = manual_review_cost
        self.false_negative_cost = false_negative_cost

    def calculate_cost(
        self,
        fp: int,
        fn: int,
        tp: int = 0,
        tn: int = 0,
        reviews_count: int = 0
    ) -> Dict[str, Any]:
        """
        Calculates complete financial impact and net merchant savings.
        """
        # If reviews_count is not explicitly passed, flagged orders = TP + FP
        if reviews_count == 0:
            reviews_count = tp + fp
            
        fp_cost = fp * self.false_positive_cost
        fn_loss = fn * self.false_negative_cost
        review_cost = reviews_count * self.manual_review_cost
        
        # Operational cost with RiskSentinel AI model
        cost_with_model = fn_loss + fp_cost + review_cost
        
        # Unmitigated baseline loss without model (all fraud occurs unnoticed)
        total_fraud_orders = tp + fn
        loss_without_model = total_fraud_orders * self.fraud_loss_per_order
        
        fraud_losses_prevented = tp * self.fraud_loss_per_order
        net_savings = max(0.0, loss_without_model - cost_with_model)
        roi_percentage = (net_savings / max(1.0, cost_with_model)) * 100.0

        total_orders = max(1, tp + tn + fp + fn)
        cost_per_order = cost_with_model / total_orders

        return {
            "currency": "INR (₹)",
            "fraud_loss_per_order": self.fraud_loss_per_order,
            "false_positive_cost": self.false_positive_cost,
            "manual_review_cost": self.manual_review_cost,
            "false_negative_cost": self.false_negative_cost,
            "true_positives": int(tp),
            "true_negatives": int(tn),
            "false_positives": int(fp),
            "false_negatives": int(fn),
            "reviews_count": int(reviews_count),
            "loss_without_model": round(loss_without_model, 2),
            "cost_with_model": round(cost_with_model, 2),
            "fraud_losses_prevented": round(fraud_losses_prevented, 2),
            "fp_cost": round(fp_cost, 2),
            "fn_cost": round(fn_loss, 2),
            "manual_review_cost_total": round(review_cost, 2),
            "total_error_cost": round(fn_loss + fp_cost, 2),
            "net_savings": round(net_savings, 2),
            "roi_percentage": round(roi_percentage, 2),
            "cost_per_order": round(cost_per_order, 2)
        }
