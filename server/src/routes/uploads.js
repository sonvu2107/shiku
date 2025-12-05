/**
 * Uploads Routes
 * 
 * Routes xử lý upload file (ảnh, video):
 * - Upload single/multiple files
 * - Validate file type và size
 * - Magic bytes validation
 * - Upload lên Cloudinary
 * 
 * @module uploads
 */

import express from "express";
import multer from "multer";
import streamifier from "streamifier";
import cloudinary from "../config/cloudinary.js";
import { authRequired } from "../middleware/auth.js";

const router = express.Router();

// File type validation
const allowedMimeTypes = [
  'image/jpeg',
  'image/png', 
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm',
  'video/quicktime'
];

// File size limits
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB for images

// Magic bytes validation
const validateFileType = (buffer, mimeType) => {
  const signatures = {
    'image/jpeg': [[0xFF, 0xD8, 0xFF]],
    'image/png': [[0x89, 0x50, 0x4E, 0x47]],
    'image/gif': [[0x47, 0x49, 0x46]],
    'image/webp': [[0x52, 0x49, 0x46, 0x46]],
    // MP4 có nhiều variant khác nhau - chỉ cần check "ftyp" ở byte 4-7
    'video/mp4': 'ftyp',
    'video/webm': [[0x1A, 0x45, 0xDF, 0xA3]],
    'video/quicktime': 'ftyp' // MOV cũng dùng ftyp
  };
  
  const signature = signatures[mimeType];
  if (!signature) return false;
  
  // Special handling for MP4/MOV - check for 'ftyp' at bytes 4-7
  if (signature === 'ftyp') {
    // ftyp box có thể bắt đầu ở byte 4-7: 0x66 0x74 0x79 0x70 = "ftyp"
    const ftypSignature = [0x66, 0x74, 0x79, 0x70];
    return ftypSignature.every((byte, index) => buffer[4 + index] === byte);
  }
  
  // Array of possible signatures
  return signature.some(sig => 
    sig.every((byte, index) => buffer[index] === byte)
  );
};

const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 10
  },
  fileFilter: (req, file, cb) => {
    // Check MIME type
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(new Error('File type not allowed'), false);
    }
    
    // Note: File size is checked by multer limits and also validated after upload
    // The per-type size limit is enforced in the route handler after file is received
    cb(null, true);
  }
});

/**
 * Validate file size based on type
 * @param {Object} file - Multer file object
 * @returns {Object} - { valid: boolean, maxSize: number }
 */
const validateFileSize = (file) => {
  const isImage = file.mimetype.startsWith('image/');
  const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_FILE_SIZE;
  return {
    valid: file.size <= maxSize,
    maxSize,
    actualSize: file.size
  };
};

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

// Upload single file (ảnh/video)
router.post("/", authRequired, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Không có file được tải lên"
      });
    }

    // Validate file size based on type (images: 10MB, videos: 50MB)
    const sizeValidation = validateFileSize(req.file);
    if (!sizeValidation.valid) {
      const maxSizeMB = Math.round(sizeValidation.maxSize / (1024 * 1024));
      const actualSizeMB = (sizeValidation.actualSize / (1024 * 1024)).toFixed(2);
      return res.status(400).json({
        success: false,
        message: `File quá lớn. Tối đa ${maxSizeMB}MB cho loại file này (file hiện tại: ${actualSizeMB}MB)`
      });
    }

    // Validate magic bytes
    if (!validateFileType(req.file.buffer, req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: "File type không hợp lệ hoặc bị hỏng"
      });
    }

    const result = await uploadFile(req.file);
    
    res.json({
      success: true,
      url: result.url,
      type: result.type,
      message: "Upload thành công"
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi upload file"
    });
  }
});

// Upload nhiều file (ảnh/video)
router.post("/media", authRequired, upload.array("files", 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "Vui lòng chọn file ảnh hoặc video" });
    }

    // Validate size for each file
    for (const file of req.files) {
      const sizeValidation = validateFileSize(file);
      if (!sizeValidation.valid) {
        const maxSizeMB = Math.round(sizeValidation.maxSize / (1024 * 1024));
        const actualSizeMB = (sizeValidation.actualSize / (1024 * 1024)).toFixed(2);
        return res.status(400).json({
          error: `File "${file.originalname}" quá lớn. Tối đa ${maxSizeMB}MB (file hiện tại: ${actualSizeMB}MB)`
        });
      }
      
      // Validate magic bytes
      if (!validateFileType(file.buffer, file.mimetype)) {
        return res.status(400).json({
          error: `File "${file.originalname}" không hợp lệ hoặc bị hỏng`
        });
      }
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