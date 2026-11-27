import numpy as np
import joblib
import os

MODEL_PATH = os.path.join(os.path.dirname(__file__), "cremad_rf_model.joblib")

# Accepts a list of videoMeta dicts (from frontend), returns predicted emotion label
# videoMeta: [{eye, smile, timestamp}, ...]
def predict_emotion_from_video_meta(video_meta):
    if not video_meta or not isinstance(video_meta, list):
        return None
    # Aggregate features as in training
    smiles = [v.get("smile", 0) for v in video_meta]
    eyes = [v.get("eye", 0) for v in video_meta]
    features = [
        float(np.mean(smiles)) if smiles else 0,
        float(np.std(smiles)) if smiles else 0,
        float(np.mean(eyes)) if eyes else 0,
        float(np.std(eyes)) if eyes else 0,
        float(len(video_meta)),
    ]
    # Load model
    clf = joblib.load(MODEL_PATH)
    pred = clf.predict([features])[0]
    return int(pred)

# For API use
def emotion_label_from_index(idx):
    idx = int(idx)
    for k, v in {
        "ANG": 0, "DIS": 1, "FEA": 2, "HAP": 3, "NEU": 4, "SAD": 5
    }.items():
        if v == idx:
            return k
    return "UNK"
