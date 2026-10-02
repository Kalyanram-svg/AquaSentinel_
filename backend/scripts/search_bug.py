import os

search_terms = ['Shipwreck / Vessel Ruin', '45.0%', '0.45', '7.5', 'defaultSelected', 'demoDetection', 'sampleDetection']
exts = ['.ts', '.tsx', '.py', '.json', '.js']

for root, dirs, files in os.walk('.'):
    if any(p in root for p in ['.git', 'node_modules', '.venv', 'dist', '__pycache__']):
        continue
    for f in files:
        if any(f.endswith(ext) for ext in exts):
            p = os.path.join(root, f)
            try:
                with open(p, 'r', encoding='utf-8', errors='ignore') as fp:
                    lines = fp.readlines()
                    for idx, line in enumerate(lines):
                        for term in search_terms:
                            if term in line:
                                print(f"{p}:{idx+1}: {line.strip()[:120]}")
            except Exception as e:
                pass
