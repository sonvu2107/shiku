/**
 * File Upload Middleware
 * 
 * Middleware bảo mật cho file upload.
 * Kiểm tra magic bytes, kích thước, và loại file để chống upload file độc hại.
 * 
 * @module fileUpload
 */

import multer from "multer";
import { Readable } from "stream";
import { fileTypeFromBuffer } from "file-type";
import { v2 as cloudinary } from "cloudinary";
import { createReadStream } from "streamifier";

// Cấu hình multer với memory storage
const storage = multer.memoryStorage();

// Giới hạn kích thước file
const fileSizeLimits = {
  image: 5 * 1024 * 1024, // 5MB
  video: 50 * 1024 * 1024, // 50MB
  document: 10 * 1024 * 1024, // 10MB
  avatar: 10 * 1024 * 1024 // 10MB for avatar (supports image and video)
};

// Các loại file được phép
const allowedTypes = {
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  video: ['video/mp4', 'video/webm', 'video/quicktime'],
  document: ['application/pdf', 'text/plain'],
  avatar: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime'] // Avatar supports both image and video
};

// Magic bytes cho các loại file phổ biến
const magicBytes = {
  'image/jpeg': [0xFF, 0xD8, 0xFF],
  'image/png': [0x89, 0x50, 0x4E, 0x47],
  'image/webp': [0x52, 0x49, 0x46, 0x46],
  'image/gif': [0x47, 0x49, 0x46],
  // MP4 có nhiều magic bytes khác nhau
  'video/mp4': [
    [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70], // ftyp box
    [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70], // ftyp box variant
    [0x00, 0x00, 0x00, 0x14, 0x66, 0x74, 0x79, 0x70], // ftyp box variant
    [0x00, 0x00, 0x00, 0x1C, 0x66, 0x74, 0x79, 0x70], // ftyp box variant
    [0x00, 0x00, 0x00, 0x24, 0x66, 0x74, 0x79, 0x70], // ftyp box variant
  ],
  'video/webm': [0x1A, 0x45, 0xDF, 0xA3],
  'application/pdf': [0x25, 0x50, 0x44, 0x46]
};

/**
 * Kiểm tra magic bytes của file
 * @param {Buffer} buffer - Buffer của file
 * @param {string} expectedType - Loại file mong đợi
 * @returns {boolean} - True nếu magic bytes đúng
 */
const checkMagicBytes = (buffer, expectedType) => {
  const expectedBytes = magicBytes[expectedType];
  if (!expectedBytes) return false;

  // Nếu expectedBytes là array của arrays (như MP4)
  if (Array.isArray(expectedBytes[0])) {
    return expectedBytes.some(bytes =>
      bytes.every((byte, index) => buffer[index] === byte)
    );
  }

  // Nếu expectedBytes là array đơn giản
  return expectedBytes.every((byte, index) => buffer[index] === byte);
};

/**
 * Kiểm tra file type thực tế bằng magic bytes
 * @param {Buffer} buffer - Buffer của file
 * @returns {Promise<Object>} - Thông tin file type
 */
const getRealFileType = async (buffer) => {
  try {
    const fileType = await fileTypeFromBuffer(buffer);
    return fileType || { mime: 'unknown', ext: 'unknown' };
  } catch (error) {
    console.error('Error detecting file type:', error);
    return { mime: 'unknown', ext: 'unknown' };
  }
};

/**
 * Validate file upload
 * @param {Object} file - File object từ multer
 * @param {string} category - Loại file (image, video, document)
 * @returns {Promise<Object>} - Kết quả validation
 */
export const validateFile = async (file, category = 'image') => {
  const errors = [];

  // Kiểm tra file có tồn tại
  if (!file || !file.buffer) {
    errors.push('Không có file được tải lên');
    return { isValid: false, errors };
  }

  // Kiểm tra kích thước file
  const maxSize = fileSizeLimits[category] || fileSizeLimits.image;
  if (file.size > maxSize) {
    errors.push(`File quá lớn. Kích thước tối đa: ${maxSize / (1024 * 1024)}MB`);
  }

  // Kiểm tra file type thực tế bằng magic bytes
  const realFileType = await getRealFileType(file.buffer);
  const allowedMimes = allowedTypes[category] || allowedTypes.image;

  if (!allowedMimes.includes(realFileType.mime)) {
    errors.push(`Loại file không được phép. Chỉ chấp nhận: ${allowedMimes.join(', ')}`);
  }

  // Kiểm tra magic bytes cho một số loại file quan trọng
  if (realFileType.mime === 'image/jpeg' && !checkMagicBytes(file.buffer, 'image/jpeg')) {
    errors.push('File JPEG không hợp lệ');
  }

  if (realFileType.mime === 'image/png' && !checkMagicBytes(file.buffer, 'image/png')) {
    errors.push('File PNG không hợp lệ');
  }

  // MP4 có nhiều format khác nhau, nên chỉ kiểm tra nếu file-type detect đúng
  if (realFileType.mime === 'video/mp4' && !checkMagicBytes(file.buffer, 'video/mp4')) {
    // Chỉ warning, không block vì MP4 có nhiều format
    console.warn('MP4 magic bytes không match, nhưng file-type detect đúng, cho phép upload');
  }

  // Kiểm tra extension
  const allowedExtensions = allowedMimes.map(mime => {
    const ext = mime.split('/')[1];
    return ext === 'jpeg' ? 'jpg' : ext;
  });

  const fileExtension = realFileType.ext;
  if (!allowedExtensions.includes(fileExtension)) {
    errors.push(`Extension file không được phép. Chỉ chấp nhận: ${allowedExtensions.join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    fileType: realFileType
  };
};

/**
 * Multer configuration với validation
 */
export const uploadConfig = {
  storage,
  limits: {
    fileSize: Math.max(...Object.values(fileSizeLimits)), // Sử dụng kích thước lớn nhất
    files: 10 // Tối đa 10 files
  },
  fileFilter: (req, file, cb) => {
    // Kiểm tra mimetype cơ bản
    const allowedMimes = [
      ...allowedTypes.image,
      ...allowedTypes.video,
      ...allowedTypes.document
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Loại file ${file.mimetype} không được phép`), false);
    }
  }
};

