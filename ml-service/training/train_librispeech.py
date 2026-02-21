import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
from audio_datasets import LibriSpeechDataset
from models.acoustic_encoder import AcousticEncoder

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
BATCH_SIZE = 16
EPOCHS = 10
LEARNING_RATE = 1e-4


def train():

    dataset = LibriSpeechDataset("datasets/librispeech/raw/train-clean-100")

    loader = DataLoader(dataset, batch_size=BATCH_SIZE, shuffle=True)

    model = AcousticEncoder(num_classes=2).to(DEVICE)

    # 🔥 IMPORTANT: Load RAVDESS pretrained weights
    model.load_state_dict(
        torch.load("models/pretrained_acoustic_encoder.pt"),
        strict=False
    )

    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=LEARNING_RATE)

    for epoch in range(EPOCHS):

        model.train()
        total_loss = 0
        correct = 0
        total = 0

        for x, y in loader:

            x, y = x.to(DEVICE), y.to(DEVICE)

            optimizer.zero_grad()
            outputs = model(x)
            loss = criterion(outputs, y)
            loss.backward()
            optimizer.step()

            total_loss += loss.item()
            _, predicted = torch.max(outputs, 1)
            total += y.size(0)
            correct += (predicted == y).sum().item()

        acc = 100 * correct / total

        print(f"Epoch {epoch+1}/{EPOCHS}")
        print(f"Loss: {total_loss:.4f} | Accuracy: {acc:.2f}%")
        print("-" * 40)

    torch.save(model.state_dict(), "models/pretrained_acoustic_encoder_librispeech.pt")
    print("LibriSpeech fine-tuned model saved.")


if __name__ == "__main__":
    train()
