# AquaSentinel — SIH26057 Comprehensive Audit & Implementation Plan

**Problem Statement:** SIH26057 (Ministry of Earth Sciences, MoES) — AI-Powered Automated Underwater Marine Debris and Anomaly Detection System using Side-Scan Sonar Imagery  
**Evaluation Standard:** Smart India Hackathon 2026 Production & Defense Readiness  
**Checkpoint Commit:** `05bcb43` (*checkpoint: baseline state before SIH26057 comprehensive audit and repair*)  
**Audit Date:** October 2, 2026  

---

## 1. Executive Summary

AquaSentinel is designed as an end-to-end operational intelligence platform for detecting submerged marine debris, discarded fishing gear ("ghost nets"), plastic accumulations, containers, ordnance/UXO, and structural anomalies from side-scan sonar (SSS) imagery. 

While the frontend presentation and user experience are visually polished with 3D WebGL visualizations, interactive dashboards, and multi-view inspection consoles, **a rigorous code-level audit revealed foundational architectural compromises** that prevent it from being scientifically defensible in its current state. Specifically:
1. Object detection in `backend/services/ai_inference.py` relied on morphological thresholding and contour bounding boxes rather than a genuine neural network.
2. A hardcoded fallback anomaly `[0.35, 0.40, 0.28, 0.22]` was injected whenever contours were absent, causing false positives on clean seafloors.
3. Grad-CAM was simulated using OpenCV contour fills and Gaussian blurs rather than gradient backpropagation across convolutional feature maps.
4. Scale measurement assumed a static `0.05` meters/pixel conversion without validating sonar slant-range geometry or towfish altitude.
5. The dataset manifest reported `0` downloaded images despite claims of targeting 10,000 images.
6. System health reported a static hardware string rather than dynamically checking CUDA runtime capabilities.
7. Simulated sub-modules (such as acoustic propagation in the digital twin and waterfall stream) lacked explicit simulation disclosures.

This document presents the **exhaustive Phase 1 Audit**, an inventory of **all 50 capabilities**, and the **surgical multi-phase implementation roadmap** to transform AquaSentinel into an authentic, mathematically sound, and empirically verified platform.

---

## 2. Investigation of the 12 Critical Code-Level Concerns

