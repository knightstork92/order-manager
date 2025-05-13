// components/BoostingCategoryList.jsx
import React, { useState } from "react";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "../firebase";

const BoostingCategoryList = ({ categories = [], selectedGame }) => {
  const [form, setForm] = useState({ name: "", type: "basic" });
  const [editing, setEditing] = useState(null);

  const handleAdd = async () => {
    if (!form.name || !selectedGame?.id) return;
    const docRef = await addDoc(collection(db, "boosting_categories"), {
      ...form,
      gameId: selectedGame.id,
      active: true,
    });
    await updateDoc(docRef, { id: docRef.id });
    setForm({ name: "", type: "basic" });
  };

  const handleUpdate = async () => {
    if (!editing?.id || !editing.name) return;
    await updateDoc(doc(db, "boosting_categories", editing.id), {
      name: editing.name,
      type: editing.type,
      active: editing.active,
    });
    setEditing(null);
  };

  const filtered = categories;

  return (
    <div>
      <h4 className="font-semibold mb-2">📌 Danh mục boosting</h4>

      <div className="flex gap-2 mb-3">
        <input
          type="text"
          placeholder="Tên danh mục"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="border px-2 py-1 rounded w-1/2"
        />
        <select
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
          className="border px-2 py-1 rounded"
        >
          <option value="basic">Chung</option>
          <option value="build">Build</option>
        </select>
        <button
          onClick={handleAdd}
          className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
        >
          + Thêm
        </button>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-500">Chưa có danh mục boosting</p>
      ) : (
        <ul className="mt-2 space-y-1">
          {filtered.map((cat) => (
            <li
              key={cat.id}
              className="border rounded px-3 py-2 flex justify-between items-center"
            >
              <span>
                📌 {cat.name} <span className="text-xs text-gray-500">({cat.type})</span>
              </span>
              <div className="space-x-2 text-sm">
                <button
                  onClick={() => setEditing({ ...cat })}
                  className="text-blue-600 hover:underline"
                >
                  Sửa
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
          <div className="bg-white p-4 rounded-lg w-full max-w-sm shadow relative">
            <button
              onClick={() => setEditing(null)}
              className="absolute top-2 right-4 text-gray-400 hover:text-black text-2xl"
            >
              &times;
            </button>
            <h3 className="text-lg font-semibold mb-3">Chỉnh sửa danh mục</h3>
            <input
              type="text"
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              className="w-full border px-3 py-2 rounded mb-2"
            />
            <select
              value={editing.type}
              onChange={(e) => setEditing({ ...editing, type: e.target.value })}
              className="w-full border px-3 py-2 rounded mb-2"
            >
              <option value="basic">Chung</option>
              <option value="build">Build</option>
            </select>
            <label className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                checked={editing.active !== false}
                onChange={(e) => setEditing({ ...editing, active: e.target.checked })}
              />
              Hiển thị danh mục này
            </label>
            <button
              onClick={handleUpdate}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full"
            >
              Lưu thay đổi
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BoostingCategoryList;
