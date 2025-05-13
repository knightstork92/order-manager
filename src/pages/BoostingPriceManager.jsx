// BoostingPriceManager.jsx
import React, { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import BoostingPriceTable from "../components/BoostingPriceTable";
import BoostingPriceCard from "../components/BoostingPriceCard";

const BoostingPriceManager = () => {
  const [games, setGames] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedGameId, setSelectedGameId] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Fetch games with boosting = true
  useEffect(() => {
    const fetchGames = async () => {
      const q = query(collection(db, "games"), where("boosting", "==", true));
      const querySnapshot = await getDocs(q);
      const gameList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setGames(gameList);
    };
    fetchGames();
  }, []);

  // Fetch boosting categories with active = true
  useEffect(() => {
    const fetchCategories = async () => {
      const q = query(collection(db, "boosting_categories"), where("active", "==", true));
      const querySnapshot = await getDocs(q);
      const categoryList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCategories(categoryList);
    };
    fetchCategories();
  }, []);

  const handleCategorySelect = (gameId, category) => {
    setSelectedGameId(gameId);
    setSelectedCategory(category);
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar Menu */}
      <div className="w-64 border-r p-4 overflow-y-auto">
        {games.map(game => (
          <div key={game.id} className="mb-4">
            <div className="font-bold mb-1">{game.name}</div>
            {categories.filter(cat => cat.gameId === game.id).map(category => (
              <button
                key={category.id}
                onClick={() => handleCategorySelect(game.id, category)}
                className={`block w-full text-left px-3 py-1 mb-1 border rounded hover:bg-gray-200 ${
                  selectedCategory?.id === category.id ? "bg-blue-100" : ""
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 overflow-y-auto">
        {selectedCategory ? (
          selectedCategory.type === "table" ? (
            <BoostingPriceTable gameId={selectedGameId} category={selectedCategory} />
          ) : (
            <BoostingPriceCard gameId={selectedGameId} category={selectedCategory} />
          )
        ) : (
          <p>Chọn một danh mục để xem bảng giá.</p>
        )}
      </div>
    </div>
  );
};

export default BoostingPriceManager;
