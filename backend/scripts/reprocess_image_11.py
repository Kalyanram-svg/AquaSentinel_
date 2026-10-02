import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.database import SessionLocal
from backend.models import SonarImage, Detection
from backend.services.ai_inference import SonarInferenceEngine

def main():
    db = SessionLocal()
    img_id = 11
    img = db.query(SonarImage).filter(SonarImage.id == img_id).first()
    if not img:
        print(f"Error: SonarImage {img_id} not found!")
        return

    print(f"Processing image {img_id}: {img.filename} (Path: {img.original_path})")

    # Run detection
    detections = SonarInferenceEngine.run_detection(
        image_path=img.original_path,
        image_id=img_id,
        confidence_threshold=0.45,
        uncertainty_threshold=0.40,
        is_calibrated=False,
        calibration_m_per_px=None,
        model_version="AquaNeural-PyTorch-ResNet-1.0",
        sensor_altitude=img.altitude_meters or 12.0,
        swath_range=75.0,
        enable_saliency=True
    )

    print(f"Inference completed! Found {len(detections)} acoustic contacts.")

    # Remove old detections for image 11
    deleted = db.query(Detection).filter(Detection.image_id == img_id).delete()
    print(f"Purged {deleted} old detections from database.")

    # Save new detections
    for d in detections:
        det = Detection(
            image_id=img_id,
            class_name=d["class_name"],
            canonical_class=d["canonical_class"],
            confidence=d["confidence"],
            bbox_x=d["bbox_x"],
            bbox_y=d["bbox_y"],
            bbox_w=d["bbox_w"],
            bbox_h=d["bbox_h"],
            length_px=d.get("length_px"),
            width_px=d.get("width_px"),
            length_meters=d.get("length_meters"),
            width_meters=d.get("width_meters"),
            estimated_height_m=d.get("estimated_height_m"),
            shadow_length_px=d.get("shadow_length_px"),
            is_calibrated=d.get("is_calibrated", False),
            calibration_status=d.get("calibration_status", "uncalibrated_pixel_dimensions"),
            hazard_score=d.get("hazard_score", 0.5),
            hazard_type=d.get("hazard_type", "Subsea Obstacle"),
            uncertainty_score=d.get("uncertainty_score", 0.15),
            requires_human_review=d.get("requires_human_review", False),
            review_status=d.get("review_status", "pending"),
            review_reason=d.get("review_reason"),
            saliency_heatmap_path=d.get("saliency_heatmap_path"),
            model_version=d.get("model_version", "AquaNeural-PyTorch-ResNet-1.0")
        )
        db.add(det)

    db.commit()
    print(f"Successfully committed {len(detections)} updated detections to database.")

    # Summary
    class_counts = {}
    review_count = 0
    for d in detections:
        c = d["class_name"]
        class_counts[c] = class_counts.get(c, 0) + 1
        if d["requires_human_review"]:
            review_count += 1

    print("Summary:")
    print(f"  Total Contacts: {len(detections)}")
    print(f"  Class Breakdown: {class_counts}")
    print(f"  Flagged for Analyst Review: {review_count}/{len(detections)}")
    print(f"  Calibrated: False (Reporting pixel dimensions only)")

if __name__ == "__main__":
    main()
