// OrderPage.jsx - giao diện bảng cải tiến và giữ toàn bộ logic của bạn
import { useState, useEffect, useRef } from "react";
import OrderForm from "../components/OrderForm";
import EditOrderForm from "../components/EditOrderForm";
import { useAuth } from "../contexts/AuthContext";
import { useMemo } from "react";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  arrayUnion,
  orderBy,
  arrayRemove,
} from "firebase/firestore";
import { db } from "../firebase";

const ITEMS_PER_PAGE = 10;

const OrderPage = () => {
  
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === "admin";
  const isEmployee = currentUser?.role === "employee";
  const isPartner = currentUser?.role === "partner";

  const [orders, setOrders] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [editingOrder, setEditingOrder] = useState(null);
  const ordersRef = collection(db, "orders");
  const notificationsRef = collection(db, "notifications");
  const [statusFilter, setStatusFilter] = useState("all"); // ✅ Thêm dòng này

const fetchOrders = async () => {
  const snapshot = await getDocs(ordersRef);
  const data = snapshot.docs.map((docSnap) => {
    const raw = docSnap.data();
    const createdAt = raw.createdAt?.seconds
      ? new Date(raw.createdAt.seconds * 1000)
      : new Date(raw.createdAt);
    return { id: docSnap.id, ...raw, createdAt };
  });

  // Sắp xếp theo mã đơn giảm dần (mới nhất trước)
  data.sort((a, b) => b.code.localeCompare(a.code));

  setOrders(data);
};

  const [userInteracted, setUserInteracted] = useState(false);


	useEffect(() => {
	  fetchOrders();
	}, []);



  const handleUpdateOrder = async (updatedOrder) => {
    if (!updatedOrder.id) return alert("Không tìm thấy ID đơn hàng.");
    const ref = doc(db, "orders", updatedOrder.id);
    const oldOrder = orders.find((o) => o.id === updatedOrder.id);
    const justCompleted = !oldOrder?.videoEnd && updatedOrder.videoEnd;

    await updateDoc(ref, updatedOrder);
    await fetchOrders();
    setEditingOrder(null);

    if (justCompleted) {
      await addDoc(notificationsRef, {
        message: `Đơn hàng ${updatedOrder.code} đã hoàn thành.`,
        orderId: updatedOrder.id,
        partner: updatedOrder.partner || "",
        readBy: [],
        timestamp: serverTimestamp(),
      });
    }
  };

  const handleDeleteOrder = async (id) => {
    try {
      if (!id) throw new Error("Không tìm thấy ID đơn hàng.");
      await deleteDoc(doc(db, "orders", id));
      fetchOrders();
      setEditingOrder(null);
    } catch (err) {
      alert("Lỗi khi xoá đơn hàng: " + err.message);
    }
  };

  const handleClaimOrder = async (orderId) => {
    const docRef = doc(db, "orders", orderId);
    try {
      await updateDoc(docRef, {
        workers: arrayUnion({
          uid: currentUser.uid,
          name: currentUser.name || currentUser.email,
        }),
      });
      fetchOrders();
    } catch (err) {
      alert("Lỗi khi nhận đơn: " + err.message);
    }
  };

  const handleUnclaimOrder = async (orderId) => {
    const docRef = doc(db, "orders", orderId);
    try {
      await updateDoc(docRef, {
        workers: arrayRemove({
          uid: currentUser.uid,
          name: currentUser.name || currentUser.email,
        }),
      });
      fetchOrders();
    } catch (err) {
      alert("Lỗi khi bỏ đơn: " + err.message);
    }
  };

  const formatDuration = (minutes) => {
    if (!minutes) return "";
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
  };

  const formatStatus = (status) => {
    const base = "inline-block px-2 py-0.5 rounded-full text-xs font-medium leading-tight";
    switch (status) {
      case "In Progress": return <span className={`${base} bg-yellow-100 text-yellow-800`}>🟡 In Progress</span>;
      case "Completed": return <span className={`${base} bg-green-100 text-green-800`}>✅ Completed</span>;
      case "Done - Payed": return <span className={`${base} bg-blue-100 text-blue-800`}>💰 Done - Payed</span>;
      case "Completed-Verify": return <span className={`${base} bg-purple-100 text-purple-800`}>👁️ Completed-Verify</span>;
      default: return <span className={`${base} bg-gray-100 text-gray-600`}>{status}</span>;
    }
  };

  const now = new Date();
const filteredOrders = useMemo(() => {
  const q = search.toLowerCase();

  return orders.filter((order) => {
    const matches =
      String(order.code || "").toLowerCase().includes(q) ||
      String(order.product || "").toLowerCase().includes(q) ||
      String(order.note || "").toLowerCase().includes(q) ||
      String(order.partner || "").toLowerCase().includes(q);

    let createdAt = order.createdAt;
    if (createdAt?.seconds) createdAt = new Date(createdAt.seconds * 1000);
    else createdAt = new Date(createdAt);

    const now = new Date();

    const matchDate = (() => {
      if (filter === "today") {
        return createdAt.toDateString() === now.toDateString();
      }
      if (filter === "thisWeek") {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        weekStart.setHours(0, 0, 0, 0);
        return createdAt >= weekStart;
      }
      if (filter === "thisMonth") {
        return (
          createdAt.getMonth() === now.getMonth() &&
          createdAt.getFullYear() === now.getFullYear()
        );
      }
      if (filter === "custom") {
        if (!fromDate || !toDate) return true;
        const from = new Date(fromDate);
        const to = new Date(toDate);
        from.setHours(0, 0, 0, 0);
        to.setHours(23, 59, 59, 999);
        return createdAt >= from && createdAt <= to;
      }
      return true;
    })();

    const matchStatus = statusFilter === "all" || order.status === statusFilter;
    const matchRole =
      isAdmin || isEmployee || order.partner === currentUser.username;

    return matches && matchDate && matchStatus && matchRole;
  });
}, [orders, search, filter, fromDate, toDate, statusFilter, isAdmin, isEmployee, currentUser]);


  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const getRowClass = (status) => {
    switch (status) {
      case "In Progress": return "bg-yellow-100";
      case "Completed": return "bg-green-100";
      case "Done - Payed": return "bg-blue-100";
      case "Completed-Verify": return "bg-purple-100";
      default: return "";
    }
  };

  return (
    <>
<div className="flex flex-col md:flex-row gap-6">
      

      <div className="w-full md:w-8/10 bg-white p-4 rounded shadow overflow-auto">
        <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
          <div>
            <h2 className="text-lg font-semibold">Danh sách đơn hàng</h2>
            <p className="text-sm text-gray-600">
                Tổng đơn: {filteredOrders.length} |
                🟡 In Progress: {filteredOrders.filter(o => o.status === "In Progress").length} |
                ✅ Completed: {filteredOrders.filter(o => o.status === "Completed").length} |
                💰 Payed: {filteredOrders.filter(o => o.status === "Done - Payed").length} |
                👁️ Verify: {filteredOrders.filter(o => o.status === "Completed-Verify").length}
              </p>
			  {currentUser?.role === "admin" && (
                <>
                  <p className="text-sm text-gray-600 mt-1">
                    Tổng tiền: {filteredOrders.reduce((sum, o) => sum + Number(o.price || 0), 0).toLocaleString()} đ
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    💰 Đã thanh toán:{" "}
                    {filteredOrders.filter(o => o.status === "Done - Payed")
                      .reduce((sum, o) => sum + Number(o.price || 0), 0).toLocaleString()} đ |
                    ✅ Đã hoàn thành:{" "}
                    {filteredOrders.filter(o => o.status === "Completed" || o.status === "Completed-Verify")
                      .reduce((sum, o) => sum + Number(o.price || 0), 0).toLocaleString()} đ
                  </p>
                </>
              )}
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <input type="text" placeholder="Tìm kiếm..." value={search} onChange={(e) => setSearch(e.target.value)} className="border px-2 py-1 rounded text-sm" />
			<select
			  value={statusFilter}
			  onChange={(e) => setStatusFilter(e.target.value)}
			  className="border px-2 py-1 rounded text-sm"
			>
			  <option value="all">Tất cả trạng thái</option>
			  <option value="In Progress">🟡 In Progress</option>
			  <option value="Completed">✅ Completed</option>
			  <option value="Done - Payed">💰 Done - Payed</option>
			  <option value="Completed-Verify">👁️ Completed-Verify</option>
			</select>
            <select value={filter} onChange={(e) => setFilter(e.target.value)} className="border px-2 py-1 rounded text-sm">
              <option value="all">Tất cả</option>
              <option value="today">Hôm nay</option>
              <option value="thisWeek">Tuần này</option>
              <option value="thisMonth">Tháng này</option>
              <option value="custom">Tùy chọn</option>
            </select>
            {filter === "custom" && (
              <>
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="border px-2 py-1 rounded text-sm" />
                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="border px-2 py-1 rounded text-sm" />
              </>
            )}
          </div>
        </div>

        <table className="w-full text-sm border border-gray-200">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="p-2 border">Mã đơn</th>
              <th className="p-2 border">Tên đơn</th>
              <th className="p-2 border">Giá</th>
              <th className="p-2 border">Note</th>
              <th className="p-2 border">Video</th>
              <th className="p-2 border">Đối tác</th>
              <th className="p-2 border">Người tạo</th>
              <th className="p-2 border w-[120px] whitespace-nowrap">Trạng thái</th>
              <th className="p-2 border">Thời gian</th>
              <th className="p-2 border">Người thực hiện</th>
              <th className="p-2 border">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {paginatedOrders.map((order) => {
              const createdAt = new Date(order.createdAt);
              const hasClaimed = order.workers?.some(w => w.uid === currentUser.uid);
              const canClaim = (isAdmin || isEmployee) && order.status === "In Progress";
              return (
                <tr key={order.id} className={`hover:bg-gray-50 ${getRowClass(order.status)}`}>
                  <td className="p-2 border font-medium">{order.code}</td>
                  <td className="p-2 border">{order.product}</td>
                  <td className="p-2 border">{Number(order.price).toLocaleString()} đ</td>
                  <td className="p-2 border">{order.note}</td>
                  <td className="p-2 border text-xs">
                    {order.videoStart && (<a href={order.videoStart} target="_blank" rel="noreferrer" className="text-blue-500 underline block">▶ Bắt đầu</a>)}
                    {order.videoEnd && (<a href={order.videoEnd} target="_blank" rel="noreferrer" className="text-green-600 underline block">✅ Hoàn thành</a>)}
					{order.extraVideos?.length > 0 && (
					  <div className="text-xs text-purple-600 mt-1">
						📎 {order.extraVideos.length} video bổ sung
					  </div>
					)}
                  </td>
                  <td className="p-2 border">{order.partner}</td>
                  <td className="p-2 border">{order.createdBy}</td>
                  <td className="p-2 border">{formatStatus(order.status)}</td>
                  <td className="p-2 border text-xs text-gray-600">{order.duration && <div>🕒 {formatDuration(order.duration)}</div>}</td>
                  <td className="p-2 border text-xs">
                    👥 {order.workers?.length || 0} người
                    {order.workers?.length > 0 && (
                      <div title={order.workers.map(w => w.name).join(", ")} className="inline-block ml-1 cursor-pointer text-blue-400">ℹ️</div>
                    )}
                  </td>
                  <td className="p-2 border text-xs space-y-1">
                    {canClaim && (
                      <button onClick={() => hasClaimed ? handleUnclaimOrder(order.id) : handleClaimOrder(order.id)} className={`px-2 py-1 rounded block w-full text-white ${hasClaimed ? "bg-gray-600 hover:bg-gray-700" : "bg-green-600 hover:bg-green-700"}`}>{hasClaimed ? "Bỏ đơn" : "Nhận đơn"}</button>
                    )}
                    <button onClick={() => setEditingOrder(order)} className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded w-full">Sửa</button>
					{(isPartner && order.status === "Completed") && (
					  <button
						onClick={() => handleUpdateOrder({ ...order, status: "Completed-Verify" })}
						className="px-2 py-1 rounded block w-full bg-purple-600 hover:bg-purple-700 text-white"
					  >
						Xác nhận proof
					  </button>
					)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="flex justify-between items-center mt-4">
          <span className="text-sm text-gray-500">Trang {currentPage}/{totalPages}</span>
          <div className="space-x-2">
            <button onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1} className="px-2 py-1 border rounded text-sm">← Trước</button>
            <button onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === totalPages} className="px-2 py-1 border rounded text-sm">Tiếp →</button>
          </div>
        </div>
      </div>

      {editingOrder && (
		  <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center">
			<div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 rounded-lg relative">
			  <button
				onClick={() => setEditingOrder(null)}
				className="absolute top-2 right-4 text-gray-400 hover:text-black text-2xl"
			  >
				&times;
			  </button>
			  <EditOrderForm
				initialData={editingOrder}
				onSubmit={handleUpdateOrder}
				onDelete={handleDeleteOrder}
				currentUser={currentUser}
			  />
			</div>
		  </div>
		)}

    </div>
    </>
  );
};
export default OrderPage;