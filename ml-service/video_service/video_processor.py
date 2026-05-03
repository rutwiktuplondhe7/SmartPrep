import cv2
import mediapipe as mp
import numpy as np

mp_face_mesh = mp.solutions.face_mesh

def analyze_video(video_path: str) -> dict:
    cap = cv2.VideoCapture(video_path)

    if not cap.isOpened():
        return {
            "eye_contact": 0.0,
            "smile": 0.0,
            "movement": 0.0,
            "yaw": 0.0,
            "video_confidence": 0.0,
            "frames_analyzed": 0
        }

    face_mesh = mp_face_mesh.FaceMesh(
        static_image_mode=False,
        max_num_faces=1,
        refine_landmarks=True,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5
    )

    eye_contact_scores = []
    smile_scores       = []
    movement_scores    = []
    yaw_scores         = []

    prev_nose = None

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        h, w, _ = frame.shape
        rgb     = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = face_mesh.process(rgb)

        if not results.multi_face_landmarks:
            continue

        lm = results.multi_face_landmarks[0].landmark

        # Eye contact — nose x proximity to frame center
        nose   = lm[1]
        nose_x = nose.x * w
        eye_contact = 1.0 if abs(nose_x - w / 2) < w * 0.15 else 0.0
        eye_contact_scores.append(eye_contact)

        # Smile — normalized mouth width
        smile_raw = abs(lm[291].x - lm[61].x)
        smile_scores.append(smile_raw)

        # Head movement — nose displacement frame-to-frame
        current_nose = np.array([nose.x, nose.y])
        if prev_nose is not None:
            movement = np.linalg.norm(current_nose - prev_nose)
            movement_scores.append(movement)
        prev_nose = current_nose

        # Yaw stability — face width proxy
        face_width = abs(lm[454].x - lm[234].x)
        yaw_score  = float(np.clip(face_width / 0.30, 0, 1))
        yaw_scores.append(yaw_score)

    cap.release()
    face_mesh.close()

    n = len(eye_contact_scores)
    if n == 0:
        return {
            "eye_contact": 0.0, "smile": 0.0,
            "movement": 0.0, "yaw": 0.0,
            "video_confidence": 0.0, "frames_analyzed": 0
        }

    eye_contact_avg  = float(np.mean(eye_contact_scores))
    smile_raw_avg    = float(np.mean(smile_scores))
    smile_norm       = float(np.clip((smile_raw_avg - 0.03) / 0.06, 0, 1))
    movement_avg     = float(np.mean(movement_scores)) if movement_scores else 0.0
    movement_score   = float(1 - min(movement_avg * 10, 1))
    yaw_avg          = float(np.mean(yaw_scores))

    video_confidence = (
        0.35 * eye_contact_avg +
        0.25 * smile_norm      +
        0.20 * movement_score  +
        0.20 * yaw_avg
    )

    return {
        "eye_contact":       eye_contact_avg,
        "smile":             smile_norm,
        "movement":          movement_score,
        "yaw":               yaw_avg,
        "video_confidence":  float(video_confidence),
        "frames_analyzed":   n
    }