/**
 * Script test online status
 * Cập nhật trạng thái online cho tất cả users để test tính năng
 */
import mongoose from "mongoose";
import User from "../src/models/User.js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function testOnlineStatus() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Lấy tất cả users
    const users = await User.find({});
    console.log(`📊 Found ${users.length} users`);

    // Cập nhật trạng thái online cho một số users để test
    const testUsers = users.slice(0, Math.min(3, users.length)); // Lấy 3 users đầu tiên
    
    for (const user of testUsers) {
      await User.findByIdAndUpdate(user._id, {
        isOnline: true,
        lastSeen: new Date()
      });
      console.log(`✅ Updated ${user.name} to online`);
    }

    // Cập nhật trạng thái offline cho các users còn lại
    const remainingUsers = users.slice(3);
    for (const user of remainingUsers) {
      await User.findByIdAndUpdate(user._id, {
        isOnline: false,
        lastSeen: new Date(Date.now() - 5 * 60 * 1000) // 5 phút trước
      });
      console.log(`❌ Updated ${user.name} to offline`);
    }

    console.log("🎉 Test data updated successfully!");
    console.log(`📈 ${testUsers.length} users online, ${remainingUsers.length} users offline`);

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
}

// Chạy script
testOnlineStatus();
