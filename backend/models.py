import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from backend.database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), default="AquaSentinel Operator")
    role = Column(String(50), default="Lead Marine Scientist")  # Operator, Scientist, Commander, Admin
    organization = Column(String(255), default="Ministry of Earth Sciences (MoES)")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Survey(Base):
    __tablename__ = "surveys"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), index=True, nullable=False)
    survey_code = Column(String(100), unique=True, index=True)
    survey_date = Column(DateTime, default=datetime.datetime.utcnow)
    platform = Column(String(100), default="Autonomous Underwater Vehicle (AUV)")  # AUV, Towfish, ROV, Surface Vessel
    sensor_model = Column(String(100), default="Klein 3900 High-Resolution Dual Frequency")
    frequency_khz = Column(Float, default=455.0)
    range_meters = Column(Float, default=75.0)
    location_name = Column(String(255), default="Arabian Sea Outer Continental Shelf")
    latitude = Column(Float, default=18.9220)
    longitude = Column(Float, default=72.8347)
    water_depth_meters = Column(Float, default=42.5)
    seabed_type = Column(String(100), default="Sandy Silt with Acoustic Ripple Patterns")
    status = Column(String(50), default="Completed")  # In Progress, Processing, Completed, Archived
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    images = relationship("SonarImage", back_populates="survey", cascade="all, delete-orphan")

class SonarImage(Base):
    __tablename__ = "sonar_images"
    
    id = Column(Integer, primary_key=True, index=True)
    survey_id = Column(Integer, ForeignKey("surveys.id"), nullable=True)
    filename = Column(String(255), nullable=False)
    original_path = Column(String(500), nullable=False)
    enhanced_path = Column(String(500), nullable=True)
    thumbnail_path = Column(String(500), nullable=True)
    sha256_hash = Column(String(64), index=True)
    width = Column(Integer, default=0)
    height = Column(Integer, default=0)
    channels = Column(Integer, default=1)
    file_size_bytes = Column(Integer, default=0)
    is_valid = Column(Boolean, default=True)
    validation_notes = Column(Text, nullable=True)
    is_duplicate = Column(Boolean, default=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    altitude_meters = Column(Float, default=12.0)
    resolution_m_per_px = Column(Float, default=0.05)  # 5cm per pixel calibration
    dataset_source = Column(String(100), default="Survey Upload")  # SubPipe, AI4Shipwrecks, MILCO, etc.
    split_group = Column(String(50), default="unassigned")  # train, val, test, unassigned
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    survey = relationship("Survey", back_populates="images")
    detections = relationship("Detection", back_populates="image", cascade="all, delete-orphan")

class Detection(Base):
    __tablename__ = "detections"
    
    id = Column(Integer, primary_key=True, index=True)
    image_id = Column(Integer, ForeignKey("sonar_images.id"), nullable=False)
    class_name = Column(String(100), nullable=False)
    canonical_class = Column(String(100), nullable=False)
    confidence = Column(Float, nullable=False)
    # Normalized coords [0.0 - 1.0]
    bbox_x = Column(Float, nullable=False)
    bbox_y = Column(Float, nullable=False)
    bbox_w = Column(Float, nullable=False)
    bbox_h = Column(Float, nullable=False)
    # Physical & Pixel measurements
    length_meters = Column(Float, nullable=True)
    width_meters = Column(Float, nullable=True)
    length_px = Column(Integer, nullable=True)
    width_px = Column(Integer, nullable=True)
    estimated_height_m = Column(Float, nullable=True)
    shadow_length_px = Column(Float, nullable=True)
    is_calibrated = Column(Boolean, default=False)
    calibration_status = Column(String(50), default="uncalibrated_pixel_dimensions")
    hazard_score = Column(Float, default=0.5)  # 0.0 - 1.0 hazard prioritization
    hazard_type = Column(String(100), default="Subsea Obstacle")
    # Explainable AI & Uncertainty
    uncertainty_score = Column(Float, default=0.15)
    saliency_heatmap_path = Column(String(500), nullable=True)
    # Environment-Aware Sonar Intelligence
    category = Column(String(100), default="Man-Made Object")
    environment_compatibility = Column(Float, nullable=True)
    final_decision = Column(String(100), nullable=True)
    decision_code = Column(String(50), nullable=True)
    environmental_profile = Column(JSON, nullable=True)
    # Human-in-the-loop review
    requires_human_review = Column(Boolean, default=False)
    review_status = Column(String(50), default="pending")  # pending, confirmed, rejected, relabeled, pending_analyst_review
    review_reason = Column(Text, nullable=True)
    reviewed_class = Column(String(100), nullable=True)
    reviewer_notes = Column(Text, nullable=True)
    reviewed_by = Column(String(255), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    # Provenance
    model_version = Column(String(100), default="AquaYOLO-v8s-Sonar-1.0")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    image = relationship("SonarImage", back_populates="detections")

class DatasetSource(Base):
    __tablename__ = "dataset_sources"
    
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True)
    name = Column(String(255), nullable=False)
    official_url = Column(String(500), nullable=False)
    publisher = Column(String(255), nullable=False)
    license = Column(String(100), default="Open Access Research")
    sensor_type = Column(String(100), default="Side-Scan Sonar")
    target_count = Column(Integer, default=0)
    downloaded_count = Column(Integer, default=0)
    valid_count = Column(Integer, default=0)
    unique_count = Column(Integer, default=0)
    annotated_count = Column(Integer, default=0)
    unannotated_count = Column(Integer, default=0)
    rejected_count = Column(Integer, default=0)
    status = Column(String(50), default="Configured")  # Configured, Downloading, Validated, Ready, Incomplete
    is_enabled = Column(Boolean, default=True)
    storage_path = Column(String(500), nullable=True)
    notes = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)

