import sys
import json
import os
import numpy as np
from video_infer import predict_emotion_from_video_meta, emotion_label_from_index

def main():
    try:
        input_str = sys.stdin.readline()
        data = json.loads(input_str)
        video_meta = data.get("videoMeta", [])
        pred_idx = predict_emotion_from_video_meta(video_meta)
        label = emotion_label_from_index(pred_idx) if pred_idx is not None else "UNK"
        print(json.dumps({"emotion": label, "index": pred_idx}))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
