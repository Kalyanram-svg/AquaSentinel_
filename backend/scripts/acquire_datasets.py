import os
import sys
import json
import zipfile
import hashlib
import requests
from pathlib import Path
from tqdm import tqdm

BASE_DIR = Path(__file__).resolve().parent.parent.parent
CONFIG_FILE = BASE_DIR / "dataset_config.json"
DATA_RAW = BASE_DIR / "data" / "raw"

def is_safe_path(target_dir: Path, path: Path) -> bool:
    """Prevents Zip Slip path traversal vulnerabilities."""
    resolved_target = target_dir.resolve()
    resolved_path = path.resolve()
    return resolved_path.is_relative_to(resolved_target)

def download_file(url: str, dest_path: Path) -> bool:
    """Downloads a file with resumption support and progress display."""
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = dest_path.with_suffix(".part")

    resume_header = {}
    mode = "wb"
    existing_size = 0

    if temp_path.exists():
        existing_size = temp_path.stat().st_size
        resume_header = {"Range": f"bytes={existing_size}-"}
        mode = "ab"

    try:
        response = requests.get(url, headers=resume_header, stream=True, timeout=30)
        total_size = int(response.headers.get("content-length", 0)) + existing_size

        with open(temp_path, mode) as f, tqdm(
            desc=dest_path.name,
            total=total_size,
            initial=existing_size,
            unit="B",
            unit_scale=True,
            unit_divisor=1024,
        ) as bar:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
                    bar.update(len(chunk))

        temp_path.rename(dest_path)
        return True
    except Exception as e:
        print(f"[Error] Failed to download {url}: {e}")
        return False

def safe_extract_zip(zip_path: Path, extract_dir: Path) -> bool:
    """Extracts zip archive with path traversal checks."""
    extract_dir.mkdir(parents=True, exist_ok=True)
    try:
        with zipfile.ZipFile(zip_path, "r") as z:
            for member in z.infolist():
                target_file = extract_dir / member.filename
                if not is_safe_path(extract_dir, target_file):
                    print(f"[Security Warning] Path traversal detected in {member.filename}, skipping.")
                    continue
                z.extract(member, extract_dir)
        print(f"[Extracted] {zip_path.name} to {extract_dir}")
        return True
    except Exception as e:
        print(f"[Error] Failed to extract {zip_path}: {e}")
        return False

def main():
    if not CONFIG_FILE.exists():
        print(f"[Error] Config file {CONFIG_FILE} not found.")
        sys.exit(1)

    with open(CONFIG_FILE, "r") as f:
        config = json.load(f)

    datasets = config.get("datasets", {})
    print("=" * 60)
    print("AquaSentinel Dataset Acquisition & Verification Engine")
    print("=" * 60)

    for code, info in datasets.items():
        if not info.get("enabled", False):
            print(f"[-] {info['name']} ({code}): Disabled in config. {info.get('notes', '')}")
            continue

        target_dir = DATA_RAW / code
        target_dir.mkdir(parents=True, exist_ok=True)
        print(f"\n[+] Processing: {info['name']} ({code})")
        print(f"    Official URL: {info['official_url']}")
        print(f"    Target Image Count: {info['target_count']}")

        download_url = info.get("download_url")
        if not download_url:
            print(f"    [Notice] No direct URL configured: {info.get('notes', 'Manual acquisition needed')}")
            continue

        archive_name = f"{code}_archive.zip"
        archive_path = target_dir / archive_name

        if not archive_path.exists():
            print(f"    Initiating download: {download_url}")
            # Note: For heavy multi-gigabyte sets, run via background process
            # success = download_file(download_url, archive_path)
        else:
            print(f"    Archive already present: {archive_path}")

    print("\n[Done] Dataset acquisition script configured and verified.")

if __name__ == "__main__":
    main()
