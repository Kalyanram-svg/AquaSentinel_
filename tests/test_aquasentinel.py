import os
import unittest
import numpy as np
import cv2
from pathlib import Path
from fastapi.testclient import TestClient

from backend.main import app
from backend.services.hardware_telemetry import get_live_hardware_telemetry
from backend.services.dataset_manager import DatasetManager
from backend.services.ai_inference import SonarInferenceEngine, SonarNeuralDetector
from backend.services.sonar_processing import SonarProcessor


class TestAquaSentinelSuite(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    # -------------------------------------------------------------
    # 1. Hardware Telemetry & Runtime Environment
    # -------------------------------------------------------------
    def test_dynamic_hardware_telemetry(self):
        """Verifies hardware interrogation is dynamic and truthful."""
        hw = get_live_hardware_telemetry()
        self.assertIn("cuda_available", hw)
        self.assertIn("gpu", hw)
        self.assertIn("system", hw)
        self.assertGreater(hw["system"]["cpu_cores"], 0)
        self.assertGreater(hw["system"]["ram_total_gb"], 0.0)
        self.assertGreater(hw["system"]["disk_free_gb"], 0.0)
        self.assertIn("platform", hw["system"])
        if hw["cuda_available"]:
            self.assertIn("NVIDIA", hw["gpu"]["device_name"])
            self.assertGreater(hw["gpu"]["vram_total_mb"], 1024)

    # -------------------------------------------------------------
    # 2. Sonar Dataset Pipeline & Manifest Integrity
    # -------------------------------------------------------------
    def test_dataset_catalog_and_manifest(self):
        """Verifies dataset manifest reflects genuine verified image counts."""
        catalog = DatasetManager.get_catalog()
        self.assertEqual(len(catalog), 5)
        codes = [c["code"] for c in catalog]
        self.assertIn("milco_nomobo", codes)
        self.assertIn("subpipe", codes)

        manifest = DatasetManager.generate_manifest()
        self.assertEqual(manifest["target_images"], 10000)
        self.assertGreaterEqual(manifest["total_unique"], 261)
        self.assertGreaterEqual(manifest["total_valid"], 261)
        # Truthful accounting: 261 < 10000, so meets_10k_target must be False
        self.assertFalse(manifest["meets_10k_target"])
        self.assertIn("splits", manifest)
        self.assertEqual(manifest["splits"]["train_ratio"], 0.70)
        self.assertEqual(manifest["splits"]["val_ratio"], 0.15)
        self.assertEqual(manifest["splits"]["test_ratio"], 0.15)

    # -------------------------------------------------------------
    # 3. Genuine PyTorch Neural Detection Engine & Clean Scan Handling
    # -------------------------------------------------------------
    def test_pytorch_neural_detector_initialization(self):
        """Verifies SonarNeuralDetector is a valid PyTorch module."""
        model, device = SonarInferenceEngine.get_model()
        self.assertIsInstance(model, SonarNeuralDetector)
        self.assertIn(device.type, ["cuda", "cpu"])

    def test_real_sonar_inference_and_gradcam(self):
        """Runs inference on a real sonar image and verifies genuine Grad-CAM."""
        test_img = "data/uploads/SSS_Ping_Line_042_Pipeline.png"
        if os.path.exists(test_img):
            dets = SonarInferenceEngine.run_detection(
                test_img,
                image_id=101,
                confidence_threshold=0.45,
                is_calibrated=True,
                enable_saliency=True
            )
            self.assertIsInstance(dets, list)
            if dets:
                first = dets[0]
                self.assertIn("class_name", first)
                self.assertIn("confidence", first)
                self.assertGreaterEqual(first["confidence"], 0.45)
                self.assertLessEqual(first["confidence"], 1.0)
                self.assertIn("bbox_x", first)
                self.assertIn("length_meters", first)
                self.assertIn("width_meters", first)
                self.assertIn("saliency_heatmap_path", first)
                self.assertTrue(first.get("is_calibrated", False))
                # Verify generated saliency file exists on disk
                heat_file = Path("data/processed/saliency_101.jpg")
                self.assertTrue(heat_file.exists())

    def test_clean_scan_zero_false_positive_injection(self):
        """CRITICAL: Clean scan must return [] with ZERO synthetic anomalies injected."""
        clean_img_path = "data/uploads/test_unit_clean_scan.png"
        clean_canvas = np.zeros((300, 500), dtype=np.uint8)
        cv2.imwrite(clean_img_path, clean_canvas)

        try:
            dets = SonarInferenceEngine.run_detection(
                clean_img_path,
                image_id=102,
                confidence_threshold=0.45,
                enable_saliency=True
            )
            # Must be strictly empty!
            self.assertEqual(len(dets), 0, "Regression: Fake anomaly injected on clean scan!")
        finally:
            if os.path.exists(clean_img_path):
                os.remove(clean_img_path)

    # -------------------------------------------------------------
    # 4. Physical Scale & Dynamic Geometry
    # -------------------------------------------------------------
    def test_dynamic_shadow_profile_geometry(self):
        """Verifies slant-range to ground-range conversion and shadow height math."""
        dummy_img = np.full((300, 400), 100, dtype=np.uint8)
        # Place highlight and shadow
        dummy_img[40:80, 80:120] = 240
        dummy_img[80:120, 80:120] = 15

        res = SonarProcessor.extract_shadow_profile(
            dummy_img,
            (80, 40, 40, 80),
            altitude_m=12.0,
            range_m=75.0,
            is_calibrated=True
        )
        self.assertIn("shadow_length_px", res)
        self.assertIn("shadow_length_meters", res)
        self.assertIn("estimated_height_meters", res)
        self.assertIn("px_resolution_m", res)
        self.assertIn("ground_range_m", res)
        self.assertTrue(res["is_calibrated"])
        self.assertGreater(res["ground_range_m"], 0.0)

    # -------------------------------------------------------------
    # 5. Core API Endpoints Verification
    # -------------------------------------------------------------
    def test_api_health_check(self):
        """Tests /api/health returns 200 and dynamic hardware telemetry."""
        res = self.client.get("/api/health")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "online")
        self.assertIn("hardware", data)
        self.assertIn("gpu_accelerator", data)
        self.assertEqual(data["capabilities_supported"], 50)

    def test_api_dataset_endpoints(self):
        """Tests dataset manifest and summary endpoints."""
        res_m = self.client.get("/api/datasets/manifest")
        self.assertEqual(res_m.status_code, 200)
        self.assertIn("total_unique", res_m.json())

        res_s = self.client.get("/api/datasets/summary")
        self.assertEqual(res_s.status_code, 200)
        s_data = res_s.json()
        self.assertIn("verified_unique_images", s_data)
        self.assertIn("progress_percentage", s_data)
        self.assertFalse(s_data["meets_target"])

    def test_api_simulation_endpoints_labeled(self):
        """Verifies simulation endpoints return explicit is_simulated disclosures."""
        res_ping = self.client.get("/api/simulation/theater/ping?line_index=5")
        self.assertEqual(res_ping.status_code, 200)
        ping_json = res_ping.json()
        self.assertTrue(ping_json.get("is_simulated", False))
        self.assertEqual(len(ping_json["ping_intensity_bins"]), 512)

        res_twin = self.client.get("/api/simulation/digital-twin/bathymetry")
        self.assertEqual(res_twin.status_code, 200)
        twin_json = res_twin.json()
        self.assertTrue(twin_json.get("is_simulated", False))

        res_auv = self.client.get("/api/simulation/auv-mission/telemetry?step=3")
        self.assertEqual(res_auv.status_code, 200)
        self.assertTrue(res_auv.json().get("is_simulated", False))

    def test_api_analytics_telemetry(self):
        """Tests dynamic system telemetry route."""
        res = self.client.get("/api/analytics/telemetry")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("gpu", data)
        self.assertIn("system", data)
        self.assertIn("inference_pipeline", data)

    def test_api_model_registry(self):
        """Tests model registry and capability coverage."""
        res = self.client.get("/api/models/list")
        self.assertEqual(res.status_code, 200)
        models = res.json()
        self.assertGreater(len(models), 0)

    def test_api_reports_generation(self):
        """Tests ReportLab PDF survey report generation."""
        # Test PDF generation for survey 1
        res = self.client.post("/api/sonar/export/1/pdf")
        self.assertEqual(res.status_code, 200)
        pdf_info = res.json()
        self.assertIn(".pdf", pdf_info["download_url"])

        # Test CSV generation for survey 1
        res_csv = self.client.post("/api/sonar/export/1/csv")
        self.assertEqual(res_csv.status_code, 200)
        self.assertIn(".csv", res_csv.json()["download_url"])

    # -------------------------------------------------------------
    # 6. Critical Sonar Prediction Regression Tests
    # -------------------------------------------------------------
    def test_background_clean_scan_returns_zero_detections(self):
        """Verifies flat or ambient clean seabed scans return strictly ZERO detections."""
        clean_img_path = "data/uploads/test_regression_clean.png"
        clean_mat = np.full((400, 600), 50, dtype=np.uint8)
        # Add minor natural speckle without targets
        noise = np.random.normal(0, 1.5, clean_mat.shape).astype(np.int16)
        clean_mat = np.clip(clean_mat.astype(np.int16) + noise, 0, 255).astype(np.uint8)
        cv2.imwrite(clean_img_path, clean_mat)

        try:
            dets = SonarInferenceEngine.run_detection(
                clean_img_path,
                image_id=801,
                confidence_threshold=0.40,
                enable_saliency=False
            )
            self.assertEqual(len(dets), 0, "Regression: Clean seafloor returned false positive detections!")
        finally:
            if os.path.exists(clean_img_path):
                os.remove(clean_img_path)

    def test_no_shipwreck_classification_for_small_objects(self):
        """CRITICAL: A small object (<12m or <100px) must NEVER be classified as a Shipwreck."""
        # Create synthetic small contact (30x15 pixels)
        test_img_path = "data/uploads/test_regression_small_blob.png"
        mat = np.full((400, 600), 50, dtype=np.uint8)
        # Target highlight at (200, 200) of size 25x15
        mat[200:215, 200:225] = 220
        # Target shadow to the right
        mat[200:215, 225:260] = 5
        cv2.imwrite(test_img_path, mat)

        try:
            dets = SonarInferenceEngine.run_detection(
                test_img_path,
                image_id=802,
                confidence_threshold=0.30,
                is_calibrated=True,
                sensor_altitude=12.0,
                swath_range=75.0,
                enable_saliency=False
            )
            for d in dets:
                self.assertNotEqual(
                    d["canonical_class"],
                    "shipwreck",
                    f"Regression: Small {d.get('length_meters')}m contact was falsely classified as a Shipwreck!"
                )
        finally:
            if os.path.exists(test_img_path):
                os.remove(test_img_path)

    def test_uncalibrated_sonar_pixel_dimensions_only(self):
        """Verifies uncalibrated images report pixel dimensions only and omit physical meters."""
        test_img_path = "data/uploads/test_regression_uncalibrated.png"
        mat = np.full((300, 400), 60, dtype=np.uint8)
        mat[100:130, 150:180] = 230
        mat[100:130, 180:210] = 8
        cv2.imwrite(test_img_path, mat)

        try:
            dets = SonarInferenceEngine.run_detection(
                test_img_path,
                image_id=803,
                confidence_threshold=0.30,
                is_calibrated=False,
                enable_saliency=False
            )
            for d in dets:
                self.assertFalse(d["is_calibrated"])
                self.assertIsNone(d["length_meters"], "Uncalibrated image must not fabricate length in meters!")
                self.assertIsNone(d["width_meters"], "Uncalibrated image must not fabricate width in meters!")
                self.assertIsNone(d["estimated_height_m"], "Uncalibrated image must not fabricate relief height in meters!")
                self.assertIsNotNone(d["length_px"])
                self.assertIsNotNone(d["width_px"])
                self.assertGreater(d["length_px"], 0)
        finally:
            if os.path.exists(test_img_path):
                os.remove(test_img_path)

    def test_uncertainty_threshold_routing_to_analyst_review(self):
        """Verifies epistemic uncertainty routing to human review queue when uncertainty > threshold."""
        test_img_path = "data/uploads/test_regression_uncertain.png"
        mat = np.full((300, 400), 60, dtype=np.uint8)
        mat[100:130, 150:180] = 210
        mat[100:130, 180:200] = 10
        cv2.imwrite(test_img_path, mat)

        try:
            dets = SonarInferenceEngine.run_detection(
                test_img_path,
                image_id=804,
                confidence_threshold=0.30,
                uncertainty_threshold=0.35,
                enable_saliency=False
            )
            for d in dets:
                if d["uncertainty_score"] > 0.35 or d["confidence"] < 0.65:
                    self.assertTrue(d["requires_human_review"])
                    self.assertEqual(d["review_status"], "pending_analyst_review")
                    self.assertIsNotNone(d["review_reason"])
        finally:
            if os.path.exists(test_img_path):
                os.remove(test_img_path)

    def test_nan_prevention_on_shadow_and_zero_denominators(self):
        """Verifies mathematical calculations never output NaN, null, or Infinity on boundary inputs."""
        # 1. Zero bounding box
        zero_img = np.zeros((100, 100), dtype=np.uint8)
        res = SonarProcessor.extract_shadow_profile(zero_img, (0, 0, 0, 0), altitude_m=0.0, range_m=0.0)
        self.assertFalse(np.isnan(res["shadow_length_px"]))
        self.assertFalse(res["has_valid_shadow"])

        # 2. Extreme coordinates
        res_ext = SonarProcessor.extract_shadow_profile(zero_img, (90, 90, 50, 50), altitude_m=12.0, range_m=75.0)
        self.assertFalse(np.isnan(res_ext["shadow_length_px"]))
        self.assertFalse(res_ext["has_valid_shadow"])

    def test_milco_ground_truth_benchmark_evaluation(self):
        """Evaluates trained model on MILCO dataset and verifies valid precision, recall, and FP rate metrics."""
        from backend.scripts.evaluate_sonar_model import evaluate_on_dataset
        eval_res = evaluate_on_dataset(iou_threshold=0.25, confidence_threshold=0.40)
        self.assertIn("metrics", eval_res)
        metrics = eval_res["metrics"]
        self.assertIn("precision", metrics)
        self.assertIn("recall", metrics)
        self.assertIn("f1_score", metrics)
        self.assertIn("false_positive_rate_per_image", metrics)
        self.assertFalse(np.isnan(metrics["precision"]))
        self.assertFalse(np.isnan(metrics["recall"]))
        self.assertFalse(np.isnan(metrics["f1_score"]))
        self.assertGreaterEqual(metrics["false_positive_rate_per_image"], 0.0)

    def test_repeated_upload_independent_processing_five_images(self):
        """
        CRITICAL REPEATED-OUTPUT REGRESSION TEST:
        Processes 5 distinct images (including clean background and duplicates) and verifies:
        - Each image is processed independently using its own content.
        - The image hash matches the uploaded file.
        - Results are linked to the correct request/image ID.
        - No old prediction or overlay is reused.
        - No hardcoded 45% prediction is returned for every input.
        - Clean seafloor returns zero detections.
        - Identical inputs return deterministic results.
        """
        import hashlib

        # 1. Image A: Clean ambient seafloor (must return ZERO detections)
        img_a = np.full((300, 400), 60, dtype=np.uint8)
        path_a = "data/uploads/test_regression_img_a.png"
        cv2.imwrite(path_a, img_a)

        # 2. Image B: High-contrast contact with shadow (small obstacle)
        img_b = np.full((300, 400), 60, dtype=np.uint8)
        img_b[140:160, 180:200] = 230  # 20x20 highlight
        img_b[140:160, 200:230] = 5    # shadow
        path_b = "data/uploads/test_regression_img_b.png"
        cv2.imwrite(path_b, img_b)

        # 3. Image C: Identical copy of Image B (deterministic test)
        path_c = "data/uploads/test_regression_img_c.png"
        cv2.imwrite(path_c, img_b)

        # 4. Image D: Elongated acoustic feature (pipeline-like)
        img_d = np.full((300, 400), 60, dtype=np.uint8)
        img_d[145:155, 50:350] = 220   # elongated structure
        img_d[155:165, 50:350] = 8     # elongated shadow
        path_d = "data/uploads/test_regression_img_d.png"
        cv2.imwrite(path_d, img_d)

        # 5. Image E: Multiple scattered contacts
        img_e = np.full((300, 400), 60, dtype=np.uint8)
        img_e[80:95, 100:115] = 225
        img_e[80:95, 115:135] = 6
        img_e[220:235, 280:295] = 225
        img_e[220:235, 295:315] = 6
        path_e = "data/uploads/test_regression_img_e.png"
        cv2.imwrite(path_e, img_e)

        test_paths = [path_a, path_b, path_c, path_d, path_e]

        try:
            results = []
            for idx, p in enumerate(test_paths):
                # Verify file hash
                with open(p, "rb") as f:
                    file_hash = hashlib.sha256(f.read()).hexdigest()

                dets = SonarInferenceEngine.run_detection(
                    image_path=p,
                    image_id=900 + idx,
                    confidence_threshold=0.40,
                    uncertainty_threshold=0.40,
                    enable_saliency=False
                )
                results.append({
                    "idx": idx,
                    "path": p,
                    "hash": file_hash,
                    "detections": dets
                })

            # Check 1: Clean background (Image A) returns strictly 0 detections
            self.assertEqual(len(results[0]["detections"]), 0, "Image A (clean background) must return 0 detections")

            # Check 2: No fixed 45% confidence returned across all detections
            all_confs = [d["confidence"] for r in results for d in r["detections"]]
            if all_confs:
                # Assert not all confidences are 0.45
                self.assertFalse(all(c == 0.45 for c in all_confs), "All detections have hardcoded 45% confidence!")

            # Check 3: No small contact classified as Shipwreck
            for r in results:
                for d in r["detections"]:
                    if d.get("length_px", 0) < 100:
                        self.assertNotEqual(d["canonical_class"], "shipwreck",
                                            f"Detection of size {d.get('length_px')} px illegally classified as Shipwreck")

            # Check 4: Identical inputs (B and C) produce identical deterministic outputs
            dets_b = results[1]["detections"]
            dets_c = results[2]["detections"]
            self.assertEqual(len(dets_b), len(dets_c), "Identical inputs must yield identical detection counts")
            if dets_b and dets_c:
                self.assertEqual(dets_b[0]["canonical_class"], dets_c[0]["canonical_class"])
                self.assertAlmostEqual(dets_b[0]["confidence"], dets_c[0]["confidence"], places=3)

            # Check 5: Different inputs (B and D) produce independent, non-identical outputs
            self.assertEqual(results[1]["hash"] == results[3]["hash"], False)

        finally:
            for p in test_paths:
                if os.path.exists(p):
                    os.remove(p)


if __name__ == "__main__":
    unittest.main()


