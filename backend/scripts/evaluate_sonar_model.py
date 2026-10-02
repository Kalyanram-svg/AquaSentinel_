import os
import glob
import json
import numpy as np
from pathlib import Path
from typing import Dict, Any, List

from backend.config import DATA_DIR
from backend.services.ai_inference import SonarInferenceEngine, calculate_iou, CANONICAL_CLASSES

EVAL_DIR = DATA_DIR / "evaluation"
EVAL_DIR.mkdir(parents=True, exist_ok=True)


def evaluate_on_dataset(iou_threshold: float = 0.30, confidence_threshold: float = 0.45) -> Dict[str, Any]:
    """
    Evaluates AquaSentinel Sonar Neural Detector against verified MILCO/NOMBO ground-truth annotations.
    Calculates authentic Precision, Recall, F1-Score, and False Positive Rate.
    """
    all_imgs = glob.glob(str(DATA_DIR / "raw" / "milco_nomobo" / "**" / "*.jpg"), recursive=True)
    # Target test partition (survey 2021) or subset
    test_imgs = [p for p in all_imgs if "2021" in p]
    if not test_imgs:
        test_imgs = all_imgs[:40]

    total_gt = 0
    total_det = 0
    tp = 0
    fp = 0
    fn = 0

    per_class_stats = {
        "mine_like_contact": {"tp": 0, "fp": 0, "fn": 0, "total_gt": 0},
        "non_mine_bottom_object": {"tp": 0, "fp": 0, "fn": 0, "total_gt": 0},
        "other": {"tp": 0, "fp": 0, "fn": 0, "total_gt": 0}
    }

    processed_count = 0
    for img_path in test_imgs:
        txt_path = img_path.replace(".jpg", ".txt")
        if not os.path.exists(txt_path):
            continue

        gt_boxes = []
        with open(txt_path, "r") as f:
            for line in f:
                parts = line.strip().split()
                if len(parts) >= 5:
                    c = int(parts[0])
                    cls_key = "mine_like_contact" if c == 0 else "non_mine_bottom_object"
                    xc, yc, w, h = [float(p) for p in parts[1:5]]
                    # Convert [xc, yc, w, h] to [x1, y1, x2, y2]
                    x1 = max(0.0, xc - w / 2)
                    y1 = max(0.0, yc - h / 2)
                    x2 = min(1.0, xc + w / 2)
                    y2 = min(1.0, yc + h / 2)
                    gt_boxes.append({"box": (x1, y1, x2, y2), "cls": cls_key, "matched": False})
                    per_class_stats[cls_key]["total_gt"] += 1
                    total_gt += 1

        # Run inference
        dets = SonarInferenceEngine.run_detection(
            image_path=img_path,
            image_id=9000 + processed_count,
            confidence_threshold=confidence_threshold,
            enable_saliency=False
        )

        total_det += len(dets)

        for d in dets:
            det_box = (
                d["bbox_x"],
                d["bbox_y"],
                d["bbox_x"] + d["bbox_w"],
                d["bbox_y"] + d["bbox_h"]
            )
            det_cls = d["canonical_class"]

            # Find best matching GT
            best_iou = 0.0
            best_gt = None
            for gt in gt_boxes:
                if not gt["matched"]:
                    iou = calculate_iou(det_box, gt["box"])
                    if iou > best_iou:
                        best_iou = iou
                        best_gt = gt

            if best_iou >= iou_threshold and best_gt is not None:
                best_gt["matched"] = True
                tp += 1
                cls_bucket = det_cls if det_cls in per_class_stats else "other"
                per_class_stats[cls_bucket]["tp"] += 1
            else:
                fp += 1
                cls_bucket = det_cls if det_cls in per_class_stats else "other"
                per_class_stats[cls_bucket]["fp"] += 1

        # Count unmatched GTs as FN
        for gt in gt_boxes:
            if not gt["matched"]:
                fn += 1
                per_class_stats[gt["cls"]]["fn"] += 1

        processed_count += 1

    precision = round(tp / max(1, tp + fp), 4)
    recall = round(tp / max(1, tp + fn), 4)
    f1 = round(2 * (precision * recall) / max(1e-6, precision + recall), 4)
    fp_rate_per_img = round(fp / max(1, processed_count), 2)

    results = {
        "evaluation_dataset": "MILCO / NOMBO Test Split (Survey Partition 2021)",
        "total_test_images": processed_count,
        "total_ground_truth_targets": total_gt,
        "total_model_predictions": total_det,
        "true_positives": tp,
        "false_positives": fp,
        "false_negatives": fn,
        "iou_threshold": iou_threshold,
        "confidence_threshold": confidence_threshold,
        "metrics": {
            "precision": precision,
            "recall": recall,
            "f1_score": f1,
            "false_positive_rate_per_image": fp_rate_per_img
        },
        "per_class": per_class_stats
    }

    out_file = EVAL_DIR / "evaluation_results.json"
    with open(out_file, "w") as f:
        json.dump(results, f, indent=2)

    print(f"[Evaluation] Completed evaluation on {processed_count} images.")
    print(f"[Evaluation] Precision: {precision * 100:.1f}% | Recall: {recall * 100:.1f}% | F1: {f1 * 100:.1f}%")
    print(f"[Evaluation] False Positive Rate: {fp_rate_per_img} FP / image")
    print(f"[Evaluation] Saved results to {out_file}")

    return results


if __name__ == "__main__":
    evaluate_on_dataset()
