/**
 * Script tạo admin user đầu tiên cho hệ thống
 * Chạy: node scripts/createAdmin.js
 */
import mongoose from "mongoose";
import User from "../src/models/User.js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

/**
 * Tạo admin user với thông tin mặc định
 * Kiểm tra xem đã có admin chưa để tránh duplicate
 */
async function createAdmin() {
  try {
    // Kết nối đến MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // Kiểm tra xem đã có admin user chưa
    const existingAdmin = await User.findOne({ role: "admin" });
    if (existingAdmin) {
      console.log("Admin user already exists:", existingAdmin.email);
      process.exit(0);
    }

    // Tạo admin user mới
    const admin = await User.create({
      name: "Admin",
      email: "admin@example.com",
      password: "admin123", // Password sẽ được hash tự động trong User model
      role: "admin"
    });

    console.log("✅ Admin user created successfully:");
    console.log("📧 Email:", admin.email);
    console.log("🔑 Password: admin123");
    console.log("👑 Role:", admin.role);
    console.log("\n⚠️  Hãy đổi password sau khi đăng nhập lần đầu!");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating admin:", error);
    process.exit(1);
  }
}

// Chạy script
createAdmin();
