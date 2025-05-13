// AppLayout.jsx - dọn dẹp chat nội bộ, giữ lại AdminChatPage
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import AdminChatPage from "../pages/AdminChatPage";

const AppLayout = () => {
  const { currentUser } = useAuth();

  if (!currentUser) return null;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar currentUser={currentUser} />
      <div className="flex-1 flex flex-col bg-gray-50">
        <Header currentUser={currentUser} />
        <main className="flex-1 overflow-y-auto p-4">
          <Outlet />
        </main>

        {/* ✅ Giữ lại danh sách đối tác ở dạng Messenger */}
        <AdminChatPage />
      </div>
    </div>
  );
};

export default AppLayout;
