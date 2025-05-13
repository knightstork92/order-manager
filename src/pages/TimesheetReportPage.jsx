import React, { useState, useEffect, useRef } from "react";
import {
  collection,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase";
import DatePicker from "react-datepicker";
import Select from "react-select";
import "react-datepicker/dist/react-datepicker.css";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

const TimesheetReportPage = () => {
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [data, setData] = useState([]);
  const [rawTimesheets, setRawTimesheets] = useState([]);
  const [payrolls, setPayrolls] = useState([]);
  const exportRef = useRef();

  useEffect(() => {
    const fetchUsers = async () => {
      const snapshot = await getDocs(collection(db, "users"));
      const userList = snapshot.docs.map((doc) => ({
        value: doc.id,
        label: doc.data().username,
        username: doc.data().username,
      }));
      setUsers(userList);
    };
    fetchUsers();
  }, []);

  const fetchData = async () => {
    if (!startDate || !endDate) return;

    const [tsSnapshot, prSnapshot] = await Promise.all([
      getDocs(collection(db, "timesheets")),
      getDocs(collection(db, "payrolls")),
    ]);

    const tsDataRaw = tsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const prData = prSnapshot.docs.map((doc) => doc.data());

    const tsData = tsDataRaw.filter((t) => {
      const d = new Date(t.date);
      return d >= new Date(startDate.setHours(0,0,0,0)) && d <= new Date(endDate.setHours(23,59,59,999));
    });

    const filteredTS =
      selectedUser && selectedUser.username
        ? tsData.filter((t) => t.username === selectedUser.username)
        : tsData;

    const paidMap = new Set();
    prData.forEach((p) => {
      if (p.details) {
        p.details.forEach((d) => {
          paidMap.add(`${p.username}_${d.date}`);
        });
      }
    });

    const enriched = filteredTS.map((t) => ({
      ...t,
      paid: paidMap.has(`${t.username}_${t.date}`),
    }));

    const dailyHours = {};
    enriched.forEach((t) => {
      if (!dailyHours[t.date]) {
        dailyHours[t.date] = 0;
      }
      dailyHours[t.date] += Number(t.hours || 0);
    });

    const chartData = Object.entries(dailyHours).map(([date, hours]) => ({
      date,
      hours,
    })).sort((a, b) => a.date.localeCompare(b.date));

    setData(chartData);
    setRawTimesheets(enriched);
    setPayrolls(prData);
  };

  const totalHours = rawTimesheets.reduce((sum, t) => sum + Number(t.hours || 0), 0);
  const hourlyRate = 50000;
  const totalPay = totalHours * hourlyRate;
  const paidPay = rawTimesheets.reduce((sum, t) => sum + (t.paid ? t.hours * hourlyRate : 0), 0);
  const unpaidPay = totalPay - paidPay;
  const uniqueDays = new Set(rawTimesheets.map((t) => t.date)).size;
  const avgHoursPerDay = uniqueDays > 0 ? (totalHours / uniqueDays).toFixed(1) : 0;

  const exportPDF = async () => {
    const input = exportRef.current;
    if (!input) return;
    const canvas = await html2canvas(input);
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const imgProps = pdf.getImageProperties(imgData);
    const pdfHeight = (imgProps.height * pageWidth) / imgProps.width;
    pdf.addImage(imgData, "PNG", 0, 0, pageWidth, pdfHeight);
    pdf.save("timesheet-report.pdf");
  };

  return (
    <div className="p-4" ref={exportRef}>
      <h2 className="text-2xl font-bold mb-4">Thống kê giờ làm</h2>

      <div className="flex gap-4 mb-4 items-center">
        <DatePicker
          selected={startDate}
          onChange={(date) => setStartDate(date)}
          placeholderText="Từ ngày"
          className="p-2 border rounded"
        />
        <DatePicker
          selected={endDate}
          onChange={(date) => setEndDate(date)}
          placeholderText="Đến ngày"
          className="p-2 border rounded"
        />
        <Select
          options={[{ value: null, label: "Tất cả nhân viên" }, ...users]}
          value={selectedUser}
          onChange={(opt) => setSelectedUser(opt?.value !== null ? opt : null)}
          className="w-64"
        />
        <button
          onClick={fetchData}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Xem thống kê
        </button>
        <button
          onClick={exportPDF}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          Xuất PDF
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6 text-sm font-medium">
        <div className="bg-gray-100 p-3 rounded">🕒 Tổng giờ: {totalHours}</div>
        <div className="bg-gray-100 p-3 rounded">💰 Tổng tiền: {totalPay.toLocaleString()}đ</div>
        <div className="bg-gray-100 p-3 rounded">✅ Đã thanh toán: {paidPay.toLocaleString()}đ</div>
        <div className="bg-gray-100 p-3 rounded">📉 Còn lại: {unpaidPay.toLocaleString()}đ</div>
        <div className="bg-gray-100 p-3 rounded">📊 TB/ngày: {avgHoursPerDay} giờ</div>
      </div>

      <div className="w-full h-80 mb-8">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="hours" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <table className="table-auto w-full border">
        <thead>
          <tr className="bg-gray-200">
            <th className="px-2 py-1 border">Ngày</th>
            <th className="px-2 py-1 border">Nhân viên</th>
            <th className="px-2 py-1 border">Giờ làm</th>
            <th className="px-2 py-1 border">Ghi chú</th>
            <th className="px-2 py-1 border">Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          {rawTimesheets.map((t, i) => (
            <tr key={i}>
              <td className="px-2 py-1 border">{t.date}</td>
              <td className="px-2 py-1 border">{t.username}</td>
              <td className="px-2 py-1 border">{t.hours}</td>
              <td className="px-2 py-1 border">{t.note || ""}</td>
              <td className="px-2 py-1 border">
                {t.paid ? <span className="text-green-600">Đã thanh toán</span> : <span className="text-red-500">Chưa thanh toán</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TimesheetReportPage;