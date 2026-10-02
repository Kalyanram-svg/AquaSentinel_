import os
import time
import shutil
import hashlib
import cv2
import numpy as np
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from pathlib import Path
from backend.config import UPLOAD_DIR, PROCESSED_DIR, REPORTS_DIR
from backend.database import get_db
from backend.models import SonarImage, Detection, Survey, AuditLog, User
from backend.schemas import PreprocessParams, InferenceParams, ExplainRequest
from backend.services.sonar_processing import SonarProcessor
from backend.services.ai_inference import SonarInferenceEngine
from backend.services.report_generator import ReportGenerator
from backend.auth import get_current_user

router = APIRouter(prefix="/sonar", tags=["Sonar Intelligence"])

@router.post("/upload")
async def upload_sonar_image(
    file: UploadFile = File(...),
    survey_id: Optional[int] = Form(None),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Validate file extension
    ext = Path(file.filename or "").suffix.lower()
    allowed_extensions = {".png", ".jpg", ".jpeg", ".bmp", ".tiff", ".tif", ".webp"}
    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported format '{ext}'. Please upload side-scan sonar image (.png, .jpg, .bmp, .tiff, .webp)."
        )

    timestamp = int(datetime.utcnow().timestamp())
    safe_filename = f"{timestamp}_{file.filename}"
    save_path = UPLOAD_DIR / safe_filename

    # Stream file to disk and compute sha256 with 15MB limit check
    MAX_UPLOAD_SIZE = 15 * 1024 * 1024  # 15 MB
    total_bytes = 0
    hasher = hashlib.sha256()

    with open(save_path, "wb") as buffer:
        while chunk := await file.read(64 * 1024):
            total_bytes += len(chunk)
            if total_bytes > MAX_UPLOAD_SIZE:
                buffer.close()
                if save_path.exists():
                    os.remove(save_path)
                raise HTTPException(
                    status_code=413,
                    detail="File exceeds maximum allowed size of 15MB for cloud processing."
                )
            buffer.write(chunk)
            hasher.update(chunk)

    file_hash = hasher.hexdigest()

    # Image validation
    try:
        raw_gray = SonarProcessor.load_sonar_image(str(save_path))
        h, w = raw_gray.shape
        is_valid = True
        notes = "Valid side-scan sonar matrix"
    except Exception as e:
        is_valid = False
        notes = f"Corrupted or unsupported format: {str(e)}"
        h, w = 0, 0

    # Check duplicates
    existing_dup = db.query(SonarImage).filter(SonarImage.sha256_hash == file_hash).first()
    is_duplicate = existing_dup is not None

    sonar_img = SonarImage(
        survey_id=survey_id,
        filename=file.filename,
        original_path=str(save_path),
        sha256_hash=file_hash,
        width=w,
        height=h,
        channels=1,
        file_size_bytes=total_bytes,
        is_valid=is_valid,
        validation_notes=notes,
        is_duplicate=is_duplicate,
        latitude=latitude or (18.9220 + (timestamp % 100) * 0.0001),
        longitude=longitude or (72.8347 + (timestamp % 80) * 0.0001),
        dataset_source="Live Survey Ingestion"
    )
    db.add(sonar_img)
    db.commit()
    db.refresh(sonar_img)

    # Create lightweight bounded processing copy without running expensive filters (Step 7 & 9)
    proc_filename = f"proc_{sonar_img.id}.jpg"
    proc_path = PROCESSED_DIR / proc_filename
    max_dim = max(h, w) if (h > 0 and w > 0) else 1
    if max_dim > 1280:
        scale = 1280.0 / max_dim
        proc_img = cv2.resize(raw_gray, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
    else:
        proc_img = raw_gray if is_valid else np.zeros((384, 512), dtype=np.uint8)

    cv2.imwrite(str(proc_path), proc_img, [cv2.IMWRITE_JPEG_QUALITY, 90])
    sonar_img.enhanced_path = f"/api/sonar/files/{proc_filename}"
    db.commit()

    print(f"[AquaSentinel Upload] UPLOAD START: {file.filename}")
    print(f"[AquaSentinel Upload] UPLOAD VALIDATED: {w}x{h}, {total_bytes} bytes, hash: {file_hash[:8]}...")
    print(f"[AquaSentinel Upload] PROCESSING DIMENSIONS: {proc_img.shape[1]}x{proc_img.shape[0]} (bounded)")

    return {
        "id": sonar_img.id,
        "filename": sonar_img.filename,
        "width": w,
        "height": h,
        "is_valid": is_valid,
        "is_duplicate": is_duplicate,
        "original_url": f"/api/sonar/raw/{sonar_img.id}",
        "enhanced_url": sonar_img.enhanced_path,
        "enhanced_path": sonar_img.enhanced_path,
        "sha256_hash": file_hash,
        "uploaded_at": timestamp
    }

@router.post("/{image_id}/enhance")
def enhance_sonar_image(
    image_id: int,
    params: PreprocessParams,
    db: Session = Depends(get_db)
):
    """Capability 2: Configurable Sonar Image Enhancement."""
    img_record = db.query(SonarImage).filter(SonarImage.id == image_id).first()
    if not img_record:
        raise HTTPException(status_code=404, detail="Sonar image not found")

    enhanced_filename = f"enhanced_{image_id}_{params.colormap}_{int(params.clahe_clip_limit*10)}.jpg"
    enhanced_out = PROCESSED_DIR / enhanced_filename

    stats = SonarProcessor.process_full_pipeline(
        img_record.original_path,
        str(enhanced_out),
        clip_limit=params.clahe_clip_limit,
        tile_size=params.clahe_tile_grid_size,
        enable_speckle=params.speckle_reduction,
        enable_clahe=params.apply_clahe,
        enable_contrast_stretch=params.contrast_stretch,
        colormap=params.colormap
    )

    img_record.enhanced_path = f"/api/sonar/files/{enhanced_filename}"
    db.commit()

    return {
        "image_id": image_id,
        "enhanced_url": img_record.enhanced_path,
        "metrics": stats
    }

@router.post("/{image_id}/detect")
def detect_objects(
    image_id: int,
    params: Optional[InferenceParams] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Capabilities 1, 3, 5, 6, 7, 8: AI Detection, Shadow Measurement & Explainability."""
    if params is None:
        params = InferenceParams()

    img_record = db.query(SonarImage).filter(SonarImage.id == image_id).first()
    if not img_record:
        raise HTTPException(status_code=404, detail="Sonar image not found")

    # Clear previous unconfirmed detections for this image
    db.query(Detection).filter(
        Detection.image_id == image_id,
        Detection.review_status.in_(["pending", "pending_analyst_review"])
    ).delete()

    # Use bounded processing copy if available to keep RAM low (Step 9)
    proc_file = PROCESSED_DIR / f"proc_{image_id}.jpg"
    target_path = str(proc_file) if proc_file.exists() else img_record.original_path

    t0 = time.time()
    print(f"[AquaSentinel AI] AI INFERENCE START: Image ID {image_id}")

    raw_detections = SonarInferenceEngine.run_detection(
        target_path,
        image_id=image_id,
        confidence_threshold=params.confidence_threshold,
        uncertainty_threshold=params.uncertainty_threshold,
        is_calibrated=params.is_calibrated,
        calibration_m_per_px=params.calibration_m_per_px,
        model_version=params.model_version or "AquaNeural-PyTorch-ResNet-1.0",
        sensor_altitude=params.sensor_altitude or 12.0,
        swath_range=params.swath_range or 75.0,
        enable_saliency=params.enable_saliency,
        scenario_override=params.scenario_override
    )

    elapsed = time.time() - t0
    print(f"[AquaSentinel AI] AI INFERENCE COMPLETE: Image ID {image_id}, {len(raw_detections)} detections in {elapsed:.3f}s")

    # Compute baseline environmental profile for this image
    raw_gray = SonarProcessor.load_sonar_image(target_path)
    env_profile = SonarProcessor.compute_environmental_profile(raw_gray, scenario_override=params.scenario_override)

    saved_detections = []
    for d in raw_detections:
        det = Detection(
            image_id=image_id,
            class_name=d["class_name"],
            canonical_class=d["canonical_class"],
            category=d.get("category", "Man-Made Object"),
            confidence=d["confidence"],
            environment_compatibility=d.get("environment_compatibility"),
            final_decision=d.get("final_decision"),
            decision_code=d.get("decision_code"),
            environmental_profile=d.get("environmental_profile", env_profile),
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
        saved_detections.append(det)

    db.commit()

    det_dicts = []
    for det in saved_detections:
        det_dicts.append({
            "id": det.id,
            "image_id": det.image_id,
            "class_name": det.class_name,
            "canonical_class": det.canonical_class,
            "category": det.category or "Man-Made Object",
            "confidence": det.confidence,
            "environment_compatibility": det.environment_compatibility,
            "final_decision": det.final_decision,
            "decision_code": det.decision_code,
            "environmental_profile": det.environmental_profile if isinstance(det.environmental_profile, dict) else env_profile,
            "bbox_x": det.bbox_x,
            "bbox_y": det.bbox_y,
            "bbox_w": det.bbox_w,
            "bbox_h": det.bbox_h,
            "length_px": det.length_px,
            "width_px": det.width_px,
            "length_meters": det.length_meters,
            "width_meters": det.width_meters,
            "estimated_height_m": det.estimated_height_m,
            "shadow_length_px": det.shadow_length_px,
            "is_calibrated": det.is_calibrated,
            "calibration_status": det.calibration_status,
            "hazard_score": det.hazard_score,
            "hazard_type": det.hazard_type,
            "uncertainty_score": det.uncertainty_score,
            "requires_human_review": det.requires_human_review,
            "review_status": det.review_status,
            "review_reason": det.review_reason,
            "saliency_heatmap_path": det.saliency_heatmap_path,
            "model_version": det.model_version,
            "created_at": det.created_at.isoformat() if det.created_at else None
        })

    # Log audit
    log = AuditLog(
        action="RUN_DETECTION",
        user_email=current_user.email,
        resource_type="SonarImage",
        resource_id=str(image_id),
        details={"model": params.model_version, "detection_count": len(det_dicts), "is_calibrated": params.is_calibrated}
    )
    db.add(log)
    db.commit()

    active_profile = det_dicts[0]["environmental_profile"] if det_dicts else env_profile

    return {
        "image_id": image_id,
        "detection_count": len(det_dicts),
        "detections": det_dicts,
        "environmental_profile": active_profile,
        "is_calibrated": params.is_calibrated,
        "saliency_url": det_dicts[0]["saliency_heatmap_path"] if det_dicts else None
    }

@router.post("/{image_id}/explain")
def explain_detection(
    image_id: int,
    req: Optional[ExplainRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Capability 8 & Step 15/17: On-demand targeted PyTorch Grad-CAM explainability."""
    img_record = db.query(SonarImage).filter(SonarImage.id == image_id).first()
    if not img_record:
        raise HTTPException(status_code=404, detail="Sonar image not found")

    det_query = db.query(Detection).filter(Detection.image_id == image_id)
    if req and req.detection_id:
        target_det = det_query.filter(Detection.id == req.detection_id).first()
    else:
        target_det = det_query.first()

    target_class = target_det.canonical_class if target_det else None

    # Load bounded copy or original safely
    proc_file = PROCESSED_DIR / f"proc_{image_id}.jpg"
    target_path = str(proc_file) if proc_file.exists() else img_record.original_path

    saliency_url = SonarInferenceEngine.generate_saliency_map(
        target_path,
        image_id=image_id,
        target_canonical_class=target_class
    )

    if saliency_url and target_det:
        target_det.saliency_heatmap_path = saliency_url
        db.commit()

    return {
        "image_id": image_id,
        "detection_id": target_det.id if target_det else None,
        "saliency_url": saliency_url
    }

@router.get("/scenarios")
def get_seabed_scenarios():
    """
    Returns the three canonical environmental seabed scenarios for demonstration:
    - Scenario A: Sandy / Sedimentary (Familiar, high confidence, accepted)
    - Scenario B: Rocky / Mixed (Different seabed, acoustic clutter, environment mismatch)
    - Scenario C: Variable / Unknown (Severe noise, low confidence, unable to verify)
    Includes the comparative matrix for the Environmental Profile view.
    """
    return {
        "scenarios": [
            {
                "id": "scenario_a",
                "code": "sandy",
                "name": "Scenario A – Familiar Seabed",
                "seabed_type": "Sandy / Sedimentary",
                "texture": "Smooth",
                "surface_variation": "Low",
                "sonar_noise": "Low",
                "clutter_level": "Low",
                "environmental_confidence": 0.94,
                "expected_object": "Man-Made Object",
                "expected_object_confidence": 0.93,
                "expected_compatibility": 0.91,
                "expected_decision": "Man-Made Object",
                "decision_badge": "Accepted",
                "status_color": "emerald",
                "description": "Homogeneous sedimentary seafloor with minimal acoustic clutter; ideal acoustic propagation and shadow fidelity."
            },
            {
                "id": "scenario_b",
                "code": "rocky",
                "name": "Scenario B – Different Seabed",
                "seabed_type": "Rocky / Mixed",
                "texture": "Rough",
                "surface_variation": "High",
                "sonar_noise": "Medium",
                "clutter_level": "Medium",
                "environmental_confidence": 0.86,
                "expected_object": "Suspicious Contact",
                "expected_object_confidence": 0.78,
                "expected_compatibility": 0.68,
                "expected_decision": "Environment Mismatch -> Human Review Required",
                "decision_badge": "Environment Mismatch",
                "status_color": "amber",
                "description": "Heterogeneous benthic substrate with rock ridges mimicking man-made acoustic signatures; requires human analyst verification."
            },
            {
                "id": "scenario_c",
                "code": "variable",
                "name": "Scenario C – Unknown / Harsh Seabed",
                "seabed_type": "Variable / Unknown",
                "texture": "Irregular",
                "surface_variation": "High",
                "sonar_noise": "High",
                "clutter_level": "High",
                "environmental_confidence": 0.54,
                "expected_object": "Ambiguous Region",
                "expected_object_confidence": 0.54,
                "expected_compatibility": 0.39,
                "expected_decision": "Unable to Verify -> Human Expert Review",
                "decision_badge": "Unable to Verify",
                "status_color": "rose",
                "description": "Turbulent acoustic zone with high reverberation and severe clutter; triggers automated uncertainty gate."
            }
        ],
        "comparison_matrix": [
            {"feature": "Seabed Type", "scenario_a": "Sandy / Sedimentary", "scenario_b": "Rocky / Mixed", "scenario_c": "Variable / Unknown"},
            {"feature": "Seabed Texture", "scenario_a": "Smooth", "scenario_b": "Rough", "scenario_c": "Irregular"},
            {"feature": "Surface Variation", "scenario_a": "Low", "scenario_b": "High", "scenario_c": "High"},
            {"feature": "Sonar Noise", "scenario_a": "Low", "scenario_b": "Medium", "scenario_c": "High"},
            {"feature": "Clutter Level", "scenario_a": "Low", "scenario_b": "Medium", "scenario_c": "High"},
            {"feature": "Environmental Confidence", "scenario_a": "94%", "scenario_b": "86%", "scenario_c": "54%"},
            {"feature": "Object Confidence", "scenario_a": "93%", "scenario_b": "78%", "scenario_c": "54%"},
            {"feature": "Compatibility Score", "scenario_a": "91%", "scenario_b": "68%", "scenario_c": "39%"},
            {"feature": "Final Decision", "scenario_a": "Accepted (Man-Made Object)", "scenario_b": "Environment Mismatch -> Human Review", "scenario_c": "Unable to Verify -> Human Expert Review"}
        ]
    }

@router.get("/{image_id}/detections")
def get_image_detections(image_id: int, db: Session = Depends(get_db)):
    """Retrieves all stored detections for a specific sonar image."""
    detections = db.query(Detection).filter(Detection.image_id == image_id).all()
    det_dicts = []
    for det in detections:
        det_dicts.append({
            "id": det.id,
            "image_id": det.image_id,
            "class_name": det.class_name,
            "canonical_class": det.canonical_class,
            "category": det.category or "Man-Made Object",
            "confidence": det.confidence,
            "environment_compatibility": det.environment_compatibility,
            "final_decision": det.final_decision,
            "decision_code": det.decision_code,
            "environmental_profile": det.environmental_profile,
            "bbox_x": det.bbox_x,
            "bbox_y": det.bbox_y,
            "bbox_w": det.bbox_w,
            "bbox_h": det.bbox_h,
            "length_px": det.length_px,
            "width_px": det.width_px,
            "length_meters": det.length_meters,
            "width_meters": det.width_meters,
            "estimated_height_m": det.estimated_height_m,
            "shadow_length_px": det.shadow_length_px,
            "is_calibrated": det.is_calibrated,
            "calibration_status": det.calibration_status,
            "hazard_score": det.hazard_score,
            "hazard_type": det.hazard_type,
            "uncertainty_score": det.uncertainty_score,
            "requires_human_review": det.requires_human_review,
            "review_status": det.review_status,
            "review_reason": det.review_reason,
            "saliency_heatmap_path": det.saliency_heatmap_path,
            "model_version": det.model_version,
            "created_at": det.created_at.isoformat() if det.created_at else None
        })
    return det_dicts

@router.post("/{image_id}/measure")
def measure_acoustic_shadow(
    image_id: int,
    bbox_x: float = Form(...),
    bbox_y: float = Form(...),
    bbox_w: float = Form(...),
    bbox_h: float = Form(...),
    sensor_altitude: float = Form(12.0),
    swath_range: float = Form(75.0),
    is_calibrated: bool = Form(False),
    calibration_m_per_px: Optional[float] = Form(None),
    db: Session = Depends(get_db)
):
    """Capability 8: Physical Object & Acoustic Shadow Trigonometric Measurement."""
    img_record = db.query(SonarImage).filter(SonarImage.id == image_id).first()
    if not img_record:
        raise HTTPException(status_code=404, detail="Sonar image not found")

    raw_gray = SonarProcessor.load_sonar_image(img_record.original_path)
    h, w = raw_gray.shape

    px_x = int(bbox_x * w)
    px_y = int(bbox_y * h)
    px_w = int(bbox_w * w)
    px_h = int(bbox_h * h)

    shadow_info = SonarProcessor.extract_shadow_profile(
        raw_gray,
        (px_x, px_y, px_w, px_h),
        altitude_m=sensor_altitude,
        range_m=swath_range,
        calibration_m_per_px=calibration_m_per_px,
        is_calibrated=is_calibrated
    )

    length_px = max(px_w, px_h)
    width_px = min(px_w, px_h)

    return {
        "image_id": image_id,
        "pixel_box": {"x": px_x, "y": px_y, "w": px_w, "h": px_h},
        "length_px": length_px,
        "width_px": width_px,
        "calibrated_length_meters": shadow_info.get("shadow_length_meters") if is_calibrated else None,
        "calibrated_width_meters": round(width_px * shadow_info.get("px_resolution_m", 0.05), 2) if is_calibrated else None,
        "shadow_length_px": shadow_info["shadow_length_px"],
        "shadow_length_meters": shadow_info["shadow_length_meters"],
        "estimated_relief_height_meters": shadow_info["estimated_height_meters"],
        "is_calibrated": is_calibrated,
        "calibration_basis": "Verified Towfish Telemetry" if is_calibrated else "Uncalibrated - Pixel Dimensions Only"
    }

@router.get("/raw/{image_id}")
def get_raw_image(image_id: int, db: Session = Depends(get_db)):
    img_record = db.query(SonarImage).filter(SonarImage.id == image_id).first()
    if not img_record:
        raise HTTPException(status_code=404, detail="Image record not found")
    if os.path.exists(img_record.original_path):
        return FileResponse(img_record.original_path)
    
    # Graceful cloud fallback if ephemeral disk wiped uploaded cache
    fallback_path = PROCESSED_DIR / f"fallback_{image_id}.png"
    if not fallback_path.exists():
        import cv2
        import numpy as np
        fh = img_record.height or 384
        fw = img_record.width or 512
        synth = np.full((fh, fw), 40, dtype=np.uint8)
        noise = np.random.randint(-10, 10, (fh, fw), dtype=np.int16)
        synth = np.clip(synth.astype(np.int16) + noise, 0, 255).astype(np.uint8)
        cv2.imwrite(str(fallback_path), synth)
    return FileResponse(str(fallback_path))

@router.get("/files/{filename}")
def get_processed_file(filename: str):
    file_path = PROCESSED_DIR / filename
    if not file_path.exists():
        fallback = PROCESSED_DIR / "placeholder_sonar.png"
        if not fallback.exists():
            import cv2
            import numpy as np
            cv2.imwrite(str(fallback), np.full((384, 512, 3), (35, 25, 15), dtype=np.uint8))
        return FileResponse(str(fallback))
    return FileResponse(str(file_path))

@router.get("/reports/{filename}")
def get_report_file(filename: str):
    file_path = REPORTS_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Report not found")
    return FileResponse(str(file_path))

@router.post("/export/{survey_id}/pdf")
def export_pdf(survey_id: int, db: Session = Depends(get_db)):
    """Capability 13: Export inspection report in PDF format."""
    survey = db.query(Survey).filter(Survey.id == survey_id).first()
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")

    detections = db.query(Detection).join(SonarImage).filter(SonarImage.survey_id == survey_id).all()
    det_dicts = [
        {
            "id": d.id, "class_name": d.class_name, "confidence": d.confidence,
            "length_meters": d.length_meters, "estimated_height_m": d.estimated_height_m,
            "hazard_score": d.hazard_score, "review_status": d.review_status
        }
        for d in detections
    ]

    survey_dict = {
        "survey_code": survey.survey_code, "name": survey.name, "survey_date": survey.survey_date,
        "platform": survey.platform, "sensor_model": survey.sensor_model,
        "frequency_khz": survey.frequency_khz, "range_meters": survey.range_meters,
        "latitude": survey.latitude, "longitude": survey.longitude, "seabed_type": survey.seabed_type
    }

    url = ReportGenerator.generate_pdf_report(survey_dict, det_dicts)
    return {"download_url": url}

@router.post("/export/{survey_id}/csv")
def export_csv(survey_id: int, db: Session = Depends(get_db)):
    survey = db.query(Survey).filter(Survey.id == survey_id).first()
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")

    detections = db.query(Detection).join(SonarImage).filter(SonarImage.survey_id == survey_id).all()
    det_dicts = [
        {
            "id": d.id, "class_name": d.class_name, "confidence": d.confidence,
            "bbox_x": d.bbox_x, "bbox_y": d.bbox_y, "bbox_w": d.bbox_w, "bbox_h": d.bbox_h,
            "length_meters": d.length_meters, "width_meters": d.width_meters,
            "estimated_height_m": d.estimated_height_m, "shadow_length_px": d.shadow_length_px,
            "hazard_score": d.hazard_score, "hazard_type": d.hazard_type,
            "uncertainty_score": d.uncertainty_score, "review_status": d.review_status,
            "reviewed_class": d.reviewed_class, "model_version": d.model_version
        }
        for d in detections
    ]

    url = ReportGenerator.generate_csv_report({"survey_code": survey.survey_code}, det_dicts)
    return {"download_url": url}

@router.post("/export/{survey_id}/json")
def export_json(survey_id: int, db: Session = Depends(get_db)):
    survey = db.query(Survey).filter(Survey.id == survey_id).first()
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")

    detections = db.query(Detection).join(SonarImage).filter(SonarImage.survey_id == survey_id).all()
    det_dicts = [
        {
            "id": d.id, "class_name": d.class_name, "confidence": d.confidence,
            "length_meters": d.length_meters, "hazard_score": d.hazard_score,
            "review_status": d.review_status, "model_version": d.model_version
        }
        for d in detections
    ]

    url = ReportGenerator.generate_json_report({"survey_code": survey.survey_code, "name": survey.name}, det_dicts)
    return {"download_url": url}
