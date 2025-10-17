import nodemailer from "nodemailer";

/**
 * Utility để gửi email sử dụng Nodemailer
 * Hỗ trợ SMTP configuration từ environment variables
 * @param {Object} options - Email options
 * @param {string} options.to - Địa chỉ email người nhận
 * @param {string} options.subject - Tiêu đề email
 * @param {string} options.html - Nội dung HTML của email
 * @param {number} options.timeout - Timeout trong milliseconds (mặc định 30s)
 */
export async function sendEmail({ to, subject, html, timeout = 30000 }) {
  return new Promise(async (resolve, reject) => {
    // Set timeout cho toàn bộ quá trình gửi email
    const timeoutId = setTimeout(() => {
      reject(new Error('Email sending timeout - server không phản hồi kịp thời'));
    }, timeout);

    try {
      const transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 465,
        secure: true,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        },
        // Thêm timeout cho SMTP connection
        connectionTimeout: 10000, // 10 seconds
        greetingTimeout: 5000,   // 5 seconds
        socketTimeout: 10000     // 10 seconds
      });

      // Gửi email
      const info = await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to,
        subject,
        html
      });

      clearTimeout(timeoutId);
      resolve(info);
    } catch (err) {
      clearTimeout(timeoutId);
      reject(err);
    }
  });
}