import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader, random_split
import pandas as pd
import librosa
import numpy as np
from sklearn.metrics import r2_score

from models.cnn_bilstm_model import CNN_BiLSTM

# -------------------
# CONFIG
# -------------------
TARGET_SR = 16000
N_MELS = 128
FIXED_DURATION = 5

BATCH_SIZE = 8
EPOCHS = 35
LR = 1e-5
PATIENCE = 5

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print("Using device:", device)

# -------------------
# DATASET
# -------------------
class SmartPrepDataset(Dataset):

    def __init__(self, csv_path):
        self.df = pd.read_csv(csv_path)

    def __len__(self):
        return len(self.df)

    def __getitem__(self, idx):

        row = self.df.iloc[idx]
        file_path = row["audio_path"]

        y, sr = librosa.load(file_path, sr=TARGET_SR)

        max_len = TARGET_SR * FIXED_DURATION
        if len(y) < max_len:
            y = np.pad(y, (0, max_len - len(y)))
        else:
            y = y[:max_len]

        mel = librosa.feature.melspectrogram(
            y=y,
            sr=TARGET_SR,
            n_mels=N_MELS
        )

        mel_db = librosa.power_to_db(mel, ref=np.max)
        mel_tensor = torch.tensor(mel_db).unsqueeze(0).float()

        # Normalize labels 1–5 → 0–1
        confidence = (row["confidence_label"] - 1) / 4
        clarity = (row["clarity_label"] - 1) / 4

        target = torch.tensor([confidence, clarity]).float()

        return mel_tensor, target


# -------------------
# TRAINING
# -------------------
def train():

    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    MODEL_PATH = os.path.join(BASE_DIR, "models", "cnn_bilstm_pretrained.pt")
    SAVE_PATH = os.path.join(BASE_DIR, "models", "smartprep_regression_final.pt")

    dataset = SmartPrepDataset(
        os.path.join(BASE_DIR, "..", "data_collection", "dataset", "master_dataset.csv")
    )

    train_size = int(0.8 * len(dataset))
    val_size = len(dataset) - train_size
    train_data, val_data = random_split(dataset, [train_size, val_size])

    train_loader = DataLoader(train_data, batch_size=BATCH_SIZE, shuffle=True)
    val_loader = DataLoader(val_data, batch_size=BATCH_SIZE)

    model = CNN_BiLSTM(num_classes=2).to(device)

    # Initialize dynamic layers
    dummy_input = torch.randn(1, 1, 128, 157).to(device)
    model(dummy_input)

    # Load pretrained weights
    model.load_state_dict(torch.load(MODEL_PATH, map_location=device))

    # Replace FC with regression head
    model.fc = nn.Sequential(
        nn.Linear(256, 128),
        nn.ReLU(),
        nn.Dropout(0.3),
        nn.Linear(128, 2)
    ).to(device)

    # 🔥 FULL UNFREEZE
    for param in model.parameters():
        param.requires_grad = True

    optimizer = optim.Adam(model.parameters(), lr=LR)
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(
        optimizer, mode='min', patience=3, factor=0.5
    )

    criterion = nn.MSELoss()

    best_val_loss = float('inf')
    early_counter = 0

    for epoch in range(EPOCHS):

        model.train()
        train_loss = 0

        for inputs, targets in train_loader:

            inputs = inputs.to(device)
            targets = targets.to(device)

            optimizer.zero_grad()
            outputs = model(inputs)
            loss = criterion(outputs, targets)
            loss.backward()
            optimizer.step()

            train_loss += loss.item()

        # ---------- VALIDATION ----------
        model.eval()
        val_loss = 0
        all_preds = []
        all_targets = []

        with torch.no_grad():
            for inputs, targets in val_loader:

                inputs = inputs.to(device)
                targets = targets.to(device)

                outputs = model(inputs)
                loss = criterion(outputs, targets)

                val_loss += loss.item()

                all_preds.extend(outputs.cpu().numpy())
                all_targets.extend(targets.cpu().numpy())

        val_loss /= len(val_loader)
        scheduler.step(val_loss)

        all_preds = np.array(all_preds)
        all_targets = np.array(all_targets)

        mae = np.mean(np.abs(all_preds - all_targets))
        rmse = np.sqrt(np.mean((all_preds - all_targets) ** 2))
        r2 = r2_score(all_targets, all_preds)

        print(f"\nEpoch {epoch+1}/{EPOCHS}")
        print(f"Train Loss: {train_loss:.4f}")
        print(f"Val Loss: {val_loss:.4f}")
        print(f"MAE: {mae:.4f} | RMSE: {rmse:.4f} | R2: {r2:.4f}")
        print("-" * 50)

        # Early stopping
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            torch.save(model.state_dict(), SAVE_PATH)
            early_counter = 0
            print("✅ Best model saved.")
        else:
            early_counter += 1

        if early_counter >= PATIENCE:
            print("⛔ Early stopping triggered.")
            break

    print("🎯 Final model saved at:", SAVE_PATH)


if __name__ == "__main__":
    train()