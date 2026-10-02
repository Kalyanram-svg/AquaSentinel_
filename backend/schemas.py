from pydantic import BaseModel, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime

class AppBaseModel(BaseModel):
    model_config = ConfigDict(protected_namespaces=(), from_attributes=True)

class UserBase(AppBaseModel):
    email: str
    full_name: Optional[str] = "AquaSentinel Operator"
    role: Optional[str] = "Lead Marine Scientist"
    organization: Optional[str] = "Ministry of Earth Sciences (MoES)"

class UserCreate(UserBase):
    password: str

class UserLogin(AppBaseModel):
    email: str
    password: str

class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime

class TokenResponse(AppBaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class SurveyBase(AppBaseModel):
    name: str
    survey_code: Optional[str] = None
    platform: Optional[str] = "Autonomous Underwater Vehicle (AUV)"
    sensor_model: Optional[str] = "Klein 3900 High-Resolution Dual Frequency"
    frequency_khz: Optional[float] = 455.0
    range_meters: Optional[float] = 75.0
    location_name: Optional[str] = "Arabian Sea Continental Shelf"
    latitude: Optional[float] = 18.9220
    longitude: Optional[float] = 72.8347
    water_depth_meters: Optional[float] = 42.5
    seabed_type: Optional[str] = "Sandy Silt"
    notes: Optional[str] = None

class SurveyCreate(SurveyBase):
    pass

class DetectionResponse(AppBaseModel):
    id: int
    image_id: int
    class_name: str
    canonical_class: str
    confidence: float
    bbox_x: float
    bbox_y: float
    bbox_w: float
    bbox_h: float
    length_meters: Optional[float] = None
    width_meters: Optional[float] = None
    length_px: Optional[int] = None
    width_px: Optional[int] = None
    estimated_height_m: Optional[float] = None
    shadow_length_px: Optional[float] = None
    is_calibrated: Optional[bool] = False
    calibration_status: Optional[str] = "uncalibrated_pixel_dimensions"
    hazard_score: Optional[float] = 0.5
    hazard_type: Optional[str] = "Subsea Obstacle"
    uncertainty_score: Optional[float] = 0.15
    saliency_heatmap_path: Optional[str] = None
    category: Optional[str] = "Man-Made Object"
    environment_compatibility: Optional[float] = None
    final_decision: Optional[str] = None
    decision_code: Optional[str] = None
    environmental_profile: Optional[Dict[str, Any]] = None
    requires_human_review: Optional[bool] = False
    review_status: Optional[str] = "pending"
    review_reason: Optional[str] = None
    reviewed_class: Optional[str] = None
    reviewer_notes: Optional[str] = None
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    model_version: Optional[str] = "AquaNeural-PyTorch-ResNet-1.0"
    created_at: Optional[datetime] = None

class SonarImageResponse(AppBaseModel):
    id: int
    survey_id: Optional[int]
    filename: str
    original_path: str
    enhanced_path: Optional[str]
    thumbnail_path: Optional[str]
    sha256_hash: Optional[str]
    width: int
    height: int
    channels: int
    file_size_bytes: int
    is_valid: bool
    is_duplicate: bool
    latitude: Optional[float]
    longitude: Optional[float]
    altitude_meters: Optional[float]
    resolution_m_per_px: Optional[float]
    dataset_source: str
    split_group: str
    created_at: datetime
    detections: List[DetectionResponse] = []

class SurveyResponse(SurveyBase):
    id: int
    survey_date: datetime
    status: str
    created_at: datetime
    images: List[SonarImageResponse] = []

class ReviewDecisionRequest(AppBaseModel):
    detection_id: int
    action: str  # confirmed, rejected, relabeled, man_made, natural, unable_to_verify
    reviewed_class: Optional[str] = None
    reviewer_notes: Optional[str] = None
    add_to_active_learning: Optional[bool] = True

class PreprocessParams(AppBaseModel):
    apply_clahe: bool = True
    clahe_clip_limit: float = 2.5
    clahe_tile_grid_size: int = 8
    speckle_reduction: bool = True
    bilateral_filter: bool = True
    contrast_stretch: bool = True
    colormap: str = "sonar_copper"  # grayscale, sonar_copper, sonar_amber, ocean_deep

class InferenceParams(AppBaseModel):
    model_version: Optional[str] = "AquaYOLO-v8s-Sonar-1.0"
    confidence_threshold: float = 0.45
    uncertainty_threshold: float = 0.40
    is_calibrated: bool = False
    calibration_m_per_px: Optional[float] = None
    iou_threshold: float = 0.45
    enable_shadow_analysis: bool = True
    enable_saliency: bool = False
    sensor_altitude: Optional[float] = 12.0
    swath_range: Optional[float] = 75.0
    scenario_override: Optional[str] = None

class ExplainRequest(AppBaseModel):
    detection_id: Optional[int] = None

class DatasetSourceResponse(AppBaseModel):
    id: int
    code: str
    name: str
    official_url: str
    publisher: str
    license: str
    sensor_type: str
    target_count: int
    downloaded_count: int
    valid_count: int
    unique_count: int
    annotated_count: int
    unannotated_count: int
    rejected_count: int
    status: str
    is_enabled: bool
    storage_path: Optional[str]
    notes: Optional[str]
    updated_at: datetime

class ModelRecordResponse(AppBaseModel):
    id: int
    name: str
    version: str
    architecture: str
    task: str
    input_resolution: str
    classes: List[str] = []
    map50: float
    map50_95: float
    precision: float
    recall: float
    f1_score: float
    latency_ms: float
    model_size_mb: float
    training_dataset: str
    status: str
    hardware_target: str
    created_at: datetime
