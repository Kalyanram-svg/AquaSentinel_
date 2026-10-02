import cv2
import numpy as np
from PIL import Image
from pathlib import Path
from typing import Dict, Any, Tuple, Optional

class SonarProcessor:
    """
    Scientific Side-Scan Sonar (SSS) Image Processing Pipeline.
    Implements CLAHE, Lee speckle reduction approximation, bilateral smoothing,
    contrast normalization, acoustic shadow profile extraction, and colormap mapping.
    """

    @staticmethod
    def load_sonar_image(image_path: str) -> np.ndarray:
        """Load an image and return in 8-bit grayscale format."""
        img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
        if img is None:
            # Fallback using PIL
            pil_img = Image.open(image_path).convert('L')
            img = np.array(pil_img)
        return img

    @staticmethod
    def apply_clahe(img: np.ndarray, clip_limit: float = 2.5, tile_size: int = 8) -> np.ndarray:
        """Contrast Limited Adaptive Histogram Equalization for acoustic backscatter enhancement."""
        clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=(tile_size, tile_size))
        return clahe.apply(img)

    @staticmethod
    def reduce_speckle(img: np.ndarray, diameter: int = 7, sigma_color: float = 50.0, sigma_space: float = 50.0) -> np.ndarray:
        """Bilateral filtering to preserve sharp shadow edges while reducing multiplicative speckle noise."""
        return cv2.bilateralFilter(img, diameter, sigma_color, sigma_space)

    @staticmethod
    def normalize_contrast(img: np.ndarray) -> np.ndarray:
        """Percentile-based linear dynamic range stretching (2nd to 98th percentile)."""
        p2, p98 = np.percentile(img, (2, 98))
        if p98 > p2:
            stretched = np.clip((img - p2) / (p98 - p2) * 255.0, 0, 255).astype(np.uint8)
            return stretched
        return img

    @classmethod
    def process_full_pipeline(
        cls,
        image_path: str,
        output_path: str,
        clip_limit: float = 2.5,
        tile_size: int = 8,
        enable_speckle: bool = True,
        enable_clahe: bool = True,
        enable_contrast_stretch: bool = True,
        colormap: str = "sonar_copper"
    ) -> Dict[str, Any]:
        """Runs the reproducible processing profile and outputs enhanced image + quality metrics."""
        raw_gray = cls.load_sonar_image(image_path)
        h, w = raw_gray.shape

        cur = raw_gray.copy()

        # Bound processing resolution to 1280px max dimension to prevent CPU freeze on cloud instances
        max_dim = max(h, w)
        if max_dim > 1280:
            scale = 1280.0 / max_dim
            cur = cv2.resize(cur, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)

        # Step 1: Speckle / Bilateral Smoothing
        if enable_speckle:
            cur = cls.reduce_speckle(cur)

        # Step 2: Dynamic Range Stretching
        if enable_contrast_stretch:
            cur = cls.normalize_contrast(cur)

        # Step 3: Adaptive CLAHE
        if enable_clahe:
            cur = cls.apply_clahe(cur, clip_limit=clip_limit, tile_size=tile_size)

        # Compute SNR (Signal-to-Noise Ratio proxy) and Mean Intensity
        mean_val = float(np.mean(cur))
        std_val = float(np.std(cur))
        contrast_ratio = float(std_val / (mean_val + 1e-5))

        # Colormap mapping for human inspection
        if colormap == "sonar_copper":
            colored = cv2.applyColorMap(cur, cv2.COLORMAP_BONE)
            # Blend with warm bronze/copper tint
            copper_tint = np.zeros_like(colored)
            copper_tint[:, :, 0] = np.clip(cur * 0.15, 0, 255).astype(np.uint8)  # B
            copper_tint[:, :, 1] = np.clip(cur * 0.65, 0, 255).astype(np.uint8)  # G
            copper_tint[:, :, 2] = np.clip(cur * 0.95, 0, 255).astype(np.uint8)  # R
            enhanced_bgr = cv2.addWeighted(colored, 0.4, copper_tint, 0.6, 0)
        elif colormap == "sonar_amber":
            enhanced_bgr = cv2.applyColorMap(cur, cv2.COLORMAP_AUTUMN)
        elif colormap == "ocean_deep":
            enhanced_bgr = cv2.applyColorMap(cur, cv2.COLORMAP_OCEAN)
        else:
            enhanced_bgr = cv2.cvtColor(cur, cv2.COLOR_GRAY2BGR)

        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        cv2.imwrite(output_path, enhanced_bgr)

        return {
            "width": w,
            "height": h,
            "mean_intensity": round(mean_val, 2),
            "std_deviation": round(std_val, 2),
            "contrast_ratio": round(contrast_ratio, 3),
            "settings": {
                "clip_limit": clip_limit,
                "tile_size": tile_size,
                "speckle_reduction": enable_speckle,
                "clahe": enable_clahe,
                "contrast_stretch": enable_contrast_stretch,
                "colormap": colormap
            }
        }

    @staticmethod
    def extract_shadow_profile(
        gray_img: np.ndarray,
        bbox: Tuple[int, int, int, int],
        altitude_m: float = 12.0,
        range_m: float = 50.0,
        calibration_m_per_px: Optional[float] = None,
        is_calibrated: bool = False
    ) -> Dict[str, Any]:
        """
        Calculates target acoustic shadow length, verifies highlight-shadow acoustic pairing,
        and computes physical relief height ONLY when sonar calibration is verified.
        
        Geometric Formula (Towfish Slant-to-Ground Triangular Model):
        Target Relief Height H_t = (Shadow Length L_s * Sensor Altitude H_s) / (Ground Range R_g + L_s)
        """
        x, y, w, h = bbox
        img_h, img_w = gray_img.shape
        x1 = max(0, x)
        y1 = max(0, y)
        x2 = min(img_w, x + w)
        y2 = min(img_h, y + h)

        target_roi = gray_img[y1:y2, x1:x2]
        if target_roi.size == 0:
            return {
                "shadow_length_px": 0,
                "shadow_length_meters": None,
                "estimated_height_meters": None,
                "px_resolution_m": None,
                "ground_range_m": None,
                "is_calibrated": False,
                "has_valid_shadow": False,
                "highlight_contrast_ratio": 1.0,
                "shadow_contrast_ratio": 1.0
            }

        # Local background estimation in an annular region around the bounding box
        pad_x = max(15, int(w * 0.5))
        pad_y = max(15, int(h * 0.5))
        bg_x1 = max(0, x1 - pad_x)
        bg_y1 = max(0, y1 - pad_y)
        bg_x2 = min(img_w, x2 + pad_x)
        bg_y2 = min(img_h, y2 + pad_y)
        
        surround_roi = gray_img[bg_y1:bg_y2, bg_x1:bg_x2]
        bg_level = float(np.median(surround_roi)) if surround_roi.size > 0 else float(np.median(gray_img))
        bg_level = max(10.0, bg_level)

        # Highlight metrics
        peak_highlight = float(np.max(target_roi))
        mean_highlight = float(np.mean(target_roi))
        highlight_contrast = round(peak_highlight / bg_level, 2)

        # Acoustic shadow search: Examine both intra-ROI shadow and lateral acoustic void (left and right)
        shadow_thresh = bg_level * 0.35

        sh_span = max(25, int(w * 1.8))
        left_roi = gray_img[y1:y2, max(0, x1 - sh_span):x1] if x1 > 0 else np.array([])
        right_roi = gray_img[y1:y2, x2:min(img_w, x2 + sh_span)] if x2 < img_w else np.array([])

        left_mask = (left_roi < shadow_thresh) if left_roi.size > 0 else np.array([])
        right_mask = (right_roi < shadow_thresh) if right_roi.size > 0 else np.array([])

        left_count = int(np.sum(left_mask)) if left_mask.size > 0 else 0
        right_count = int(np.sum(right_mask)) if right_mask.size > 0 else 0

        if left_count >= right_count and left_count > 0:
            ext_shadow_roi = left_roi
            ext_shadow_mask = left_mask
        elif right_count > 0:
            ext_shadow_roi = right_roi
            ext_shadow_mask = right_mask
        else:
            ext_shadow_roi = np.array([])
            ext_shadow_mask = np.array([])
        
        # Intra-target shadow (for tall targets where shadow overlaps bounding box)
        intra_shadow_mask = target_roi < shadow_thresh
        intra_shadow_px = int(np.sum(intra_shadow_mask) / max(1, h))
        intra_contrast = float(np.mean(target_roi[intra_shadow_mask])) / bg_level if np.any(intra_shadow_mask) else 1.0

        ext_shadow_px = 0
        ext_contrast = 1.0
        if ext_shadow_roi.size > 0:
            ext_shadow_mask = ext_shadow_roi < shadow_thresh
            ext_shadow_px = int(np.sum(ext_shadow_mask) / max(1, h))
            if np.any(ext_shadow_mask):
                ext_contrast = float(np.mean(ext_shadow_roi[ext_shadow_mask])) / bg_level

        shadow_px = max(intra_shadow_px, ext_shadow_px)
        shadow_contrast = round(min(intra_contrast, ext_contrast), 2)

        # Valid acoustic shadow requirement:
        # A true target shadow must have a measurable pixel span, low backscatter,
        # and must be associated with a valid acoustic highlight (cannot be cast by pure black background)
        has_valid_shadow = (
            shadow_px >= 3
            and shadow_contrast <= 0.45
            and peak_highlight >= 25.0
            and highlight_contrast >= 1.3
        )

        # Calibration & Physical Measurement Gating
        if is_calibrated or (calibration_m_per_px is not None and calibration_m_per_px > 0):
            slant_r = max(range_m, altitude_m + 1.0)
            ground_r = float(np.sqrt(max(1.0, slant_r**2 - altitude_m**2)))
            px_resolution = float(calibration_m_per_px) if calibration_m_per_px else (ground_r / max(1.0, img_w / 2.0))
            
            shadow_length_m = round(float(shadow_px * px_resolution), 2)
            est_height_m = round(float((shadow_length_m * altitude_m) / max(0.1, (ground_r + shadow_length_m))), 2)
            
            return {
                "shadow_length_px": shadow_px,
                "shadow_length_meters": shadow_length_m,
                "estimated_height_meters": est_height_m,
                "px_resolution_m": round(float(px_resolution), 4),
                "ground_range_m": round(float(ground_r), 2),
                "is_calibrated": True,
                "has_valid_shadow": has_valid_shadow,
                "highlight_contrast_ratio": highlight_contrast,
                "shadow_contrast_ratio": shadow_contrast
            }
        else:
            # Uncalibrated: STRICTLY report pixel dimensions only!
            return {
                "shadow_length_px": shadow_px,
                "shadow_length_meters": None,
                "estimated_height_meters": None,
                "px_resolution_m": None,
                "ground_range_m": None,
                "is_calibrated": False,
                "has_valid_shadow": has_valid_shadow,
                "highlight_contrast_ratio": highlight_contrast,
                "shadow_contrast_ratio": shadow_contrast
            }

    @classmethod
    def compute_environmental_profile(cls, img: np.ndarray, scenario_override: Optional[str] = None) -> Dict[str, Any]:
        """
        Analyzes side-scan sonar seabed acoustic backscatter and generates the Environmental Profile.
        Computes seabed type, texture roughness, surface variation, sonar noise, clutter, and confidence.
        """
        if scenario_override == "sandy" or scenario_override == "scenario_a":
            return {
                "seabed_type": "Sandy / Sedimentary",
                "texture": "Smooth",
                "surface_variation": "Low",
                "sonar_noise": "Low",
                "clutter_level": "Low",
                "environmental_confidence": 0.94,
                "clutter_ratio": 0.024,
                "mean_backscatter": 78.5,
                "std_backscatter": 11.2,
                "scenario_code": "scenario_a",
                "zone_name": "Zone 1 - Sedimentary Swath",
                "description": "Homogeneous sedimentary seafloor with minimal acoustic clutter; ideal acoustic propagation and shadow fidelity."
            }
        elif scenario_override == "rocky" or scenario_override == "scenario_b":
            return {
                "seabed_type": "Rocky / Mixed",
                "texture": "Rough",
                "surface_variation": "High",
                "sonar_noise": "Medium",
                "clutter_level": "Medium",
                "environmental_confidence": 0.86,
                "clutter_ratio": 0.118,
                "mean_backscatter": 114.2,
                "std_backscatter": 28.6,
                "scenario_code": "scenario_b",
                "zone_name": "Zone 2 - Rocky Benthic Outcrop",
                "description": "Heterogeneous benthic substrate featuring boulder clusters and rock relief; moderate acoustic scattering."
            }
        elif scenario_override == "variable" or scenario_override == "scenario_c":
            return {
                "seabed_type": "Variable / Unknown",
                "texture": "Irregular",
                "surface_variation": "High",
                "sonar_noise": "High",
                "clutter_level": "High",
                "environmental_confidence": 0.54,
                "clutter_ratio": 0.245,
                "mean_backscatter": 138.0,
                "std_backscatter": 42.1,
                "scenario_code": "scenario_c",
                "zone_name": "Zone 3 - Turbulent Acoustic Zone",
                "description": "Acoustically variable and turbulent seabed zone; high reverberation and irregular bottom clutter."
            }

        h, w = img.shape
        # Mask out central nadir water column line (central 10% of swath)
        center_x = w // 2
        nadir_margin = int(w * 0.05)
        nadir_mask = np.zeros(w, dtype=bool)
        nadir_mask[max(0, center_x - nadir_margin):min(w, center_x + nadir_margin)] = True

        valid_cols = ~nadir_mask
        seabed_roi = img[:, valid_cols]

        mean_bg = float(np.mean(seabed_roi))
        std_bg = float(np.std(seabed_roi))

        # Spatial gradient energy as texture roughness proxy
        sobel_x = cv2.Sobel(seabed_roi, cv2.CV_32F, 1, 0, ksize=3)
        sobel_y = cv2.Sobel(seabed_roi, cv2.CV_32F, 0, 1, ksize=3)
        grad_energy = float(np.mean(np.sqrt(sobel_x**2 + sobel_y**2)))

        # Acoustic clutter ratio (proportion of intense backscatter + deep shadows)
        high_ref = np.sum(seabed_roi > (mean_bg + 2.2 * max(8.0, std_bg)))
        void_sh = np.sum(seabed_roi < 15)
        clutter_ratio = float((high_ref + void_sh) / max(1, seabed_roi.size))

        # Classify based on hydroacoustic characteristics
        if std_bg < 18.0 and grad_energy < 18.0 and clutter_ratio < 0.08:
            seabed_type = "Sandy / Sedimentary"
            texture = "Smooth"
            surface_variation = "Low"
            sonar_noise = "Low"
            clutter_level = "Low"
            env_conf = round(float(np.clip(0.96 - std_bg * 0.002, 0.90, 0.98)), 2)
            scenario_code = "scenario_a"
            zone_name = "Zone 1 - Sedimentary Swath"
            desc = "Homogeneous sedimentary seafloor with minimal acoustic clutter; ideal acoustic propagation and shadow fidelity."
        elif std_bg < 34.0 and clutter_ratio < 0.20:
            seabed_type = "Rocky / Mixed"
            texture = "Rough"
            surface_variation = "High"
            sonar_noise = "Medium"
            clutter_level = "Medium"
            env_conf = round(float(np.clip(0.88 - clutter_ratio * 0.3, 0.80, 0.89)), 2)
            scenario_code = "scenario_b"
            zone_name = "Zone 2 - Rocky Benthic Outcrop"
            desc = "Heterogeneous benthic substrate featuring boulder clusters and rock relief; moderate acoustic scattering."
        else:
            seabed_type = "Variable / Unknown"
            texture = "Irregular"
            surface_variation = "High"
            sonar_noise = "High"
            clutter_level = "High"
            env_conf = round(float(np.clip(0.60 - clutter_ratio * 0.4, 0.35, 0.65)), 2)
            scenario_code = "scenario_c"
            zone_name = "Zone 3 - Turbulent Acoustic Zone"
            desc = "Acoustically variable and turbulent seabed zone; high reverberation and irregular bottom clutter."

        return {
            "seabed_type": seabed_type,
            "texture": texture,
            "surface_variation": surface_variation,
            "sonar_noise": sonar_noise,
            "clutter_level": clutter_level,
            "environmental_confidence": env_conf,
            "clutter_ratio": round(clutter_ratio, 3),
            "mean_backscatter": round(mean_bg, 1),
            "std_backscatter": round(std_bg, 1),
            "scenario_code": scenario_code,
            "zone_name": zone_name,
            "description": desc
        }

    @classmethod
    def compute_object_environment_compatibility(
        cls,
        canonical_class: str,
        category: str,
        object_confidence: float,
        env_profile: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Evaluates object-environment compatibility and enforces decision gating.
        Decisions:
        - "Man-Made Object"
        - "Natural / Geological"
        - "Environment Mismatch -> Human Review Required"
        - "Unable to Verify -> Human Expert Review"
        """
        seabed_type = env_profile.get("seabed_type", "Sandy / Sedimentary")
        env_conf = env_profile.get("environmental_confidence", 0.90)

        # Baseline compatibility based on seabed profile
        if "Sandy" in seabed_type:
            # Low clutter, smooth substrate: high contrast between man-made geometry and sand
            compat_score = round(float(np.clip(0.91 + (object_confidence - 0.85) * 0.15, 0.82, 0.97)), 2)
        elif "Rocky" in seabed_type:
            # High clutter, rough substrate: rocks mimic man-made debris shadows
            compat_score = round(float(np.clip(0.68 + (object_confidence - 0.78) * 0.12, 0.58, 0.74)), 2)
        else:
            # Variable / Unknown: erratic substrate
            compat_score = round(float(np.clip(0.39 + (object_confidence - 0.54) * 0.10, 0.28, 0.48)), 2)

        # Decision Gating
        if compat_score >= 0.85 and object_confidence >= 0.75:
            final_decision = category
            decision_code = "accepted"
            review_required = False
            review_reason = None
        elif compat_score < 0.50 or object_confidence < 0.60 or env_conf < 0.65:
            final_decision = "Unable to Verify"
            decision_code = "unable_to_verify"
            review_required = True
            review_reason = f"Unable to Verify: Low environmental confidence ({int(env_conf*100)}%) and high acoustic noise level."
        else:
            final_decision = "Environment Mismatch"
            decision_code = "environment_mismatch"
            review_required = True
            review_reason = f"Environment Mismatch: {seabed_type} seabed ({env_profile.get('texture')} texture, {env_profile.get('clutter_level')} clutter) creates acoustic ambiguity requiring human analyst verification."

        return {
            "compatibility_score": compat_score,
            "final_decision": final_decision,
            "decision_code": decision_code,
            "requires_human_review": review_required,
            "review_reason": review_reason
        }

