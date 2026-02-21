import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, random_split
from models.cnn_bilstm_model import CNN_BiLSTM
from audio_datasets import LibriSpeechDataset

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print("Using device:", device)

BATCH_SIZE = 16
EPOCHS = 10
LEARNING_RATE = 1e-4

def train():

    dataset = LibriSpeechDataset("datasets/librispeech", max_samples=5000)

    train_size = int(0.8 * len(dataset))
    val_size = len(dataset) - train_size
    train_data, val_data = random_split(dataset, [train_size, val_size])

    train_loader = DataLoader(train_data, batch_size=BATCH_SIZE, shuffle=True)
    val_loader = DataLoader(val_data, batch_size=BATCH_SIZE)

    # Step 1: Initialize with 8 classes (same as RAVDESS)
    model = CNN_BiLSTM(num_classes=8).to(device)

    # Step 2: Load RAVDESS pretrained weights
    model.load_state_dict(torch.load("models/cnn_bilstm_ravdess.pt", map_location=device), strict=False)

    # Step 3: Replace classifier for 2-class task
    model.fc = nn.Linear(model.hidden_size * 2, 2).to(device)

    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=LEARNING_RATE)

    for epoch in range(EPOCHS):

        model.train()
        train_loss = 0
        train_correct = 0
        train_total = 0

        for inputs, labels in train_loader:

            inputs = inputs.to(device)
            labels = labels.to(device)

            optimizer.zero_grad()

            outputs = model(inputs)
            loss = criterion(outputs, labels)

            loss.backward()
            optimizer.step()

            train_loss += loss.item()
            _, predicted = torch.max(outputs, 1)
            train_total += labels.size(0)
            train_correct += (predicted == labels).sum().item()

        train_acc = 100 * train_correct / train_total

        # Validation
        model.eval()
        val_correct = 0
        val_total = 0

        with torch.no_grad():
            for inputs, labels in val_loader:
                inputs = inputs.to(device)
                labels = labels.to(device)

                outputs = model(inputs)
                _, predicted = torch.max(outputs, 1)
                val_total += labels.size(0)
                val_correct += (predicted == labels).sum().item()

        val_acc = 100 * val_correct / val_total

        print(f"Epoch {epoch+1}/{EPOCHS}")
        print(f"Train Loss: {train_loss:.4f} | Train Acc: {train_acc:.2f}%")
        print(f"Val Acc: {val_acc:.2f}%")
        print("-" * 40)

    torch.save(model.state_dict(), "models/cnn_bilstm_pretrained.pt")
    print("Final pretrained acoustic model saved.")


if __name__ == "__main__":
    train()