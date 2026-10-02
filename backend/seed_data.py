import os
import shutil
import hashlib
import cv2
import numpy as np
from pathlib import Path
from datetime import datetime
from backend.config import UPLOAD_DIR, PROCESSED_DIR, DATA_DIR, settings
from backend.database import SessionLocal, engine, Base
from backend.models import User, Survey, SonarImage, Detection, DatasetSource, ModelRecord, AuditLog
from backend.auth import get_password_hash
from backend.services.sonar_processing import SonarProcessor
from backend.services.dataset_manager import DatasetManager

def seed_database():
    print("[Seed] Creating all database tables...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # 1. Seed Demo User
        demo_user = db.query(User).filter(User.email == settings.DEMO_USER_EMAIL).first()
        if not demo_user:
            demo_user = User(
                email=settings.DEMO_USER_EMAIL,
                hashed_password=get_password_hash(settings.DEMO_USER_PASSWORD),
                full_name="Dr. Vikram Sen (Lead Marine Scientist)",
                role="Lead Marine Scientist",
                organization="Ministry of Earth Sciences (MoES)",
                is_active=True
            )
            db.add(demo_user)
            db.commit()
            print("[Seed] Demo user created:", demo_user.email)

        # 2. Seed Dataset Sources
        if db.query(DatasetSource).count() == 0:
            for item in DatasetManager.get_catalog():
                ds = DatasetSource(
                    code=item["code"],
                    name=item["name"],
                    official_url=item["official_url"],
                    publisher=item["publisher"],
                    license=item["license"],
                    sensor_type=item["sensor_type"],
                    target_count=item["target_count"],
                    annotated_count=item.get("annotated_count", 0),
                    storage_path=item["storage_path"],
                    status="Cataloged / Available for Sync",
                    notes=item.get("notes")
                )
                db.add(ds)
            db.commit()
            print("[Seed] Dataset sources cataloged.")

        # 3. Seed Model Records
        if db.query(ModelRecord).count() == 0:
            models = [
                ModelRecord(
                    name="AquaYOLO-v8s-Sonar",
                    version="v1.2.0-production",
                    architecture="YOLOv8s-Sonar",
                    task="Side-Scan Sonar Acoustic Target Detection",
                    input_resolution="640x640",
                    classes=["Subsea Pipeline", "Shipwreck", "MILCO", "NOMBO", "Human Surrogate", "Debris"],
                    map50=0.865,
                    map50_95=0.642,
                    precision=0.884,
                    recall=0.829,
                    f1_score=0.855,
                    latency_ms=16.8,
                    model_size_mb=21.8,
                    training_dataset="SubPipe-Verified-Split-10K",
                    status="Active",
                    hardware_target="NVIDIA RTX 4050 / TensorRT"
                ),
                ModelRecord(
                    name="AquaYOLO-v9c-Acoustic",
                    version="v2.0.0-candidate",
                    architecture="YOLOv9c-GELAN",
                    task="Multi-Class Sonar Anomaly Segmentation",
                    input_resolution="800x800",
                    classes=["Subsea Pipeline", "Shipwreck", "MILCO", "NOMBO", "Human Surrogate", "Debris"],
                    map50=0.892,
                    map50_95=0.684,
                    precision=0.901,
                    recall=0.864,
                    f1_score=0.882,
                    latency_ms=28.4,
                    model_size_mb=48.2,
                    training_dataset="SubPipe + AI4Shipwrecks Hybrid Split",
                    status="Candidate",
                    hardware_target="NVIDIA RTX 4050 (CUDA 13.1)"
                ),
                ModelRecord(
                    name="EdgeSonar-Nano-Quant",
                    version="v1.0-edge-int8",
                    architecture="YOLOv8n-INT8-ONNX",
                    task="AUV Low-Power Real-Time Edge Processing",
                    input_resolution="416x416",
                    classes=["Subsea Pipeline", "Shipwreck", "MILCO", "NOMBO", "Human Surrogate", "Debris"],
                    map50=0.798,
                    map50_95=0.551,
                    precision=0.821,
                    recall=0.774,
                    f1_score=0.797,
                    latency_ms=5.4,
                    model_size_mb=6.1,
                    training_dataset="SubPipe-Verified-Split-10K",
                    status="Benchmark",
                    hardware_target="Embedded Jetson Orin / ONNX Runtime"
                )
            ]
            for m in models:
                db.add(m)
            db.commit()
            print("[Seed] Model registry populated.")

        # 4. Seed Surveys
        if db.query(Survey).count() == 0:
            surveys = [
                Survey(
                    name="Arabian Sea Continental Shelf Pipeline Survey",
                    survey_code="AQ-SRV-2026-001",
                    platform="Autonomous Underwater Vehicle (AUV DeepScan-4)",
                    sensor_model="Klein 3900 High-Resolution Dual Frequency",
                    frequency_khz=455.0,
                    range_meters=75.0,
                    location_name="Mumbai High Offshore Basin",
                    latitude=18.9220,
                    longitude=72.8347,
                    water_depth_meters=42.5,
                    seabed_type="Sandy Silt with Acoustic Sand Ripples",
                    status="Completed",
                    notes="Systematic swath survey for subsea pipeline free span and foreign debris detection."
                ),
                Survey(
                    name="Bay of Bengal Coral Margin Reconnaissance",
                    survey_code="AQ-SRV-2026-002",
                    platform="Towfish Sensor Array (Edgetech 4200)",
                    sensor_model="Edgetech 4200-MP Side-Scan Sonar",
                    frequency_khz=300.0,
                    range_meters=100.0,
                    location_name="Offshore Chennai Outer Swath",
                    latitude=13.0827,
                    longitude=80.2707,
                    water_depth_meters=68.0,
                    seabed_type="Coarse Sand & Biogenic Gravel",
                    status="In Progress",
                    notes="Ghost fishing gear and derelict marine debris mapping."
                ),
                Survey(
                    name="Goa Coastal Archaeological Sonar Swath",
                    survey_code="AQ-SRV-2026-003",
                    platform="Remote Operated Vehicle (ROV OceanEye)",
                    sensor_model="Tritech StarFish 990F Ultra-High Res",
                    frequency_khz=990.0,
                    range_meters=40.0,
                    location_name="Aguada Reef Marine Sanctuary",
                    latitude=15.4920,
                    longitude=73.7730,
                    water_depth_meters=24.0,
                    seabed_type="Rocky Reef Margin & Sediment Pocket",
                    status="Completed",
                    notes="Historic maritime shipwreck structural survey."
                )
            ]
            for s in surveys:
                db.add(s)
            db.commit()
            print("[Seed] Surveys created.")

        # 5. Generate and seed realistic Sonar Images with detections
        if db.query(SonarImage).count() == 0:
            survey_1 = db.query(Survey).filter(Survey.survey_code == "AQ-SRV-2026-001").first()
            
            # Create synthetic but realistic side-scan sonar waterfall slices
            sample_configs = [
                {
                    "filename": "SSS_Ping_Line_042_Pipeline.png",
                    "lat": 18.9222, "lon": 72.8349,
                    "target": "pipeline",
                    "class_name": "Subsea Pipeline",
                    "canonical": "subsea_pipeline",
                    "conf": 0.92,
                    "bbox": [0.15, 0.42, 0.70, 0.14],
                    "length_m": 52.5, "width_m": 0.85, "height_m": 1.1, "shadow_px": 38.0,
                    "hazard": 0.88, "hazard_type": "Subsea Pipeline Free Span",
                    "review": "confirmed",
                    "notes": "Verified exposed pipeline span over seabed depression."
                },
                {
                    "filename": "SSS_Ping_Line_089_Shipwreck.png",
                    "lat": 18.9238, "lon": 72.8365,
                    "target": "shipwreck",
                    "class_name": "Shipwreck / Vessel Ruin",
                    "canonical": "shipwreck",
                    "conf": 0.95,
                    "bbox": [0.38, 0.32, 0.32, 0.42],
                    "length_m": 24.0, "width_m": 7.5, "height_m": 3.8, "shadow_px": 65.0,
                    "hazard": 0.75, "hazard_type": "Navigation Obstacle",
                    "review": "confirmed",
                    "notes": "Confirmed wooden hull vessel ruin with intact acoustic shadow cast."
                },
                {
                    "filename": "SSS_Ping_Line_114_MILCO.png",
                    "lat": 18.9215, "lon": 72.8332,
                    "target": "milco",
                    "class_name": "Mine-Like Contact (MILCO)",
                    "canonical": "mine_like_contact",
                    "conf": 0.84,
                    "bbox": [0.62, 0.55, 0.12, 0.16],
                    "length_m": 2.2, "width_m": 1.1, "height_m": 0.9, "shadow_px": 24.0,
                    "hazard": 0.95, "hazard_type": "High Explosive Ordnance Alert",
                    "review": "pending",
                    "notes": "Awaiting military diver / EOD confirmation."
                },
                {
                    "filename": "SSS_Ping_Line_156_GhostNet.png",
                    "lat": 18.9245, "lon": 72.8378,
                    "target": "debris",
                    "class_name": "Unclassified Marine Debris / Anomaly",
                    "canonical": "unclassified_debris",
                    "conf": 0.79,
                    "bbox": [0.28, 0.60, 0.22, 0.25],
                    "length_m": 8.5, "width_m": 4.2, "height_m": 0.5, "shadow_px": 15.0,
                    "hazard": 0.70, "hazard_type": "Ghost Fishing Gear / Cetacean Risk",
                    "review": "pending",
                    "notes": "Diffuse echo return consistent with synthetic monofilament netting."
                }
            ]

            for idx, sc in enumerate(sample_configs):
                img_path = UPLOAD_DIR / sc["filename"]
                
                # Synthesize acoustic backscatter matrix
                h, w = 600, 800
                sonar_matrix = np.zeros((h, w), dtype=np.uint8)

                # Base acoustic reverberation with nadir line down center
                center_x = w // 2
                for x in range(w):
                    dist = abs(x - center_x)
                    if dist < 35:
                        val = int(15 + np.random.normal(0, 4))
                    else:
                        decay = max(0.25, 1.0 - (dist / center_x) * 0.6)
                        val = int((95 + np.sin(x * 0.05) * 12 + np.random.normal(0, 10)) * decay)
                    sonar_matrix[:, x] = np.clip(val, 0, 255)

                # Add specific target highlight and shadow
                bx, by, bw, bh = int(sc["bbox"][0]*w), int(sc["bbox"][1]*h), int(sc["bbox"][2]*w), int(sc["bbox"][3]*h)
                
                # Highlight (bright return)
                sonar_matrix[by:by+bh, bx:bx+bw//2] = np.clip(sonar_matrix[by:by+bh, bx:bx+bw//2] + 130, 0, 255)
                # Shadow (dark absorption zone)
                sonar_matrix[by:by+bh, bx+bw//2:bx+bw] = np.clip(sonar_matrix[by:by+bh, bx+bw//2:bx+bw] - 80, 5, 255)

                cv2.imwrite(str(img_path), sonar_matrix)

                # SHA256
                hasher = hashlib.sha256()
                with open(img_path, "rb") as f:
                    hasher.update(f.read())
                sha = hasher.hexdigest()

                # Save enhanced
                enh_filename = f"enhanced_seed_{idx+1}.jpg"
                enh_path = PROCESSED_DIR / enh_filename
                SonarProcessor.process_full_pipeline(str(img_path), str(enh_path), colormap="sonar_copper")

                # Saliency heatmap
                saliency_map = np.zeros((h, w), dtype=np.float32)
                cv2.rectangle(saliency_map, (bx, by), (bx+bw, by+bh), sc["conf"], -1)
                saliency_map = cv2.GaussianBlur(saliency_map, (45, 45), 0)
                norm_heat = (np.clip(saliency_map / (np.max(saliency_map) + 1e-5), 0, 1) * 255).astype(np.uint8)
                colored_heat = cv2.applyColorMap(norm_heat, cv2.COLORMAP_JET)
                base_bgr = cv2.cvtColor(sonar_matrix, cv2.COLOR_GRAY2BGR)
                blended = cv2.addWeighted(base_bgr, 0.6, colored_heat, 0.4, 0)
                saliency_filename = f"saliency_seed_{idx+1}.jpg"
                cv2.imwrite(str(PROCESSED_DIR / saliency_filename), blended)

                # Save SonarImage record
                simg = SonarImage(
                    survey_id=survey_1.id,
                    filename=sc["filename"],
                    original_path=str(img_path),
                    enhanced_path=f"/api/sonar/files/{enh_filename}",
                    sha256_hash=sha,
                    width=w,
                    height=h,
                    channels=1,
                    file_size_bytes=int(img_path.stat().st_size),
                    is_valid=True,
                    latitude=sc["lat"],
                    longitude=sc["lon"],
                    altitude_meters=12.0,
                    resolution_m_per_px=0.05,
                    dataset_source="MoES Survey Ingest",
                    split_group="train" if idx % 2 == 0 else "test"
                )
                db.add(simg)
                db.commit()
                db.refresh(simg)

                # Save Detection record
                det = Detection(
                    image_id=simg.id,
                    class_name=sc["class_name"],
                    canonical_class=sc["canonical"],
                    confidence=sc["conf"],
                    bbox_x=sc["bbox"][0],
                    bbox_y=sc["bbox"][1],
                    bbox_w=sc["bbox"][2],
                    bbox_h=sc["bbox"][3],
                    length_meters=sc["length_m"],
                    width_meters=sc["width_m"],
                    estimated_height_m=sc["height_m"],
                    shadow_length_px=sc["shadow_px"],
                    hazard_score=sc["hazard"],
                    hazard_type=sc["hazard_type"],
                    uncertainty_score=round(1.0 - sc["conf"], 2),
                    saliency_heatmap_path=f"/api/sonar/files/{saliency_filename}",
                    review_status=sc["review"],
                    reviewed_class=sc["class_name"] if sc["review"] == "confirmed" else None,
                    reviewer_notes=sc["notes"],
                    reviewed_by="demo@aquasentinel.ocean" if sc["review"] == "confirmed" else None,
                    reviewed_at=datetime.utcnow() if sc["review"] == "confirmed" else None,
                    model_version="AquaYOLO-v8s-Sonar-1.0"
                )
                db.add(det)
                db.commit()

            print("[Seed] Sonar images and acoustic detections populated.")

        # 6. Generate Initial Dataset Manifest
        DatasetManager.generate_manifest()
        print("[Seed] Initial dataset manifest generated.")

    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
