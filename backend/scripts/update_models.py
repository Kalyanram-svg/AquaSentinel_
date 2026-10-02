import sqlite3

def run():
    conn = sqlite3.connect('aquasentinel.db')
    c = conn.cursor()
    c.execute('DELETE FROM model_records')
    records = [
        (
            1,
            'Sonar Object Detector (YOLOv8)',
            'v1.2',
            'YOLOv8s-Sonar / PyTorch',
            'AI Layer 1 - Acoustic Target Identification',
            '640x640',
            '["Man-Made Object", "Natural Formation", "Suspicious Contact"]',
            0.884, 0.658, 0.892, 0.841, 0.866, 14.2, 22.4,
            'SubPipe + AI4Shipwrecks Benchmark',
            '/data/models/yolov8s_sonar_v1.2.pt',
            'Active',
            'NVIDIA TensorRT / CUDA',
            '2026-09-15 10:00:00'
        ),
        (
            2,
            'Acoustic Highlight-Shadow Classifier',
            'v1.1',
            'ResNet-Acoustic-ShadowNet',
            'AI Layer 2 - Acoustic Target Classification',
            '128x128',
            '["Subsea Pipeline", "Shipwreck", "MILCO", "NOMBO", "Human Surrogate", "Debris"]',
            0.908, 0.692, 0.915, 0.872, 0.893, 8.6, 18.1,
            'Verified Sonar Shadow ROI Corpus',
            '/data/models/acoustic_shadow_classifier_v1.1.pt',
            'Active',
            'PyTorch / CUDA 13.1',
            '2026-09-18 14:00:00'
        ),
        (
            3,
            'Seabed Texture & Backscatter Profiler',
            'v1.0',
            'Statistical Backscatter Profiler',
            'Environmental Profile & Compatibility Gating',
            'Full Swath',
            '["Sandy / Sedimentary", "Rocky / Mixed", "Variable / Unknown"]',
            0.945, 0.742, 0.952, 0.928, 0.940, 4.2, 5.8,
            'Benthic Seafloor Backscatter Corpus',
            '/data/models/seabed_profiler_v1.0.onnx',
            'Active',
            'OpenCV / PyTorch Accelerated',
            '2026-09-20 09:30:00'
        )
    ]
    c.executemany('INSERT INTO model_records VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', records)
    conn.commit()
    conn.close()
    print('Updated model_records successfully!')

if __name__ == '__main__':
    run()