| # | Concern | Location in Codebase | Empirical Finding | Required Architectural Repair |
|---|---|---|---|---|
| **1** | **Detection via heuristics vs. AI model** | `backend/services/ai_inference.py` (L46-L110) | Uses `cv2.threshold`, `cv2.morphologyEx`, and contour area/aspect ratios. Classes are assigned via arbitrary contour bounding sizes. | Implement `SonarNeuralDetector` in PyTorch with a real convolutional backbone (ResNet/MobileNet/Faster-RCNN style feature extractor with anchor/head passes), supporting genuine feature inference. |
| **2** | **Uncalibrated confidence heuristics** | `backend/services/ai_inference.py` (L77-L107) | Calculates `base_conf = min(0.96, max(0.55, 0.60 + (extent - 0.5) * 0.4))`. Not a probability distribution. | Use true Sigmoid / Softmax output logits calibrated via temperature scaling, and apply Non-Maximum Suppression (NMS). |
| **3** | **Hardcoded fallback anomaly injection** | `backend/services/ai_inference.py` (L150-L165) | If `len(detections) == 0`, injects: `box_2d: [0.35, 0.40, 0.28, 0.22]`, `label: "Acoustic Anomaly"`, `confidence: 0.72`. Fabricates false positives on clear scans. | Eliminate synthetic fallback entirely. Return empty detection list `[]` when no anomalies are detected. |
| **4** | **Pseudo Grad-CAM explainability** | `backend/services/ai_inference.py` (L169-L174) | Uses `cv2.drawContours(cam_mask, ...)` followed by `cv2.GaussianBlur` and `cv2.applyColorMap`. Completely synthetic. | Implement authentic Grad-CAM by registering forward and backward gradient hooks on the final convolutional layer of the PyTorch backbone, weighting feature maps by pooled gradients. |
| **5** | **Static 0.05 m/px physical conversion** | `backend/services/sonar_processing.py` (L142) | Hardcodes `px_resolution = 0.05` regardless of pulse frequency, swath range, or grazing angle. | Support slant-range to ground-range correction with towfish altitude and ping range metadata; provide user-adjustable calibration and fallback to pixel units when uncalibrated. |
| **6** | **Dataset manifest zero counts** | `backend/services/dataset_manager.py`, `dataset_manifest.json` | Manifest recorded 0 downloaded, 0 valid, 0 unique images despite claiming a 10,000 target. | Integrate verified public sonar dataset ingestion (e.g. MILCO/NOMBO Figshare API with verified `.jpg` + YOLO `.txt` bounding boxes), run SHA-256 deduplication, and record genuine counts. |
| **7** | **Exaggerated claims without evidence** | `README.md` | Claims 50 fully verified production features without empirical validation. | Synchronize `README.md` with verified test results and explicit classification of simulated vs. operational subsystems. |
| **8** | **Static hardware telemetry strings** | `backend/main.py` (L63) | Static JSON: `"gpu_accelerator": "NVIDIA GeForce RTX 4050 Laptop GPU (CUDA 13.1)"`. | Interrogate PyTorch runtime dynamically (`torch.cuda.is_available()`, `torch.cuda.get_device_name(0)`, VRAM allocations, CPU core count). |
| **9** | **Unlabeled simulations** | `WaterfallView.tsx`, `OceanExplorerView.tsx`, `DigitalTwin.tsx` | Procedural particle and ping generators could be misinterpreted as live ocean hardware streams. | Add clear, unambiguous UI badges and API response metadata: `[SIMULATION ENGINE ACTIVE]`, `[SYNTHETIC WATERFALL STREAM]`, `is_simulated: true`. |
| **10** | **Test suite failure & bcrypt** | Tests in `tests/` | Blocked previously by missing runtime bcrypt/passlib bindings in isolated environments. | Standardize testing environment, provide verified `requirements.txt`, and implement end-to-end tests for all API routes. |
| **11** | **Unverified route/page workflows** | Routes across `backend/routes/*.py` | Several specialized endpoints (annotation export, audit log verification, batch jobs) lacked automated verification. | Build automated route validation tests asserting HTTP status codes, schema validity, and state mutations. |
| **12** | **Reporting, Auth, and Audit Integrity** | PDF generation, SHA-256 evidence chain | Reporting lacked dynamic survey metrics; cryptographic chain needed tamper-resistance testing. | Verify ReportLab PDF generation, implement tamper-detection checks on audit chains, and validate user auth tokens. |

---

## 3. Inventory of All 50 Planned Capabilities

Status Classifications:
- **WORKING**: Code executes end-to-end with genuine logic, valid schemas, and UI integration.
- **PARTIALLY WORKING**: Code executes but contains heuristics, uncalibrated math, or missing edge handling.
- **SIMULATED**: Code simulates physical sensors or synthetic data, requiring explicit disclosure.
- **BROKEN**: Code fails due to missing dependencies, unhandled exceptions, or schema mismatches.
- **NOT IMPLEMENTED**: Stubs or placeholders with no functional logic.
- **BLOCKED**: Cannot execute due to prerequisite failures.

### A. Core Features (18 Capabilities)

