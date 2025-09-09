import mongoose from "mongoose";

export async function connectDB(uri) {
  if (!uri) throw new Error("MONGODB_URI is not set");
  mongoose.set("strictQuery", true);
  try {
    await mongoose.connect(uri, { dbName: process.env.DB_NAME || undefined });
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  }
}
