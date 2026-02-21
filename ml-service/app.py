from fastapi import FastAPI, UploadFile, File
from faster_whisper import WhisperModel
import tempfile
import os
import subprocess
import torch
import torch.nn as nn
import librosa
import numpy as np

from feature_extractor import extract_audio_features
from dataset_logger import generate_sample_id, log_metadata, AUDIO_DIR
from models.cnn_bilstm_model import CNN_BiLSTM

app = FastAPI()

# -----------------------------------
# Whisper Model (Transcription)
# -----------------------------------
whisper_model = WhisperModel("small", device="cpu", compute_type="int8")

# -----------------------------------
# Clarity Regression Model
# -----------------------------------
DEVICE = torch.device("cpu")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "models", "smartprep_regression_lstm_unfrozen.pt")

# Load regression model
regression_model = CNN_BiLSTM(num_classes=2)

# Initialize dynamic layers
dummy_input = torch.randn(1, 1, 128, 157)
regression_model(dummy_input)

# 🔥 IMPORTANT: Recreate regression head exactly like training
regression_model.fc = nn.Sequential(
    nn.Linear(256, 128),
    nn.ReLU(),
    nn.Dropout(0.3),
    nn.Linear(128, 2)
)

regression_model.load_state_dict(torch.load(MODEL_PATH, map_location=DEVICE))
regression_model.eval()

TARGET_SR = 16000
N_MELS = 128
FIXED_DURATION = 5

# -----------------------------------
# 1️⃣ TRANSCRIPTION ENDPOINT
# -----------------------------------
@app.post("/transcribe")
async def transcribe_audio(audio: UploadFile = File(...)):
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp:
            tmp.write(await audio.read())
            temp_webm = tmp.name

        sample_id = generate_sample_id()
        wav_path = os.path.join(AUDIO_DIR, f"{sample_id}.wav")

        subprocess.run(
            ["ffmpeg", "-y", "-i", temp_webm, wav_path],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )

        segments, info = whisper_model.transcribe(
            wav_path,
            beam_size=5,
            vad_filter=True
        )

        transcript = ""
        for segment in segments:
            transcript += segment.text + " "

        transcript = transcript.strip()

        features = extract_audio_features(wav_path, transcript)
        log_metadata(sample_id, transcript, features)

        os.remove(temp_webm)

        return {
            "transcript": transcript,
            "sample_id": sample_id,
            "features": features
        }

    except Exception as e:
        return {"error": str(e)}


# -----------------------------------
# 2️⃣ CLARITY PREDICTION ENDPOINT
# -----------------------------------
@app.post("/predict")
async def predict_clarity(file: UploadFile = File(...)):
    try:
        # Save temp webm
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp:
            tmp.write(await file.read())
            temp_webm = tmp.name

        temp_wav = temp_webm.replace(".webm", ".wav")

        subprocess.run(
            ["ffmpeg", "-y", "-i", temp_webm, temp_wav],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )

        # Load audio
        y, sr = librosa.load(temp_wav, sr=TARGET_SR)

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
        mel_tensor = torch.tensor(mel_db).unsqueeze(0).unsqueeze(0).float()

        with torch.no_grad():
            output = regression_model(mel_tensor)

        confidence_norm = output[0][0].item()
        clarity_norm = output[0][1].item()

        # Convert back to 1–5 scale
        confidence_score = round((confidence_norm * 4) + 1, 2)
        clarity_score = round((clarity_norm * 4) + 1, 2)

        os.remove(temp_webm)
        os.remove(temp_wav)

        return {
            "confidence": confidence_score,
            "clarity": clarity_score
        }

    except Exception as e:
        return {"error": str(e)}