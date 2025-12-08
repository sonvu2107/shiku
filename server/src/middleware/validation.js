/**
 * Validation Middleware
 * 
 * Middleware validation cho các input quan trọng.
 * Sử dụng Joi để validate và sanitize input, chống XSS và NoSQL injection.
 * 
 * @module validation
 */

import Joi from "joi";

// Schema validation cho đăng ký user
export const registerSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(50)
    .trim()
    .required()
    .messages({
      'string.min': 'Tên phải có ít nhất 2 ký tự',
      'string.max': 'Tên không được quá 50 ký tự',
      'any.required': 'Tên là bắt buộc'
    }),
  email: Joi.string()
    .email()
    .lowercase()
    .trim()
    .required()
    .messages({
      'string.email': 'Email không hợp lệ',
      'any.required': 'Email là bắt buộc'
    }),
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.min': 'Mật khẩu phải có ít nhất 8 ký tự',
      'string.max': 'Mật khẩu không được quá 128 ký tự',
      'string.pattern.base': 'Mật khẩu phải có ít nhất 1 chữ thường, 1 chữ hoa, 1 số và 1 ký tự đặc biệt',
      'any.required': 'Mật khẩu là bắt buộc'
    })
});

// Schema validation cho đăng nhập
export const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .lowercase()
    .trim()
    .required()
    .messages({
      'string.email': 'Email không hợp lệ',
      'any.required': 'Email là bắt buộc'
    }),
  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Mật khẩu là bắt buộc'
    })
});

// Schema validation cho quên mật khẩu (chỉ cần email)
export const forgotPasswordSchema = Joi.object({
  email: Joi.string()
    .email()
    .lowercase()
    .trim()
    .required()
    .messages({
      'string.email': 'Email không hợp lệ',
      'any.required': 'Email là bắt buộc'
    })
});

// Schema validation cho đặt lại mật khẩu (cần token và password mới)
export const resetPasswordSchema = Joi.object({
  token: Joi.string()
    .required()
    .messages({
      'any.required': 'Token là bắt buộc'
    }),
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.min': 'Mật khẩu phải có ít nhất 8 ký tự',
      'string.max': 'Mật khẩu không được quá 128 ký tự',
      'string.pattern.base': 'Mật khẩu phải có ít nhất 1 chữ thường, 1 chữ hoa, 1 số và 1 ký tự đặc biệt',
      'any.required': 'Mật khẩu là bắt buộc'
    })
});

// Schema validation cho tạo bài viết
export const createPostSchema = Joi.object({
  title: Joi.string()
    .min(1)
    .max(100)
    .trim()
    .required()
    .messages({
      'string.min': 'Tiêu đề không được để trống',
      'string.max': 'Tiêu đề không được quá 100 ký tự',
      'any.required': 'Tiêu đề là bắt buộc'
    }),
  content: Joi.string()
    .min(1)
    .max(5000)
    .trim()
    .required()
    .messages({
      'string.min': 'Nội dung không được để trống',
      'string.max': 'Nội dung không được quá 5000 ký tự',
      'any.required': 'Nội dung là bắt buộc'
    }),
  tags: Joi.array()
    .items(Joi.string().trim().max(20))
    .max(10)
    .optional()
    .messages({
      'array.max': 'Không được quá 10 tags',
      'string.max': 'Mỗi tag không được quá 20 ký tự'
    }),
  status: Joi.string()
    .valid('published', 'private', 'draft')
    .default('published')
    .messages({
      'any.only': 'Trạng thái phải là published, private hoặc draft'
    }),
  group: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .optional()
    .messages({
      'string.pattern.base': 'ID group không hợp lệ'
    })
});

// Schema validation cho comment
export const createCommentSchema = Joi.object({
  content: Joi.string()
    .min(1)
    .max(1000)
    .trim()
    .required()
    .messages({
      'string.min': 'Nội dung comment không được để trống',
      'string.max': 'Nội dung comment không được quá 1000 ký tự',
      'any.required': 'Nội dung comment là bắt buộc'
    }),
  parent: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .optional()
    .messages({
      'string.pattern.base': 'ID comment cha không hợp lệ'
    })
});

