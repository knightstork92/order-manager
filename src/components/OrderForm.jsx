import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";

const OrderForm = ({ onAddOrder, currentUser, initialData, submitLabel = "Thêm đơn" }) => {
  const [form, setForm] = useState({
    code: "",
    product: "",
    price: "",
    note: "",
    videoStart: "",
    videoEnd: "",
    partner: "",
  });

  const [partners, setPartners] = useState([]);

  useEffect(() => {
    const fetchPartners = async () => {
      const snapshot = await getDocs(collection(db, "users"));
      const data = snapshot.docs
        .map(doc => doc.data())
        .filter(user => user.role === "partner")
        .map(user => user.username);
      setPartners(data);
    };
    fetchPartners();
  }, []);

  useEffect(() => {
    if (initialData) {
      setForm(initialData);
    } else {
      if (currentUser?.role === "partner") {
        setForm(prev => ({ ...prev, partner: currentUser.username }));
      } else if (currentUser?.role === "admin") {
        setForm(prev => ({ ...prev, partner: "tranthuong" }));
      }
    }
  }, [initialData, currentUser]);

  const [rawText, setRawText] = useState("");

  const parseOrderText = (text) => {
    const lines = text.trim().split(/\n+/);
    const all = lines.join(" ").replace(/\s+/g, " ").trim();
    const result = {
      code: "",
      price: "",
      product: "",
      note: "",
      partner: currentUser?.role === "partner" ? currentUser.username : "",
    };

    const codeMatch = all.match(/PAL\d{5,}/i);
    result.code = codeMatch ? codeMatch[0].toUpperCase() : "";

    let afterCode = all;
    if (result.code) {
      afterCode = all.slice(all.indexOf(result.code) + result.code.length).trim();
    }
    const priceMatch = afterCode.match(/^\s*(\d{1,5})\b/);
    result.price = priceMatch ? parseInt(priceMatch[1]) * 1000 : "";

    const noteRegex = /([\w.-]+@[\w.-]+\.[\w]{2,}|#[\d]+|[\w\d]{4,})$/i;
    const noteMatch = all.match(noteRegex);
    result.note = noteMatch ? noteMatch[0] : "";

    let temp = all;
    if (result.code) temp = temp.replace(result.code, "");
    if (priceMatch) temp = temp.replace(priceMatch[0], "");
    if (noteMatch) temp = temp.replace(noteMatch[0], "");
    result.product = temp.replace(/\s+/g, " ").trim();
    result.partner = "tranthuong" ;
    setForm({ ...form, ...result });
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.code || !form.product || !form.price || !form.partner)
      return alert("Vui lòng nhập đầy đủ thông tin.");

    const newOrder = {
      ...form,
      status: form.videoEnd ? "Done" : "In Progress",
      id: form.id || Date.now(),
      createdAt: form.createdAt || new Date(),
      createdBy: form.createdBy || currentUser.name,
    };

    onAddOrder(newOrder);
    setForm({
      code: "",
      product: "",
      price: "",
      note: "",
      videoStart: "",
      videoEnd: "",
      partner:
        currentUser?.role === "partner"
          ? currentUser.username
          : currentUser?.role === "admin"
          ? "tranthuong"
          : "",
    });
    setRawText("");
  };

  return (
    <div className="w-full md:w-1/3 xl:w-1/4 bg-white p-4 rounded shadow h-fit">
      <h2 className="text-lg font-semibold mb-4">Nhập đơn hàng</h2>
      <textarea
        placeholder="Dán chuỗi tin nhắn từ Messenger..."
        value={rawText}
        onChange={(e) => setRawText(e.target.value)}
        className="w-full border px-3 py-2 rounded text-sm mb-2"
        rows={5}
      ></textarea>
      <button
        onClick={() => parseOrderText(rawText)}
        className="mb-4 bg-gray-100 px-3 py-1 rounded text-sm border hover:bg-gray-200"
      >
        📥 Phân tích chuỗi
      </button>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          name="code"
          placeholder="Mã đơn (PAL...)"
          value={form.code}
          onChange={handleChange}
          className="w-full border px-3 py-2 rounded"
        />
        <textarea
          name="product"
          placeholder="Tên đơn / sản phẩm"
          value={form.product}
          onChange={handleChange}
          rows={2}
          className="w-full border px-3 py-2 rounded"
        />
        <input
          type="number"
          name="price"
          placeholder="Giá tiền"
          value={form.price}
          onChange={handleChange}
          className="w-full border px-3 py-2 rounded"
        />
        <textarea
          name="note"
          placeholder="Ghi chú (tài khoản / nhân vật...)"
          value={form.note}
          onChange={handleChange}
          rows={2}
          className="w-full border px-3 py-2 rounded"
        />
        <input
          type="text"
          name="videoStart"
          placeholder="Link video bắt đầu"
          value={form.videoStart}
          onChange={handleChange}
          className="w-full border px-3 py-2 rounded"
        />
        <input
          type="text"
          name="videoEnd"
          placeholder="Link video hoàn thành"
          value={form.videoEnd}
          onChange={handleChange}
          className="w-full border px-3 py-2 rounded"
        />

        {currentUser?.role !== "partner" && (
          <select
            name="partner"
            value={form.partner}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
          >
            <option value="">-- Chọn đối tác --</option>
            {partners.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        )}

        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full"
        >
          {submitLabel}
        </button>
      </form>
    </div>
  );
};

export default OrderForm;
