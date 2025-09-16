import express from "express";
import { authRequired } from "../middleware/jwtSecurity.js";
import { checkBanStatus } from "../middleware/banCheck.js";
import { 
  uploadSingle, 
  uploadMultiple, 
  uploadToCloudinary 
} from "../middleware/fileUpload.js";
import { 
  fileUploadLogger,
  logSecurityEvent,
  SECURITY_EVENTS,
  LOG_LEVELS 
} from "../middleware/securityLogging.js";

const router = express.Router();

// Apply file upload logging middleware
router.use(fileUploadLogger);

/**
 * POST /single - Upload single file (ảnh/video)
 * @param {File} req.file - File cần upload
 * @returns {Object} URL và thông tin file
 */
router.post("/single", 
  authRequired,
  checkBanStatus,
  uploadSingle('image'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Không có file được upload"
        });
      }

      // Upload lên Cloudinary
      const result = await uploadToCloudinary(req.file, 'blog', req.fileType.mime.startsWith('video') ? 'video' : 'image');
      
      // Log successful upload
      logSecurityEvent(LOG_LEVELS.INFO, SECURITY_EVENTS.FILE_UPLOAD, {
        fileName: req.file.originalname,
        fileSize: req.file.size,
        fileType: req.fileType.mime,
        cloudinaryUrl: result.url,
        userId: req.user._id,
        ip: req.ip
      }, req);
      
      res.json({
        success: true,
        url: result.url,
        type: result.type,
        publicId: result.public_id,
        message: "Upload thành công"
      });
    } catch (error) {
      // Log upload error
      logSecurityEvent(LOG_LEVELS.ERROR, SECURITY_EVENTS.FILE_UPLOAD_BLOCKED, {
        fileName: req.file?.originalname,
        fileSize: req.file?.size,
        fileType: req.file?.mimetype,
        userId: req.user._id,
        ip: req.ip,
        error: error.message
      }, req);
      
      console.error("Upload error:", error);
      res.status(500).json({
        success: false,
        message: "Lỗi khi upload file"
      });
    }
  }
);

/**
 * POST /media - Upload multiple files (ảnh/video)
 * @param {File[]} req.files - Files cần upload
 * @returns {Object} URLs và thông tin files
 */
router.post("/media", 
  authRequired,
  checkBanStatus,
  uploadMultiple('image', 10),
  async (req, res, next) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Không có file nào được upload"
        });
      }

      // Upload tất cả files lên Cloudinary
      const uploadPromises = req.files.map(async (file, index) => {
        try {
          const result = await uploadToCloudinary(file, 'blog', req.fileTypes[index].mime.startsWith('video') ? 'video' : 'image');
          return {
            url: result.url,
            type: result.type,
            publicId: result.public_id,
            originalName: file.originalname,
            size: file.size
          };
        } catch (error) {
          console.error(`Error uploading file ${index}:`, error);
          return {
            error: error.message,
            originalName: file.originalname
          };
        }
      });

      const results = await Promise.all(uploadPromises);
      
      // Log successful uploads
      const successfulUploads = results.filter(r => !r.error);
      const failedUploads = results.filter(r => r.error);
      
      if (successfulUploads.length > 0) {
        logSecurityEvent(LOG_LEVELS.INFO, SECURITY_EVENTS.FILE_UPLOAD, {
          fileCount: successfulUploads.length,
          totalSize: successfulUploads.reduce((sum, r) => sum + r.size, 0),
          userId: req.user._id,
          ip: req.ip
        }, req);
      }
      
      if (failedUploads.length > 0) {
        logSecurityEvent(LOG_LEVELS.WARN, SECURITY_EVENTS.FILE_UPLOAD_BLOCKED, {
          failedCount: failedUploads.length,
          errors: failedUploads.map(f => f.error),
          userId: req.user._id,
          ip: req.ip
        }, req);
      }
      
      res.json({
        success: true,
        files: results,
        message: `Upload thành công ${successfulUploads.length}/${results.length} files`
      });
    } catch (error) {
      console.error("Multiple upload error:", error);
      res.status(500).json({
        success: false,
        message: "Lỗi khi upload files"
      });
    }
  }
);

