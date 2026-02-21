import os
import torch
import librosa
import numpy as np
import random
from torch.utils.data import Dataset

TARGET_SR = 16000
N_MELS = 128
FIXED_DURATION = 5  # seconds


EMOTION_MAP = {
    "01": 0,  # neutral
    "02": 1,  # calm
    "03": 2,  # happy
    "04": 3,  # sad
    "05": 4,  # angry
    "06": 5,  # fearful
    "07": 6,  # disgust
    "08": 7   # surprised
}


class RAVDESSDataset(Dataset):

    def __init__(self, root_dir):
        self.samples = []
        self.root_dir = root_dir

        for actor in os.listdir(root_dir):
            actor_path = os.path.join(root_dir, actor)

            if not os.path.isdir(actor_path):
                continue

            for file in os.listdir(actor_path):
                if file.endswith(".wav"):
                    emotion_id = file.split("-")[2]
                    label = EMOTION_MAP.get(emotion_id)

                    if label is not None:
                        self.samples.append(
                            (os.path.join(actor_path, file), label)
                        )

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        file_path, label = self.samples[idx]

        y, sr = librosa.load(file_path, sr=TARGET_SR)

        # pad or cut to fixed length
        max_len = TARGET_SR * FIXED_DURATION
        if len(y) < max_len:
            pad_length = max_len - len(y)
            y = np.pad(y, (0, pad_length))
        else:
            y = y[:max_len]

        mel = librosa.feature.melspectrogram(
            y=y,
            sr=TARGET_SR,
            n_mels=N_MELS
        )

        mel_db = librosa.power_to_db(mel, ref=np.max)

        mel_tensor = torch.tensor(mel_db).unsqueeze(0).float()

        return mel_tensor, torch.tensor(label)


class LibriSpeechDataset(Dataset):

    def __init__(self, root_dir, max_samples=5000):
        self.files = []

        for root, _, files in os.walk(root_dir):
            for file in files:
                if file.endswith(".flac"):
                    self.files.append(os.path.join(root, file))

        # Shuffle and limit to max_samples
        random.shuffle(self.files)
        self.files = self.files[:max_samples]

        print(f"Loaded {len(self.files)} LibriSpeech samples.")

    def __len__(self):
        return len(self.files)

    def degrade_audio(self, y):
        noise = np.random.normal(0, 0.005, y.shape)
        return y + noise

    def __getitem__(self, idx):

        file_path = self.files[idx]
        y, sr = librosa.load(file_path, sr=TARGET_SR)

        max_len = TARGET_SR * FIXED_DURATION
        if len(y) < max_len:
            y = np.pad(y, (0, max_len - len(y)))
        else:
            y = y[:max_len]

        if random.random() > 0.5:
            label = 0
        else:
            y = self.degrade_audio(y)
            label = 1

        mel = librosa.feature.melspectrogram(
            y=y,
            sr=TARGET_SR,
            n_mels=N_MELS
        )

        mel_db = librosa.power_to_db(mel, ref=np.max)

        mel_tensor = torch.tensor(mel_db).unsqueeze(0).float()

        return mel_tensor, torch.tensor(label)