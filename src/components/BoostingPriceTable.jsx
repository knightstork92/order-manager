// BoostingPriceTable.jsx
import React, { useEffect, useState } from "react";
import { collection, query, where, getDocs, doc, updateDoc, addDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";

const BoostingPriceTable = ({ gameId, category }) => {
  const { currentUser } = useAuth();
  const [prices, setPrices] = useState([]);
  const [newItem, setNewItem] = useState({ name: "", price: "", note: "" });
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editedItem, setEditedItem] = useState({});

  const isAdmin = currentUser?.role === "admin";

  const fetchPrices = async () => {
    const q = query(
      collection(db, "boosting_prices"),
      where("gameId", "==", gameId),
      where("categoryId", "==", category.id)
    );
    const querySnapshot = await getDocs(q);
    const list = querySnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(item => isAdmin || item.active);
    setPrices(list);
  };

  useEffect(() => {
    fetchPrices();
  }, [gameId, category.id]);

  const handleAdd = async () => {
    if (!newItem.name || !newItem.price) return;
    await addDoc(collection(db, "boosting_prices"), {
      ...newItem,
      price: Number(newItem.price),
      gameId,
      categoryId: category.id,
      active: true,
    });
    setNewItem({ name: "", price: "", note: "" });
    fetchPrices();
  };

  const handleSaveEdit = async () => {
    await updateDoc(doc(db, "boosting_prices", editingId), {
      name: editedItem.name,
      price: Number(editedItem.price),
      note: editedItem.note,
      active: editedItem.active
    });
    setEditingId(null);
    setEditedItem({});
    fetchPrices();
  };

  const filteredPrices = prices.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Bảng giá: {category.name}</h2>

      <input
        type="text"
        placeholder="Tìm kiếm theo tên gói..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="border p-1 mb-4 w-full"
      />

      {isAdmin && (
        <div className="mb-4 p-4 border rounded">
          <h3 className="font-semibold mb-2">➕ Thêm gói mới</h3>
          <input
            type="text"
            placeholder="Tên gói"
            value={newItem.name}
            onChange={e => setNewItem({ ...newItem, name: e.target.value })}
            className="border p-1 mr-2 mb-2"
          />
          <input
            type="number"
            placeholder="Giá"
            value={newItem.price}
            onChange={e => setNewItem({ ...newItem, price: e.target.value })}
            className="border p-1 mr-2 mb-2"
          />
          <textarea
            placeholder="Ghi chú (có thể dán icon game)"
            value={newItem.note}
            onChange={e => setNewItem({ ...newItem, note: e.target.value })}
            className="border p-1 w-full mb-2"
            rows={2}
          />
          <button onClick={handleAdd} className="bg-blue-500 text-white px-3 py-1 rounded">
            Thêm
          </button>
        </div>
      )}

      <table className="w-full border">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-2 py-1 text-left">Tên gói</th>
            <th className="border px-2 py-1 text-right">Giá</th>
            <th className="border px-2 py-1">Ghi chú</th>
            {isAdmin && <th className="border px-2 py-1">Hành động</th>}
          </tr>
        </thead>
        <tbody>
          {filteredPrices.map((item) => (
            <tr key={item.id} className={!item.active ? "opacity-50" : ""}>
              {editingId === item.id ? (
                <>
                  <td className="border px-2 py-1">
                    <input
                      type="text"
                      value={editedItem.name}
                      onChange={e => setEditedItem({ ...editedItem, name: e.target.value })}
                      className="border p-1 w-full"
                    />
                  </td>
                  <td className="border px-2 py-1">
                    <input
                      type="number"
                      value={editedItem.price}
                      onChange={e => setEditedItem({ ...editedItem, price: e.target.value })}
                      className="border p-1 w-full text-right"
                    />
                  </td>
                  <td className="border px-2 py-1">
                    <textarea
                      value={editedItem.note}
                      onChange={e => setEditedItem({ ...editedItem, note: e.target.value })}
                      className="border p-1 w-full"
                      rows={2}
                    />
                    <label className="text-sm">
                      <input
                        type="checkbox"
                        checked={editedItem.active}
                        onChange={e => setEditedItem({ ...editedItem, active: e.target.checked })}
                        className="mr-2"
                      />
                      Hiển thị
                    </label>
                  </td>
                  <td className="border px-2 py-1 text-center">
                    <button onClick={handleSaveEdit} className="text-green-600 mr-2">💾</button>
                    <button onClick={() => setEditingId(null)} className="text-gray-500">❌</button>
                  </td>
                </>
              ) : (
                <>
                  <td className="border px-2 py-1">{item.name}</td>
                  <td className="border px-2 py-1 text-right">{item.price.toLocaleString()}đ</td>
                  <td className="border px-2 py-1">{item.note}</td>
                  {isAdmin && (
                    <td className="border px-2 py-1 text-center">
                      <button
                        onClick={() => {
                          setEditingId(item.id);
                          setEditedItem({ name: item.name, price: item.price, note: item.note, active: item.active });
                        }}
                        className="text-blue-500 hover:underline"
                      >
                        ✏️ Sửa
                      </button>
                    </td>
                  )}
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default BoostingPriceTable;
