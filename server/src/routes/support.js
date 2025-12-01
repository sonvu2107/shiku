/**
 * Support Routes
 * 
 * Routes xử lý các thao tác hỗ trợ người dùng:
 * - FAQ (Câu hỏi thường gặp)
 * - Feedback/Contact form
 * - Bug reports
 * - Help articles
 * 
 * @module support
 */

import express from "express";
import mongoose from "mongoose";
import { authRequired, authOptional } from "../middleware/auth.js";

const router = express.Router();

// --- MODELS ---

// FAQ Schema
const faqSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
    trim: true
  },
  answer: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    enum: ['start', 'account', 'security', 'privacy', 'other'],
    default: 'other'
  },
  order: {
    type: Number,
    default: 0
  },
  isPublished: {
    type: Boolean,
    default: true
  },
  views: {
    type: Number,
    default: 0
  },
  helpful: {
    type: Number,
    default: 0
  },
  notHelpful: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

faqSchema.index({ question: 'text', answer: 'text' });
faqSchema.index({ category: 1, order: 1 });
faqSchema.index({ isPublished: 1, createdAt: -1 });

const FAQ = mongoose.model("FAQ", faqSchema);

// Support Ticket Schema (thay thế Feedback cũ)
const supportTicketSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  subject: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  category: {
    type: String,
    enum: ['technical', 'account', 'security', 'feature', 'bug', 'other'],
    default: 'other'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'resolved', 'closed'],
    default: 'open'
  },
  replies: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    message: {
      type: String,
      required: true
    },
    isStaff: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  resolvedAt: {
    type: Date
  }
});

supportTicketSchema.index({ user: 1, createdAt: -1 });
supportTicketSchema.index({ status: 1, priority: -1, createdAt: -1 });
supportTicketSchema.index({ assignedTo: 1, status: 1 });

const SupportTicket = mongoose.model("SupportTicket", supportTicketSchema);

// --- FAQ ENDPOINTS ---

// GET /api/support/faqs - Lấy danh sách FAQs (public)
router.get("/faqs", async (req, res, next) => {
  try {
    const { category, search, limit = 20 } = req.query;
    
    let query = { isPublished: true };
    
    if (category && category !== 'all') {
      query.category = category;
    }
    
    if (search) {
      query.$text = { $search: search };
    }
    
    const faqs = await FAQ.find(query)
      .sort({ order: 1, createdAt: -1 })
      .limit(parseInt(limit))
      .select('-__v')
      .lean();
    
    res.json({ faqs, total: faqs.length });
  } catch (err) {
    next(err);
  }
});

// GET /api/support/faqs/:id - Lấy chi tiết FAQ và tăng views
router.get("/faqs/:id", async (req, res, next) => {
  try {
    const faq = await FAQ.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    ).select('-__v').lean();
    
    if (!faq) {
      return res.status(404).json({ error: "FAQ không tồn tại" });
    }
    
    res.json({ faq });
  } catch (err) {
    next(err);
  }
});

// POST /api/support/faqs/:id/feedback - Đánh giá FAQ có hữu ích không
router.post("/faqs/:id/feedback", authOptional, async (req, res, next) => {
  try {
    const { helpful } = req.body; // true or false
    
    if (typeof helpful !== 'boolean') {
      return res.status(400).json({ error: "Vui lòng chọn có hữu ích hay không" });
    }
    
    const update = helpful 
      ? { $inc: { helpful: 1 } }
      : { $inc: { notHelpful: 1 } };
    
    const faq = await FAQ.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true }
    ).select('helpful notHelpful').lean();
    
    if (!faq) {
      return res.status(404).json({ error: "FAQ không tồn tại" });
    }
    
    res.json({ 
      message: "Cảm ơn phản hồi của bạn!",
      helpful: faq.helpful,
      notHelpful: faq.notHelpful
    });
  } catch (err) {
    next(err);
  }
});

// --- SUPPORT TICKET ENDPOINTS ---

