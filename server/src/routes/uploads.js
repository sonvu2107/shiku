import express from "express";
import multer from "multer";

import streamifier from "streamifier";
import cloudinary from "../config/cloudinary.js";
import { authRequired } from "../middleware/auth.js";

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post("/image", authRequired, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Vui lòng chọn một hình ảnh" });
    }

    const stream = cloudinary.uploader.upload_stream(
      { folder: "blog" },
      (error, result) => {
        if (error) {
          console.error("Cloudinary upload error:", error);
          return res.status(500).json({ error: "Lỗi khi tải ảnh lên" });
        }
        res.json({ url: result.secure_url });
      }
    );

    streamifier.createReadStream(req.file.buffer).pipe(stream);
  } catch (e) {
    console.error("Upload route error:", e);
    res.status(500).json({ error: "Lỗi khi tải ảnh lên" });
  }
});

export default router;