// Schema validation cho update profile
export const updateProfileSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(50)
    .trim()
    .optional()
    .messages({
      'string.min': 'Tên phải có ít nhất 2 ký tự',
      'string.max': 'Tên không được quá 50 ký tự'
    }),
  email: Joi.string()
    .email()
    .lowercase()
    .trim()
    .optional()
    .messages({
      'string.email': 'Email không hợp lệ'
    }),
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .optional()
    .messages({
      'string.min': 'Mật khẩu phải có ít nhất 8 ký tự',
      'string.max': 'Mật khẩu không được quá 128 ký tự',
      'string.pattern.base': 'Mật khẩu phải có ít nhất 1 chữ thường, 1 chữ hoa, 1 số và 1 ký tự đặc biệt'
    }),
  // Các field có thể xóa - cho phép chuỗi rỗng
  bio: Joi.string()
    .max(500)
    .trim()
    .allow('')
    .optional()
    .messages({
      'string.max': 'Bio không được quá 500 ký tự'
    }),
  nickname: Joi.string()
    .max(30)
    .trim()
    .allow('')
    .optional()
    .messages({
      'string.max': 'Biệt danh không được quá 30 ký tự'
    }),
  birthday: Joi.alternatives()
    .try(
      Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/),
      Joi.string().allow('', null)
    )
    .optional()
    .messages({
      'string.pattern.base': 'Ngày sinh phải có định dạng YYYY-MM-DD'
    }),
  gender: Joi.string()
    .valid('male', 'female', 'other', '')
    .allow('')
    .optional()
    .messages({
      'any.only': 'Giới tính phải là male, female, other hoặc để trống'
    }),
  hobbies: Joi.string()
    .max(200)
    .trim()
    .allow('')
    .optional()
    .messages({
      'string.max': 'Sở thích không được quá 200 ký tự'
    }),
  avatarUrl: Joi.string()
    .uri()
    .optional()
    .messages({
      'string.uri': 'URL avatar không hợp lệ'
    }),
  // New profile customization fields
  coverUrl: Joi.string()
    .uri()
    .optional()
    .messages({
      'string.uri': 'URL ảnh bìa không hợp lệ'
    }),
  location: Joi.string()
    .max(100)
    .trim()
    .allow('')
    .optional()
    .messages({
      'string.max': 'Địa chỉ không được quá 100 ký tự'
    }),
  website: Joi.alternatives()
    .try(
      Joi.string().uri(),
      Joi.string().allow('', null)
    )
    .optional()
    .messages({
      'string.uri': 'Website không hợp lệ'
    }),
  phone: Joi.alternatives()
    .try(
      Joi.string().pattern(/^[\+]?[0-9\s\-\(\)]{10,15}$/),
      Joi.string().allow('', null)
    )
    .optional()
    .messages({
      'string.pattern.base': 'Số điện thoại không hợp lệ'
    }),
  profileTheme: Joi.string()
    .valid('default', 'dark', 'blue', 'green', 'purple', 'pink', 'orange')
    .optional(),
  profileLayout: Joi.string()
    .valid('classic', 'modern', 'minimal', 'creative')
    .optional(),
  useCoverImage: Joi.boolean().optional(),
  showEmail: Joi.boolean().optional(),
  showPhone: Joi.boolean().optional(),
  showBirthday: Joi.boolean().optional(),
  showLocation: Joi.boolean().optional(),
  showWebsite: Joi.boolean().optional(),
  showHobbies: Joi.boolean().optional(),
  showFriends: Joi.boolean().optional(),
  showPosts: Joi.boolean().optional(),
  showEvents: Joi.boolean().optional(),
  displayBadgeType: Joi.string()
    .valid('realm', 'title', 'both', 'none', 'role', 'cultivation')
    .optional()
    .messages({
      'any.only': 'Loại badge phải là realm, title, both hoặc none'
    }),
  // Profile Personalization fields
  // Profile Personalization fields
  profileSongUrl: Joi.alternatives()
    .try(
      Joi.string().uri().regex(/^https:\/\/open\.spotify\.com\//),
      Joi.string().allow('', null)
    )
    .optional()
    .messages({
      'string.pattern.base': 'URL phải là link Spotify hợp lệ'
    }),
  statusUpdate: Joi.object({
    text: Joi.string().max(100).allow('').optional(),
    emoji: Joi.string().max(10).allow('').optional()
  }).optional()
});

// Schema validation cho search
export const searchSchema = Joi.object({
  q: Joi.string()
    .min(1)
    .max(100)
    .trim()
    .required()
    .messages({
      'string.min': 'Từ khóa tìm kiếm không được để trống',
      'string.max': 'Từ khóa tìm kiếm không được quá 100 ký tự',
      'any.required': 'Từ khóa tìm kiếm là bắt buộc'
    }),
  page: Joi.number()
    .integer()
    .min(1)
    .max(1000)
    .default(1)
    .messages({
      'number.min': 'Trang phải lớn hơn 0',
      'number.max': 'Trang không được quá 1000'
    }),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20)
    .messages({
      'number.min': 'Số lượng kết quả phải lớn hơn 0',
      'number.max': 'Số lượng kết quả không được quá 100'
    })
});

/**
 * Middleware validation generic
 * @param {Object} schema - Joi schema để validate
 * @param {string} property - Property cần validate (body, query, params)
 */
export const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false, // Trả về tất cả lỗi
      stripUnknown: true, // Loại bỏ các field không có trong schema
      convert: true // Convert types khi có thể
    });

    if (error) {
      const errorMessages = error.details.map(detail => detail.message);
      return res.status(400).json({
        error: 'Dữ liệu không hợp lệ',
        details: errorMessages
      });
    }

    // Gán giá trị đã được sanitize vào request
    req[property] = value;
    next();
  };
};

/**
 * Sanitize HTML để chống XSS
 * @param {string} input - Input cần sanitize
 * @returns {string} - Input đã được sanitize
 */
export const sanitizeHtml = (input) => {
  if (typeof input !== 'string') return input;

  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Escape regex special characters để tránh NoSQL injection
 * @param {string} input - Input cần escape
 * @returns {string} - Input đã được escape
 */
export const escapeRegex = (input) => {
  if (typeof input !== 'string') return input;

  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};
