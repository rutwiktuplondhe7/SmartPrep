# Audio models

Trained PyTorch weights for the audio analysis. **These files are stored in git** (about 70 MB in total), so a normal `git clone` already includes them. There is nothing to download.

| File | Needed to run the service? | Purpose |
|---|---|---|
| `smartprep_regression_final.pt` | **Yes** | Confidence and clarity scoring. `app.py` loads it on startup and will not start without it. |
| `cnn_bilstm_ravdess.pt` | No | Intermediate checkpoint, only for retraining or fine-tuning |
| `cnn_bilstm_pretrained.pt` | No | Intermediate checkpoint, only for retraining or fine-tuning |
| `pretrained_acoustic_encoder.pt` | No | Pretrained encoder, only for retraining |
| `pretrained_acoustic_encoder_librispeech.pt` | No | Pretrained encoder, only for retraining |

`cnn_bilstm_model.py` defines the network architecture that these weights belong to.

If `app.py` fails with a `FileNotFoundError` for `smartprep_regression_final.pt`, the file is missing from this folder: re-clone the repository or restore it from your backup.

The training scripts that produce these files are in [`../training/`](../training). They need the training datasets (LibriSpeech, RAVDESS and the project's own recordings), which are **not** in git. Retraining is optional and not needed to run the app.
