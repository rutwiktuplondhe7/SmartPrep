import os
import pandas as pd
import uuid
from datetime import datetime

DATASET_ROOT = "datasets"
SMARTPREP_DIR = os.path.join(DATASET_ROOT, "smartprep")
AUDIO_DIR = os.path.join(SMARTPREP_DIR, "audio")
METADATA_FILE = os.path.join(SMARTPREP_DIR, "metadata.csv")

os.makedirs(AUDIO_DIR, exist_ok=True)

def generate_sample_id():
    return f"sp_{uuid.uuid4().hex[:12]}"

def log_metadata(sample_id, transcript, features):

    data = {
        "sample_id": sample_id,
        "transcript": transcript,
        "duration": features["duration"],
        "rms_mean": features["rms_mean"],
        "rms_variance": features["rms_variance"],
        "zero_crossing_rate": features["zero_crossing_rate"],
        "spectral_centroid": features["spectral_centroid"],
        "speaking_rate": features["speaking_rate"],
        "pause_ratio": features["pause_ratio"],
        "pitch_mean": features["pitch_mean"],
        "pitch_variance": features["pitch_variance"],
        "filler_count": features["filler_count"],
        "dataset_version": "smartprep_v1",
        "created_at": datetime.utcnow().isoformat()
    }

    df = pd.DataFrame([data])

    if not os.path.exists(METADATA_FILE):
        df.to_csv(METADATA_FILE, index=False)
    else:
        df.to_csv(METADATA_FILE, mode="a", header=False, index=False)
