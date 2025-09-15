import { Navigate } from "react-router-dom";

/**
 * ProtectedRoute - Component bảo vệ routes cần authentication
 * Redirect đến trang login nếu user chưa đăng nhập
 * @param {Object} user - Thông tin user hiện tại (null nếu chưa đăng nhập)
 * @param {ReactNode} children - Components con cần được bảo vệ
 */
export default function ProtectedRoute({ user, children }) {
  // Redirect đến login nếu chưa đăng nhập
  if (!user) return <Navigate to="/login" replace />;
  
  // Render children nếu đã đăng nhập
  return children;
}
