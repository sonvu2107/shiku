import mongoose from "mongoose";
import Post from "../src/models/Post.js";
import Comment from "../src/models/Comment.js";
import User from "../src/models/User.js";
import dotenv from "dotenv";

dotenv.config();

async function migratePostCounts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("[SUCESSED] Connected to MongoDB");

    const posts = await Post.find({});
    console.log(`[SUCESSED] Found ${posts.length} posts to migrate.`);

    let processed = 0;
    for (const post of posts) {
      const commentCount = await Comment.countDocuments({ post: post._id });
      const savedCount = await User.countDocuments({ savedPosts: post._id });

      post.commentCount = commentCount;
      post.savedCount = savedCount;
      await post.save();

      processed++;
      if (processed % 100 === 0) {
        console.log(`[SUCESSED] Processed ${processed}/${posts.length} posts...`);
      }
    }

    console.log("[SUCESSED] Migration completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("[FAILED] Error migrating post counts:", error);
    process.exit(1);
  }
}

migratePostCounts();

