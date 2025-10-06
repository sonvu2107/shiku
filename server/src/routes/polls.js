import express from "express";
import mongoose from "mongoose";
import Poll from "../models/Poll.js";
import Post from "../models/Post.js";
import { authRequired, authOptional } from "../middleware/auth.js";
import { checkBanStatus } from "../middleware/banCheck.js";
import sanitizeHtml from "sanitize-html";

const router = express.Router();

/**
 * POST / - Tạo poll mới cho một post
 * Request body: { postId, question, options, allowMultipleVotes, isPublic, expiresAt }
 */
router.post("/", authRequired, checkBanStatus, async (req, res, next) => {
  try {
    const { postId, question, options, allowMultipleVotes = false, isPublic = true, expiresAt = null } = req.body;

    // Validate input
    if (!postId || !question || !options) {
      return res.status(400).json({ error: "Vui lòng nhập đầy đủ thông tin poll" });
    }

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ error: "Post ID không hợp lệ" });
    }

    if (!Array.isArray(options) || options.length < 2 || options.length > 10) {
      return res.status(400).json({ error: "Poll phải có từ 2 đến 10 lựa chọn" });
    }

    // Kiểm tra post tồn tại và user có quyền
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: "Không tìm thấy bài viết" });
    }

    if (post.author.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ error: "Bạn không có quyền tạo poll cho bài viết này" });
    }

    // Kiểm tra post đã có poll chưa
    const existingPoll = await Poll.findOne({ post: postId });
    if (existingPoll) {
      return res.status(400).json({ error: "Bài viết này đã có poll" });
    }

    // Sanitize input
    const sanitizedQuestion = sanitizeHtml(question.trim(), {
      allowedTags: [],
      allowedAttributes: {}
    });

    const sanitizedOptions = options.map(opt => ({
      text: sanitizeHtml(opt.text || opt, {
        allowedTags: [],
        allowedAttributes: {}
      }).trim(),
      votes: []
    }));

    // Validate expiresAt
    let parsedExpiresAt = null;
    if (expiresAt) {
      parsedExpiresAt = new Date(expiresAt);
      if (parsedExpiresAt <= new Date()) {
        return res.status(400).json({ error: "Thời gian hết hạn phải ở tương lai" });
      }
    }

    // Tạo poll
    const poll = await Poll.create({
      post: postId,
      question: sanitizedQuestion,
      options: sanitizedOptions,
      allowMultipleVotes,
      isPublic,
      expiresAt: parsedExpiresAt
    });

    // Update post để đánh dấu có poll
    post.hasPoll = true;
    await post.save();

    res.status(201).json({ poll });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /post/:postId - Lấy poll của một post
 */
