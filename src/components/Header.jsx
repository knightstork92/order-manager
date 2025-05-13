import { useState } from "react";
import useNotifications from "../hooks/useNotifications";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const Header = () => {
  const { currentUser, logout } = useAuth(); // ✅ dùng từ AuthContext
  const { notifications, unreadCount, markAllAsRead } = useNotifications(currentUser);
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();

  const toggleDropdown = () => {
    setShowDropdown((prev) => {
      const next = !prev;
      if (next && unreadCount > 0) markAllAsRead();
      return next;
    });
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="bg-white shadow p-3 flex justify-between items-center">
      <h1 className="font-semibold">Quản Lý Đơn Hàng - Knight Team</h1>

      <div className="flex items-center gap-6">
        {/* 🔔 Nút thông báo */}
        <div className="relative">
          <button onClick={toggleDropdown} className="relative">
            <span className="text-xl">🔔</span>
            {unreadCount > 0 && (
              <span className="absolute -top-2 -right-2 text-xs bg-red-500 text-white px-1.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </button>

          {showDropdown && (
            <div className="absolute right-0 mt-2 bg-white shadow rounded w-64 max-h-72 overflow-auto z-50">
              <div className="p-2 border-b font-semibold">Thông báo</div>
              {notifications.length === 0 ? (
                <div className="p-2 text-sm text-gray-500">Không có thông báo nào.</div>
              ) : (
                notifications.map((n) => {
                  const isRead = n.readBy?.includes(currentUser.name);
                  return (
                    <div
                      key={n.id}
                      className={`p-2 text-sm hover:bg-gray-50 ${
                        !isRead ? "font-semibold text-blue-800" : "text-gray-700"
                      }`}
                    >
                      {n.message}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* 👤 Thông tin người dùng */}
        <div className="text-sm text-gray-600 flex items-center gap-3">
          Xin chào, <span className="font-semibold">{currentUser?.name || "Người dùng"}</span>
          <button
            onClick={handleLogout}
            className="text-red-600 text-xs underline hover:text-red-800"
          >
            Đăng xuất
          </button>
        </div>
      </div>
    </div>
  );
};

export default Header;
