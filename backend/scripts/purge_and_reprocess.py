import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from backend.database import SessionLocal
from backend.models import SonarImage, Detection
from backend.services.ai_inference import SonarInferenceEngine

def main():
    db = SessionLocal()
    # Delete stale spurious shipwreck detections
    deleted = db.query(Detection).filter(
        Detection.confidence == 0.45,
        Detection.class_name == "Shipwreck / Vessel Ruin"
    ).delete()
    db.commit()
    print(f"Purged {deleted} stale Shipwreck 45% detections from database.")

    # Re-run clean inference on sample images 1, 2, 3, 4, 11
    sample_ids = [1, 2, 3, 4, 11]
    for img_id in sample_ids:
        img = db.query(SonarImage).filter(SonarImage.id == img_id).first()
        if not img or not Path(img.original_path).exists():
            continue
        
        # Clear existing unreviewed detections
        db.query(Detection).filter(
            Detection.image_id == img_id,
            Detection.review_status.in_(["pending", "pending_analyst_review"])
        ).delete()
        db.commit()

        dets = SonarInferenceEngine.run_detection(
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

        for d in dets:
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
        print(f"Reprocessed Image {img_id} ({img.filename}): {len(dets)} genuine contacts.")

if __name__ == "__main__":
    main()
