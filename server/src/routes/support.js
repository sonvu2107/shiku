import express from "express";
import mongoose from "mongoose";
import { authRequired } from "../middleware/auth.js";

const router = express.Router();

// Feedback model
const feedbackSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  feedback: {
    type: String,
    required: true,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});
const Feedback = mongoose.model("Feedback", feedbackSchema);

// POST /api/support/feedback - gửi góp ý
router.post("/feedback", authRequired, async (req, res) => {
  try {
    const { feedback } = req.body;
    if (!feedback || feedback.length < 5) {
      return res.status(400).json({ message: "Nội dung góp ý quá ngắn." });
    }
    const fb = await Feedback.create({
      user: req.user._id,
      feedback
    });
    res.json({ message: "Gửi góp ý thành công!", feedback: fb });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server" });
  }
});

// GET /api/support/feedback - chỉ admin xem góp ý
router.get("/feedback", authRequired, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Chỉ admin mới xem được góp ý." });
  }
  const feedbacks = await Feedback.find().populate("user", "name email avatarUrl").sort({ createdAt: -1 });
  res.json({ feedbacks });
});

export default router;
