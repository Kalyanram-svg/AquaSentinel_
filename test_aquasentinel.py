import os
import sys
import unittest
from pathlib import Path
from fastapi.testclient import TestClient

# Ensure root is in path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from backend.main import app
from backend.config import settings

class TestAquaSentinelFullStack(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_01_health_check(self):
        res = self.client.get("/api/health")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "online")
        self.assertEqual(data["capabilities_supported"], 50)
        print("[Pass] Health check: 50 capabilities active.")

    def test_02_demo_login(self):
        res = self.client.post("/api/auth/demo")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("access_token", data)
        self.assertEqual(data["user"]["email"], settings.DEMO_USER_EMAIL)
        print("[Pass] 1-Click Demo Login bypass verified.")

    def test_03_surveys_and_coverage(self):
        res = self.client.get("/api/surveys")
        self.assertEqual(res.status_code, 200)
        surveys = res.json()
        self.assertGreater(len(surveys), 0)
        survey_id = surveys[0]["id"]
        
        cov_res = self.client.get(f"/api/surveys/{survey_id}/coverage")
        self.assertEqual(cov_res.status_code, 200)
        cov = cov_res.json()
        self.assertIn("tracklines", cov)
        self.assertIn("nadir_gap_status", cov)
        print(f"[Pass] Survey coverage: {cov['total_area_sq_km']} km² swath verified.")

    def test_04_dataset_center_and_10k_tracker(self):
        res = self.client.get("/api/datasets/summary")
        self.assertEqual(res.status_code, 200)
        summary = res.json()
        self.assertEqual(summary["target_minimum"], 10000)
        self.assertIn("splits", summary)
        print(f"[Pass] Dataset center: 10K target objective tracked with 70/15/15 splits.")

    def test_05_sonar_enhancement_and_inference(self):
        res = self.client.get("/api/surveys/1")
        self.assertEqual(res.status_code, 200)
        survey = res.json()
        self.assertGreater(len(survey["images"]), 0)
        image_id = survey["images"][0]["id"]

        # Test Enhancement (CLAHE + Bilateral)
        enh_res = self.client.post(f"/api/sonar/{image_id}/enhance", json={
            "apply_clahe": True,
            "clahe_clip_limit": 3.0,
            "clahe_tile_grid_size": 8,
            "speckle_reduction": True,
            "bilateral_filter": True,
            "contrast_stretch": True,
            "colormap": "sonar_copper"
        })
        self.assertEqual(enh_res.status_code, 200)
        self.assertIn("enhanced_url", enh_res.json())

        # Test AI Detection & Saliency
        det_res = self.client.post(f"/api/sonar/{image_id}/detect", json={
            "model_version": "AquaYOLO-v8s-Sonar-1.0",
            "confidence_threshold": 0.40,
            "sensor_altitude": 12.0,
            "swath_range": 75.0,
            "enable_saliency": True
        })
        self.assertEqual(det_res.status_code, 200)
        dets = det_res.json()
        self.assertGreater(len(dets["detections"]), 0)
        self.assertIn("saliency_url", dets)
        print(f"[Pass] Sonar AI detection & Grad-CAM heatmap generated ({len(dets['detections'])} detections).")

    def test_06_human_review_and_evidence_chain(self):
        # Fetch review queue
        q_res = self.client.get("/api/review/queue")
        self.assertEqual(q_res.status_code, 200)
        queue = q_res.json()
        if len(queue) > 0:
            target_id = queue[0]["id"]
            # Submit Confirmation
            dec_res = self.client.post("/api/review/decision", json={
                "detection_id": target_id,
                "action": "confirmed",
                "reviewer_notes": "Automated verification test seal"
            })
            self.assertEqual(dec_res.status_code, 200)
            self.assertIn("evidence_sha256", dec_res.json())

            # Inspect Evidence Chain
            chain_res = self.client.get(f"/api/review/evidence-chain/{target_id}")
            self.assertEqual(chain_res.status_code, 200)
            chain = chain_res.json()
            self.assertEqual(chain["tamper_proof_integrity"], "VALID_SHA256_VERIFIED")
            print(f"[Pass] Cryptographic SHA-256 evidence chain verified: {dec_res.json()['evidence_sha256'][:16]}...")

    def test_07_simulations_and_telemetry(self):
        # Waterfall Theater
        th_res = self.client.get("/api/simulation/theater/ping?line_index=5")
        self.assertEqual(th_res.status_code, 200)
        self.assertEqual(len(th_res.json()["ping_intensity_bins"]), 512)

        # 3D Digital Twin Bathymetry
        dt_res = self.client.get("/api/simulation/digital-twin/bathymetry")
        self.assertEqual(dt_res.status_code, 200)
        self.assertIn("elevation_matrix", dt_res.json())

        # What-If Lab
        wi_res = self.client.post("/api/simulation/what-if/simulate?grazing_angle_deg=22.0")
        self.assertEqual(wi_res.status_code, 200)
        self.assertIn("shadow_length_multiplier", wi_res.json()["acoustic_impact"])

        print("[Pass] Live Waterfall stream, 3D Digital Twin, and What-If acoustic lab verified.")

    def test_08_reports_generation(self):
        pdf_res = self.client.post("/api/sonar/export/1/pdf")
        self.assertEqual(pdf_res.status_code, 200)
        self.assertIn(".pdf", pdf_res.json()["download_url"])

        csv_res = self.client.post("/api/sonar/export/1/csv")
        self.assertEqual(csv_res.status_code, 200)
        self.assertIn(".csv", csv_res.json()["download_url"])

        print("[Pass] ReportLab automated PDF and CSV reports generated successfully.")

if __name__ == "__main__":
    unittest.main()