/**
 * POST /avatar - Upload avatar
 * @param {File} req.file - Avatar file
 * @returns {Object} URL avatar
 */
router.post("/avatar", 
  authRequired,
  checkBanStatus,
  uploadSingle('image'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Không có file avatar được upload"
        });
      }

      // Kiểm tra kích thước avatar (tối đa 2MB)
      if (req.file.size > 2 * 1024 * 1024) {
        return res.status(400).json({
          success: false,
          message: "Avatar không được quá 2MB"
        });
      }

      // Upload lên Cloudinary với transformation cho avatar
      const result = await uploadToCloudinary(req.file, 'avatars', 'image');
      
      // Log successful upload
      logSecurityEvent(LOG_LEVELS.INFO, SECURITY_EVENTS.FILE_UPLOAD, {
        fileName: req.file.originalname,
        fileSize: req.file.size,
        fileType: req.fileType.mime,
        cloudinaryUrl: result.url,
        userId: req.user._id,
        ip: req.ip,
        uploadType: 'avatar'
      }, req);
      
      res.json({
        success: true,
        url: result.url,
        publicId: result.public_id,
        message: "Upload avatar thành công"
      });
    } catch (error) {
      console.error("Avatar upload error:", error);
      res.status(500).json({
        success: false,
        message: "Lỗi khi upload avatar"
      });
    }
  }
);

/**
 * POST /document - Upload document
 * @param {File} req.file - Document file
 * @returns {Object} URL document
 */
router.post("/document", 
  authRequired,
  checkBanStatus,
  uploadSingle('document'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Không có file document được upload"
        });
      }

      // Upload lên Cloudinary
      const result = await uploadToCloudinary(req.file, 'documents', 'document');
      
      // Log successful upload
      logSecurityEvent(LOG_LEVELS.INFO, SECURITY_EVENTS.FILE_UPLOAD, {
        fileName: req.file.originalname,
        fileSize: req.file.size,
        fileType: req.fileType.mime,
        cloudinaryUrl: result.url,
        userId: req.user._id,
        ip: req.ip,
        uploadType: 'document'
      }, req);
      
      res.json({
        success: true,
        url: result.url,
        publicId: result.public_id,
        message: "Upload document thành công"
      });
    } catch (error) {
      console.error("Document upload error:", error);
      res.status(500).json({
        success: false,
        message: "Lỗi khi upload document"
      });
    }
  }
);

/**
 * DELETE /:publicId - Xóa file từ Cloudinary
 * @param {string} req.params.publicId - Public ID của file
 * @returns {Object} Thông báo xóa thành công
 */
router.delete("/:publicId", 
  authRequired,
  checkBanStatus,
  async (req, res, next) => {
    try {
      const { publicId } = req.params;
      
      if (!publicId) {
        return res.status(400).json({
          success: false,
          message: "Public ID là bắt buộc"
        });
      }

      // Xóa file từ Cloudinary
      const { v2: cloudinary } = await import("cloudinary");
      const result = await cloudinary.uploader.destroy(publicId);
      
      if (result.result === 'ok') {
        // Log successful deletion
        logSecurityEvent(LOG_LEVELS.INFO, SECURITY_EVENTS.ADMIN_ACTION, {
          action: 'file_deleted',
          publicId: publicId,
          userId: req.user._id,
          ip: req.ip
        }, req);
        
        res.json({
          success: true,
          message: "Xóa file thành công"
        });
      } else {
        res.status(404).json({
          success: false,
          message: "Không tìm thấy file để xóa"
        });
      }
    } catch (error) {
      console.error("Delete file error:", error);
      res.status(500).json({
        success: false,
        message: "Lỗi khi xóa file"
      });
    }
  }
);

export default router;