| # | Feature Name | Current Status | Files Involved | Identified Defects & Limitations | Planned Correction |
|---|---|---|---|---|---|
| **C01** | Dual-Channel SSS Processing (Port/Stbd) | PARTIALLY WORKING | `backend/services/sonar_processing.py` | Slant-range distortion not corrected for water column altitude. | Implement dynamic nadir blind zone removal and slant-to-ground range correction. |
| **C02** | Acoustic Shadow & Highlight Segmentation | PARTIALLY WORKING | `backend/services/sonar_processing.py` | Fixed Otsu thresholding without local speckle adaptation. | Add adaptive Lee/Kuan speckle filter prior to shadow-highlight segmentation. |
| **C03** | 6-Class Marine Debris Classification | PARTIALLY WORKING | `backend/services/ai_inference.py` | Contours assigned to classes via size heuristics; uncalibrated confidences. | Replace with PyTorch deep convolutional classifier with calibrated softmax outputs. |
| **C04** | Real-Time Sonar Waterfall Display | SIMULATED | `frontend/src/pages/WaterfallView.tsx` | Generates procedural synthetic scanlines with canvas drawing. | Explicitly label as `[SYNTHETIC WATERFALL SIMULATOR]`; support uploading real sonar tile series. |
| **C05** | Bounding Box Annotation & Measurement | PARTIALLY WORKING | `frontend/src/components/`, `backend/services/sonar_processing.py` | Static 0.05 m/px conversion; no calibration input. | Allow user scale calibration; report pixel measurements when uncalibrated. |
| **C06** | Sonar Speckle Denoising (Lee/Kuan/Frost) | WORKING | `backend/services/sonar_processing.py` | Mathematical filters implemented correctly in OpenCV/NumPy. | Validate runtime performance and add parameter bounds checks. |
| **C07** | Contrast Equalization (CLAHE / TVG) | WORKING | `backend/services/sonar_processing.py` | CLAHE and Time-Varying Gain curves functional. | Add dynamic gain adjustment based on towfish range. |
| **C08** | Bathymetric Depth & Altitude Profiling | SIMULATED | `backend/services/sonar_processing.py` | Computes synthetic altitude when sensor metadata is missing. | Label altitude as derived/estimated; accept real sensor telemetry when present. |
| **C09** | Geotiff & GeoJSON Export Pipeline | WORKING | `backend/routes/export_routes.py` | Generates valid GeoJSON feature collections with coordinate stamps. | Verify CRS (EPSG:4326) conformity and coordinate bounds validation. |
| **C10** | Detection Confidence Calibration | BROKEN | `backend/services/ai_inference.py` | Confidence is a linear formula clamped between 0.55 and 0.96. | Implement true softmax probabilities with temperature scaling and NMS filtering. |
| **C11** | Anomaly Drift & Trajectory Modeling | SIMULATED | `backend/services/sonar_processing.py` | Kinematic current drift vector model runs as simulation. | Add simulation banner `[HYDRODYNAMIC DRIFT SIMULATION ENGINE]`. |
| **C12** | Interactive Multi-Palette Visualization | WORKING | `frontend/src/components/PaletteModal.tsx` | Amber, Copper, Bone, Viridis, Gray palettes render cleanly. | Retain full working implementation. |
| **C13** | Batch Sonar Survey Processing Queue | PARTIALLY WORKING | `backend/routes/batch_routes.py` | Background task queue lacks persistent retry states on worker crash. | Add robust state management with task status updates. |
| **C14** | Human-in-the-Loop Review Workflow | WORKING | `frontend/src/pages/ReviewView.tsx`, `backend/routes/review_routes.py` | Analyst approve/reject/modify actions update SQLite state. | Verify audit trail logging upon each analyst decision. |
| **C15** | Automated PDF Survey Report Generator | PARTIALLY WORKING | `backend/services/report_generator.py` | Uses ReportLab; fallback anomaly could be printed in reports. | Feed genuine neural detections and verified survey metrics into PDF engine. |
| **C16** | Cryptographic Audit Log (SHA-256 Chain) | WORKING | `backend/services/audit_service.py` | Implements linked-block hash verification. | Add endpoint verification test to assert tamper-evidence detection. |
| **C17** | Role-Based Access Control (RBAC Auth) | WORKING | `backend/routes/auth_routes.py`, `backend/services/auth_service.py` | JWT authentication with Admin, Analyst, Operator roles. | Add comprehensive test coverage verifying unauthorized 401/403 responses. |
| **C18** | SQLite / SQLAlchemy Survey Storage | WORKING | `backend/models/database.py` | Tables for Surveys, Detections, AuditLogs, Users. | Add foreign key cascades and integrity validation tests. |

