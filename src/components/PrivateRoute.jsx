// src/routes/PrivateRoute.jsx
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const PrivateRoute = ({ children, requiredRole, allowedRoles }) => {
  const { currentUser } = useAuth();

  if (!currentUser) {
    console.warn("❌ Chưa đăng nhập.");
    return <Navigate to="/login" replace />;
  }

  // ✅ Nếu có mảng allowedRoles
  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    console.warn(`🚫 Role '${currentUser.role}' không có trong allowedRoles.`);
    return (
      <div className="p-8 text-center text-red-600 text-lg font-semibold">
        🚫 Bạn không có quyền truy cập trang này.
      </div>
    );
  }

  // ✅ Nếu có requiredRole đơn lẻ
  if (requiredRole && currentUser.role !== requiredRole) {
    console.warn(`🚫 Role '${currentUser.role}' không khớp requiredRole '${requiredRole}'`);
    return (
      <div className="p-8 text-center text-red-600 text-lg font-semibold">
        🚫 Bạn không có quyền truy cập trang này.
      </div>
    );
  }

  return children;
};

export default PrivateRoute;
