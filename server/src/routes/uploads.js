import express from "express";
import multer from "multer";
import streamifier from "streamifier";
import cloudinary from "../config/cloudinary.js";
import { authRequired } from "../middleware/auth.js";

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Hàm upload 1 file lên Cloudinary
const uploadFile = (file) => {
  return new Promise((resolve, reject) => {
    const type = file.mimetype.startsWith("video") ? "video" : "image";
    const stream = cloudinary.uploader.upload_stream(
      { folder: "blog", resource_type: type },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve({ url: result.secure_url, type });
        }
      }
    );
    streamifier.createReadStream(file.buffer).pipe(stream);
  });
};

// Upload nhiều file (ảnh/video)
router.post("/media", authRequired, upload.array("files", 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "Vui lòng chọn file ảnh hoặc video" });
    }

    // Upload song song tất cả file
    const results = await Promise.all(
      req.files.map(file =>
        uploadFile(file).catch(err => ({ error: err.message }))
      )
    );

    // Kiểm tra nếu có file lỗi
    const hasError = results.some(r => r.error);
    if (hasError) {
      return res.status(500).json({
        error: "Một số file tải lên thất bại",
        results
      });
    }

    res.json({ files: results });
  } catch (e) {
    console.error("Upload route error:", e);
    res.status(500).json({ error: "Lỗi khi tải file lên" });
  }
});

export default router;
