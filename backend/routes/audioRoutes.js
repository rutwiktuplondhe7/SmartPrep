const express = require("express");
const multer = require("multer");
const { protect } = require("../middlewares/authMiddleware");
const { transcribeAudio } = require("../controllers/audioController");

const router = express.Router();

/*
|----------------------------------------------------------------------
| Multer Configuration (Simplified & Stable)
|----------------------------------------------------------------------
| - Memory storage
| - 15MB max file size
| - No strict mimetype filtering (browser variance safe)
|----------------------------------------------------------------------
*/

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB
  },
});

router.post(
  "/transcribe",
  protect,
  upload.single("audio"),
  transcribeAudio
);

router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      message: err.message,
    });
  }
  next(err);
});

module.exports = router;
