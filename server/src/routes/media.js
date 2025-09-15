import express from 'express';
import Media from '../models/Media.js';
import { authRequired } from '../middleware/auth.js';

const router = express.Router();

/**
 * Media Routes - API routes cho chức năng quản lý media
 * Bao gồm CRUD operations và quản lý media files
 */

/**
 * @route   GET /api/media
 * @desc    Lấy danh sách media với phân trang và tìm kiếm
 * @access  Private
 */
router.get('/', authRequired, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      type = 'all', // all, images, videos
      sortBy = 'uploadedAt',
      sortOrder = 'desc'
    } = req.query;

    // Xây dựng query
    let query = { 
      uploadedBy: req.user._id,
      isActive: true 
    };
    
    // Lọc theo loại media
    if (type === 'images') {
      query.type = 'image';
    } else if (type === 'videos') {
      query.type = 'video';
    }
    
    // Tìm kiếm theo tên file, title
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { originalName: { $regex: search, $options: 'i' } }
      ];
    }

    // Xây dựng sort
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Thực hiện query với phân trang
    const media = await Media.find(query)
      .populate('uploadedBy', 'name avatarUrl')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    // Đếm tổng số media
    const total = await Media.countDocuments(query);

    res.json({
      success: true,
      media,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Error fetching media:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tải danh sách media'
    });
  }
});

/**
 * @route   GET /api/media/:id
 * @desc    Lấy thông tin chi tiết media
 * @access  Private
 */
router.get('/:id', authRequired, async (req, res) => {
  try {
    const media = await Media.findOne({
      _id: req.params.id,
      uploadedBy: req.user._id,
      isActive: true
    }).populate('uploadedBy', 'name avatarUrl');

    if (!media) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy media'
      });
    }

    res.json({
      success: true,
      media
    });
  } catch (error) {
    console.error('Error fetching media:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tải thông tin media'
    });
  }
});

/**
 * @route   POST /api/media
 * @desc    Tạo media mới (từ upload)
 * @access  Private
 */
router.post('/', authRequired, async (req, res) => {
  try {
    const {
      url,
      thumbnail,
      originalName,
      title,
      type,
      size,
      mimeType
    } = req.body;

    if (!url || !type) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ thông tin media'
      });
    }

    const media = new Media({
      url,
      thumbnail: thumbnail || url,
      originalName: originalName || 'Untitled',
      title: title || originalName || 'Untitled',
      type,
      size: size ? parseInt(size) : 0,
      mimeType,
      uploadedBy: req.user._id
    });

    await media.save();
    await media.populate('uploadedBy', 'name avatarUrl');

    res.status(201).json({
      success: true,
      message: 'Tạo media thành công',
      media
    });
  } catch (error) {
    console.error('Error creating media:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo media'
    });
  }
});

/**
 * @route   PUT /api/media/:id
 * @desc    Cập nhật thông tin media
 * @access  Private
 */
router.put('/:id', authRequired, async (req, res) => {
  try {
    const media = await Media.findOne({
      _id: req.params.id,
      uploadedBy: req.user._id,
      isActive: true
    });
    
    if (!media) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy media'
      });
    }

    const { title, description } = req.body;

    // Cập nhật thông tin
    if (title) media.title = title;
    if (description !== undefined) media.description = description;

    await media.save();
    await media.populate('uploadedBy', 'name avatarUrl');

    res.json({
      success: true,
      message: 'Cập nhật media thành công',
      media
    });
  } catch (error) {
    console.error('Error updating media:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật media'
    });
  }
});

/**
 * @route   DELETE /api/media/:id
 * @desc    Xóa media
 * @access  Private
 */
router.delete('/:id', authRequired, async (req, res) => {
  try {
    const media = await Media.findOne({
      _id: req.params.id,
      uploadedBy: req.user._id,
      isActive: true
    });
    
    if (!media) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy media'
      });
    }

    // Đánh dấu media là không hoạt động thay vì xóa thật
    media.isActive = false;
    await media.save();

    res.json({
      success: true,
      message: 'Xóa media thành công'
    });
  } catch (error) {
    console.error('Error deleting media:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa media'
    });
  }
});

/**
 * @route   POST /api/media/:id/view
 * @desc    Tăng lượt xem media
 * @access  Private
 */
router.post('/:id/view', authRequired, async (req, res) => {
  try {
    const media = await Media.findOneAndUpdate(
      {
        _id: req.params.id,
        uploadedBy: req.user._id,
        isActive: true
      },
      { $inc: { views: 1 } },
      { new: true }
    );

    if (!media) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy media'
      });
    }

    res.json({
      success: true,
      views: media.views
    });
  } catch (error) {
    console.error('Error updating media views:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật lượt xem'
    });
  }
});

export default router;
