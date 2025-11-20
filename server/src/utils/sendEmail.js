import { Resend } from "resend";

/**
 * Utility để gửi email sử dụng Resend API
 * Sử dụng domain riêng @shiku.click đã được verify
 * @param {Object} options - Email options
 * @param {string} options.to - Địa chỉ email người nhận (có thể là string hoặc array)
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
      // Kiểm tra API key
      const apiKey = process.env.RESEND_API_KEY;
      
      // Debug: Log để kiểm tra (chỉ trong development)
      if (process.env.NODE_ENV !== 'production') {
        console.log('[sendEmail] Checking RESEND_API_KEY:', apiKey ? `${apiKey.substring(0, 10)}...` : 'NOT FOUND');
      }
      
      if (!apiKey) {
        const errorMsg = 'RESEND_API_KEY không được tìm thấy trong environment variables.\n' +
          'Vui lòng kiểm tra:\n' +
          '1. File .env có ở thư mục server/ không?\n' +
          '2. Tên biến có đúng là RESEND_API_KEY không?\n' +
          '3. Đã restart server sau khi thêm biến chưa?';
        throw new Error(errorMsg);
      }

      // Khởi tạo Resend client
      const resend = new Resend(apiKey);

      // Chuyển đổi 'to' thành array nếu là string
      const toArray = Array.isArray(to) ? to : [to];

      // Gửi email qua Resend API
      const info = await resend.emails.send({
        from: "Shiku Support <support@shiku.click>",
        to: toArray,
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