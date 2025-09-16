# 🔒 MyBlog - Secure Social Media Platform

A comprehensive social media platform built with Node.js, Express, MongoDB, and React, featuring enterprise-grade security implementations.

## ✨ Features

### 🛡️ Security Features
- **Input Validation**: Joi schema validation for all inputs
- **File Upload Security**: Magic bytes detection, type validation, size limits
- **NoSQL Injection Protection**: Regex escaping, safe query builders
- **JWT Security**: Refresh tokens, token blacklist, short-lived access tokens
- **Rate Limiting**: Multiple rate limiters for different endpoints
- **Security Logging**: Comprehensive security event monitoring
- **XSS Protection**: HTML sanitization and CSP headers
- **CORS Protection**: Strict origin validation

### 🚀 Core Features
- **User Authentication**: Secure login/register with password reset
- **Social Features**: Posts, comments, likes, friends system
- **Real-time Chat**: Socket.IO powered messaging
- **File Uploads**: Secure image/video/document uploads
- **Groups & Events**: Community features
- **Admin Panel**: User management and moderation
- **Responsive Design**: Mobile-first UI

## 🏗️ Tech Stack

### Backend
- **Node.js** + **Express.js**
- **MongoDB** + **Mongoose**
- **JWT** + **bcryptjs**
- **Socket.IO** for real-time features
- **Cloudinary** for file storage
- **Nodemailer** for email services

### Frontend
- **React** + **Vite**
- **Tailwind CSS**
- **Axios** for API calls
- **Socket.IO Client**

## 🚀 Quick Start

### Prerequisites
- Node.js (v16+)
- MongoDB
- Cloudinary account
- SMTP email service

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/myblog.git
cd myblog
```

2. **Install dependencies**
```bash
# Backend
cd server
npm install

# Frontend
cd ../client
npm install
```

3. **Environment Setup**
```bash
# Copy environment template
cp server/env.example server/.env
cp client/.env.example client/.env

# Edit with your actual values
nano server/.env
nano client/.env
```

4. **Start the application**
```bash
# Start backend (from server directory)
npm run dev

# Start frontend (from client directory)
npm run dev
```

## 🔧 Environment Variables

### Backend (.env)
```env
# Database
MONGODB_URI=mongodb://localhost:27017/myblog

# JWT Secrets (generate strong secrets)
JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters-long
JWT_REFRESH_SECRET=your-super-secret-refresh-key-at-least-32-characters-long

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:4000
VITE_SOCKET_URL=http://localhost:4000
```

## 🧪 Security Testing

Run comprehensive security tests:

```bash
cd server
npm run test:security
```

## 📁 Project Structure

```
myblog/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/         # Page components
│   │   ├── utils/         # Utility functions
│   │   └── styles/        # CSS styles
│   └── public/            # Static assets
├── server/                # Node.js backend
│   ├── src/
│   │   ├── middleware/    # Security & validation middleware
│   │   ├── routes/        # API routes
│   │   ├── models/        # MongoDB models
│   │   ├── utils/         # Utility functions
│   │   └── config/        # Configuration files
│   ├── scripts/           # Utility scripts
│   └── logs/              # Security logs
└── docs/                  # Documentation
```

## 🔒 Security Implementation

This project implements enterprise-grade security features:

### Input Validation
- Joi schema validation for all API endpoints
- XSS protection through HTML sanitization
- SQL/NoSQL injection prevention
- File upload validation with magic bytes detection

### Authentication & Authorization
- JWT with refresh token system
- Password strength requirements
- Token blacklisting on logout
- Role-based access control

### Rate Limiting
- Multiple rate limiters for different endpoints
- IP-based and user-based limiting
- Graceful degradation

### Security Monitoring
- Comprehensive security event logging
- Suspicious activity detection
- Real-time monitoring dashboard

## 📊 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - User logout
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password` - Password reset

### Posts Endpoints
- `GET /api/posts` - Get posts with pagination
- `POST /api/posts` - Create new post
- `GET /api/posts/:id` - Get post by ID
- `PUT /api/posts/:id` - Update post
- `DELETE /api/posts/:id` - Delete post

### File Upload Endpoints
- `POST /api/uploads/single` - Upload single file
- `POST /api/uploads/media` - Upload multiple files
- `POST /api/uploads/avatar` - Upload avatar
- `DELETE /api/uploads/:publicId` - Delete file

## 🚀 Deployment

### Production Checklist
- [ ] Set strong JWT secrets
- [ ] Configure production database
- [ ] Set up Cloudinary account
- [ ] Configure SMTP service
- [ ] Set up SSL/TLS certificates
- [ ] Configure CORS origins
- [ ] Set up monitoring and logging
- [ ] Run security tests

### Docker Deployment
```bash
# Build and run with Docker
docker-compose up -d
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run security tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Check the [Security Documentation](server/SECURITY.md)
- Review the [API Documentation](docs/API.md)

## 🔗 Links

- [Live Demo](https://your-demo-url.com)
- [API Documentation](https://your-api-docs.com)
- [Security Report](https://your-security-report.com)

---

**⚠️ Security Notice**: This project implements comprehensive security features. Always use strong secrets in production and keep dependencies updated.