router.get("/post/:postId", authOptional, async (req, res, next) => {
  try {
    const { postId } = req.params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ error: "Post ID không hợp lệ" });
    }

    const poll = await Poll.findOne({ post: postId });
    if (!poll) {
      return res.status(404).json({ error: "Không tìm thấy poll" });
    }

    // Kiểm tra user đã vote chưa
    let userVote = null;
    if (req.user) {
      userVote = poll.hasUserVoted(req.user._id);
    }

    // Lấy results (có include voters nếu là public poll)
    const includeVoters = poll.isPublic && req.user;
    const results = poll.getResults(includeVoters);

    // Populate voters nếu cần
    if (includeVoters) {
      await poll.populate("options.votes.user", "name avatarUrl");
      results.results = poll.options.map((option, index) => {
        const voteCount = option.votes ? option.votes.length : 0;
        const percentage = poll.totalVotes > 0
          ? Math.round((voteCount / poll.totalVotes) * 100)
          : 0;

        return {
          index,
          text: option.text,
          voteCount,
          percentage,
          voters: poll.isPublic ? option.votes.map(v => ({
            user: v.user,
            votedAt: v.votedAt
          })) : undefined
        };
      });
    }

    res.json({
      poll: {
        _id: poll._id,
        ...results,
        userVote,
        createdAt: poll.createdAt,
        updatedAt: poll.updatedAt
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /:pollId/vote - Vote cho một option
 * Request body: { optionIndex }
 */
router.post("/:pollId/vote", authRequired, checkBanStatus, async (req, res, next) => {
  try {
    const { pollId } = req.params;
    const { optionIndex } = req.body;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(pollId)) {
      return res.status(400).json({ error: "Poll ID không hợp lệ" });
    }

    if (optionIndex === undefined || optionIndex === null) {
      return res.status(400).json({ error: "Vui lòng chọn một lựa chọn" });
    }

    const poll = await Poll.findById(pollId);
    if (!poll) {
      return res.status(404).json({ error: "Không tìm thấy poll" });
    }

    // Thêm/xóa vote
    try {
      const added = poll.addVote(req.user._id, parseInt(optionIndex));
      await poll.save();

      // Lấy results mới
      const includeVoters = poll.isPublic;
      if (includeVoters) {
        await poll.populate("options.votes.user", "name avatarUrl");
      }

      const results = poll.getResults(includeVoters);
      const userVote = poll.hasUserVoted(req.user._id);

      // Populate voters nếu cần
      if (includeVoters) {
        results.results = poll.options.map((option, index) => {
          const voteCount = option.votes ? option.votes.length : 0;
          const percentage = poll.totalVotes > 0
            ? Math.round((voteCount / poll.totalVotes) * 100)
            : 0;

          return {
            index,
            text: option.text,
            voteCount,
            percentage,
            voters: poll.isPublic ? option.votes.map(v => ({
              user: v.user,
              votedAt: v.votedAt
            })) : undefined
          };
        });
      }

      // Emit realtime update qua Socket.io
      const io = req.app.get("io");
      if (io) {
        io.to(`poll-${pollId}`).emit("poll-update", {
          pollId: poll._id,
          action: added ? "voted" : "unvoted",
          userId: req.user._id,
          optionIndex: parseInt(optionIndex),
          results: results.results,
          totalVotes: poll.totalVotes
        });
      }

      res.json({
        success: true,
        action: added ? "voted" : "unvoted",
        poll: {
          _id: poll._id,
          ...results,
          userVote
        }
      });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  } catch (error) {
    next(error);
  }
});

/**
 * GET /:pollId/results - Lấy kết quả poll
 */
router.get("/:pollId/results", authOptional, async (req, res, next) => {
  try {
    const { pollId } = req.params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(pollId)) {
      return res.status(400).json({ error: "Poll ID không hợp lệ" });
    }

    const poll = await Poll.findById(pollId);
    if (!poll) {
      return res.status(404).json({ error: "Không tìm thấy poll" });
    }

    // Lấy results với voters nếu là public poll
    const includeVoters = poll.isPublic && req.user;
    if (includeVoters) {
      await poll.populate("options.votes.user", "name avatarUrl");
    }

    const results = poll.getResults(includeVoters);

    // Populate voters nếu cần
    if (includeVoters) {
      results.results = poll.options.map((option, index) => {
        const voteCount = option.votes ? option.votes.length : 0;
        const percentage = poll.totalVotes > 0
          ? Math.round((voteCount / poll.totalVotes) * 100)
          : 0;

        return {
          index,
          text: option.text,
          voteCount,
          percentage,
          voters: poll.isPublic ? option.votes.map(v => ({
            user: v.user,
            votedAt: v.votedAt
          })) : undefined
        };
      });
    }

    res.json({ results });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /:pollId - Cập nhật poll (chỉ owner/admin)
 * Request body: { question, expiresAt, isActive }
 */
router.put("/:pollId", authRequired, checkBanStatus, async (req, res, next) => {
  try {
    const { pollId } = req.params;
    const { question, expiresAt, isActive } = req.body;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(pollId)) {
      return res.status(400).json({ error: "Poll ID không hợp lệ" });
    }

    const poll = await Poll.findById(pollId);
    if (!poll) {
      return res.status(404).json({ error: "Không tìm thấy poll" });
    }

    // Kiểm tra quyền
    const post = await Post.findById(poll.post);
    if (!post) {
      return res.status(404).json({ error: "Không tìm thấy bài viết" });
    }
    if (post.author.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ error: "Bạn không có quyền chỉnh sửa poll này" });
    }

    // Cập nhật
    if (question !== undefined) {
      poll.question = sanitizeHtml(question.trim(), {
        allowedTags: [],
        allowedAttributes: {}
      });
    }

    if (expiresAt !== undefined) {
      if (expiresAt === null) {
        poll.expiresAt = null;
      } else {
        const parsedExpiresAt = new Date(expiresAt);
        if (parsedExpiresAt <= new Date()) {
          return res.status(400).json({ error: "Thời gian hết hạn phải ở tương lai" });
        }
        poll.expiresAt = parsedExpiresAt;
      }
    }

    if (isActive !== undefined) {
      poll.isActive = isActive;
    }

    await poll.save();

    res.json({ poll });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /:pollId/options - Thêm options vào poll (chỉ owner/admin)
 * Request body: { options: ["option1", "option2", ...] }
 */
router.post("/:pollId/options", authRequired, checkBanStatus, async (req, res, next) => {
  try {
    const { pollId } = req.params;
    const { options } = req.body;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(pollId)) {
      return res.status(400).json({ error: "Poll ID không hợp lệ" });
    }

    if (!Array.isArray(options) || options.length === 0) {
      return res.status(400).json({ error: "Vui lòng cung cấp ít nhất một lựa chọn" });
    }

    const poll = await Poll.findById(pollId);
    if (!poll) {
      return res.status(404).json({ error: "Không tìm thấy poll" });
    }

    // Kiểm tra quyền
    const post = await Post.findById(poll.post);
    if (!post) {
      return res.status(404).json({ error: "Không tìm thấy bài viết" });
    }
    if (post.author.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ error: "Bạn không có quyền chỉnh sửa poll này" });
    }

    // Kiểm tra poll còn active không
    if (!poll.isActive) {
      return res.status(400).json({ error: "Poll đã đóng, không thể thêm lựa chọn" });
    }

    // Kiểm tra tổng số options không vượt quá 10
    if (poll.options.length + options.length > 10) {
      return res.status(400).json({ error: "Poll chỉ có thể có tối đa 10 lựa chọn" });
    }

    // Sanitize và thêm options mới
    const sanitizedOptions = options.map(opt => ({
      text: sanitizeHtml(opt.trim(), {
        allowedTags: [],
        allowedAttributes: {}
      }).trim(),
      votes: []
    })).filter(opt => opt.text.length > 0);

    if (sanitizedOptions.length === 0) {
      return res.status(400).json({ error: "Không có lựa chọn hợp lệ nào" });
    }

    poll.options.push(...sanitizedOptions);
    await poll.save();

    // Lấy results mới
    const includeVoters = poll.isPublic;
    if (includeVoters) {
      await poll.populate("options.votes.user", "name avatarUrl");
    }

    const results = poll.getResults(includeVoters);

    res.json({ 
      poll: {
        _id: poll._id,
        ...results,
        createdAt: poll.createdAt,
        updatedAt: poll.updatedAt
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /:pollId - Xóa poll (chỉ owner/admin)
 */
router.delete("/:pollId", authRequired, async (req, res, next) => {
  try {
    const { pollId } = req.params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(pollId)) {
      return res.status(400).json({ error: "Poll ID không hợp lệ" });
    }

    const poll = await Poll.findById(pollId);
    if (!poll) {
      return res.status(404).json({ error: "Không tìm thấy poll" });
    }

    // Kiểm tra quyền
    const post = await Post.findById(poll.post);
    if (post.author.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ error: "Bạn không có quyền xóa poll này" });
    }

    // Update post
    post.hasPoll = false;
    await post.save();

    // Xóa poll
    await poll.deleteOne();

    res.json({ success: true, message: "Đã xóa poll" });
  } catch (error) {
    next(error);
  }
});

export default router;
