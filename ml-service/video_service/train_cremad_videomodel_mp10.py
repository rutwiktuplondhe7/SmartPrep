import os
import cv2

import mediapipe as mp
from mediapipe import solutions
import numpy as np
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
from tqdm import tqdm

# Path to CREMA-D video files
VIDEO_DIR = "datasets/CREMA-D/VideoFlash/"

# Emotion mapping from filename
EMOTION_MAP = {
    "ANG": 0,  # Anger
    "DIS": 1,  # Disgust
    "FEA": 2,  # Fear
    "HAP": 3,  # Happy
    "NEU": 4,  # Neutral
    "SAD": 5,  # Sad
}

# Helper: extract features from a video file using mediapipe 0.10.x+ (FaceMesh)
def extract_features_from_video(video_path):
    cap = cv2.VideoCapture(video_path)
    smile_scores = []
    eye_openness = []
    frame_count = 0
    with solutions.face_mesh.FaceMesh(static_image_mode=False, max_num_faces=1, refine_landmarks=True) as mesh:
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = mesh.process(rgb)
            if results.multi_face_landmarks:
                landmarks = results.multi_face_landmarks[0].landmark
                # Smile: distance between mouth corners
                left = landmarks[61]
                right = landmarks[291]
                smile = np.linalg.norm([right.x - left.x, right.y - left.y])
                smile_scores.append(smile)
                # Eye openness: vertical distance between eyelid landmarks (left eye)
                top = landmarks[159]
                bottom = landmarks[145]
                eye_open = abs(top.y - bottom.y)
                eye_openness.append(eye_open)
            frame_count += 1
    cap.release()
    return {
        "smile_mean": np.mean(smile_scores) if smile_scores else 0,
        "smile_std": np.std(smile_scores) if smile_scores else 0,
        "eye_open_mean": np.mean(eye_openness) if eye_openness else 0,
        "eye_open_std": np.std(eye_openness) if eye_openness else 0,
        "frame_count": frame_count,
    }

def get_label_from_filename(filename):
    parts = filename.split("_")
    if len(parts) < 3:
        return None
    return EMOTION_MAP.get(parts[2], None)

def main():
    X = []
    y = []
    files = [f for f in os.listdir(VIDEO_DIR) if f.endswith(".flv")]
    for fname in tqdm(files, desc="Extracting features"):
        label = get_label_from_filename(fname)
        if label is None:
            continue
        fpath = os.path.join(VIDEO_DIR, fname)
        feats = extract_features_from_video(fpath)
        X.append([
            feats["smile_mean"], feats["smile_std"],
            feats["eye_open_mean"], feats["eye_open_std"],
            feats["frame_count"]
        ])
        y.append(label)
    X = np.array(X)
    y = np.array(y)
    print(f"Extracted features from {len(X)} videos.")
    # Train/test split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    clf = RandomForestClassifier(n_estimators=100, random_state=42)
    clf.fit(X_train, y_train)
    y_pred = clf.predict(X_test)
    print(classification_report(y_test, y_pred, target_names=list(EMOTION_MAP.keys())))
    # Save model
    import joblib
    joblib.dump(clf, "cremad_rf_model.joblib")
    print("Model saved as cremad_rf_model.joblib")

if __name__ == "__main__":
    main()
