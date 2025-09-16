import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

/**
 * Environment Variables Security Configuration
 * Sử dụng dotenv-safe để đảm bảo tất cả env vars cần thiết được set
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

/**
 * Danh sách các environment variables bắt buộc
 */
const requiredEnvVars = [
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'MONGODB_URI',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_FROM'
];

/**
 * Kiểm tra và validate environment variables
 */
export const validateEnvVars = () => {
  const missingVars = [];
  const invalidVars = [];

  // Kiểm tra các biến bắt buộc
  requiredEnvVars.forEach(varName => {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  });

  // Kiểm tra các biến có giá trị hợp lệ
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    invalidVars.push('JWT_SECRET phải có ít nhất 32 ký tự');
  }

  if (process.env.JWT_REFRESH_SECRET && process.env.JWT_REFRESH_SECRET.length < 32) {
    invalidVars.push('JWT_REFRESH_SECRET phải có ít nhất 32 ký tự');
  }

  if (process.env.MONGODB_URI && !process.env.MONGODB_URI.startsWith('mongodb')) {
    invalidVars.push('MONGODB_URI phải là một MongoDB connection string hợp lệ');
  }

  if (process.env.SMTP_PORT && isNaN(Number(process.env.SMTP_PORT))) {
    invalidVars.push('SMTP_PORT phải là một số');
  }

  // Báo lỗi nếu có biến thiếu hoặc không hợp lệ
  if (missingVars.length > 0 || invalidVars.length > 0) {
    console.error('❌ Environment Variables Error:');
    
    if (missingVars.length > 0) {
      console.error('Missing required variables:', missingVars.join(', '));
    }
    
    if (invalidVars.length > 0) {
      console.error('Invalid variables:', invalidVars.join(', '));
    }
    
    console.error('\nVui lòng tạo file .env với các biến sau:');
    console.error(requiredEnvVars.map(varName => `${varName}=your_value_here`).join('\n'));
    
    process.exit(1);
  }

  console.log('✅ All required environment variables are set');
};

/**
 * Cấu hình bảo mật cho environment variables
 */
export const securityConfig = {
  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessTokenExpiry: '15m',
    refreshTokenExpiry: '7d'
  },

  // Database Configuration
  database: {
    uri: process.env.MONGODB_URI,
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: parseInt(process.env.DB_MAX_POOL_SIZE) || 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    }
  },

  // Cloudinary Configuration
  cloudinary: {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  },

  // SMTP Configuration
  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 465,
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    from: process.env.SMTP_FROM || process.env.SMTP_USER
  },

  // CORS Configuration
  cors: {
    origins: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://172.29.100.73:5173",
      "http://172.29.100.73:5174",
      "http://192.168.0.101:5173",
      "http://192.168.0.101:5174",
      ...(process.env.CORS_ORIGIN?.split(",").map(o => o.trim()) || [])
    ],
    credentials: true
  },

  // Rate Limiting Configuration
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // requests per window
    authMax: 5, // auth requests per window
    uploadMax: 50, // upload requests per window
    messageMax: 60, // messages per minute
    postsMax: 200 // post requests per window
  },

  // File Upload Configuration
  fileUpload: {
    maxImageSize: 5 * 1024 * 1024, // 5MB
    maxVideoSize: 50 * 1024 * 1024, // 50MB
    maxDocumentSize: 10 * 1024 * 1024, // 10MB
    allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    allowedVideoTypes: ['video/mp4', 'video/webm', 'video/quicktime'],
    allowedDocumentTypes: ['application/pdf', 'text/plain']
  },

  // Security Headers
  security: {
    helmet: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    }
  }
};

/**
 * Kiểm tra xem có đang chạy trong production không
 */
export const isProduction = () => {
  return process.env.NODE_ENV === 'production';
};

/**
 * Kiểm tra xem có đang chạy trong development không
 */
export const isDevelopment = () => {
  return process.env.NODE_ENV === 'development';
};

/**
 * Lấy giá trị environment variable với fallback
 * @param {string} key - Tên biến
 * @param {any} defaultValue - Giá trị mặc định
 * @returns {any} - Giá trị biến hoặc giá trị mặc định
 */
export const getEnv = (key, defaultValue = null) => {
  return process.env[key] || defaultValue;
};

/**
 * Lấy giá trị environment variable dạng số
 * @param {string} key - Tên biến
 * @param {number} defaultValue - Giá trị mặc định
 * @returns {number} - Giá trị biến dạng số
 */
export const getEnvNumber = (key, defaultValue = 0) => {
  const value = process.env[key];
  return value ? parseInt(value, 10) : defaultValue;
};

/**
 * Lấy giá trị environment variable dạng boolean
 * @param {string} key - Tên biến
 * @param {boolean} defaultValue - Giá trị mặc định
 * @returns {boolean} - Giá trị biến dạng boolean
 */
export const getEnvBoolean = (key, defaultValue = false) => {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true';
};

// Validate environment variables khi import
validateEnvVars();
