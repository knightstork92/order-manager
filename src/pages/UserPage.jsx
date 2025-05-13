// src/pages/UserPage.jsx
import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  setDoc,
} from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { db, auth } from "../firebase";
import UserEditPopup from "../components/UserEditPopup";

const roles = [
  { label: "Admin", value: "admin" },
  { label: "Nhân viên", value: "employee" },
  { label: "Đối tác", value: "partner" },
];

const UserPage = () => {
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState("all");
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "employee",
    username: "",
  });

  const fetchUsers = async () => {
    const snap = await getDocs(collection(db, "users"));
    const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setUsers(data);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { name, email, password, role, username } = form;
    if (!name || !email || !password || !role || !username)
      return alert("Vui lòng nhập đầy đủ thông tin.");

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      await setDoc(doc(db, "users", uid), {
        name,
        email,
        role,
        username,
        disabled: false,
      });

      setForm({ name: "", email: "", password: "", role: "employee", username: "" });
      fetchUsers();
    } catch (err) {
      alert("Lỗi tạo tài khoản: " + err.message);
    }
  };

  const handleSaveUser = async (updatedUser) => {
    const ref = doc(db, "users", updatedUser.id);
    await updateDoc(ref, updatedUser);
    fetchUsers();
  };

  const filteredUsers = users.filter((u) => {
    if (filter === "all") return true;
    if (filter === "active") return !u.disabled;
    if (filter === "disabled") return u.disabled;
    return true;
  });

  return (
    <div className="flex flex-col md:flex-row gap-6">
      {/* Form tạo user */}
      <div className="w-full md:w-1/3 bg-white p-4 rounded shadow">
        <h2 className="text-lg font-semibold mb-4">Tạo người dùng</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="text" name="name" placeholder="Họ tên" value={form.name} onChange={handleChange} className="w-full border px-3 py-2 rounded" />
          <input type="text" name="username" placeholder="Username" value={form.username} onChange={handleChange} className="w-full border px-3 py-2 rounded" />
          <input type="email" name="email" placeholder="Email" value={form.email} onChange={handleChange} className="w-full border px-3 py-2 rounded" />
          <input type="password" name="password" placeholder="Mật khẩu" value={form.password} onChange={handleChange} className="w-full border px-3 py-2 rounded" />
          <select name="role" value={form.role} onChange={handleChange} className="w-full border px-3 py-2 rounded">
            {roles.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded w-full hover:bg-blue-700">Tạo người dùng</button>
        </form>
      </div>

      {/* Danh sách user */}
      <div className="w-full md:w-2/3 bg-white p-4 rounded shadow overflow-auto">
        <h2 className="text-lg font-semibold mb-4">Danh sách người dùng</h2>
        <div className="flex justify-between items-center mb-4">
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="border px-2 py-1 text-sm rounded">
            <option value="all">Tất cả</option>
            <option value="active">Đang hoạt động</option>
            <option value="disabled">Đã vô hiệu hoá</option>
          </select>
        </div>

        <table className="w-full border text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 border">Họ tên</th>
              <th className="p-2 border">Username</th>
              <th className="p-2 border">Email</th>
              <th className="p-2 border">Vai trò</th>
              <th className="p-2 border">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id} className={user.disabled ? "opacity-50 bg-gray-100" : ""}>
                <td className="p-2 border">{user.name}</td>
                <td className="p-2 border">{user.username}</td>
                <td className="p-2 border">{user.email}</td>
                <td className="p-2 border text-blue-600">{user.role}</td>
                <td className="p-2 border">
                  <button onClick={() => setEditingUser(user)} className="text-blue-600 hover:underline text-sm">Sửa</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingUser && (
        <UserEditPopup
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSave={handleSaveUser}
        />
      )}
    </div>
  );
};

export default UserPage;
