const express = require("express");
const router = express.Router();
const multer = require("multer");

const upload = multer();

const { analyzeVideoChunk } = require("../controllers/videoController");

router.post("/analyze-chunk", upload.single("video"), analyzeVideoChunk);

module.exports = router;