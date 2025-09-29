import express from "express";
import SearchHistory from "../models/SearchHistory.js";
import { authRequired } from "../middleware/auth.js";

const router = express.Router();

// GET /api/search/history - lấy danh sách lịch sử theo user
router.get("/history", authRequired, async (req, res) => {
  try {
    const items = await SearchHistory.find({ user: req.user._id })
      .sort({ lastSearchedAt: -1 })
      .limit(100)
      .lean();
    res.json({ items });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/search/history - thêm hoặc tăng đếm cho một query
router.post("/history", authRequired, async (req, res) => {
  try {
    const query = (req.body?.query || "").trim();
    if (!query) return res.status(400).json({ error: "Thiếu query" });

    const updated = await SearchHistory.findOneAndUpdate(
      { user: req.user._id, query },
      { $inc: { count: 1 }, $set: { lastSearchedAt: new Date() } },
      { upsert: true, new: true }
    ).lean();

    res.json({ item: updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/search/history/:id - xóa 1 mục
router.delete("/history/:id", authRequired, async (req, res) => {
  try {
    const { id } = req.params;
    await SearchHistory.deleteOne({ _id: id, user: req.user._id });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/search/history - xóa tất cả lịch sử của user
router.delete("/history", authRequired, async (req, res) => {
  try {
    await SearchHistory.deleteMany({ user: req.user._id });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;


