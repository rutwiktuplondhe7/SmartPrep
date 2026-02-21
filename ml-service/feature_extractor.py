import librosa
import numpy as np

FILLER_WORDS = ["um", "uh", "like", "you know", "actually", "basically"]

def extract_audio_features(file_path, transcript=""):

    y, sr = librosa.load(file_path, sr=None)

    duration = librosa.get_duration(y=y, sr=sr)

    # Energy
    rms = librosa.feature.rms(y=y)[0]
    rms_mean = float(np.mean(rms))
    rms_var = float(np.var(rms))

    # Zero Crossing Rate
    zcr = float(np.mean(librosa.feature.zero_crossing_rate(y)))

    # Spectral centroid
    spectral_centroid = float(
        np.mean(librosa.feature.spectral_centroid(y=y, sr=sr))
    )

    # MFCC
    mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
    mfcc_means = np.mean(mfcc, axis=1).tolist()

    # Pitch extraction
    f0, voiced_flag, voiced_probs = librosa.pyin(
        y,
        fmin=librosa.note_to_hz("C2"),
        fmax=librosa.note_to_hz("C7")
    )

    valid_f0 = f0[~np.isnan(f0)]

    if len(valid_f0) > 0:
        pitch_mean = float(np.mean(valid_f0))
        pitch_var = float(np.var(valid_f0))
    else:
        pitch_mean = 0.0
        pitch_var = 0.0

    # Silence detection
    intervals = librosa.effects.split(y, top_db=25)
    speech_duration = sum((end - start) for start, end in intervals) / sr
    silence_duration = duration - speech_duration
    pause_ratio = silence_duration / duration if duration > 0 else 0

    # Transcript-based features
    words = transcript.split()
    word_count = len(words)

    wpm = (word_count / (duration / 60)) if duration > 0 else 0

    filler_count = sum(
        transcript.lower().count(filler)
        for filler in FILLER_WORDS
    )

    return {
        "duration": duration,
        "rms_mean": rms_mean,
        "rms_variance": rms_var,
        "zero_crossing_rate": zcr,
        "spectral_centroid": spectral_centroid,
        "speaking_rate": wpm,
        "pause_ratio": pause_ratio,
        "pitch_mean": pitch_mean,
        "pitch_variance": pitch_var,
        "filler_count": filler_count,
        "mfcc_means": mfcc_means
    }
