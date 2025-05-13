import React, { useEffect, useState, useCallback } from "react";
import { collection, query, where, getDocs, addDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";

const BoostingPriceCard = ({ gameId, category }) => {
  const { currentUser } = useAuth();
  const [cards, setCards] = useState([]);
  const [newCard, setNewCard] = useState({
    title: "",
    price: "",
    description: "",
    imageUrl: "",
    videoUrls: ""
  });
  const [editingId, setEditingId] = useState(null);
  const [editedCard, setEditedCard] = useState({});
  const [search, setSearch] = useState("");

  const isAdmin = currentUser?.role === "admin";

  const fetchCards = useCallback(async () => {
    const q = query(
      collection(db, "boosting_prices"),
      where("gameId", "==", gameId),
      where("categoryId", "==", category.id)
    );
    const snapshot = await getDocs(q);
    const data = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(card => isAdmin || card.active);
    setCards(data);
  }, [gameId, category.id, isAdmin]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const handleAddCard = async () => {
    if (!newCard.title || !newCard.price) return;
    await addDoc(collection(db, "boosting_prices"), {
      ...newCard,
      price: Number(newCard.price),
      videoUrls: newCard.videoUrls
        .split("\n")
        .map((url) => url.trim())
        .filter((url) => url),
      gameId,
      categoryId: category.id,
      active: true,
    });
    setNewCard({ title: "", price: "", description: "", imageUrl: "", videoUrls: "" });
    fetchCards();
  };

  const handleSaveEdit = async () => {
    await updateDoc(doc(db, "boosting_prices", editingId), {
      title: editedCard.title,
      price: Number(editedCard.price),
      description: editedCard.description,
      imageUrl: editedCard.imageUrl,
      videoUrls: editedCard.videoUrls,
      active: editedCard.active
    });
    setEditingId(null);
    setEditedCard({});
    fetchCards();
  };

  const filteredCards = cards.filter(card =>
    card.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Gói dịch vụ: {category.name}</h2>

      <input
        type="text"
        placeholder="Tìm kiếm theo tiêu đề..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="border p-1 mb-4 w-full"
      />

      {isAdmin && editingId === null && (
        <div className="mb-6 p-4 border rounded">
          <h3 className="font-semibold mb-2">➕ Thêm gói mới</h3>
          <input type="text" placeholder="Tên gói" value={newCard.title} onChange={(e) => setNewCard({ ...newCard, title: e.target.value })} className="border p-1 mr-2 mb-2" />
          <input type="number" placeholder="Giá" value={newCard.price} onChange={(e) => setNewCard({ ...newCard, price: e.target.value })} className="border p-1 mr-2 mb-2" />
          <input type="text" placeholder="Hình ảnh URL" value={newCard.imageUrl} onChange={(e) => setNewCard({ ...newCard, imageUrl: e.target.value })} className="border p-1 mr-2 mb-2" />
          <textarea placeholder="Mô tả (có thể dán icon game)" value={newCard.description} onChange={(e) => setNewCard({ ...newCard, description: e.target.value })} className="border p-1 w-full mb-2" rows={2} />
          <textarea placeholder="Danh sách video demo (1 dòng 1 link)" value={newCard.videoUrls} onChange={(e) => setNewCard({ ...newCard, videoUrls: e.target.value })} className="border p-1 w-full mb-2" rows={3} />
          <button onClick={handleAddCard} className="bg-blue-500 text-white px-3 py-1 rounded">Thêm</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCards.map((card) => (
          <div key={card.id} className="border rounded p-4 shadow hover:shadow-lg transition">
            {editingId === card.id ? (
              <div>
                <input type="text" value={editedCard.title} onChange={(e) => setEditedCard({ ...editedCard, title: e.target.value })} className="border p-1 w-full mb-2" />
                <input type="number" value={editedCard.price} onChange={(e) => setEditedCard({ ...editedCard, price: e.target.value })} className="border p-1 w-full mb-2" />
                <input type="text" value={editedCard.imageUrl} onChange={(e) => setEditedCard({ ...editedCard, imageUrl: e.target.value })} className="border p-1 w-full mb-2" />
                <textarea value={editedCard.description} onChange={(e) => setEditedCard({ ...editedCard, description: e.target.value })} className="border p-1 w-full mb-2" />
                <textarea value={editedCard.videoUrls?.join("\n") || ""} onChange={(e) => setEditedCard({ ...editedCard, videoUrls: e.target.value.split("\n") })} className="border p-1 w-full mb-2" />
                <label className="block text-sm mb-2">
                  <input type="checkbox" checked={editedCard.active} onChange={(e) => setEditedCard({ ...editedCard, active: e.target.checked })} className="mr-2" />
                  Hiển thị
                </label>
                <div className="flex gap-2">
                  <button onClick={handleSaveEdit} className="text-green-600">💾 Lưu</button>
                  <button onClick={() => setEditingId(null)} className="text-gray-500">❌ Hủy</button>
                </div>
              </div>
            ) : (
              <>
                {card.imageUrl && <img src={card.imageUrl} alt={card.title} className="w-full h-40 object-cover mb-2 rounded" />}
                <h4 className="text-lg font-semibold mb-1">{card.title}</h4>
                <p className="text-blue-600 font-bold mb-1">{card.price.toLocaleString()}đ</p>
                <p className="text-sm text-gray-700 mb-2">{card.description}</p>
                {card.videoUrls?.length > 0 && (
                  <details className="mb-2">
                    <summary className="cursor-pointer text-sm text-blue-500">🎬 Xem video demo</summary>
                    <ul className="list-disc ml-4 text-sm">
                      {card.videoUrls.map((url, idx) => (
                        <li key={idx}>
                          <a href={url} target="_blank" rel="noreferrer" className="text-blue-600 underline">
                            Video {idx + 1}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
                {isAdmin && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingId(card.id);
                        setEditedCard({
                          title: card.title,
                          price: card.price,
                          description: card.description,
                          imageUrl: card.imageUrl,
                          videoUrls: card.videoUrls || [],
                          active: card.active
                        });
                      }}
                      className="text-blue-500 hover:underline"
                    >✏️ Sửa</button>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default BoostingPriceCard;
