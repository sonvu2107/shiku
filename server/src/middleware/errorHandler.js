export function notFound(req, res) {
  res.status(404).json({ error: "Không tìm thấy trang yêu cầu" });
}

export function errorHandler(err, req, res, next) {
  console.error("Error:", {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Don't send stack trace in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Handle specific error types
  let status = err.status || err.statusCode || 500;
  let message = err.message || "Lỗi server";

  // MongoDB/Mongoose errors
  if (err.name === 'ValidationError') {
    status = 400;
    message = "Dữ liệu không hợp lệ";
  } else if (err.name === 'CastError') {
    status = 400;
    message = "ID không hợp lệ";
  } else if (err.code === 11000) {
    status = 400;
    message = "Dữ liệu đã tồn tại";
  } else if (err.name === 'MongoTimeoutError') {
    status = 503;
    message = "Kết nối database bị timeout";
  } else if (err.name === 'MongoNetworkError') {
    status = 503;
    message = "Lỗi kết nối database";
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    status = 401;
    message = "Token không hợp lệ";
  } else if (err.name === 'TokenExpiredError') {
    status = 401;
    message = "Token đã hết hạn";
  }

  // Rate limiting errors
  if (err.status === 429) {
    message = "Quá nhiều yêu cầu, vui lòng thử lại sau";
  }

  // Don't leak error details in production
  if (!isDevelopment && status === 500) {
    message = "Lỗi server nội bộ";
  }

  const errorResponse = {
    error: message,
    status: status
  };

  // Include stack trace in development
  if (isDevelopment) {
    errorResponse.stack = err.stack;
    errorResponse.details = err;
  }

  res.status(status).json(errorResponse);
}
