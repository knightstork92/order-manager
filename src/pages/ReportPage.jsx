import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import Select from "react-select";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const ITEMS_PER_PAGE = 20;

const ReportPage = () => {
  const [orders, setOrders] = useState([]);
  const [partners, setPartners] = useState([]);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [filterType, setFilterType] = useState("week");
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [filteredOrders, setFilteredOrders] = useState([]);

  const fetchOrders = async () => {
    const snap = await getDocs(collection(db, "orders"));
    const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setOrders(data);
  };

  const fetchPartners = async () => {
    const q = query(collection(db, "users"), where("role", "==", "partner"));
    const snap = await getDocs(q);
    const options = snap.docs.map((doc) => {
      const d = doc.data();
      return {
        label: d.name || d.username,
        value: d.username,
      };
    });
    setPartners(options);
  };

  useEffect(() => {
    fetchOrders();
    fetchPartners();
  }, []);

  useEffect(() => {
    if (orders.length > 0) applyFilters();
  }, [orders]);

  const applyFilters = () => {
    const now = new Date();
    const getWeekNumber = (d) => {
      const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
      const dayNum = date.getUTCDay() || 7;
      date.setUTCDate(date.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
      return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
    };

    const isInRange = (d) => {
      if (!fromDate || !toDate) return true;
      return d >= fromDate && d <= toDate;
    };

    const filtered = orders.filter((o) => {
      if (selectedPartner && o.partner !== selectedPartner.value) return false;

      const created = new Date(o.createdAt?.seconds * 1000 || o.createdAt);
      if (filterType === "week") {
        return getWeekNumber(created) === getWeekNumber(now) &&
               created.getFullYear() === now.getFullYear();
      }
      if (filterType === "month") {
        return created.getMonth() === now.getMonth() &&
               created.getFullYear() === now.getFullYear();
      }
      if (filterType === "custom") {
        return isInRange(created);
      }
      return true;
    });

    setFilteredOrders(filtered);
    setCurrentPage(1);
  };

  const summaryMap = {};
  filteredOrders.forEach((o) => {
    const date = new Date(o.createdAt?.seconds * 1000 || o.createdAt)
      .toISOString()
      .split("T")[0];
    if (!summaryMap[date]) {
      summaryMap[date] = { date, count: 0, total: 0 };
    }
    summaryMap[date].count += 1;
    summaryMap[date].total += Number(o.price || 0);
  });

  const summary = Object.values(summaryMap).sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  const paginated = filteredOrders
    .sort((a, b) =>
      new Date(b.createdAt?.seconds * 1000 || b.createdAt) -
      new Date(a.createdAt?.seconds * 1000 || a.createdAt)
    )
    .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const totalOrders = filteredOrders.length;
  const totalRevenue = filteredOrders.reduce((sum, o) => sum + Number(o.price || 0), 0);
  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h2 className="text-xl font-bold mb-4">📊 Thống kê đơn hàng</h2>

      <div className="flex flex-wrap items-center gap-4 mb-4">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="border px-2 py-1 rounded"
        >
          <option value="week">Tuần này</option>
          <option value="month">Tháng này</option>
          <option value="custom">Tùy chọn</option>
          <option value="all">Tất cả</option>
        </select>

        {filterType === "custom" && (
          <>
            <DatePicker
              selected={fromDate}
              onChange={(date) => setFromDate(date)}
              placeholderText="Từ ngày"
              className="border px-2 py-1 rounded"
            />
            <DatePicker
              selected={toDate}
              onChange={(date) => setToDate(date)}
              placeholderText="Đến ngày"
              className="border px-2 py-1 rounded"
            />
          </>
        )}

        <Select
          options={partners}
          value={selectedPartner}
          onChange={setSelectedPartner}
          placeholder="Chọn đối tác"
          className="min-w-[200px]"
        />

        <button
          onClick={applyFilters}
          className="px-3 py-1 bg-blue-500 text-white rounded"
        >
          Xem thống kê
        </button>
      </div>

      <div className="mb-6 text-sm text-gray-700 space-y-1">
        <p>
          Tổng đơn: <strong>{totalOrders}</strong>
        </p>
        <p>
          Tổng doanh thu: <strong>{totalRevenue.toLocaleString()} đ</strong>
        </p>
      </div>

      {summary.length > 0 && (
        <div className="bg-white p-4 rounded shadow mb-6">
          <h3 className="text-lg font-semibold mb-2">Biểu đồ doanh thu</h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={summary}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" />
              <YAxis
                yAxisId="right"
                orientation="right"
                tickFormatter={(v) => `${(v / 1_000_000).toFixed(1)}tr`}
              />
              <Tooltip
                formatter={(v) =>
                  typeof v === "number" ? `${v.toLocaleString()} đ` : v
                }
              />
              <Legend />
              <Bar yAxisId="left" dataKey="count" name="Số đơn" fill="#3182ce" />
              <Bar yAxisId="right" dataKey="total" name="Doanh thu" fill="#38a169" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="bg-white p-4 rounded shadow mb-6 overflow-auto">
        <h3 className="text-lg font-semibold mb-3">Danh sách đơn hàng</h3>
        <table className="w-full text-sm border">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border">Mã</th>
              <th className="p-2 border">Tên</th>
              <th className="p-2 border">Đối tác</th>
              <th className="p-2 border">Giá</th>
              <th className="p-2 border">Tạo lúc</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((o) => (
              <tr key={o.id}>
                <td className="p-2 border">{o.code}</td>
                <td className="p-2 border">{o.product}</td>
                <td className="p-2 border">{o.partner}</td>
                <td className="p-2 border">{Number(o.price).toLocaleString()} đ</td>
                <td className="p-2 border text-xs text-gray-600">
                  {new Date(o.createdAt?.seconds * 1000 || o.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-between items-center mt-3">
          <span className="text-sm">
            Trang {currentPage}/{totalPages}
          </span>
          <div className="space-x-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
              className="px-3 py-1 border rounded text-sm"
            >
              ← Trước
            </button>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
              className="px-3 py-1 border rounded text-sm"
            >
              Tiếp →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportPage;
