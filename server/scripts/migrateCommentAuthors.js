import mongoose from "mongoose";
import Comment from "../src/models/Comment.js";
import User from "../src/models/User.js";
import dotenv from "dotenv";
dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/MyBLog";

async function migrateComments() {
  await mongoose.connect(MONGO_URI);
  const comments = await Comment.find({});
  let updated = 0;
  for (const comment of comments) {
    // Nếu author là ObjectId thì không cần sửa, chỉ cần đảm bảo populate ở backend
    // Nếu author là object nhưng thiếu role, name, avatarUrl thì cần sửa lại
    if (typeof comment.author === "object" && !comment.author.role) {
      const user = await User.findById(comment.author._id || comment.author);
      if (user) {
        comment.author = user._id; // Để backend populate lại
        await comment.save();
        updated++;
      }
    }
  }
  console.log(`Đã cập nhật ${updated} comment.`);
  mongoose.disconnect();
}

migrateComments();
