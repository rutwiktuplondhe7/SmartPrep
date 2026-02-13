const express = require("express");
const multer = require("multer");
const { protect } = require("../middlewares/authMiddleware");
const { transcribeAudio } = require("../controllers/audioController");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Multer Configuration (Memory Storage - No Disk Writes)
|--------------------------------------------------------------------------
| - Only allows webm audio (from MediaRecorder)
| - 15MB max file size
| - Secure and minimal
*/

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB
  },
  fileFilter: (req, file, cb) => {
    const mimeType = file.mimetype;

    // Allow only MediaRecorder formats
    if (mimeType === "audio/webm" || mimeType === "video/webm") {
      cb(null, true);
    } else {
      cb(
        new Error(
          `Unsupported format: ${mimeType}. Only webm audio supported.`
        ),
        false
      );
    }
  },
});

/*
|--------------------------------------------------------------------------
| Routes
|--------------------------------------------------------------------------
| POST /api/audio/transcribe
*/

router.post(
  "/transcribe",
  protect,
  upload.single("audio"),
  transcribeAudio
);

/*
|--------------------------------------------------------------------------
| Multer Error Handling
|--------------------------------------------------------------------------
*/

router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      message: err.message,
    });
  }

  if (err.message && err.message.includes("Unsupported format")) {
    return res.status(400).json({
      message: err.message,
    });
  }

  next(err);
});

module.exports = router;
