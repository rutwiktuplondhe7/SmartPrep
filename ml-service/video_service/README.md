# Video analysis

Video analysis for the mock interview.

**How it works in the running app:** `app.py` calls `analyze_video()` in `video_processor.py`. It uses MediaPipe face tracking on the recorded video and measures eye contact, smile, head movement and head turn (yaw), then combines them into a video confidence score. No trained model file is needed for this.

| File | Needed to run the app? | Purpose |
|---|---|---|
| `video_processor.py` | **Yes** | Face-tracking analysis used by `app.py` |
| `cremad_rf_model.joblib` | No | Random-forest emotion classifier trained on CREMA-D. Stored in git (about 41 MB). |
| `video_infer.py`, `video_infer_entry.py` | No | Standalone script that runs the `.joblib` classifier. Not called by `app.py` or the backend. |
| `train_cremad_videomodel.py`, `train_cremad_videomodel_mp10.py` | No | Scripts used to train the `.joblib` classifier |

Everything the app needs is included in a normal `git clone`; there is nothing to download.

The classifier was trained on the [CREMA-D](https://github.com/CheyneyComputerScience/CREMA-D) dataset. That dataset (about 3.6 GB) is **not** in git. It is only needed if you want to retrain: download it into `video_service/datasets/CREMA-D/` and run one of the `train_*` scripts from the `video_service` folder.
