const axios = require("axios");
const FormData = require("form-data");

exports.analyzeVideoChunk = async (req, res) => {
  try {
    const formData = new FormData();

    formData.append("video", req.file.buffer, {
      filename: "chunk.webm",
      contentType: req.file.mimetype,
    });

    const response = await axios.post(
      "http://127.0.0.1:8001/analyze/video-chunk",
      formData,
      {
        headers: formData.getHeaders(),
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Video error" });
  }
};