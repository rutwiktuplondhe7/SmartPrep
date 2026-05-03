from fastapi import FastAPI, UploadFile, File
from faster_whisper import WhisperModel
import tempfile
import os
import subprocess
import torch
import torch.nn as nn
import librosa
import numpy as np
import joblib
from pydantic import BaseModel
from typing import Optional

from feature_extractor import extract_audio_features
from dataset_logger import generate_sample_id, log_metadata, AUDIO_DIR
from models.cnn_bilstm_model import CNN_BiLSTM
from video_service.video_processor import analyze_video

app = FastAPI()

# -----------------------------------
# Whisper Model
# -----------------------------------
whisper_model = WhisperModel("small", device="cpu", compute_type="int8")

# -----------------------------------
# Regression Model (Confidence + Clarity)
# -----------------------------------
DEVICE = torch.device("cpu")
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "models", "smartprep_regression_final.pt")

regression_model = CNN_BiLSTM(num_classes=2)
dummy_input = torch.randn(1, 1, 128, 157)
regression_model(dummy_input)
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
# Fusion weights
# -----------------------------------
AUDIO_WEIGHT = 0.6
VIDEO_WEIGHT = 0.4


def run_regression(wav_path: str):
    """Run CNN+BiLSTM on a wav file, return confidence and clarity on 1–5 scale."""
    y, sr = librosa.load(wav_path, sr=TARGET_SR)

    max_len = TARGET_SR * FIXED_DURATION
    if len(y) < max_len:
        y = np.pad(y, (0, max_len - len(y)))
    else:
        y = y[:max_len]

    mel = librosa.feature.melspectrogram(y=y, sr=TARGET_SR, n_mels=N_MELS)
    mel_db = librosa.power_to_db(mel, ref=np.max)
    mel_tensor = torch.tensor(mel_db).unsqueeze(0).unsqueeze(0).float()

    with torch.no_grad():
        output = regression_model(mel_tensor)

    # Model outputs 0–1, convert to 1–5 scale
    confidence_score = round((output[0][0].item() * 4) + 1, 2)
    clarity_score    = round((output[0][1].item() * 4) + 1, 2)

    # Clamp to valid range
    confidence_score = max(1.0, min(5.0, confidence_score))
    clarity_score    = max(1.0, min(5.0, clarity_score))

    return confidence_score, clarity_score


def fuse_confidence(audio_confidence: float, video_confidence: Optional[float]) -> float:
    """
    Fuse audio confidence (1–5 scale) with video confidence (0–1 scale).
    Returns final confidence on 1–5 scale.
    """
    if video_confidence is None or video_confidence <= 0:
        return audio_confidence

    # Convert video 0–1 → 1–5 scale to match audio
    video_scaled = (video_confidence * 4) + 1

    fused = (AUDIO_WEIGHT * audio_confidence) + (VIDEO_WEIGHT * video_scaled)
    return round(max(1.0, min(5.0, fused)), 2)


# -----------------------------------
# 1️⃣ TRANSCRIPTION + SCORING
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

        # Transcription
        segments, _ = whisper_model.transcribe(wav_path, beam_size=5, vad_filter=True)
        transcript = " ".join([s.text for s in segments]).strip()

        # Acoustic features
        features = extract_audio_features(wav_path, transcript)
        log_metadata(sample_id, transcript, features)

        # 🔥 Run regression model on same wav
        audio_confidence, clarity_score = run_regression(wav_path)

        os.remove(temp_webm)

        return {
            "transcript":      transcript,
            "sampleId":        sample_id,
            "features":        features,
            "confidenceScore": audio_confidence,  # raw audio score, fusion happens below
            "clarityScore":    clarity_score,
        }

    except Exception as e:
        return {"error": str(e)}


# -----------------------------------
# 2️⃣ PREDICT ONLY (kept for standalone use)
# -----------------------------------
@app.post("/predict")
async def predict_clarity(audio: UploadFile = File(...)):
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp:
            tmp.write(await audio.read())
            temp_webm = tmp.name

        temp_wav = temp_webm.replace(".webm", ".wav")
        subprocess.run(
            ["ffmpeg", "-y", "-i", temp_webm, temp_wav],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )

        confidence_score, clarity_score = run_regression(temp_wav)

        os.remove(temp_webm)
        os.remove(temp_wav)

        return {
            "confidence": confidence_score,
            "clarity":    clarity_score,
        }

    except Exception as e:
        return {"error": str(e)}


# -----------------------------------
# 3️⃣ VIDEO CHUNK ANALYSIS
# -----------------------------------
@app.post("/analyze/video-chunk")
async def analyze_video_chunk(video: UploadFile = File(...)):
    try:
        with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp:
            tmp.write(await video.read())
            tmp_path = tmp.name

        result = analyze_video(tmp_path)
        os.unlink(tmp_path)
        return result

    except Exception as e:
        return {"error": str(e)}


# -----------------------------------
# 4️⃣ FUSED SCORE ENDPOINT
# Called after both audio + video are done
# -----------------------------------
class FuseRequest(BaseModel):
    audioConfidence: float
    videoConfidence: Optional[float] = None

@app.post("/fuse/confidence")
async def fuse_confidence_endpoint(body: FuseRequest):
    fused = fuse_confidence(body.audioConfidence, body.videoConfidence)
    return {"finalConfidence": fused}