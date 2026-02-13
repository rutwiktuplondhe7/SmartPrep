const axios = require("axios");
const FormData = require("form-data");

exports.transcribeAudio = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "No audio file provided",
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        message: "OpenAI API key not configured",
      });
    }

    const formData = new FormData();
    formData.append("file", req.file.buffer, {
      filename: "recording.webm",
      contentType: req.file.mimetype || "audio/webm",
    });

    formData.append("model", "whisper-1");

    // Optional: force language for better speed
    formData.append("language", "en");

    const response = await axios.post(
      "https://api.openai.com/v1/audio/transcriptions",
      formData,
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          ...formData.getHeaders(),
        },
        timeout: 60000,
      }
    );

    const transcript = response.data.text?.trim() || "";

    if (!transcript) {
      return res.status(200).json({
        transcript: "",
        warning: "No speech detected",
      });
    }

    return res.status(200).json({ transcript });

  } catch (error) {
    console.error(
      "Whisper Transcription Error:",
      error.response?.data || error.message
    );

    return res.status(500).json({
      message: "Audio transcription failed",
    });
  }
};