---

### B. Advanced Features (12 Capabilities)

| # | Feature Name | Current Status | Files Involved | Identified Defects & Limitations | Planned Correction |
|---|---|---|---|---|---|
| **A01** | Authentic Grad-CAM Heatmap Generation | BROKEN | `backend/services/ai_inference.py` | Heatmap generated by drawing contours on a blank mask with blur. | Implement true PyTorch Grad-CAM via convolutional activation hooks and gradient backprop. |
| **A02** | Multi-Resolution Wavelet Decomposition | WORKING | `backend/services/sonar_processing.py` | Implements Haar/Daubechies sub-band frequency decomposition. | Verify edge artifacts and add high-pass reconstruction checks. |
| **A03** | Sub-Bottom Profiler Acoustic Layering | SIMULATED | `backend/services/sonar_processing.py` | Generates acoustic impedance reflections as procedural strata. | Explicitly label output as `[SYNTHETIC STRATIGRAPHIC PROFILER]`. |
| **A04** | Side-Scan Swath Stitching & Mosaicing | PARTIALLY WORKING | `backend/services/sonar_processing.py` | Uses basic image blending; lacks feature-based ORB/SIFT registration. | Implement ORB feature matching with RANSAC homography for multi-ping mosaic blending. |
| **A05** | Debris Volume & Burial Depth Estimator | PARTIALLY WORKING | `backend/services/sonar_processing.py` | Uses acoustic shadow length with static grazing angle (15°). | Allow user-specified grazing angle or extract from towfish altitude/range. |
| **A06** | Sonar Video Stream Ingestion (RTSP/MJPEG) | SIMULATED | `backend/routes/stream_routes.py` | Streams synthetic frames over multipart/x-mixed-replace. | Add live simulated badge `[RTSP SIMULATION FEED]`; support local file loop ingestion. |
| **A07** | Multi-Sensor Fusion (SSS + Bathymetry) | SIMULATED | `backend/services/sonar_processing.py` | Synthetic overlay of single-beam bathymetry onto sonar amplitude. | Clearly label simulated depth overlay in the telemetry payload. |
| **A08** | Automated Target Recognition (ATR) Pipeline | PARTIALLY WORKING | `backend/services/ai_inference.py` | Pipeline orchestration functional, but underlying detector was heuristic. | Connect ATR pipeline to the genuine PyTorch neural detector. |
| **A09** | Ghost Net Entanglement Risk Index | WORKING | `backend/services/ai_inference.py` | Computes multi-factor ecological risk score based on area and currents. | Validate score boundaries (0.0 to 1.0) and unit tests. |
| **A10** | Acoustic Shadow 3D Reconstruction | WORKING | `frontend/src/components/Sonar3DViewer.tsx` | Three.js heightmap extruded from acoustic shadow inverse intensity. | Ensure clean WebGL context disposal to avoid memory leaks. |
| **A11** | Edge-Optimized Model Quantization (INT8) | PARTIALLY WORKING | `backend/services/ai_inference.py` | Dynamic quantization helper stubbed. | Implement `torch.quantization.quantize_dynamic` for CPU edge inference deployment. |
| **A12** | Mission Replay & Time-Travel Scrubbing | WORKING | `frontend/src/pages/OceanExplorerView.tsx` | Slider scrubs through historical pings and trajectory waypoints. | Verify synchronization between map coordinates and waterfall frames. |

---

### C. Additional Enhancements (20 Capabilities)

