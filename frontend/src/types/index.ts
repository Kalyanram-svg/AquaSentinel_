export interface User {
  id: number;
  email: string;
  full_name: string;
  role: string;
  organization: string;
  is_active: boolean;
  created_at: string;
}

export interface Survey {
  id: number;
  name: string;
  survey_code: string;
  survey_date: string;
  platform: string;
  sensor_model: string;
  frequency_khz: number;
  range_meters: number;
  location_name: string;
  latitude: number;
  longitude: number;
  water_depth_meters: number;
  seabed_type: string;
  status: string;
  notes?: string;
  created_at: string;
  images?: SonarImage[];
}

export interface SonarImage {
  id: number;
  survey_id?: number;
  filename: string;
  original_path: string;
  enhanced_path?: string;
  thumbnail_path?: string;
  sha256_hash?: string;
  width: number;
  height: number;
  channels: number;
  file_size_bytes: number;
  is_valid: boolean;
  is_duplicate: boolean;
  latitude?: number;
  longitude?: number;
  altitude_meters?: number;
  resolution_m_per_px?: number;
  dataset_source: string;
  split_group: string;
  created_at: string;
  detections?: Detection[];
}

export interface Detection {
  id: number;
  image_id: number;
  class_name: string;
  canonical_class: string;
  confidence: number;
  bbox_x: number;
  bbox_y: number;
  bbox_w: number;
  bbox_h: number;
  length_meters?: number;
  width_meters?: number;
  estimated_height_m?: number;
  shadow_length_px?: number;
  hazard_score: number;
  hazard_type: string;
  uncertainty_score: number;
  saliency_heatmap_path?: string;
  category?: string;
  environment_compatibility?: number;
  final_decision?: string;
  decision_code?: string;
  environmental_profile?: EnvironmentalProfile;
  requires_human_review?: boolean;
  review_reason?: string;
  is_calibrated?: boolean;
  calibration_status?: string;
  length_px?: number;
  width_px?: number;
  review_status: 'pending' | 'confirmed' | 'rejected' | 'relabeled' | 'pending_analyst_review';
  reviewed_class?: string;
  reviewer_notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  model_version: string;
  created_at: string;
}

export interface EnvironmentalProfile {
  seabed_type: string;
  texture: string;
  surface_variation: string;
  sonar_noise: string;
  clutter_level: string;
  environmental_confidence: number;
  clutter_ratio?: number;
  mean_backscatter?: number;
  std_backscatter?: number;
  scenario_code?: string;
  zone_name?: string;
  description?: string;
}

export interface SeabedScenario {
  id: string;
  code: string;
  name: string;
  seabed_type: string;
  texture: string;
  surface_variation: string;
  sonar_noise: string;
  clutter_level: string;
  environmental_confidence: number;
  expected_object: string;
  expected_object_confidence: number;
  expected_compatibility: number;
  expected_decision: string;
  decision_badge: string;
  status_color: string;
  description: string;
}

export interface DatasetSource {
  id: number;
  code: string;
  name: string;
  official_url: string;
  publisher: string;
  license: string;
  sensor_type: string;
  target_count: number;
  downloaded_count: number;
  valid_count: number;
  unique_count: number;
  annotated_count: number;
  unannotated_count: number;
  rejected_count: number;
  status: string;
  is_enabled: boolean;
  storage_path?: string;
  notes?: string;
  updated_at: string;
}

export interface ModelRecord {
  id: number;
  name: string;
  version: string;
  architecture: string;
  task: string;
  input_resolution: string;
  classes: string[];
  map50: number;
  map50_95: number;
  precision: number;
  recall: number;
  f1_score: number;
  latency_ms: number;
  model_size_mb: number;
  training_dataset: string;
  status: 'Active' | 'Candidate' | 'Benchmark';
  hardware_target: string;
  created_at: string;
}

export interface PreprocessSettings {
  apply_clahe: boolean;
  clahe_clip_limit: number;
  clahe_tile_grid_size: number;
  speckle_reduction: boolean;
  bilateral_filter: boolean;
  contrast_stretch: boolean;
  colormap: 'sonar_copper' | 'sonar_amber' | 'ocean_deep' | 'grayscale';
}

export interface InferenceSettings {
  model_version: string;
  confidence_threshold: number;
  sensor_altitude: number;
  swath_range: number;
  enable_saliency: boolean;
}