/**
 * Middleware upload single file với validation
 */
export const uploadSingle = (category = 'image') => {
  return [
    multer(uploadConfig).single('file'),
    async (req, res, next) => {
      try {
        if (!req.file) {
          return res.status(400).json({
            success: false,
            message: 'Không có file được tải lên'
          });
        }

        const validation = await validateFile(req.file, category);

        if (!validation.isValid) {
          return res.status(400).json({
            success: false,
            message: 'File không hợp lệ',
            errors: validation.errors
          });
        }

        // Gán thông tin file type vào request
        req.fileType = validation.fileType;
        next();
      } catch (error) {
        console.error('File validation error:', error);
        res.status(500).json({
          success: false,
          message: 'Lỗi khi xử lý file'
        });
      }
    }
  ];
};

/**
 * Middleware upload multiple files với validation
 */
export const uploadMultiple = (category = 'image', maxFiles = 10) => {
  return [
    multer({
      ...uploadConfig,
      limits: {
        ...uploadConfig.limits,
        files: maxFiles
      }
    }).array('files', maxFiles),
    async (req, res, next) => {
      try {
        if (!req.files || req.files.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'Không có file nào được upload'
          });
        }

        // Validate từng file
        const validationResults = await Promise.all(
          req.files.map(file => validateFile(file, category))
        );

        const invalidFiles = validationResults.filter(result => !result.isValid);

        if (invalidFiles.length > 0) {
          const allErrors = invalidFiles.flatMap(result => result.errors);
          return res.status(400).json({
            success: false,
            message: 'Một số file không hợp lệ',
            errors: allErrors
          });
        }

        // Gán thông tin file types vào request
        req.fileTypes = validationResults.map(result => result.fileType);
        next();
      } catch (error) {
        console.error('Multiple file validation error:', error);
        res.status(500).json({
          success: false,
          message: 'Lỗi khi xử lý files'
        });
      }
    }
  ];
};

/**
 * Middleware upload multiple files optional (cho phép không có file)
 */
export const uploadMultipleOptional = (category = 'image', maxFiles = 10) => {
  return [
    multer({
      ...uploadConfig,
      limits: {
        ...uploadConfig.limits,
        files: maxFiles
      }
    }).array('files', maxFiles),
    async (req, res, next) => {
      try {
        // Nếu không có file, tiếp tục bình thường
        if (!req.files || req.files.length === 0) {
          req.files = [];
          req.fileTypes = [];
          return next();
        }

        // Validate từng file
        const validationResults = await Promise.all(
          req.files.map(file => validateFile(file, category))
        );

        const invalidFiles = validationResults.filter(result => !result.isValid);

        if (invalidFiles.length > 0) {
          const allErrors = invalidFiles.flatMap(result => result.errors);
          return res.status(400).json({
            success: false,
            message: 'Một số file không hợp lệ',
            errors: allErrors
          });
        }

        // Gán thông tin file types vào request
        req.fileTypes = validationResults.map(result => result.fileType);
        next();
      } catch (error) {
        console.error('Multiple file validation error:', error);
        res.status(500).json({
          success: false,
          message: 'Lỗi khi xử lý files'
        });
      }
    }
  ];
};

/**
 * Upload file lên Cloudinary với security checks
 * @param {Object} file - File object
 * @param {string} folder - Folder trên Cloudinary
 * @param {string} category - Loại file (image, video)
 * @returns {Promise<Object>} - Kết quả upload
 */
export const uploadToCloudinary = async (file, folder = 'blog', category = 'image') => {
  try {
    // Validate file trước khi upload
    const validation = await validateFile(file, category);
    if (!validation.isValid) {
      throw new Error(`File không hợp lệ: ${validation.errors.join(', ')}`);
    }

    const uploadOptions = {
      folder,
      resource_type: category === 'video' ? 'video' : 'image',
      quality: 'auto'
    };

    // Thêm transformation cho ảnh
    if (category === 'image') {
      uploadOptions.transformation = [
        { width: 1920, height: 1080, crop: 'limit' },
        { quality: 'auto' }
      ];
    }

    // Sử dụng stream đúng chuẩn Cloudinary
    return await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve({
              url: result.secure_url,
              public_id: result.public_id,
              width: result.width,
              height: result.height,
              type: category
            });
          }
        }
      );
      // Pipe buffer vào stream
      const bufferStream = Readable.from(file.buffer);
      bufferStream.pipe(stream);
    });
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
};