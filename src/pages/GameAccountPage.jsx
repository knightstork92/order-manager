// GameAccountPage.jsx - UI quản lý tài khoản game
import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase";

const GameAccountPage = () => {
  const [games, setGames] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [selectedGame, setSelectedGame] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ id: null, title: "", game: "", username: "", password: "", email: "", emailPass: "", notes: "" });

  const fetchGames = async () => {
    const snapshot = await getDocs(collection(db, "games"));
    const list = snapshot.docs.map(doc => doc.data().name).filter(name => name && name.trim() !== "");
    setGames(list);
  };



  const fetchAccounts = async () => {
    const snapshot = await getDocs(collection(db, "game_accounts"));
    const list = snapshot.docs.map(doc => {
	  const data = doc.data();
	  return { ...data, id: data.id || doc.id };
	});
    setAccounts(list);
  };

  useEffect(() => {
	
    fetchGames();
    fetchAccounts();
  }, []);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
  };

  const handleSubmit = async () => {
    try {
      if (form.id) {
        await updateDoc(doc(db, "game_accounts", form.id), form);
      } else {
        const docRef = await addDoc(collection(db, "game_accounts"), form);
        await updateDoc(docRef, { id: docRef.id });
      }
      await fetchAccounts();
      setShowForm(false);
    } catch (err) {
      alert("Lỗi khi lưu: " + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn xoá tài khoản này?")) return;
    try {
      await deleteDoc(doc(db, "game_accounts", id));
      await fetchAccounts();
    } catch (err) {
      alert("Lỗi khi xoá: " + err.message);
    }
  };

  const filtered = accounts
    .filter(acc => selectedGame ? acc.game === selectedGame : true)
    .filter(acc => {
      const q = search.toLowerCase();
      return (
        acc.title?.toLowerCase().includes(q) ||
        acc.username?.toLowerCase().includes(q) ||
        acc.notes?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => a.game.localeCompare(b.game));

  const handleEdit = (acc) => {
    setForm({
      id: acc.id || null,
      title: acc.title || "",
      game: acc.game || "",
      username: acc.username || "",
      password: acc.password || "",
      email: acc.email || "",
      emailPass: acc.emailPass || "",
      notes: acc.notes || ""
    });
    setShowForm(true);
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">🎮 Quản lý tài khoản game</h2>
        <button onClick={() => { setForm({ id: null, title: "", game: "", username: "", password: "", email: "", emailPass: "", notes: "" }); setShowForm(true); }} className="bg-blue-600 text-white px-4 py-2 rounded">+ Thêm tài khoản</button>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <select value={selectedGame} onChange={(e) => setSelectedGame(e.target.value)} className="border px-3 py-1 rounded">
          <option value="">Tất cả game</option>
          {games.map((game, i) => (
            <option key={i} value={game}>{game}</option>
          ))}
        </select>
        <input type="text" placeholder="Tìm kiếm tài khoản..." value={search} onChange={(e) => setSearch(e.target.value)} className="border px-3 py-1 rounded w-60" />
      </div>

      <table className="w-full text-sm border">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 border">Game</th>
            <th className="p-2 border">Tên</th>
            <th className="p-2 border">User</th>
            <th className="p-2 border">Mật khẩu</th>
            <th className="p-2 border">Email</th>
            <th className="p-2 border">Email Pass</th>
            <th className="p-2 border">Ghi chú</th>
            <th className="p-2 border">Sửa</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((acc) => (
            <tr key={acc.id} className="border-b">
              <td className="p-2 border">{acc.game}</td>
              <td className="p-2 border font-medium">{acc.title}</td>
              <td className="p-2 border">{acc.username} <button onClick={() => handleCopy(acc.username)} className="ml-1 text-blue-500 hover:underline text-xs">📋</button></td>
              <td className="p-2 border">{acc.password} <button onClick={() => handleCopy(acc.password)} className="ml-1 text-blue-500 hover:underline text-xs">📋</button></td>
              <td className="p-2 border text-xs">{acc.email} <button onClick={() => handleCopy(acc.email)} className="ml-1 text-blue-500 hover:underline text-xs">📋</button></td>
              <td className="p-2 border text-xs">{acc.emailPass} <button onClick={() => handleCopy(acc.emailPass)} className="ml-1 text-blue-500 hover:underline text-xs">📋</button></td>
              <td className="p-2 border text-xs">{acc.notes}</td>
              <td className="p-2 border text-center space-x-2">
                <button onClick={() => handleEdit(acc)} className="text-blue-600 text-sm hover:underline">✏️</button>
                <button onClick={() => handleDelete(acc.id)} className="text-red-500 text-sm hover:underline">🗑</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showForm && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-full max-w-lg space-y-3 relative overflow-y-auto max-h-[90vh]">
            <button onClick={() => setShowForm(false)} className="absolute top-2 right-4 text-xl">&times;</button>
            <h3 className="text-lg font-semibold mb-2">{form.id ? "Cập nhật" : "Thêm"} tài khoản</h3>
            <select value={form.game} onChange={(e) => setForm({ ...form, game: e.target.value })} className="w-full border px-3 py-2 rounded">
              <option value="">-- Chọn game --</option>
              {games.map((g, i) => (
                <option key={i} value={g}>{g}</option>
              ))}
            </select>
            <input type="text" placeholder="Tên tài khoản" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full border px-3 py-2 rounded" />
            <input type="text" placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="w-full border px-3 py-2 rounded" />
            <input type="text" placeholder="Mật khẩu" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full border px-3 py-2 rounded" />
            <input type="text" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full border px-3 py-2 rounded" />
            <input type="text" placeholder="Mật khẩu Email" value={form.emailPass} onChange={(e) => setForm({ ...form, emailPass: e.target.value })} className="w-full border px-3 py-2 rounded" />
            <textarea rows={2} placeholder="Ghi chú" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full border px-3 py-2 rounded" />
            <button onClick={handleSubmit} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Lưu</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameAccountPage;
