// OrderPage.jsx - giao diện bảng cải tiến và giữ toàn bộ logic của bạn
import { useState, useEffect, useRef } from "react";
import OrderForm from "../components/OrderForm";
import EditOrderForm from "../components/EditOrderForm";
import { useAuth } from "../contexts/AuthContext";

import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  query,         
  orderBy,       
  limit,         
  startAfter,  
  where,
  getCountFromServer 
} from "firebase/firestore";

import { db } from "../firebase";

const ITEMS_PER_PAGE = 10;

const OrderPage = () => {
  const [timeFilter, setTimeFilter] = useState("thisMonth");
  const [statusFilter, setStatusFilter] = useState("all");
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === "admin";
  const isEmployee = currentUser?.role === "employee";
  const isPartner = currentUser?.role === "partner";

  const [orders, setOrders] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchField, setSearchField] = useState("code");
 
  const [filter, setFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [editingOrder, setEditingOrder] = useState(null);
  const [lastVisibleDocs, setLastVisibleDocs] = useState([]);	
  const ordersRef = collection(db, "orders");
  const notificationsRef = collection(db, "notifications");
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
  const [inputPage, setInputPage] = useState(currentPage);
  


const fetchOrders = async () => {
  let filters = [orderBy("code", "desc")];

  // Lọc theo vai trò
  if (!isAdmin && !isEmployee && currentUser?.username) {
    filters.push(where("partner", "==", currentUser.username));
  }

  // Lọc theo trạng thái
  if (statusFilter !== "all") {
    filters.push(where("status", "==", statusFilter));
  }

  // Lọc theo thời gian
  const now = new Date();
  if (timeFilter === "today") {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(); end.setHours(23, 59, 59, 999);
    filters.push(where("createdAt", ">=", start));
    filters.push(where("createdAt", "<=", end));
  } else if (timeFilter === "thisWeek") {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    filters.push(where("createdAt", ">=", weekStart));
  } else if (timeFilter === "thisMonth") {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    filters.push(where("createdAt", ">=", monthStart));
  } else if (timeFilter === "custom" && fromDate && toDate) {
    const start = new Date(fromDate);
    const end = new Date(toDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    filters.push(where("createdAt", ">=", start));
    filters.push(where("createdAt", "<=", end));
  }

  // Tìm kiếm theo `code`
  if (search.trim() !== "") {
    filters.push(where("code", ">=", search));
    filters.push(where("code", "<=", search + "\uf8ff"));
  }

  // 👇 Đếm tổng dòng với cùng điều kiện
  const countSnap = await getCountFromServer(query(ordersRef, ...filters));
  setTotalCount(countSnap.data().count);

  // 👇 Thêm phân trang
  filters.push(limit(ITEMS_PER_PAGE));
  if (currentPage > 1 && lastVisibleDocs[currentPage - 2]) {
    filters.push(startAfter(lastVisibleDocs[currentPage - 2]));
  }

  const snapshot = await getDocs(query(ordersRef, ...filters));

  const data = snapshot.docs.map((docSnap) => {
    const raw = docSnap.data();
    const createdAt = raw.createdAt?.seconds
      ? new Date(raw.createdAt.seconds * 1000)
      : new Date(raw.createdAt);
    return { id: docSnap.id, ...raw, createdAt };
  });

  setOrders(data);
  if (snapshot.docs.length > 0) {
    const updated = [...lastVisibleDocs];
    updated[currentPage - 1] = snapshot.docs[snapshot.docs.length - 1];
    setLastVisibleDocs(updated);
  }
};

useEffect(() => {
  fetchOrders();
  
}, [currentPage, search, statusFilter, timeFilter, fromDate, toDate]);
useEffect(() => {
  setInputPage(currentPage);
}, [currentPage]);
const handleAddOrder = async (order) => {
		const now = new Date();
		const newOrder = {
		  ...order,
		  createdAt: now,
		  createdBy: currentUser.name,
		  status: order.videoEnd ? "Done" : "In Progress",
		};

		try {
		  const docRef = await addDoc(ordersRef, newOrder);
		  await updateDoc(docRef, { id: docRef.id });
		  fetchOrders();
		} catch (err) {
		  alert("Lỗi khi thêm đơn hàng: " + err.message);
		}
	  };

	  const handleUpdateOrder = async (updatedOrder) => {
		if (!updatedOrder.id) return alert("Không tìm thấy ID đơn hàng.");
		const ref = doc(db, "orders", updatedOrder.id);
		const oldOrder = orders.find((o) => o.id === updatedOrder.id);
		const justCompleted = !oldOrder?.videoEnd && updatedOrder.videoEnd;

		await updateDoc(ref, updatedOrder);
		fetchOrders();
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
      case "In Progress":
        return <span className={`${base} bg-yellow-100 text-yellow-800`}>🟡 In Progress</span>;
      case "Completed":
        return <span className={`${base} bg-green-100 text-green-800`}>✅ Completed</span>;
      case "Done - Payed":
        return <span className={`${base} bg-blue-100 text-blue-800`}>💰 Done - Payed</span>;
      case "Completed-Verify":
        return <span className={`${base} bg-purple-100 text-purple-800`}>👁️ Completed-Verify</span>;
      default:
        return <span className={`${base} bg-gray-100 text-gray-600`}>{status}</span>;
    }
  };

  const now = new Date();
  const filteredOrders = orders.filter((order) => {
    const q = search.toLowerCase();
	const fieldValue = String(order[searchField] || "").toLowerCase();
	const matches = fieldValue.includes(q);

    let createdAt = order.createdAt;
    if (createdAt?.seconds) createdAt = new Date(createdAt.seconds * 1000);
    else createdAt = new Date(createdAt);

    const matchTime = (() => {
      if (timeFilter === "today") {
        return createdAt.toDateString() === now.toDateString();
      }
      if (timeFilter === "thisWeek") {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        weekStart.setHours(0, 0, 0, 0);
        return createdAt >= weekStart;
      }
      if (timeFilter === "thisMonth") {
        return (
          createdAt.getMonth() === now.getMonth() &&
          createdAt.getFullYear() === now.getFullYear()
        );
      }
      if (timeFilter === "custom") {
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
    const matchRole = isAdmin || isEmployee || order.partner === currentUser.username;

    return matches && matchTime && matchStatus && matchRole;
  });

  const paginatedOrders = orders; // orders đã là 1 trang rồi

  const getRowClass = (status) => {
    switch (status) {
      case "In Progress":
        return "bg-yellow-100";
      case "Completed":
        return "bg-green-100";
      case "Done - Payed":
        return "bg-blue-100";
      case "Completed-Verify":
        return "bg-purple-100";
      default:
        return "";
    }
  };



  return (
    <>
    <div className="flex flex-col md:flex-row gap-6">
      <OrderForm onAddOrder={handleAddOrder} currentUser={currentUser} />
      <div className="w-full md:w-8/10 bg-white p-4 rounded shadow overflow-auto">
          <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
            <div>
              <h2 className="text-lg font-semibold">Danh sách đơn hàng</h2>
              <p className="text-sm text-gray-600">
                Tổng đơn: {totalCount} |
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

            {/* Bộ lọc */}
            <div className="flex gap-2 flex-wrap items-center">
              <input
                type="text"
                placeholder="Tìm kiếm..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border px-2 py-1 rounded text-sm"
              />
			<select
				  value={searchField}
				  onChange={(e) => setSearchField(e.target.value)}
				  className="border px-2 py-1 rounded text-sm"
				>
				  <option value="code">🔍 Mã đơn</option>
				</select>
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
                className="border px-2 py-1 rounded text-sm"
              >
                <option value="all">Tất cả thời gian</option>
                <option value="today">Hôm nay</option>
                <option value="thisWeek">Tuần này</option>
                <option value="thisMonth">Tháng này</option>
                <option value="custom">Tùy chọn</option>
              </select>

              {timeFilter === "custom" && (
                <>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="border px-2 py-1 rounded text-sm"
                  />
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="border px-2 py-1 rounded text-sm"
                  />
                </>
              )}

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
                    <td className="p-2 border max-w-[250px] overflow-hidden" title={order.product || ""}>
                      <div className="line-clamp-2 whitespace-pre-wrap">{order.product || ""}</div>
                    </td>
                    <td className="p-2 border">{Number(order.price).toLocaleString()} đ</td>
                    <td className="p-2 border max-w-[250px] overflow-hidden" title={order.note || ""}>
                      <div className="line-clamp-2 whitespace-pre-wrap">{order.note || ""}</div>
                    </td>
                    <td className="p-2 border text-xs">
                      {order.videoStart && (
                        <a href={order.videoStart} target="_blank" rel="noreferrer" className="text-blue-500 underline block">
                          ▶ Bắt đầu
                        </a>
                      )}
                      {order.videoEnd && (
                        <a href={order.videoEnd} target="_blank" rel="noreferrer" className="text-green-600 underline block">
                          ✅ Hoàn thành
                        </a>
                      )}
                      {order.extraVideos?.length > 0 && (
                        <div className="text-xs text-purple-600 mt-1">
                          📎 {order.extraVideos.length} video bổ sung
                        </div>
                      )}
                    </td>
                    <td className="p-2 border">{order.partner}</td>
                    <td className="p-2 border">{order.createdBy}</td>
                    <td className="p-2 border">{formatStatus(order.status)}</td>
                    <td className="p-2 border text-xs text-gray-600">
                      {order.duration && <div>🕒 {formatDuration(order.duration)}</div>}
                    </td>
                    <td className="p-2 border text-xs">
                      👥 {order.workers?.length || 0} người
                      {order.workers?.length > 0 && (
                        <div title={order.workers.map(w => w.name).join(", ")} className="inline-block ml-1 cursor-pointer text-blue-400">
                          ℹ️
                        </div>
                      )}
                    </td>
                    <td className="p-2 border text-xs space-y-1">
                      {canClaim && (
                        <button
                          onClick={() =>
                            hasClaimed
                              ? handleUnclaimOrder(order.id)
                              : handleClaimOrder(order.id)
                          }
                          className={`px-2 py-1 rounded block w-full text-white ${
                            hasClaimed ? "bg-gray-600 hover:bg-gray-700" : "bg-green-600 hover:bg-green-700"
                          }`}
                        >
                          {hasClaimed ? "Bỏ đơn" : "Nhận đơn"}
                        </button>
                      )}
                      <button
                        onClick={() => setEditingOrder(order)}
                        className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded w-full"
                      >
                        Sửa
                      </button>
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
            <span className="text-sm text-gray-500">
              Trang {currentPage} / {totalPages || 1}
            </span>
            <div className="space-x-2 flex items-center">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2 py-1 border rounded text-sm"
              >
                ← Trước
              </button>
              <input
				  type="number"
				  value={inputPage}
				  min={1}
				  max={lastVisibleDocs.length + 1} // 🔒 Chỉ cho phép nhập tới trang đã truy cập
				  onChange={(e) => {
					const val = Number(e.target.value);
					setInputPage(val);
				  }}
				  onKeyDown={(e) => {
					if (e.key === "Enter") {
					  if (inputPage >= 1 && inputPage <= lastVisibleDocs.length + 1) {
						setCurrentPage(inputPage);
					  } else {
						alert(`Bạn chỉ có thể nhập đến trang ${lastVisibleDocs.length + 1}.`);
					  }
					}
				  }}
				  className="w-16 px-2 py-1 border rounded text-sm text-center"
				/>


              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-2 py-1 border rounded text-sm"
              >
                Tiếp →
              </button>
            </div>
          </div>
        </div>

        {/* Popup Sửa Đơn */}
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

