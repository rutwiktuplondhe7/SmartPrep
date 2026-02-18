from fastapi import FastAPI, UploadFile, File
from faster_whisper import WhisperModel
import tempfile
import os

app = FastAPI()

# Load model once at startup
# Use "base" for good balance
model = WhisperModel("small", device="cpu", compute_type="int8")

@app.post("/transcribe")
async def transcribe_audio(audio: UploadFile = File(...)):
    try:
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp:
            tmp.write(await audio.read())
            tmp_path = tmp.name

        # Transcription
        segments, info = model.transcribe(tmp_path)

        transcript = ""
        for segment in segments:
            transcript += segment.text + " "

        # Delete temp file
        os.remove(tmp_path)

        return {
            "transcript": transcript.strip()
        }

    except Exception as e:
        return {
            "error": str(e)
        }
