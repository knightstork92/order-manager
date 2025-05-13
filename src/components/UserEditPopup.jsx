import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase";
import { useAuth } from "../contexts/AuthContext";

const UserEditPopup = ({ user, onClose, onSave }) => {
  const [form, setForm] = useState({ ...user });
  const [msg, setMsg] = useState("");
  const { currentUser } = useAuth();

  const handleChange = (e) => {
    const { name, value, checked, type } = e.target;
    setForm({
      ...form,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  const handleResetPassword = async () => {
    try {
      await sendPasswordResetEmail(auth, form.email);
      setMsg("✅ Email đặt lại mật khẩu đã được gửi.");
    } catch (err) {
      setMsg("❌ Lỗi gửi email: " + err.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg w-full max-w-md relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-3 text-gray-400 hover:text-black text-2xl"
        >
          &times;
        </button>
        <h2 className="text-lg font-semibold mb-4">Chỉnh sửa người dùng</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
            placeholder="Họ tên"
          />
          <input
            type="text"
            name="username"
            value={form.username}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
            placeholder="Tên đăng nhập"
          />
          <select
            name="role"
            value={form.role}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
          >
            <option value="admin">admin</option>
            <option value="partner">partner</option>
            <option value="employee">employee</option>
          </select>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="disabled"
              checked={form.disabled || false}
              onChange={handleChange}
            />
            Vô hiệu hoá tài khoản
          </label>

          {/* ✅ Nút đặt lại mật khẩu chỉ dành cho admin */}
          {currentUser?.role === "admin" && (
            <button
              type="button"
              onClick={handleResetPassword}
              className="w-full bg-yellow-500 text-white py-2 rounded hover:bg-yellow-600"
            >
              Đặt lại mật khẩu qua email
            </button>
          )}

          {msg && <p className="text-sm text-center text-gray-600">{msg}</p>}

          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded w-full hover:bg-blue-700"
          >
            Cập nhật
          </button>
        </form>
      </div>
    </div>
  );
};

export default UserEditPopup;
