import os
import cv2
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
from tqdm import tqdm
import urllib.request

# NEW MediaPipe imports
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision
from mediapipe.tasks.python.vision import FaceLandmarker, FaceLandmarkerOptions, RunningMode

# Path to CREMA-D video files
VIDEO_DIR = "datasets/CREMA-D/VideoFlash/"

EMOTION_MAP = {
    "ANG": 0,
    "DIS": 1,
    "FEA": 2,
    "HAP": 3,
    "NEU": 4,
    "SAD": 5,
}

MODEL_PATH = "face_landmarker.task"

def download_model():
    """Download the face landmarker model if not present."""
    if not os.path.exists(MODEL_PATH):
        print("Downloading face_landmarker.task model...")
        url = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"
        urllib.request.urlretrieve(url, MODEL_PATH)
        print("Model downloaded.")

def extract_features_from_video(video_path):
    options = FaceLandmarkerOptions(
        base_options=mp_python.BaseOptions(model_asset_path=MODEL_PATH),
        running_mode=RunningMode.IMAGE,  # Process frame-by-frame
        num_faces=1,
        output_face_blendshapes=False,
        output_facial_transformation_matrixes=False,
    )

    smile_scores = []
    eye_openness = []
    frame_count = 0

    cap = cv2.VideoCapture(video_path)

    with FaceLandmarker.create_from_options(options) as landmarker:
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

            # NEW: wrap frame in MediaPipe Image
            import mediapipe as mp
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)

            result = landmarker.detect(mp_image)

            if result.face_landmarks:
                landmarks = result.face_landmarks[0]

                # Smile: horizontal distance between mouth corners
                left = landmarks[61]
                right = landmarks[291]
                smile = np.linalg.norm([right.x - left.x, right.y - left.y])
                smile_scores.append(smile)

                # Eye openness: vertical distance (left eye)
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
    download_model()  # Ensure model file exists

    X, y = [], []
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

    X, y = np.array(X), np.array(y)
    print(f"Extracted features from {len(X)} videos.")

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    clf = RandomForestClassifier(n_estimators=100, random_state=42)
    clf.fit(X_train, y_train)

    y_pred = clf.predict(X_test)
    print(classification_report(y_test, y_pred, target_names=list(EMOTION_MAP.keys())))

    import joblib
    joblib.dump(clf, "cremad_rf_model.joblib")
    print("Model saved as cremad_rf_model.joblib")

if __name__ == "__main__":
    main()