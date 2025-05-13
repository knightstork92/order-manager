import { useState, useEffect } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

const TimesheetEditPopup = ({ entry, onUpdated, onClose, isAdmin }) => {
  const [form, setForm] = useState(entry);
  const today = new Date().toISOString().split("T")[0];
  const isToday = form.date === today;

  useEffect(() => {
    setForm(entry);
  }, [entry]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "hours" ? parseFloat(value) : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.hours || isNaN(form.hours)) {
      return alert("Giờ công không hợp lệ.");
    }

    try {
      const ref = doc(db, "timesheets", form.id);
      await updateDoc(ref, {
        hours: form.hours,
        note: form.note,
        date: form.date,
      });

      onUpdated(); // gọi lại fetchTimesheets từ parent
      onClose();
    } catch (err) {
      alert("Lỗi khi cập nhật: " + err.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg w-full max-w-md relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-3 text-gray-400 hover:text-black text-2xl"
        >
          &times;
        </button>
        <h2 className="text-lg font-semibold mb-4">Chỉnh sửa giờ công</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="date"
            name="date"
            value={form.date}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
            disabled={!isAdmin}
          />
          <input
            type="number"
            step="0.5"
            name="hours"
            value={form.hours}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
            placeholder="Số giờ"
            disabled={!isAdmin && !isToday}
          />
          <textarea
            name="note"
            value={form.note}
            onChange={handleChange}
            placeholder="Ghi chú"
            className="w-full border px-3 py-2 rounded"
            rows={3}
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded w-full hover:bg-blue-700"
            disabled={!isAdmin && !isToday}
          >
            Cập nhật
          </button>
        </form>
      </div>
    </div>
  );
};

export default TimesheetEditPopup;
