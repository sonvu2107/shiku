import mongoose from "mongoose";
import User from "../models/User.js";
import dotenv from "dotenv";

dotenv.config();

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // Kiểm tra xem đã có admin chưa
    const existingAdmin = await User.findOne({ role: "admin" });
    if (existingAdmin) {
      console.log("Admin user already exists:", existingAdmin.email);
      process.exit(0);
    }

    // Tạo admin user
    const admin = await User.create({
      name: "Admin",
      email: "admin@example.com",
      password: "admin123", // Sẽ được hash tự động bởi model
      role: "admin"
    });

    console.log("Admin user created successfully:");
    console.log("Email:", admin.email);
    console.log("Password: admin123");
    console.log("Role:", admin.role);

    process.exit(0);
  } catch (error) {
    console.error("Error creating admin:", error);
    process.exit(1);
  }
}

createAdmin();
