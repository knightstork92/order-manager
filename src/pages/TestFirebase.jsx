// TestFirebase.jsx
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";

export default function TestFirebase() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const snap = await getDocs(collection(db, "orders"));
        const data = snap.docs.map(doc => doc.data());
        setOrders(data);
        console.log("✅ Lấy dữ liệu thành công:", data);
      } catch (err) {
        console.error("❌ Lỗi khi lấy dữ liệu Firebase:", err);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="p-4">
      <h1>🔥 Test Firebase</h1>
      <p>Số đơn hàng: {orders.length}</p>
    </div>
  );
}
