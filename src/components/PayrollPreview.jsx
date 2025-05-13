import { useRef } from "react";
import html2canvas from "html2canvas";

const PayrollPreview = ({ employee, timesheets, totalHours, totalPay, printedBy }) => {
  const previewRef = useRef();

  if (!employee || !timesheets) {
    return (
      <div className="text-red-600 font-semibold text-center">
        ❌ Không thể hiển thị phiếu lương: Dữ liệu không hợp lệ.
      </div>
    );
  }

  const handleExport = async () => {
    if (!previewRef.current) return;
    const canvas = await html2canvas(previewRef.current);
    const link = document.createElement("a");
    link.download = `phieu-luong-${employee.username || "user"}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <div className="mt-6">
      <div className="mb-4">
        <button
          onClick={handleExport}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          📸 Xuất phiếu lương
        </button>
      </div>

      <div
        ref={previewRef}
        className="bg-white p-6 rounded shadow max-w-xl border mx-auto text-sm"
        style={{ width: "100%", fontFamily: "Arial, sans-serif" }}
      >
        <h2 className="text-xl font-bold text-center mb-2">PHIẾU LƯƠNG</h2>
        <p className="text-center mb-4">Knight Team</p>

        <div className="mb-4">
          <p><strong>Họ tên:</strong> {employee.name || "-"}</p>
          <p><strong>Username:</strong> {employee.username || "-"}</p>
        </div>

        <table className="w-full border text-xs mb-4">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-1">Ngày</th>
              <th className="border p-1">Giờ công</th>
              <th className="border p-1">Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            {[...timesheets]
			  .sort((a, b) => new Date(a.date) - new Date(b.date))
			  .map((t) => (
              <tr key={t.id}>
                <td className="border p-1">{t.date}</td>
                <td className="border p-1 text-center">{t.hours}</td>
                <td className="border p-1">{t.note || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="text-right mb-4">
          <p><strong>Tổng giờ:</strong> {totalHours} giờ</p>
          <p><strong>Hệ số:</strong> 50,000 đ/giờ</p>
          <p><strong>Tổng tiền:</strong> {totalPay.toLocaleString()} đ</p>
        </div>

        <div className="text-sm text-right text-gray-500">
          In bởi: {printedBy} | {new Date().toLocaleString()}
        </div>
      </div>
    </div>
  );
};

export default PayrollPreview;
