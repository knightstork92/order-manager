// AdminChatPage.jsx (chỉ hiển thị nhóm TranThuong ở góc trái)
import { useAuth } from "../contexts/AuthContext";

const AdminChatPage = () => {
  const { currentUser } = useAuth();

  if (!currentUser || currentUser.role === "partner") return null;

  return (
    <div className="fixed bottom-4 left-4 w-42 bg-white shadow-lg rounded-lg p-3 z-40 border">
      <h3 className="font-semibold text-sm mb-2">Đối tác đang trò chuyện</h3>
      <div className="space-y-2">
        <a
          href="https://m.me/6780108988746272"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 px-3 py-2 text-sm bg-green-50 hover:bg-green-100 rounded w-full text-left shadow-sm border border-green-300"
        >
          👥 Nhóm hỗ trợ TranThuong
        </a>
      </div>
    </div>
  );
};

export default AdminChatPage;