import os
import glob
import json
import time
from pathlib import Path
from typing import List, Dict, Tuple
import cv2
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import Dataset, DataLoader

from backend.services.ai_inference import SonarNeuralDetector, CANONICAL_CLASSES
from backend.services.sonar_processing import SonarProcessor
from backend.config import DATA_DIR

MODELS_DIR = DATA_DIR / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)


class SonarDetectionDataset(Dataset):
    """
    Side-scan sonar spatial detection dataset with bounding-box and class supervision.
    Grid size: 64x64 for 512x512 image (stride 8).
    """
    def __init__(self, file_pairs: List[Tuple[str, str]], img_size: int = 512, grid_size: int = 64):
        self.file_pairs = file_pairs
        self.img_size = img_size
        self.grid_size = grid_size

    def __len__(self):
        return len(self.file_pairs)

    def __getitem__(self, idx):
        img_path, txt_path = self.file_pairs[idx]
        raw_gray = cv2.imread(img_path, cv2.IMREAD_GRAYSCALE)
        if raw_gray is None:
            raw_gray = np.zeros((self.img_size, self.img_size), dtype=np.uint8)
        else:
            raw_gray = cv2.resize(raw_gray, (self.img_size, self.img_size))

        # 3-channel input: [raw, clahe, gradient]
        clahe_img = SonarProcessor.apply_clahe(raw_gray, clip_limit=3.0)
        sobel_x = cv2.Sobel(clahe_img, cv2.CV_32F, 1, 0, ksize=3)
        sobel_y = cv2.Sobel(clahe_img, cv2.CV_32F, 0, 1, ksize=3)
        grad_mag = np.clip(np.sqrt(sobel_x**2 + sobel_y**2), 0, 255).astype(np.uint8)

        stacked = np.stack([raw_gray, clahe_img, grad_mag], axis=0).astype(np.float32) / 255.0
        tensor = torch.from_numpy(stacked)

        # Spatial grid targets: [1, 64, 64] objectness, [4, 64, 64] box, [64, 64] class
        target_obj = torch.zeros((1, self.grid_size, self.grid_size), dtype=torch.float32)
        target_box = torch.zeros((4, self.grid_size, self.grid_size), dtype=torch.float32)
        target_cls = torch.zeros((self.grid_size, self.grid_size), dtype=torch.long)
        target_global = torch.zeros(len(CANONICAL_CLASSES), dtype=torch.float32)

        if os.path.exists(txt_path):
            with open(txt_path, "r") as f:
                for line in f:
                    parts = line.strip().split()
                    if len(parts) >= 5:
                        raw_c = int(parts[0])
                        # Map MILCO (0) -> canonical mine_like_contact (idx 2)
                        # Map NOMBO (1) -> canonical non_mine_bottom_object (idx 3)
                        mapped_c = 2 if raw_c == 0 else 3
                        target_global[mapped_c] = 1.0

                        xc, yc, w, h = [float(p) for p in parts[1:5]]
                        gx = int(np.clip(xc * self.grid_size, 0, self.grid_size - 1))
                        gy = int(np.clip(yc * self.grid_size, 0, self.grid_size - 1))

                        target_obj[0, gy, gx] = 1.0
                        tx = xc * self.grid_size - gx
                        ty = yc * self.grid_size - gy
                        tw = np.sqrt(max(1e-4, w))
                        th = np.sqrt(max(1e-4, h))
                        target_box[:, gy, gx] = torch.tensor([tx, ty, tw, th], dtype=torch.float32)
                        target_cls[gy, gx] = mapped_c

        return tensor, target_obj, target_box, target_cls, target_global


