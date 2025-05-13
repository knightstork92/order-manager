import { useEffect, useState } from "react";
import Select from "react-select";
import html2canvas from "html2canvas";
import TimesheetEditPopup from "../components/TimesheetEditPopup";
import PayrollPreview from "../components/PayrollPreview";
import {
  collection,
  addDoc,
  getDocs,
  serverTimestamp,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";

const TimesheetPage = () => {
  const { currentUser } = useAuth();
  const isAdmin = currentUser.role === "admin";

  const [timesheets, setTimesheets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [filterUser, setFilterUser] = useState(currentUser.username);
  const [filterType, setFilterType] = useState("week");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [paidDates, setPaidDates] = useState([]);
  const [previewVisible, setPreviewVisible] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const payRate = 50000;

  const fetchTimesheets = async () => {
    const snapshot = await getDocs(collection(db, "timesheets"));
    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setTimesheets(data);
  };

  const fetchEmployees = async () => {
    const q = query(collection(db, "users"), where("role", "in", ["employee", "admin"]));
    const snapshot = await getDocs(q);
    const list = snapshot.docs.map((doc) => {
      const d = doc.data();
      return {
        value: d.username,
        label: d.name || d.username,
        username: d.username,
        name: d.name,
      };
    });
    setEmployees(list);
    if (list.length > 0 && isAdmin) setFilterUser(list[0].value);
  };

  const fetchPayrolls = async (targetUsername) => {
    const q = query(collection(db, "payrolls"), where("username", "==", targetUsername));
    const snap = await getDocs(q);
    const paid = snap.docs.flatMap((doc) => doc.data().details.map((d) => d.date));
    setPaidDates(paid);
  };

  useEffect(() => {
    fetchTimesheets();
    fetchEmployees();
  }, []);

  useEffect(() => {
    const targetUsername = isAdmin ? filterUser : currentUser.username;
    fetchPayrolls(targetUsername);
  }, [filterUser, isAdmin]);

  const [form, setForm] = useState({
    date: today,
    hours: "",
    note: "",
    userId: currentUser.uid,
    username: currentUser.username,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.hours || isNaN(form.hours)) return alert("Giờ công không hợp lệ.");
    if (!isAdmin && form.date !== today) return alert("Chỉ được chấm công hôm nay.");

    const newEntry = {
      ...form,
      hours: parseFloat(form.hours),
      createdAt: serverTimestamp(),
      createdBy: currentUser.username,
    };

    try {
      const q = query(
        collection(db, "timesheets"),
        where("userId", "==", currentUser.uid),
        where("date", "==", form.date)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) return alert("Đã chấm công ngày này rồi.");

      await addDoc(collection(db, "timesheets"), newEntry);
      setForm((f) => ({ ...f, hours: "", note: "" }));
      fetchTimesheets();
    } catch (err) {
      alert("Lỗi khi chấm công: " + err.message);
    }
  };

  const getWeekNumber = (d) => {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  };

  const now = new Date();

  const isInRange = (d) => {
    if (!fromDate || !toDate) return true;
    return d >= new Date(fromDate) && d <= new Date(toDate);
  };

  const filtered = timesheets.filter((t) => {
    if (!isAdmin && t.username !== currentUser.username) return false;
    if (isAdmin && filterUser && t.username !== filterUser) return false;

    const d = new Date(t.date);
    if (!isInRange(d)) return false;

    if (filterType === "week") {
      return getWeekNumber(d) === getWeekNumber(now) && d.getFullYear() === now.getFullYear();
    }
    if (filterType === "month") {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }
    return true;
  });

  const totalHours = filtered.reduce((sum, t) => sum + (parseFloat(t.hours) || 0), 0);
  const totalPay = totalHours * payRate;

  return (
    <div className="flex flex-col md:flex-row gap-6">
      {/* Form chấm công */}
      <div className="w-full md:w-1/3 bg-white p-4 rounded shadow">
        <h2 className="text-lg font-semibold mb-4">Chấm công</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="date" name="date" value={form.date} onChange={handleChange} className="w-full border px-3 py-2 rounded" disabled={!isAdmin} />
          <input type="number" name="hours" step="0.5" value={form.hours} onChange={handleChange} placeholder="Số giờ làm" className="w-full border px-3 py-2 rounded" required />
          <textarea name="note" value={form.note} onChange={handleChange} placeholder="Ghi chú (nếu có)" rows={3} className="w-full border px-3 py-2 rounded" />
          {isAdmin && (
            <Select
              options={employees}
              value={employees.find((e) => e.value === form.username)}
              onChange={(selected) => setForm((prev) => ({ ...prev, username: selected.value }))}
              placeholder="Chọn nhân viên"
            />
          )}
          <button className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">Ghi nhận</button>
        </form>
      </div>

      {/* Bảng dữ liệu */}
      <div className="w-full md:w-2/3 bg-white p-4 rounded shadow">
        <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
          <div className="flex gap-2">
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="border px-2 py-1 rounded text-sm">
              <option value="week">Tuần này</option>
              <option value="month">Tháng này</option>
              <option value="custom">Tùy chọn</option>
            </select>

            {isAdmin && (
              <Select
                options={employees}
                value={employees.find((e) => e.value === filterUser)}
                onChange={(selected) => setFilterUser(selected.value)}
                placeholder="Lọc theo nhân viên"
              />
            )}
          </div>

          {filterType === "custom" && (
            <div className="flex gap-2 items-center mt-2">
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="border px-2 py-1 rounded text-sm" />
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="border px-2 py-1 rounded text-sm" />
            </div>
          )}

          <div className="text-sm text-right space-y-1">
            <div>Tổng giờ: <strong>{totalHours}</strong></div>
            <div>Lương: <strong>{totalPay.toLocaleString()} đ</strong></div>
            {isAdmin && (
              <button onClick={() => setPreviewVisible(true)} className="bg-green-600 text-white px-3 py-1 rounded text-sm">
                📄 Preview phiếu lương
              </button>
            )}
          </div>
        </div>

        <div id="timesheet-table">
          <table className="w-full border text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 border">Ngày</th>
                <th className="p-2 border">Nhân viên</th>
                <th className="p-2 border">Giờ</th>
                <th className="p-2 border">Ghi chú</th>
                <th className="p-2 border">Trạng thái</th>
                <th className="p-2 border">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {[...filtered].sort((a, b) => new Date(a.date) - new Date(b.date)).map((t) => (
                <tr key={t.id}>
                  <td className="p-2 border">{t.date}</td>
                  <td className="p-2 border">{t.username}</td>
                  <td className="p-2 border">{t.hours}</td>
                  <td className="p-2 border">{t.note || "-"}</td>
                  <td className="p-2 border text-center">
                    {paidDates.includes(t.date) ? (
                      <span className="text-green-700 font-medium">✓ Đã TT</span>
                    ) : "-"}
                  </td>
                  <td className="p-2 border text-blue-600 text-sm hover:underline cursor-pointer" onClick={() => setEditingItem(t)}>Sửa</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editingItem && (
        <TimesheetEditPopup
          entry={editingItem}
          onClose={() => setEditingItem(null)}
          onUpdated={fetchTimesheets}
          isAdmin={isAdmin}
        />
      )}

      {previewVisible && filtered.length > 0 && employees.length > 0 && (
        <PayrollPreview
          timesheets={filtered}
          employee={employees.find((e) => e.value === filterUser) || {
            username: filterUser,
            name: filterUser,
          }}
          totalHours={totalHours}
          totalPay={totalPay}
          printedBy={currentUser.name}
          onClose={() => setPreviewVisible(false)}
        />
      )}
    </div>
  );
};

export default TimesheetPage;
