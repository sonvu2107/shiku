/**
 * Script giải thích cách hoạt động của Visitor Tracking
 * Tạo dữ liệu test để minh họa
 */
import mongoose from "mongoose";
import User from "../src/models/User.js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function explainVisitorTracking() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Lấy thống kê hiện tại
    const totalUsers = await User.countDocuments();
    const onlineUsers = await User.countDocuments({ isOnline: true });
    const usersWithActivity = await User.countDocuments({
      lastSeen: { $exists: true, $ne: null }
    });

    console.log("\n📊 THỐNG KÊ HIỆN TẠI:");
    console.log(`👥 Tổng người dùng: ${totalUsers}`);
    console.log(`🟢 Đang online: ${onlineUsers}`);
    console.log(`📈 Đã hoạt động: ${usersWithActivity}`);

    // Thống kê theo thời gian
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [todayVisitors, weekVisitors, monthVisitors] = await Promise.all([
      User.countDocuments({ lastSeen: { $gte: today } }),
      User.countDocuments({ lastSeen: { $gte: thisWeek } }),
      User.countDocuments({ lastSeen: { $gte: thisMonth } })
    ]);

    console.log("\n⏰ THỐNG KÊ THEO THỜI GIAN:");
    console.log(`📅 Hôm nay: ${todayVisitors} người`);
    console.log(`📆 Tuần này: ${weekVisitors} người`);
    console.log(`📊 Tháng này: ${monthVisitors} người`);

    console.log("\n🔍 CÁCH HOẠT ĐỘNG CỦA VISITOR TRACKING:");
    console.log("1. 📝 Đăng ký: User tạo tài khoản → totalUsers++");
    console.log("2. 🔐 Đăng nhập: User login → isOnline=true, lastSeen=now()");
    console.log("3. 💓 Heartbeat: Mỗi 30s → lastSeen=now() (duy trì online)");
    console.log("4. 👋 Đăng xuất: User logout → isOnline=false");
    console.log("5. 📊 Tổng lượt truy cập = Số users đã từng hoạt động (có lastSeen)");

    console.log("\n📈 CÔNG THỨC TÍNH TOÁN:");
    console.log("• Tổng lượt truy cập = usersWithActivity");
    console.log("• Tỷ lệ hoạt động = (usersWithActivity / totalUsers) * 100%");
    console.log("• Tỷ lệ online = (onlineUsers / totalUsers) * 100%");

    // Tính tỷ lệ
    const activityRate = totalUsers > 0 ? ((usersWithActivity / totalUsers) * 100).toFixed(1) : 0;
    const onlineRate = totalUsers > 0 ? ((onlineUsers / totalUsers) * 100).toFixed(1) : 0;

    console.log("\n📊 TỶ LỆ:");
    console.log(`🎯 Tỷ lệ hoạt động: ${activityRate}%`);
    console.log(`🟢 Tỷ lệ online: ${onlineRate}%`);

    console.log("\n💡 CÁCH MỞ RỘNG:");
    console.log("• Track page views: Thêm bảng PageView");
    console.log("• Track unique visitors: Dựa trên IP + User Agent");
    console.log("• Track session duration: Tính thời gian online");
    console.log("• Track bounce rate: Tỷ lệ rời khỏi trang nhanh");

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
  }
}

// Chạy script
explainVisitorTracking();
