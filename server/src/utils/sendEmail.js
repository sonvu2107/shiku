import nodemailer from "nodemailer";

/**
 * Utility để gửi email sử dụng Nodemailer
 * Hỗ trợ SMTP configuration từ environment variables
 * @param {Object} options - Email options
 * @param {string} options.to - Địa chỉ email người nhận
 * @param {string} options.subject - Tiêu đề email
 * @param {string} options.html - Nội dung HTML của email
 */
export async function sendEmail({ to, subject, html }) {
  console.log("[sendEmail] Chuẩn bị gửi email:", { to, subject });
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 465,
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  try {
    // Gửi email
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER, // Địa chỉ gửi
      to,      // Địa chỉ nhận
      subject, // Tiêu đề
      html     // Nội dung HTML
    });
    console.log("[sendEmail] Gửi email thành công:", info.messageId);
  } catch (err) {
    console.error("[sendEmail] Lỗi gửi email:", err);
    // Không throw error để không crash app
  }
}
