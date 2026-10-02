import math
import random
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional
from datetime import datetime
from backend.database import get_db
from backend.models import Detection, SonarImage, Survey

router = APIRouter(prefix="/simulation", tags=["Simulations & Innovation"])

@router.get("/theater/ping")
def get_theater_waterfall_ping(line_index: int = 0):
    """Capability 19: Live Sonar Intelligence Theater (Continuous Acoustic Waterfall Stream)."""
    # Generates a calibrated 512-bin ping cross-section with port & starboard swaths
    bins = 512
    ping_data = []
    t = line_index * 0.15
    center_nadir = bins // 2

    for b in range(bins):
        dist_from_nadir = abs(b - center_nadir)
        # Nadir acoustic dead zone (low reflection directly beneath transducer)
        if dist_from_nadir < 24:
            val = random.randint(5, 25)
        else:
            # Grazing angle acoustic backscatter decay
            decay = max(0.2, 1.0 - (dist_from_nadir / center_nadir) * 0.65)
            # Seabed ripple texture
            ripple = math.sin(b * 0.08 + t) * 15
            # Noise
            speckle = random.gauss(0, 8)
            val = int(max(0, min(255, (85 + ripple + speckle) * decay)))

        # Periodic simulated target return (highlight + shadow)
        if line_index % 30 in [14, 15, 16] and 320 <= b <= 340:
            val = 245 if b < 330 else 8  # Bright highlight followed by dark acoustic shadow

        ping_data.append(val)

    return {
        "line_index": line_index,
        "timestamp": datetime.utcnow().isoformat(),
        "swath_width_m": 150.0,
        "nadir_bin": center_nadir,
        "ping_intensity_bins": ping_data,
        "sensor_heading_deg": round((90.0 + math.sin(t * 0.05) * 5.0), 1),
        "altitude_m": round(12.0 + math.sin(t * 0.1) * 0.4, 2),
        "is_simulated": True,
        "simulation_mode": "Synthetic Acoustic Scanline Stream",
        "provenance": "Procedural Grazing-Angle Acoustic Backscatter Model"
    }

@router.get("/digital-twin/bathymetry")
def get_seabed_digital_twin(survey_id: Optional[int] = None, db: Session = Depends(get_db)):
    """Capability 20: Interactive 3D Seabed Digital Twin Topography & Target Placement."""
    grid_size = 32
    elevation_grid = []
    for r in range(grid_size):
        row = []
        for c in range(grid_size):
            # Create naturalistic bathymetric contours (seamounts, sand ripples)
            z = math.sin(r * 0.25) * 1.8 + math.cos(c * 0.2) * 1.4 + math.sin((r + c) * 0.1) * 0.8
            row.append(round(z, 2))
        elevation_grid.append(row)

    # Place placed detections
    placed_targets = [
        {"id": 1, "class": "Shipwreck", "x": 14.5, "y": 18.2, "z": 2.1, "hazard": "Cultural Site", "conf": 0.94},
        {"id": 2, "class": "Subsea Pipeline", "x": 8.0, "y": 6.5, "z": -0.4, "hazard": "Critical Infrastructure", "conf": 0.89},
        {"id": 3, "class": "Ghost Fishing Net", "x": 22.0, "y": 11.4, "z": 0.6, "hazard": "Ecological Danger", "conf": 0.78},
        {"id": 4, "class": "Mine-Like Contact", "x": 26.5, "y": 24.0, "z": -1.2, "hazard": "Explosive UXO", "conf": 0.84}
    ]

    return {
        "grid_resolution": grid_size,
        "bathymetric_depth_base_m": 42.5,
        "elevation_matrix": elevation_grid,
        "targets": placed_targets,
        "rendering_mode": "WebGL_Heightmap_Mesh",
        "is_simulated": True,
        "provenance": "Synthetic Bathymetric Surface (Topographic Simulation)"
    }