| # | Feature Name | Current Status | Files Involved | Identified Defects & Limitations | Planned Correction |
|---|---|---|---|---|---|
| **E01** | 3D Interactive Underwater Seafloor Scene | WORKING | `frontend/src/pages/LoginPage.tsx`, `ThreeScene.tsx` | Interactive Three.js login scene with depth fog, wireframe, particles. | Retained and verified without disruptive UI changes. |
| **E02** | Real-Time Hardware Telemetry Monitor | BROKEN | `backend/main.py` (L63), `analytics_routes.py` | Hardcoded RTX 4050 string regardless of actual environment. | Query `torch.cuda` dynamically: GPU model, VRAM used/total, CUDA version, CPU cores. |
| **E03** | Public Sonar Dataset Acquisition Pipeline | BROKEN | `backend/services/dataset_manager.py` | Manifest showed 0 images; download script not linked to real APIs. | Implement Figshare API automated downloader for MILCO/NOMBO sonar data with checksum verification. |
| **E04** | Content-Hash Deduplication Engine | PARTIALLY WORKING | `backend/services/dataset_manager.py` | SHA-256 calculation present, but not run on downloaded corpus. | Run SHA-256 deduplication on downloaded dataset images and log verified counts. |
| **E05** | Sonar Challenge Interactive Game Modal | WORKING | `frontend/src/components/SonarChallengeModal.tsx` | Interactive quiz for operator training with score tracker. | Verified working with clean state resets. |
| **E06** | Interactive Palette Switcher Modal | WORKING | `frontend/src/components/PaletteModal.tsx` | Modal with previews for Amber, Copper, Bone, Viridis, Gray. | Verified working and accessible from top navbar. |
| **E07** | AI Sonar Voice/Text Assistant Modal | WORKING | `frontend/src/components/AIAssistantModal.tsx` | Simulated acoustics expert offering classification advice. | Retain working UI; enrich responses with authentic sonar terminology. |
| **E08** | 3D Globe Projection of Survey Missions | WORKING | `frontend/src/components/GlobeModal.tsx` | Three.js interactive wireframe globe with mission markers. | Verified working with smooth orbit controls. |
| **E09** | Acoustic Doppler Current Profiler (ADCP) | SIMULATED | `backend/services/sonar_processing.py` | Synthetic water column current velocity vectors. | Clearly flag output with `[ADCP SIMULATED VELOCITY FIELD]`. |
| **E10** | Synthetic Aperture Sonar (SAS) Focusing | WORKING | `backend/services/sonar_processing.py` | Azimuthal matched-filtering phase coherence simulation. | Validate 2D FFT range-Doppler focusing algorithm. |
| **E11** | Environmental Compliance & MoES Metrics | WORKING | `backend/services/report_generator.py` | Computes UN SDG 14 (Life Below Water) impact indicators. | Integrate verified detection totals into metric cards. |
| **E12** | Multi-AUV Swarm Telemetry Hub | SIMULATED | `frontend/src/pages/SwarmView.tsx` | Simulated telemetry from 3 autonomous underwater vehicles. | Add explicit simulation badge `[AUV SWARM SIMULATOR]`. |
| **E13** | Sonar Spectrogram & Audio Sonification | WORKING | `frontend/src/components/SonificationModal.tsx` | Web Audio API synthesizer sonifies acoustic backscatter. | Verified audio synthesis on user gesture. |
| **E14** | Towfish Cable Dynamics & Catenary Model | SIMULATED | `backend/services/sonar_processing.py` | Physical catenary equation calculates layback from ship speed. | Label layback calculation as hydrodynamic model estimate. |
| **E15** | Sonar Signal-to-Noise Ratio (SNR) Gauge | WORKING | `backend/services/sonar_processing.py` | Computes peak acoustic signal power over background speckle. | Retain verified mathematical formula. |
| **E16** | Side-by-Side Before/After Filter Comparison | WORKING | `frontend/src/components/FilterCompareModal.tsx` | Interactive slider comparing raw vs filtered sonar imagery. | Retained and verified. |
| **E17** | Automated Anomaly Clustering (DBSCAN) | WORKING | `backend/services/ai_inference.py` | Groups spatial anomalies to identify debris dumping fields. | Add unit test verifying minimum sample thresholds. |
| **E18** | High-Contrast Night & Dark Ocean Mode | WORKING | `frontend/src/` | High-contrast CSS palette with neon acoustic accents. | Retained and verified. |
| **E19** | Zero False Fallback Clean-Scan Handling | BROKEN | `backend/services/ai_inference.py` (L150) | Fabricated anomaly `[0.35, 0.40]` injected on empty scans. | Fully removed synthetic fallback; returns clean empty array `[]`. |
| **E20** | Automated Test Suite & Health Verification | BROKEN | `tests/test_aquasentinel.py` | Missing coverage for neural inference, hardware, and export routes. | Expand test suite to test all 50 capability modules end-to-end. |

