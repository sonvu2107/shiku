import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

/**
 * Cấu hình Cloudinary cho việc upload và quản lý hình ảnh
 * Sử dụng credentials từ environment variables
 */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, // Tên cloud trên Cloudinary
  api_key: process.env.CLOUDINARY_API_KEY, // API key
  api_secret: process.env.CLOUDINARY_API_SECRET, // API secret
});

// Cloudinary configuration loaded

export default cloudinary;
