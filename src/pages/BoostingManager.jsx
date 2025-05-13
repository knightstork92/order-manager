// BoostingManager.jsx - Quản lý Game & Danh mục Boosting
import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import BoostingCategoryList from "../components/BoostingCategoryList";

const BoostingManager = () => {
  const [games, setGames] = useState([]);
  const [selectedGame, setSelectedGame] = useState(null);
  const [newGame, setNewGame] = useState({ name: "", boosting: false });
  const [search, setSearch] = useState("");
  const [editingGame, setEditingGame] = useState(null);
  const [categories, setCategories] = useState([]);

  const fetchGames = async () => {
    const snapshot = await getDocs(collection(db, "games"));
    const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setGames(list);

    if (!selectedGame && list.length > 0) {
      setSelectedGame(list[0]);
    }
  };

  const fetchCategories = async (gameId) => {
    if (!gameId) return;
    const q = query(collection(db, "boosting_categories"), where("gameId", "==", gameId));
    const snapshot = await getDocs(q);
    const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setCategories(list);
  };

  useEffect(() => {
    fetchGames();
  }, []);

  useEffect(() => {
    if (selectedGame?.id) {
      fetchCategories(selectedGame.id);
    }
  }, [selectedGame]);

  const handleAddGame = async () => {
    if (!newGame.name.trim()) return;
    const docRef = await addDoc(collection(db, "games"), {
      name: newGame.name.trim(),
      boosting: newGame.boosting,
    });
    await updateDoc(docRef, { id: docRef.id });
    setNewGame({ name: "", boosting: false });
    fetchGames();
  };

  const handleUpdateGame = async () => {
    if (!editingGame || !editingGame.name.trim()) return;
    await updateDoc(doc(db, "games", editingGame.id), {
      name: editingGame.name.trim(),
      boosting: editingGame.boosting,
    });
    setEditingGame(null);
    fetchGames();
  };

  const handleDisableGame = async (game) => {
    const confirm = window.confirm("Bạn có chắc muốn ẩn game này không?");
    if (!confirm) return;
    await updateDoc(doc(db, "games", game.id), { boosting: false });
    fetchGames();
  };

  const filteredGames = games.filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">🎮 Quản lý Game & Danh mục Boosting</h2>

      <div className="flex gap-4 mb-4 items-end">
        <div>
          <label className="block text-sm font-medium">Tên game</label>
          <input
            type="text"
            value={newGame.name}
            onChange={(e) => setNewGame({ ...newGame, name: e.target.value })}
            placeholder="Tên game"
            className="border px-3 py-1 rounded w-48"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={newGame.boosting}
            onChange={(e) => setNewGame({ ...newGame, boosting: e.target.checked })}
          />
          <label className="text-sm">Có boosting</label>
        </div>
        <button
          onClick={handleAddGame}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          + Thêm game
        </button>
      </div>

      <div className="flex gap-8">
        <div className="w-64">
          <h4 className="font-semibold mb-2">🎮 Danh sách Game</h4>
          <input
            type="text"
            placeholder="Tìm game..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full mb-2 border px-2 py-1 rounded"
          />
          <ul className="border rounded divide-y">
            {filteredGames.map((g) => (
              <li
                key={g.id}
                onClick={() => setSelectedGame(g)}
                className={`cursor-pointer px-3 py-2 hover:bg-gray-100 ${
                  selectedGame?.id === g.id ? "bg-blue-100" : ""
                }`}
              >
                <div className="flex justify-between items-center">
                  <span>{g.name}</span>
                  <div className="space-x-2 text-xs">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingGame({ ...g });
                      }}
                      className="text-blue-600 hover:underline"
                    >
                      Sửa
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDisableGame(g);
                      }}
                      className="text-red-600 hover:underline"
                    >
                      Ẩn
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex-1">
          <BoostingCategoryList categories={categories} />
        </div>
      </div>

      {editingGame && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
          <div className="bg-white p-4 rounded-lg w-full max-w-md shadow relative">
            <button
              onClick={() => setEditingGame(null)}
              className="absolute top-2 right-4 text-gray-400 hover:text-black text-2xl"
            >
              &times;
            </button>
            <h3 className="text-lg font-semibold mb-4">Chỉnh sửa Game</h3>
            <input
              type="text"
              value={editingGame.name}
              onChange={(e) => setEditingGame({ ...editingGame, name: e.target.value })}
              className="w-full border px-3 py-2 rounded mb-2"
            />
            <label className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                checked={editingGame.boosting}
                onChange={(e) => setEditingGame({ ...editingGame, boosting: e.target.checked })}
              />
              Có boosting
            </label>
            <button
              onClick={handleUpdateGame}
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

export default BoostingManager;