def train_model(epochs: int = 25, batch_size: int = 8, lr: float = 1e-3):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"[Trainer] Training on device: {device}")

    # Discover MILCO / NOMBO dataset files
    all_imgs = glob.glob(str(DATA_DIR / "raw" / "milco_nomobo" / "**" / "*.jpg"), recursive=True)
    file_pairs = []
    for img in all_imgs:
        txt = img.replace(".jpg", ".txt")
        file_pairs.append((img, txt))

    print(f"[Trainer] Discovered {len(file_pairs)} sonar image/annotation pairs.")

    # Survey-aware split (2015 & 2017 for train, 2021 for val/test)
    train_pairs = [p for p in file_pairs if "2021" not in p[0]]
    val_pairs = [p for p in file_pairs if "2021" in p[0]]

    print(f"[Trainer] Train split: {len(train_pairs)} images | Val split: {len(val_pairs)} images (partitioned by survey).")

    train_ds = SonarDetectionDataset(train_pairs, img_size=512, grid_size=64)
    val_ds = SonarDetectionDataset(val_pairs, img_size=512, grid_size=64)

    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True, drop_last=False)
    val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False)

    model = SonarNeuralDetector(num_classes=len(CANONICAL_CLASSES)).to(device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)
    pos_weight = torch.tensor([12.0]).to(device)

    best_val_loss = float("inf")
    metrics_history = []
    start_time = time.time()

    for epoch in range(1, epochs + 1):
        model.train()
        running_train_loss = 0.0

        for images, target_obj, target_box, target_cls, target_global in train_loader:
            images = images.to(device)
            target_obj = target_obj.to(device)
            target_box = target_box.to(device)
            target_cls = target_cls.to(device)
            target_global = target_global.to(device)

            optimizer.zero_grad()
            features, dense_preds, global_logits = model(images)

            # Objectness loss
            pred_obj_logits = dense_preds[:, 0:1, :, :]
            loss_obj = F.binary_cross_entropy_with_logits(pred_obj_logits, target_obj, pos_weight=pos_weight)

            # Spatial box & class loss on positive grid cells
            pos_mask = (target_obj > 0.5)
            if pos_mask.sum() > 0:
                pos_mask_box = pos_mask.expand_as(target_box)
                pred_boxes = dense_preds[:, 1:5, :, :]
                loss_box = F.smooth_l1_loss(pred_boxes[pos_mask_box], target_box[pos_mask_box])

                pred_cls = dense_preds[:, 5:, :, :].permute(0, 2, 3, 1)
                pos_cells = pos_mask.squeeze(1)
                loss_cls = F.cross_entropy(pred_cls[pos_cells], target_cls[pos_cells])
            else:
                loss_box = torch.tensor(0.0).to(device)
                loss_cls = torch.tensor(0.0).to(device)

            loss_global = F.binary_cross_entropy_with_logits(global_logits, target_global)
            total_loss = loss_obj + 2.0 * loss_box + 1.0 * loss_cls + 0.4 * loss_global

            total_loss.backward()
            optimizer.step()

            running_train_loss += total_loss.item() * len(images)

        scheduler.step()
        train_loss = running_train_loss / max(1, len(train_ds))

        # Validation
        model.eval()
        running_val_loss = 0.0
        with torch.no_grad():
            for images, target_obj, target_box, target_cls, target_global in val_loader:
                images = images.to(device)
                target_obj = target_obj.to(device)
                target_box = target_box.to(device)
                target_cls = target_cls.to(device)
                target_global = target_global.to(device)

                _, dense_preds, global_logits = model(images)
                pred_obj_logits = dense_preds[:, 0:1, :, :]
                loss_obj = F.binary_cross_entropy_with_logits(pred_obj_logits, target_obj, pos_weight=pos_weight)

                pos_mask = (target_obj > 0.5)
                if pos_mask.sum() > 0:
                    pos_mask_box = pos_mask.expand_as(target_box)
                    loss_box = F.smooth_l1_loss(dense_preds[:, 1:5, :, :][pos_mask_box], target_box[pos_mask_box])
                    pred_cls = dense_preds[:, 5:, :, :].permute(0, 2, 3, 1)
                    pos_cells = pos_mask.squeeze(1)
                    loss_cls = F.cross_entropy(pred_cls[pos_cells], target_cls[pos_cells])
                else:
                    loss_box = torch.tensor(0.0).to(device)
                    loss_cls = torch.tensor(0.0).to(device)

                loss_global = F.binary_cross_entropy_with_logits(global_logits, target_global)
                val_total = loss_obj + 2.0 * loss_box + 1.0 * loss_cls + 0.4 * loss_global
                running_val_loss += val_total.item() * len(images)

        val_loss = running_val_loss / max(1, len(val_ds))
        metrics_history.append({
            "epoch": epoch,
            "train_loss": round(train_loss, 4),
            "val_loss": round(val_loss, 4),
            "lr": round(scheduler.get_last_lr()[0], 6)
        })

        if val_loss < best_val_loss:
            best_val_loss = val_loss
            torch.save(model.state_dict(), str(MODELS_DIR / "sonar_neural_detector_best.pt"))
            print(f"[*] Epoch {epoch:02d}/{epochs}: Train Loss: {train_loss:.4f} | Val Loss: {val_loss:.4f} (Saved Best)")
        else:
            if epoch % 5 == 0 or epoch == epochs:
                print(f"[-] Epoch {epoch:02d}/{epochs}: Train Loss: {train_loss:.4f} | Val Loss: {val_loss:.4f}")

    total_time = time.time() - start_time
    print(f"[Trainer] Training completed in {total_time:.1f}s. Best Val Loss: {best_val_loss:.4f}")

    # Save training metadata
    metrics_file = MODELS_DIR / "training_metrics.json"
    with open(metrics_file, "w") as f:
        json.dump({
            "model_architecture": "SonarNeuralDetector-ResNet-FCOS-Head",
            "dataset": "MILCO/NOMBO Side-Scan Sonar",
            "epochs": epochs,
            "batch_size": batch_size,
            "best_val_loss": round(best_val_loss, 4),
            "train_time_seconds": round(total_time, 1),
            "history": metrics_history
        }, f, indent=2)

    return model

if __name__ == "__main__":
    train_model(epochs=25, batch_size=8, lr=1e-3)