// POST /api/support/tickets - Tạo support ticket mới
router.post("/tickets", authRequired, async (req, res, next) => {
  try {
    const { subject, message, category = 'other', priority = 'medium' } = req.body;
    
    if (!subject || subject.trim().length < 5) {
      return res.status(400).json({ error: "Tiêu đề phải có ít nhất 5 ký tự" });
    }
    
    if (!message || message.trim().length < 10) {
      return res.status(400).json({ error: "Nội dung phải có ít nhất 10 ký tự" });
    }
    
    const ticket = await SupportTicket.create({
      user: req.user._id,
      subject: subject.trim(),
      message: message.trim(),
      category,
      priority
    });
    
    const populatedTicket = await SupportTicket.findById(ticket._id)
      .populate('user', 'name nickname email avatarUrl')
      .lean();
    
    res.status(201).json({ 
      message: "Ticket đã được tạo thành công. Chúng tôi sẽ phản hồi sớm nhất!",
      ticket: populatedTicket 
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/support/tickets - Lấy danh sách tickets của user
router.get("/tickets", authRequired, async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    let query = { user: req.user._id };
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [tickets, total] = await Promise.all([
      SupportTicket.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('user', 'name nickname email avatarUrl')
        .populate('assignedTo', 'name nickname avatarUrl')
        .lean(),
      SupportTicket.countDocuments(query)
    ]);
    
    res.json({ 
      tickets, 
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/support/tickets/:id - Lấy chi tiết ticket
router.get("/tickets/:id", authRequired, async (req, res, next) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id)
      .populate('user', 'name nickname email avatarUrl')
      .populate('assignedTo', 'name nickname avatarUrl')
      .populate('replies.user', 'name nickname avatarUrl')
      .lean();
    
    if (!ticket) {
      return res.status(404).json({ error: "Ticket không tồn tại" });
    }
    
    // Check permission
    if (ticket.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: "Bạn không có quyền xem ticket này" });
    }
    
    res.json({ ticket });
  } catch (err) {
    next(err);
  }
});

// POST /api/support/tickets/:id/reply - Trả lời ticket
router.post("/tickets/:id/reply", authRequired, async (req, res, next) => {
  try {
    const { message } = req.body;
    
    if (!message || message.trim().length < 5) {
      return res.status(400).json({ error: "Tin nhắn phải có ít nhất 5 ký tự" });
    }
    
    const ticket = await SupportTicket.findById(req.params.id);
    
    if (!ticket) {
      return res.status(404).json({ error: "Ticket không tồn tại" });
    }
    
    // Check permission
    const isStaff = req.user.role === 'admin' || req.user.role === 'moderator';
    if (ticket.user.toString() !== req.user._id.toString() && !isStaff) {
      return res.status(403).json({ error: "Bạn không có quyền trả lời ticket này" });
    }
    
    ticket.replies.push({
      user: req.user._id,
      message: message.trim(),
      isStaff
    });
    
    ticket.updatedAt = new Date();
    
    // Auto change status to in_progress if admin replies
    if (isStaff && ticket.status === 'open') {
      ticket.status = 'in_progress';
    }
    
    await ticket.save();
    
    const updatedTicket = await SupportTicket.findById(ticket._id)
      .populate('user', 'name nickname email avatarUrl')
      .populate('assignedTo', 'name nickname avatarUrl')
      .populate('replies.user', 'name nickname avatarUrl')
      .lean();
    
    res.json({ 
      message: "Đã gửi tin nhắn thành công",
      ticket: updatedTicket 
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/support/tickets/:id/status - Cập nhật trạng thái ticket
router.patch("/tickets/:id/status", authRequired, async (req, res, next) => {
  try {
    const { status } = req.body;
    
    const validStatuses = ['open', 'in_progress', 'resolved', 'closed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Trạng thái không hợp lệ" });
    }
    
    const ticket = await SupportTicket.findById(req.params.id);
    
    if (!ticket) {
      return res.status(404).json({ error: "Ticket không tồn tại" });
    }
    
    // Check permission
    const isOwner = ticket.user.toString() === req.user._id.toString();
    const isStaff = req.user.role === 'admin' || req.user.role === 'moderator';
    
    if (!isOwner && !isStaff) {
      return res.status(403).json({ error: "Bạn không có quyền cập nhật ticket này" });
    }
    
    // User can only close their own ticket
    if (isOwner && !isStaff && status !== 'closed') {
      return res.status(403).json({ error: "Bạn chỉ có thể đóng ticket của mình" });
    }
    
    ticket.status = status;
    ticket.updatedAt = new Date();
    
    if (status === 'resolved' || status === 'closed') {
      ticket.resolvedAt = new Date();
    }
    
    await ticket.save();
    
    res.json({ 
      message: "Đã cập nhật trạng thái ticket",
      status: ticket.status
    });
  } catch (err) {
    next(err);
  }
});

// --- ADMIN ENDPOINTS ---

// GET /api/support/admin/tickets - Admin xem tất cả tickets
router.get("/admin/tickets", authRequired, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'moderator') {
      return res.status(403).json({ error: "Chỉ admin/moderator mới xem được" });
    }
    
    const { status, priority, category, page = 1, limit = 20 } = req.query;
    
    let query = {};
    
    if (status && status !== 'all') {
      query.status = status;
    }
    if (priority && priority !== 'all') {
      query.priority = priority;
    }
    if (category && category !== 'all') {
      query.category = category;
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [tickets, total] = await Promise.all([
      SupportTicket.find(query)
        .sort({ priority: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('user', 'name nickname email avatarUrl')
        .populate('assignedTo', 'name nickname avatarUrl')
        .lean(),
      SupportTicket.countDocuments(query)
    ]);
    
    res.json({ 
      tickets, 
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/support/admin/faqs - Admin xem tất cả FAQs
router.get("/admin/faqs", authRequired, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: "Chỉ admin mới xem được tất cả FAQ" });
    }
    
    const faqs = await FAQ.find()
      .sort({ order: 1, createdAt: -1 })
      .select('-__v')
      .lean();
    
    res.json({ faqs, total: faqs.length });
  } catch (err) {
    next(err);
  }
});

// POST /api/support/admin/faqs - Admin tạo FAQ
router.post("/admin/faqs", authRequired, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: "Chỉ admin mới tạo được FAQ" });
    }
    
    const { question, answer, category = 'other', order = 0, isPublished = true } = req.body;
    
    if (!question || question.trim().length < 5) {
      return res.status(400).json({ error: "Câu hỏi phải có ít nhất 5 ký tự" });
    }
    
    if (!answer || answer.trim().length < 10) {
      return res.status(400).json({ error: "Câu trả lời phải có ít nhất 10 ký tự" });
    }
    
    const faq = await FAQ.create({
      question: question.trim(),
      answer: answer.trim(),
      category,
      order,
      isPublished
    });
    
    res.status(201).json({ 
      message: "FAQ đã được tạo thành công",
      faq 
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/support/admin/faqs/:id - Admin cập nhật FAQ
router.put("/admin/faqs/:id", authRequired, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: "Chỉ admin mới cập nhật được FAQ" });
    }
    
    const { question, answer, category, order, isPublished } = req.body;
    
    const updateData = { updatedAt: new Date() };
    if (question !== undefined) updateData.question = question.trim();
    if (answer !== undefined) updateData.answer = answer.trim();
    if (category !== undefined) updateData.category = category;
    if (order !== undefined) updateData.order = order;
    if (isPublished !== undefined) updateData.isPublished = isPublished;
    
    const faq = await FAQ.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).lean();
    
    if (!faq) {
      return res.status(404).json({ error: "FAQ không tồn tại" });
    }
    
    res.json({ 
      message: "FAQ đã được cập nhật",
      faq 
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/support/admin/faqs/:id - Admin xóa FAQ
router.delete("/admin/faqs/:id", authRequired, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: "Chỉ admin mới xóa được FAQ" });
    }
    
    const faq = await FAQ.findByIdAndDelete(req.params.id);
    
    if (!faq) {
      return res.status(404).json({ error: "FAQ không tồn tại" });
    }
    
    res.json({ message: "FAQ đã được xóa" });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/support/admin/tickets/:id/assign - Assign ticket cho admin
router.patch("/admin/tickets/:id/assign", authRequired, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'moderator') {
      return res.status(403).json({ error: "Chỉ admin/moderator mới assign được" });
    }
    
    const { assignedTo } = req.body;
    
    const ticket = await SupportTicket.findByIdAndUpdate(
      req.params.id,
      { 
        assignedTo: assignedTo || null,
        updatedAt: new Date()
      },
      { new: true }
    )
      .populate('user', 'name nickname email avatarUrl')
      .populate('assignedTo', 'name nickname avatarUrl')
      .lean();
    
    if (!ticket) {
      return res.status(404).json({ error: "Ticket không tồn tại" });
    }
    
    res.json({ 
      message: assignedTo ? "Đã assign ticket" : "Đã bỏ assign ticket",
      ticket 
    });
  } catch (err) {
    next(err);
  }
});

export default router;