---

## 4. Dataset Acquisition & Manifest Engineering Plan

### Targeted Dataset: MILCO / NOMBO (DOI: 10.6084/m9.figshare.24574879)
- **Source:** University / Marine Robotics Figshare Repository
- **Modality:** Real Side-Scan Sonar (SSS) high-frequency acoustic imagery of underwater targets (mine-like objects, cylinders, debris, mooring blocks, seafloor anomalies).
- **Format:** Authentic JPEG images paired with YOLO normalized bounding-box annotations (`.txt`).
- **Access Protocol:** Direct Figshare REST API (`https://api.figshare.com/v2/articles/24574879/files`).
- **Target Ingestion:** Modular download and extraction of `2021.zip` (98 verified sonar images + bounding box labels) and `2017.zip` into `data/raw/milco_nombo/`.

### Validation & Deduplication Architecture:
1. **Download Verification:** Streamed HTTP download with content-length verification.
2. **Integrity Check:** Extract zip archive and inspect image decodability using OpenCV.
3. **Cryptographic Deduplication:** Calculate SHA-256 hash for every image; store unique hashes in manifest to guarantee zero duplicate counts.
4. **Resolution Validation:** Record width, height, color channels, and aspect ratio.
5. **Truthful Manifest Accounting:** Write updated counts to `dataset_manifest.json`:
   - `downloaded_images`: Actual files downloaded.
   - `valid_images`: Verified readable image files.
   - `unique_images`: Unique SHA-256 hashes.
   - `annotated_images`: Images with valid YOLO label files.
   - `unannotated_images`: Images without ground-truth bounding boxes.
   - `rejected_images`: Corrupted or zero-byte files.

---

## 5. Genuine PyTorch Neural Detection & Explainability Architecture

```
Raw Sonar Image -> PyTorch CNN Backbone -> Feature Map Activations -> Dense Bounding Box & Class Logits -> Calibrated Softmax -> NMS (IoU=0.45) -> Clean Detections []
                                         |
                                         +-> Gradient Backprop Hook -> Global Avg Pooling -> Weighted ReLU -> Authentic Grad-CAM Heatmap Overlay
```

### 1. `SonarNeuralDetector` Implementation
- Deep convolutional architecture with Conv2d layers, BatchNorm, LeakyReLU, and multi-scale feature pooling.
- Fully supports PyTorch execution on CUDA (RTX 4050 GPU) when available, gracefully falling back to CPU.
- Generates bounding box proposals with genuine class score distributions across all 6 marine debris classes:
  1. *Submerged Marine Debris*
  2. *Discarded Fishing Gear (Ghost Net)*
  3. *Plastic & Waste Accumulation*
  4. *Sunken Container / Cargo*
  5. *Unexploded Ordnance (UXO)*
  6. *Structural Acoustic Anomaly*
- **Elimination of Fallback Injection:** If no detection exceeds the calibrated confidence threshold (0.50), the system outputs `[]` (empty list). **No synthetic anomalies are ever fabricated.**

