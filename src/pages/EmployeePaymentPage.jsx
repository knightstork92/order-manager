// src/pages/EmployeePaymentPage.jsx
import { useEffect, useState } from "react";
import { collection, getDocs, query, where, addDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import Select from "react-select";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const EmployeePaymentPage = () => {
  const { currentUser } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [timesheets, setTimesheets] = useState([]);
  const [payrolls, setPayrolls] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);

  const payRate = 50000;

const fetchData = async () => {
      const userSnap = await getDocs(
        query(collection(db, "users"), where("role", "in", ["employee", "admin"]))
      );
      const empList = userSnap.docs.map((doc) => {
        const d = doc.data();
        return {
          value: d.username,
          label: d.name || d.username,
          uid: doc.id,
        };
      });
      setEmployees(empList);

      const sheetSnap = await getDocs(collection(db, "timesheets"));
      const data = sheetSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setTimesheets(data);

      const payrollSnap = await getDocs(collection(db, "payrolls"));
      const payrollList = payrollSnap.docs.flatMap((doc) => {
        const d = doc.data();
        return d.details?.map((entry) => `${d.username}_${entry.date}`) || [];
      });
      setPayrolls(payrollList);
    };

  useEffect(() => {
    

    fetchData();
  }, []);

  const filtered = timesheets.filter((t) => {
    if (!selectedUser || !fromDate || !toDate) return false;
    if (t.username !== selectedUser.value) return false;

    const d = new Date(t.date);
    return d >= fromDate && d <= toDate;
  });

  const totalHours = filtered.reduce((sum, t) => sum + (parseFloat(t.hours) || 0), 0);
  const totalPay = totalHours * payRate;

  const handleToggle = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleConfirm = async () => {
    if (!selectedUser || selectedIds.length === 0) {
      return alert("Vui lòng chọn nhân viên và các ngày cần xác nhận.");
    }

    const confirmed = window.confirm(`Xác nhận thanh toán ${selectedIds.length} dòng công?`);
    if (!confirmed) return;

    const items = filtered.filter((t) => selectedIds.includes(t.id));
    const total = items.reduce((sum, t) => sum + (parseFloat(t.hours) || 0), 0);

    await addDoc(collection(db, "payrolls"), {
      username: selectedUser.value,
      fromDate: fromDate.toISOString().split("T")[0],
      toDate: toDate.toISOString().split("T")[0],
      hours: total,
      amount: total * payRate,
      confirmedBy: currentUser.username,
      timestamp: new Date().toISOString(),
      details: items.map((t) => ({ date: t.date, hours: t.hours, note: t.note })),
    });

    alert("✅ Đã xác nhận thanh toán");
    setSelectedIds([]);
	await fetchData();
  };

  const isPaid = (username, date) => payrolls.includes(`${username}_${date}`);

  return (
    <div className="max-w-5xl mx-auto p-4">
      <h2 className="text-xl font-bold mb-4">Thanh toán cho nhân viên</h2>

      <div className="flex flex-wrap gap-4 mb-4 items-center">
        <Select
          options={employees}
          value={selectedUser}
          onChange={setSelectedUser}
          placeholder="Chọn nhân viên"
          className="min-w-[200px]"
        />
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
      </div>

      {filtered.length > 0 && (
        <div className="bg-white shadow rounded p-4">
          <div className="flex justify-between items-center mb-2">
            <div>
              <h3 className="text-lg font-semibold">{selectedUser?.label}</h3>
              <p>
                Tổng giờ: <strong>{totalHours}</strong> – Tổng tiền:{" "}
                <strong>{totalPay.toLocaleString()} đ</strong>
              </p>
            </div>
            <div>
              <button
                onClick={handleConfirm}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                ✅ Xác nhận thanh toán
              </button>
            </div>
          </div>

          <table className="w-full border text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 border">
                  <input
                    type="checkbox"
                    checked={
                      filtered.filter((t) => !isPaid(t.username, t.date)).every((t) =>
                        selectedIds.includes(t.id)
                      )
                    }
                    onChange={(e) => {
                      if (e.target.checked) {
                        const ids = filtered
                          .filter((t) => !isPaid(t.username, t.date))
                          .map((t) => t.id);
                        setSelectedIds(ids);
                      } else {
                        setSelectedIds([]);
                      }
                    }}
                  />
                </th>
                <th className="p-2 border">Ngày</th>
                <th className="p-2 border">Số giờ</th>
                <th className="p-2 border">Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const paid = isPaid(t.username, t.date);
                return (
                  <tr key={t.id} className={paid ? "bg-blue-100 text-gray-500" : ""}>
                    <td className="border p-2 text-center">
                      {!paid && (
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(t.id)}
                          onChange={() => handleToggle(t.id)}
                        />
                      )}
                    </td>
                    <td className="border p-2">{t.date}</td>
                    <td className="border p-2">{t.hours}</td>
                    <td className="border p-2">{t.note || "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default EmployeePaymentPage;
