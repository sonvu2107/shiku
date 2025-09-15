import express from 'express';
import Event from '../models/Event.js';
import User from '../models/User.js';
import { authRequired, authOptional } from '../middleware/auth.js';

const router = express.Router();

/**
 * Events Routes - API routes cho chức năng sự kiện
 * Bao gồm CRUD operations và quản lý sự kiện
 */

/**
 * @route   GET /api/events
 * @desc    Lấy danh sách sự kiện với phân trang và tìm kiếm
 * @access  Public
 */
router.get('/', authOptional, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      filter = 'all', // all, upcoming, past, my
      sortBy = 'date',
      sortOrder = 'asc'
    } = req.query;

    // Xây dựng query
    let query = { isActive: true };
    
    // Lọc theo loại sự kiện
    if (filter === 'upcoming') {
      query.date = { $gte: new Date() };
    } else if (filter === 'past') {
      query.date = { $lt: new Date() };
    } else if (filter === 'my' && req.user) {
      query.$or = [
        { creator: req.user._id },
        { attendees: req.user._id }
      ];
    }
    
    // Tìm kiếm theo tên, mô tả, địa điểm
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }

    // Xây dựng sort
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Thực hiện query với phân trang
    const events = await Event.find(query)
      .populate('creator', 'name avatarUrl')
      .populate('attendees', 'name avatarUrl')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    // Thêm thông tin user role cho mỗi event
    events.forEach(event => {
      if (req.user) {
        if (event.creator._id.toString() === req.user._id.toString()) {
          event.userRole = 'creator';
        } else if (event.attendees.some(attendee => attendee._id.toString() === req.user._id.toString())) {
          event.userRole = 'attendee';
        } else {
          event.userRole = null;
        }
      } else {
        event.userRole = null;
      }
    });

    // Đếm tổng số sự kiện
    const total = await Event.countDocuments(query);

    res.json({
      success: true,
      events,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tải danh sách sự kiện'
    });
  }
});

/**
 * @route   GET /api/events/:id
 * @desc    Lấy thông tin chi tiết sự kiện
 * @access  Public
 */
router.get('/:id', authOptional, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('creator', 'name avatarUrl')
      .populate('attendees', 'name avatarUrl');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sự kiện'
      });
    }

    // Thêm thông tin user role
    if (req.user) {
      if (event.creator._id.toString() === req.user._id.toString()) {
        event.userRole = 'creator';
      } else if (event.attendees.some(attendee => attendee._id.toString() === req.user._id.toString())) {
        event.userRole = 'attendee';
      } else {
        event.userRole = null;
      }
    } else {
      event.userRole = null;
    }

    res.json({
      success: true,
      event
    });
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tải thông tin sự kiện'
    });
  }
});

/**
 * @route   POST /api/events
 * @desc    Tạo sự kiện mới
 * @access  Private
 */
router.post('/', authRequired, async (req, res) => {
  try {
    const {
      title,
      description,
      date,
      location,
      maxAttendees,
      isPublic = true,
      tags = []
    } = req.body;

    if (!title || !description || !date) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng điền đầy đủ thông tin bắt buộc'
      });
    }

    const event = new Event({
      title,
      description,
      date: new Date(date),
      location,
      maxAttendees: maxAttendees ? parseInt(maxAttendees) : null,
      isPublic,
      tags: Array.isArray(tags) ? tags : tags.split(',').map(tag => tag.trim()),
      creator: req.user._id,
      attendees: [req.user._id] // Tự động thêm creator làm attendee
    });

    await event.save();
    await event.populate('creator', 'name avatarUrl');
    await event.populate('attendees', 'name avatarUrl');

    res.status(201).json({
      success: true,
      message: 'Tạo sự kiện thành công',
      event
    });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo sự kiện'
    });
  }
});

/**
 * @route   PUT /api/events/:id
 * @desc    Cập nhật sự kiện
 * @access  Private (chỉ creator)
 */
router.put('/:id', authRequired, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sự kiện'
      });
    }

    // Kiểm tra quyền chỉnh sửa
    if (event.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền chỉnh sửa sự kiện này'
      });
    }

    const {
      title,
      description,
      date,
      location,
      maxAttendees,
      isPublic,
      tags
    } = req.body;

    // Cập nhật thông tin
    if (title) event.title = title;
    if (description !== undefined) event.description = description;
    if (date) event.date = new Date(date);
    if (location !== undefined) event.location = location;
    if (maxAttendees !== undefined) event.maxAttendees = maxAttendees ? parseInt(maxAttendees) : null;
    if (isPublic !== undefined) event.isPublic = isPublic;
    if (tags) event.tags = Array.isArray(tags) ? tags : tags.split(',').map(tag => tag.trim());

    await event.save();
    await event.populate('creator', 'name avatarUrl');
    await event.populate('attendees', 'name avatarUrl');

    res.json({
      success: true,
      message: 'Cập nhật sự kiện thành công',
      event
    });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật sự kiện'
    });
  }
});

/**
 * @route   DELETE /api/events/:id
 * @desc    Xóa sự kiện
 * @access  Private (chỉ creator)
 */
router.delete('/:id', authRequired, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sự kiện'
      });
    }

    // Kiểm tra quyền xóa
    if (event.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xóa sự kiện này'
      });
    }

    // Đánh dấu sự kiện là không hoạt động thay vì xóa thật
    event.isActive = false;
    await event.save();

    res.json({
      success: true,
      message: 'Xóa sự kiện thành công'
    });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa sự kiện'
    });
  }
});

/**
 * @route   POST /api/events/:id/join
 * @desc    Tham gia sự kiện
 * @access  Private
 */
router.post('/:id/join', authRequired, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sự kiện'
      });
    }

    const userId = req.user._id;

    // Kiểm tra xem user đã tham gia chưa
    if (event.attendees.includes(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Bạn đã tham gia sự kiện này'
      });
    }

    // Kiểm tra giới hạn số người tham gia
    if (event.maxAttendees && event.attendees.length >= event.maxAttendees) {
      return res.status(400).json({
        success: false,
        message: 'Sự kiện đã đủ số người tham gia'
      });
    }

    event.attendees.push(userId);
    await event.save();
    await event.populate('attendees', 'name avatarUrl');

    res.json({
      success: true,
      message: 'Tham gia sự kiện thành công',
      event
    });
  } catch (error) {
    console.error('Error joining event:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tham gia sự kiện'
    });
  }
});

/**
 * @route   POST /api/events/:id/leave
 * @desc    Rời khỏi sự kiện
 * @access  Private
 */
router.post('/:id/leave', authRequired, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sự kiện'
      });
    }

    const userId = req.user._id;

    // Không cho phép creator rời khỏi sự kiện
    if (event.creator.toString() === userId) {
      return res.status(400).json({
        success: false,
        message: 'Người tạo sự kiện không thể rời khỏi sự kiện'
      });
    }

    // Kiểm tra xem user có tham gia không
    if (!event.attendees.includes(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Bạn chưa tham gia sự kiện này'
      });
    }

    event.attendees = event.attendees.filter(id => id.toString() !== userId.toString());
    await event.save();
    await event.populate('attendees', 'name avatarUrl');

    res.json({
      success: true,
      message: 'Rời khỏi sự kiện thành công',
      event
    });
  } catch (error) {
    console.error('Error leaving event:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi rời khỏi sự kiện'
    });
  }
});

export default router;