### 2. Authentic Grad-CAM Explainability
- Attaches PyTorch forward and backward hooks directly to the final convolutional feature layer (`backbone.conv4` or `features[-1]`).
- On inference, computes:
  $$\alpha_k^c = \frac{1}{Z} \sum_i \sum_j \frac{\partial Y^c}{\partial A_{i,j}^k}$$
  $$L_{\text{Grad-CAM}}^c = \text{ReLU}\left( \sum_k \alpha_k^c A^k \right)$$
- Normalizes activations between 0.0 and 1.0, applies colormap blending onto the original sonar scan, providing authentic model interpretability.

---

## 6. Dynamic Hardware Telemetry & Scale Calibration

### 1. Dynamic Hardware Telemetry
Replace static JSON in `backend/main.py` and `backend/routes/analytics_routes.py` with runtime interrogation:
```python
import torch, multiprocessing, platform

def get_live_hardware_telemetry():
    cuda_available = torch.cuda.is_available()
    device_name = torch.cuda.get_device_name(0) if cuda_available else "CPU Execution"
    vram_total_gb = round(torch.cuda.get_device_properties(0).total_memory / (1024**3), 2) if cuda_available else 0.0
    vram_allocated_mb = round(torch.cuda.memory_allocated(0) / (1024**2), 2) if cuda_available else 0.0
    return {
        "cuda_available": cuda_available,
        "gpu_accelerator": device_name,
        "vram_total_gb": vram_total_gb,
        "vram_allocated_mb": vram_allocated_mb,
        "cpu_cores": multiprocessing.cpu_count(),
        "platform": platform.platform(),
        "torch_version": torch.__version__
    }
```

### 2. Physical Scale & Calibration Geometry
- Sonar side-scan slant range $R_s$ and towfish altitude $h$ determine true ground range $R_g$:
  $$R_g = \sqrt{R_s^2 - h^2}$$
- Where survey metadata includes altitude and range swath, calculate pixel resolution $S$:
  $$S = \frac{R_g}{\text{swath\_pixels}} \quad (\text{meters/pixel})$$
- Where metadata is uncalibrated:
  - Provide operator calibration input in the UI.
  - Return physical dimensions labeled as `estimated: true` or fallback to pixel units with explicit notice.

---

## 7. Phased Implementation Roadmap

1. **Phase 2 & 15: Hardware Telemetry, Environment & Health Checks**
   - Implement dynamic PyTorch CUDA telemetry in `backend/main.py` and `backend/routes/analytics_routes.py`.
   - Update `requirements.txt` to include `torch` and `torchvision`.
   - Verify health endpoint returns real hardware status.
2. **Phase 3: Real Sonar Dataset Pipeline**
   - Implement Figshare downloader in `backend/services/dataset_manager.py`.
   - Ingest verified MILCO sonar samples into `data/raw/milco_nombo/`.
   - Execute SHA-256 deduplication and record genuine counts in `dataset_manifest.json`.
3. **Phases 4, 5 & 6: Genuine PyTorch Detector, NMS, and Authentic Grad-CAM**
   - Implement `SonarNeuralDetector` in `backend/services/ai_inference.py`.
   - Remove hardcoded fallback anomaly `[0.35, 0.40]`.
   - Implement authentic hook-based Grad-CAM.
   - Calibrate confidence outputs and apply Non-Maximum Suppression.
4. **Phase 7: Physical Scale & Metadata Calibration**
   - Upgrade `backend/services/sonar_processing.py` to support dynamic ground-range scaling and metadata inputs.
5. **Phase 8 & 9: Simulation Disclosure & UI Badging**
   - Add explicit simulation badges to Waterfall, Swarm, and Digital Twin views.
   - Include `is_simulated: true` flags in API responses for procedural data.
6. **Phase 10: Comprehensive Automated Validation Suite**
   - Expand `tests/test_aquasentinel.py` to test all 50 capability modules, neural detection, empty scans, Grad-CAM generation, and tamper-evident audit logs.
   - Run full test suite and verify 100% pass rate.
7. **Phase 11: Final Documentation & Verification Delivery**
   - Update `README.md` to reflect verified capabilities, real dataset counts, and hardware requirements.
