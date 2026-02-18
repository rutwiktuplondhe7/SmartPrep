const axios = require("axios");
const FormData = require("form-data");

exports.transcribeAudio = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "No audio file provided",
      });
    }

    const formData = new FormData();
    formData.append("audio", req.file.buffer, {
      filename: "recording.webm",
      contentType: req.file.mimetype,
    });

    const response = await axios.post(
      "http://127.0.0.1:8001/transcribe",   // 🔥 IMPORTANT
      formData,
      {
        headers: {
          ...formData.getHeaders(),
        },
        timeout: 120000,
      }
    );

    return res.status(200).json({
      transcript: response.data.transcript,
    });

  } catch (error) {
    console.error("Local Whisper Error:", error.response?.data || error.message);

    return res.status(500).json({
      message: "Audio transcription failed",
    });
  }
};
