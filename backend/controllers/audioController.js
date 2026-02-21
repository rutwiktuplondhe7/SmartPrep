const axios = require("axios");
const FormData = require("form-data");

exports.transcribeAudio = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "No audio file provided",
      });
    }

    // -------------------------------
    // 1️⃣ Send audio to Whisper Service
    // -------------------------------
    const formData = new FormData();
    formData.append("audio", req.file.buffer, {
      filename: "recording.webm",
      contentType: req.file.mimetype,
    });

    const whisperResponse = await axios.post(
      "http://127.0.0.1:8001/transcribe",
      formData,
      {
        headers: {
          ...formData.getHeaders(),
        },
        timeout: 120000,
      }
    );

    // -------------------------------
    // 2️⃣ Send SAME audio to Clarity ML Service
    // -------------------------------
    const mlFormData = new FormData();
    mlFormData.append("file", req.file.buffer, {
      filename: "recording.webm",
      contentType: req.file.mimetype,
    });

    const mlResponse = await axios.post(
      "http://127.0.0.1:8001/predict",
      mlFormData,
      {
        headers: {
          ...mlFormData.getHeaders(),
        },
      }
    );

    // -------------------------------
    // 3️⃣ Return Everything to Frontend
    // -------------------------------
    return res.status(200).json({
      transcript: whisperResponse.data.transcript,
      sampleId: whisperResponse.data.sample_id,
      features: whisperResponse.data.features,
      confidenceScore: mlResponse.data.confidence,
      clarityScore: mlResponse.data.clarity,
    });

  } catch (error) {
    console.error("Audio Processing Error:", error.response?.data || error.message);

    return res.status(500).json({
      message: "Audio processing failed",
    });
  }
};