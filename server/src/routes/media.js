import express from 'express';
import Media from '../models/Media.js';
import { authRequired } from '../middleware/auth.js';
// Cache utilities imported but using custom cache for media

const router = express.Router();

// Create media cache instance
const mediaCache = {
  cache: new Map(),
  ttl: 5 * 60 * 1000, // 5 minutes
  set(key, value, customTtl = null) {
    const ttl = customTtl || this.ttl;
    this.cache.set(key, {
      value,
      expires: Date.now() + ttl
    });
  },
  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }
    return item.value;
  },
  delete(key) {
    this.cache.delete(key);
  }
};

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

    const userId = req.user._id.toString();
    const cacheKey = `media:list:${userId}:${page}:${limit}:${type}:${search}:${sortBy}:${sortOrder}`;

    // Try cache first
    const cached = mediaCache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

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

    // Xây dựng sort - map uploadedAt to createdAt for sorting
    const sortOptions = {};
    const sortField = sortBy === 'uploadedAt' ? 'createdAt' : sortBy;
    sortOptions[sortField] = sortOrder === 'desc' ? -1 : 1;

    // OPTIMIZATION: Use aggregation to get both data and count in one query
    const skip = (page - 1) * limit;
    
    const [result] = await Media.aggregate([
      { $match: query },
      {
        $facet: {
          media: [
            { $sort: sortOptions },
            { $skip: skip },
            { $limit: parseInt(limit) },
            {
              $lookup: {
                from: 'users',
                localField: 'uploadedBy',
                foreignField: '_id',
                as: 'uploadedBy',
                pipeline: [
                  { $project: { name: 1, avatarUrl: 1 } }
                ]
              }
            },
            { $unwind: { path: '$uploadedBy', preserveNullAndEmptyArrays: true } }
          ],
          total: [{ $count: 'count' }]
        }
      }
    ]);

    const media = result.media || [];
    const total = result.total[0]?.count || 0;

    const response = {
      success: true,
      media,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    };

    // Cache the result
    mediaCache.set(cacheKey, response);

    res.json(response);
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
    const cacheKey = `media:detail:${req.params.id}:${req.user._id}`;
    
    // Try cache first
    const cached = mediaCache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const media = await Media.findOne({
      _id: req.params.id,
      uploadedBy: req.user._id,
      isActive: true
    })
      .populate('uploadedBy', 'name avatarUrl')
      .lean(); // Use lean() for better performance

    if (!media) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy media'
      });
    }

    const response = {
      success: true,
      media
    };

    // Cache for 2 minutes (detail pages change less frequently)
    mediaCache.set(cacheKey, response, 2 * 60 * 1000);

    res.json(response);
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

    // Invalidate cache for user's media list
    for (const key of mediaCache.cache.keys()) {
      if (key.startsWith(`media:list:${req.user._id}:`)) {
        mediaCache.delete(key);
      }
    }

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

    // Invalidate cache
    mediaCache.delete(`media:detail:${req.params.id}:${req.user._id}`);
    for (const key of mediaCache.cache.keys()) {
      if (key.startsWith(`media:list:${req.user._id}:`)) {
        mediaCache.delete(key);
      }
    }

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

    // Invalidate cache
    mediaCache.delete(`media:detail:${req.params.id}:${req.user._id}`);
    for (const key of mediaCache.cache.keys()) {
      if (key.startsWith(`media:list:${req.user._id}:`)) {
        mediaCache.delete(key);
      }
    }

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
    // Use findOneAndUpdate with lean for better performance
    const media = await Media.findOneAndUpdate(
      {
        _id: req.params.id,
        uploadedBy: req.user._id,
        isActive: true
      },
      { $inc: { views: 1 } },
      { new: true, lean: true, select: 'views' } // Only return views field
    );

    if (!media) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy media'
      });
    }

    // Invalidate detail cache (views changed)
    mediaCache.delete(`media:detail:${req.params.id}:${req.user._id}`);

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