class ModelRecord(Base):
    __tablename__ = "model_records"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    version = Column(String(50), unique=True, nullable=False)
    architecture = Column(String(100), default="YOLOv8s-Sonar")
    task = Column(String(100), default="Object Detection & Anomaly Recognition")
    input_resolution = Column(String(50), default="640x640")
    classes = Column(JSON, default=list)
    map50 = Column(Float, default=0.0)
    map50_95 = Column(Float, default=0.0)
    precision = Column(Float, default=0.0)
    recall = Column(Float, default=0.0)
    f1_score = Column(Float, default=0.0)
    latency_ms = Column(Float, default=18.4)
    model_size_mb = Column(Float, default=22.5)
    training_dataset = Column(String(255), default="SubPipe-Verified-Split-10K")
    weights_path = Column(String(500), nullable=True)
    status = Column(String(50), default="Active")  # Active, Candidate, Benchmark, Training
    hardware_target = Column(String(100), default="NVIDIA RTX 4050 / CUDA 13.1")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class ActiveLearningQueue(Base):
    __tablename__ = "active_learning_queue"
    
    id = Column(Integer, primary_key=True, index=True)
    image_id = Column(Integer, ForeignKey("sonar_images.id"), nullable=False)
    detection_id = Column(Integer, ForeignKey("detections.id"), nullable=True)
    trigger_reason = Column(String(100), default="Low Confidence (< 0.60)")
    priority_score = Column(Float, default=0.85)
    suggested_label = Column(String(100), nullable=True)
    human_label = Column(String(100), nullable=True)
    status = Column(String(50), default="pending_review")  # pending_review, curated, rejected
    reviewed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    action = Column(String(100), nullable=False)
    user_email = Column(String(255), default="demo@aquasentinel.ocean")
    resource_type = Column(String(100), nullable=False)
    resource_id = Column(String(100), nullable=True)
    details = Column(JSON, nullable=True)
    hash_sha256 = Column(String(64), nullable=True)  # Cryptographic evidence chain
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
