import { Navigate } from "react-router-dom";

/**
 * ProtectedRoute - Protects routes that require authentication
 * Redirects to login if the user is not authenticated
 * @param {Object} user - Current user object (null if not logged in)
 * @param {ReactNode} children - Child components to render when authenticated
 */
export default function ProtectedRoute({ user, children }) {
  // Redirect to login if not authenticated
  if (!user) return <Navigate to="/login" replace />;

  // Render children when authenticated
  return children;
}