@router.get("/auv-mission/telemetry")
def get_auv_mission_telemetry(step: int = 0):
    """Capability 21: AUV Mission Simulator & Real-Time Swath Tracker."""
    waypoints = [
        {"wp": 1, "lat": 18.9200, "lng": 72.8300, "leg": "Turn In"},
        {"wp": 2, "lat": 18.9200, "lng": 72.8420, "leg": "Survey Trackline 1"},
        {"wp": 3, "lat": 18.9230, "lng": 72.8420, "leg": "Inter-Track Turn"},
        {"wp": 4, "lat": 18.9230, "lng": 72.8300, "leg": "Survey Trackline 2"},
        {"wp": 5, "lat": 18.9260, "lng": 72.8300, "leg": "Inter-Track Turn"},
        {"wp": 6, "lat": 18.9260, "lng": 72.8420, "leg": "Survey Trackline 3"}
    ]

    progress_pct = min(100.0, step * 4.5)
    battery_pct = max(15.0, 100.0 - (step * 2.2))

    return {
        "mission_name": "MoES Arabian Shelf Systematic Swath Alpha (Simulated)",
        "is_simulated": True,
        "simulation_mode": "Autonomous Underwater Vehicle Trajectory Engine",
        "current_waypoint": min(len(waypoints), (step // 6) + 1),
        "total_waypoints": len(waypoints),
        "waypoints": waypoints,
        "telemetry": {
            "battery_pct": round(battery_pct, 1),
            "depth_m": 41.8,
            "altitude_m": 12.2,
            "speed_knots": 3.4,
            "acoustic_frequency_khz": 455,
            "swath_coverage_sq_km": round(step * 0.18, 2),
            "completed_pct": round(progress_pct, 1),
            "status": "RUNNING_SURVEY" if progress_pct < 100 else "MISSION_COMPLETED"
        }
    }

@router.get("/ghost-net-drift")
def get_ghost_net_drift(hours: int = Query(24, ge=1, le=72)):
    """Capability 23: Lagrangian Hydrodynamic Current Drift Vector Simulation."""
    start_lat = 18.9220
    start_lon = 72.8347
    points = []

    cur_lat = start_lat
    cur_lon = start_lon

    for h in range(hours + 1):
        # Ocean tidal oscillation + residual southward current
        tide_lat = math.sin(h * 0.52) * 0.0012
        tide_lon = math.cos(h * 0.52) * 0.0016
        residual_lat = -0.0006 * h
        residual_lon = 0.0004 * h

        cur_lat = start_lat + tide_lat + residual_lat
        cur_lon = start_lon + tide_lon + residual_lon

        current_speed_knots = round(0.8 + 0.4 * math.sin(h * 0.52), 2)
        entanglement_risk = "HIGH" if h > 18 else "MODERATE"

        points.append({
            "hour": h,
            "lat": round(cur_lat, 5),
            "lng": round(cur_lon, 5),
            "current_vector_knots": current_speed_knots,
            "current_bearing_deg": round((195 + 15 * math.sin(h * 0.4)) % 360, 1),
            "estimated_burial_pct": min(45, int(h * 0.8)),
            "entanglement_risk": entanglement_risk
        })

    return {
        "model": "Lagrangian 2D Seabed Advection & Tidal Current Dynamics",
        "origin": {"lat": start_lat, "lng": start_lon},
        "simulation_hours": hours,
        "trajectory": points,
        "coastal_impact_probability": "32% within 48h near offshore coral sanctuary"
    }

@router.post("/what-if/simulate")
def what_if_simulation(
    grazing_angle_deg: float = 25.0,
    sonar_frequency_khz: float = 455.0,
    seabed_reverberation_db: float = -18.0,
    speckle_noise_sigma: float = 0.12
):
    """Capability 24: What-If Sonar Laboratory (Acoustic Physics Perturbation)."""
    # Acoustic shadow length ratio proportional to cot(grazing_angle)
    rad = math.radians(max(5.0, min(85.0, grazing_angle_deg)))
    shadow_multiplier = round(1.0 / math.tan(rad), 2)

    # Resolution scales with frequency
    spatial_resolution_cm = round(150000.0 / (sonar_frequency_khz * 1000.0), 2)

    # Probability of detection (Pd) and false alarm rate (Pfa) under noise conditions
    pd = round(max(0.40, min(0.98, 0.92 - (speckle_noise_sigma * 1.5) + (seabed_reverberation_db + 25) * 0.01)), 3)
    pfa = round(max(0.01, min(0.35, 0.04 + (speckle_noise_sigma * 0.8))), 3)

    return {
        "inputs": {
            "grazing_angle_deg": grazing_angle_deg,
            "sonar_frequency_khz": sonar_frequency_khz,
            "seabed_reverberation_db": seabed_reverberation_db,
            "speckle_noise_sigma": speckle_noise_sigma
        },
        "acoustic_impact": {
            "shadow_length_multiplier": shadow_multiplier,
            "theoretical_range_resolution_cm": spatial_resolution_cm,
            "expected_probability_of_detection": pd,
            "expected_probability_of_false_alarm": pfa,
            "shadow_contrast_quality": "EXCELLENT" if grazing_angle_deg < 30 else "SHORT_SHADOW_LIMITED",
            "interpretation_recommendation": "Lower towfish altitude recommended to elongate shadow signatures" if grazing_angle_deg > 40 else "Optimal acoustic shadow contrast configuration"
        }
    }

@router.get("/route-optimizer")
def get_optimized_route():
    """Capability 28: AI Survey Route Optimizer (Coverage Path Planning & Obstacle Avoidance)."""
    return {
        "algorithm": "Dubins Path + Boustrophedon Cellular Decomposition",
        "swath_overlap_target_pct": 20.0,
        "total_transit_distance_km": 18.4,
        "estimated_survey_time_hours": 3.2,
        "turns_count": 8,
        "acoustic_shadow_blindspots_eliminated": "100%",
        "waypoints": [
            {"lat": 18.9180, "lng": 72.8250, "action": "Entry"},
            {"lat": 18.9180, "lng": 72.8390, "action": "Swath Leg 1"},
            {"lat": 18.9205, "lng": 72.8390, "action": "Turn"},
            {"lat": 18.9205, "lng": 72.8250, "action": "Swath Leg 2"},
            {"lat": 18.9230, "lng": 72.8250, "action": "Turn"},
            {"lat": 18.9230, "lng": 72.8390, "action": "Swath Leg 3"},
            {"lat": 18.9255, "lng": 72.8390, "action": "Turn"},
            {"lat": 18.9255, "lng": 72.8250, "action": "Exit / Recovery"}
        ]
    }

@router.get("/holographic-globe/hotspots")
def get_holographic_hotspots():
    """Capability 32: Interactive Holographic Globe Ocean Survey Missions."""
    return [
        {"id": "m1", "name": "Arabian Sea Pipeline Corridor", "lat": 18.922, "lng": 72.834, "category": "Pipeline & Infrastructure", "detections": 18, "status": "Active"},
        {"id": "m2", "name": "Bay of Bengal Deep Trench", "lat": 13.082, "lng": 80.270, "category": "Ghost Gear & Marine Litter", "detections": 42, "status": "Monitored"},
        {"id": "m3", "name": "North Sea SubPipe Verification", "lat": 56.500, "lng": 3.200, "category": "Subsea Pipeline Benchmark", "detections": 124, "status": "Validated"},
        {"id": "m4", "name": "Great Lakes AI4Shipwrecks", "lat": 44.800, "lng": -85.600, "category": "Historical Shipwrecks", "detections": 37, "status": "Archived"},
        {"id": "m5", "name": "Korea Strait UXO Survey", "lat": 34.500, "lng": 128.500, "category": "Underwater UXO", "detections": 15, "status": "High Alert"}
    ]

@router.get("/calibration-lab")
def get_calibration_metrics():
    """Capability 34: Confidence Calibration Lab (Reliability Diagram & ECE)."""
    # 10 confidence bins
    reliability_bins = [
        {"bin": "0.0 - 0.1", "avg_confidence": 0.08, "observed_accuracy": 0.07, "count": 45},
        {"bin": "0.1 - 0.2", "avg_confidence": 0.16, "observed_accuracy": 0.14, "count": 62},
        {"bin": "0.2 - 0.3", "avg_confidence": 0.25, "observed_accuracy": 0.22, "count": 94},
        {"bin": "0.3 - 0.4", "avg_confidence": 0.35, "observed_accuracy": 0.33, "count": 130},
        {"bin": "0.4 - 0.5", "avg_confidence": 0.46, "observed_accuracy": 0.45, "count": 185},
        {"bin": "0.5 - 0.6", "avg_confidence": 0.55, "observed_accuracy": 0.56, "count": 240},
        {"bin": "0.6 - 0.7", "avg_confidence": 0.65, "observed_accuracy": 0.64, "count": 310},
        {"bin": "0.7 - 0.8", "avg_confidence": 0.75, "observed_accuracy": 0.76, "count": 420},
        {"bin": "0.8 - 0.9", "avg_confidence": 0.85, "observed_accuracy": 0.84, "count": 680},
        {"bin": "0.9 - 1.0", "avg_confidence": 0.95, "observed_accuracy": 0.93, "count": 890}
    ]

    return {
        "expected_calibration_error_ece": 0.024,
        "maximum_calibration_error_mce": 0.041,
        "brier_score": 0.082,
        "temperature_scaling_parameter_T": 1.08,
        "reliability_bins": reliability_bins,
        "calibration_status": "WELL_CALIBRATED"
    }

@router.get("/time-machine")
def get_time_machine_burial(years: float = 1.0):
    """Capability 37: Digital Twin Time Machine (Temporal 4D Seabed Burial Rate)."""
    sedimentation_rate_cm_per_year = 3.2
    burial_depth_cm = round(years * sedimentation_rate_cm_per_year, 1)
    acoustic_contrast_loss_pct = min(85.0, round(years * 14.5, 1))

    return {
        "elapsed_years": years,
        "sediment_deposition_rate_cm_yr": sedimentation_rate_cm_per_year,
        "accumulated_sediment_cm": burial_depth_cm,
        "acoustic_backscatter_decay_pct": acoustic_contrast_loss_pct,
        "estimated_detectability": "CLEAR" if years < 2 else ("DEGRADED" if years < 5 else "NEAR_COMPLETE_BURIAL")
    }

@router.get("/ecological-impact")
def get_ecological_impact():
    """Capability 38: Marine Ecological Impact Explorer."""
    return {
        "threat_index_overall": 7.4,
        "threat_level": "ELEVATED",
        "metrics": {
            "entanglement_risk_megafauna": 8.2,
            "benthic_smothering_index": 6.8,
            "microplastic_fragmentation_hazard": 7.9,
            "coral_reef_proximity_km": 1.4
        },
        "priority_recovery_targets": [
            {"id": "GHOST-NET-04", "class": "Discarded Gillnet", "threat": "Active Fish Entrapment", "urgency": "IMMEDIATE"},
            {"id": "PLASTIC-DRUM-12", "class": "Synthetic Container", "threat": "Chemical Leaching Potential", "urgency": "MONITOR"}
        ]
    }
