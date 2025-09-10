import nodemailer from "nodemailer";

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
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      html
    });
    console.log("[sendEmail] Gửi email thành công:", info.messageId);
  } catch (err) {
    console.error("[sendEmail] Lỗi gửi email:", err);
  }
}
