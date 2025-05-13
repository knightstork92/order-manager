// src/components/EditOrderForm.jsx
import { useState, useEffect } from "react";

const EditOrderForm = ({ onSubmit, currentUser, initialData, onDelete }) => {
  const [form, setForm] = useState({
    id: "",
    code: "",
    product: "",
    price: "",
    note: "",
    videoStart: "",
    videoEnd: "",
    partner: "",
    createdAt: null,
    completedAt: null,
    duration: null,
    workers: [],
    extraVideos: [],
  });

  const [newExtraName, setNewExtraName] = useState("");
  const [newExtraUrl, setNewExtraUrl] = useState("");

  const toDatetimeLocal = (input) => {
    try {
      if (!input) return "";
      let date;
      if (input?.seconds) {
        date = new Date(input.seconds * 1000);
      } else if (typeof input === "string" || input instanceof Date) {
        date = new Date(input);
      } else {
        return "";
      }
      if (isNaN(date.getTime())) return "";
      const tzOffset = date.getTimezoneOffset() * 60000;
      return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
    } catch {
      return "";
    }
  };

  useEffect(() => {
    if (initialData) {
      const safeExtras = Array.isArray(initialData.extraVideos)
        ? initialData.extraVideos.map((v) =>
            typeof v === "string"
              ? { name: v.split("/").pop(), url: v }
              : { name: v.name || v.url?.split("/").pop(), url: v.url }
          ).filter(v => v?.url)
        : [];

      const parseDate = (d) => {
        try {
          if (!d) return null;
          if (d?.seconds) return new Date(d.seconds * 1000);
          return new Date(d);
        } catch {
          return null;
        }
      };

      setForm((prev) => ({
        ...prev,
        ...initialData,
        id: String(initialData.id),
        extraVideos: safeExtras,
        createdAt: parseDate(initialData.createdAt),
        completedAt: parseDate(initialData.completedAt),
      }));
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const updatedForm = { ...prev, [name]: value };

      if (name === "videoEnd" && value.trim() !== "") {
        updatedForm.status = "Completed";
        updatedForm.completedAt = new Date();

        if (prev.createdAt) {
          const created = new Date(prev.createdAt);
          const completed = new Date(updatedForm.completedAt);
          if (!isNaN(created.getTime()) && !isNaN(completed.getTime())) {
            const diffMinutes = Math.round((completed - created) / 60000);
            updatedForm.duration = diffMinutes;
          }
        }
      }

      if ((name === "createdAt" || name === "completedAt") && value) {
        const parsed = new Date(value);
        if (!isNaN(parsed.getTime())) {
          updatedForm[name] = parsed;
        }
      }

      return updatedForm;
    });
  };

  const handleAddExtra = () => {
    if (!newExtraUrl) return;
    setForm((prev) => ({
      ...prev,
      extraVideos: [
        ...prev.extraVideos,
        { name: newExtraName || newExtraUrl.split("/").pop(), url: newExtraUrl },
      ],
    }));
    setNewExtraName("");
    setNewExtraUrl("");
  };

  const handleRemoveExtra = (index) => {
    setForm((prev) => ({
      ...prev,
      extraVideos: prev.extraVideos.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.id) return alert("Không tìm thấy ID đơn hàng.");
    onSubmit(form);
  };

  const canDelete = currentUser.role === "admin" || currentUser.role === "employee";
  const isAdmin = currentUser.role === "admin";

  return (
    <form onSubmit={handleSubmit} className="space-y-3 w-full max-h-[80vh] overflow-y-auto p-2">
      <h2 className="text-lg font-semibold mb-4">Chỉnh sửa đơn hàng</h2>

      <input type="text" name="code" placeholder="Mã đơn (PAL...)" value={form.code} onChange={handleChange} className="w-full border px-3 py-2 rounded" />
      <textarea name="product" placeholder="Tên đơn / sản phẩm" value={form.product} onChange={handleChange} rows={2} className="w-full border px-3 py-2 rounded" />
      <input type="number" name="price" placeholder="Giá tiền" value={form.price} onChange={handleChange} className="w-full border px-3 py-2 rounded" />
      <textarea name="note" placeholder="Ghi chú (tài khoản / nhân vật...)" value={form.note} onChange={handleChange} rows={2} className="w-full border px-3 py-2 rounded" />
      <input type="text" name="videoStart" placeholder="Link video bắt đầu" value={form.videoStart} onChange={handleChange} className="w-full border px-3 py-2 rounded" />
      <input type="text" name="videoEnd" placeholder="Link video hoàn thành" value={form.videoEnd} onChange={handleChange} className="w-full border px-3 py-2 rounded" />

      <input type="text" name="partner" value={form.partner} disabled className="w-full border px-3 py-2 rounded bg-gray-100 text-gray-500" />

      {isAdmin && (
        <>
          <label className="block text-sm">Ngày tạo:</label>
          <input
            type="datetime-local"
            name="createdAt"
            value={toDatetimeLocal(form.createdAt)}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
          />

          <label className="block text-sm">Hoàn thành lúc:</label>
          <input
            type="datetime-local"
            name="completedAt"
            value={toDatetimeLocal(form.completedAt)}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
          />
        </>
      )}

      <div className="bg-gray-50 p-2 rounded border text-sm">
        <p className="font-semibold mb-1">👥 Người thực hiện:</p>
        {form.workers?.length > 0 ? (
          <ul className="list-disc pl-5">
            {form.workers.map((w, i) => (
              <li key={i}>{w.name || w.uid}</li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">Không có</p>
        )}
      </div>

      <div className="bg-gray-50 p-2 rounded border text-sm">
        <div className="flex items-center justify-between mb-1">
          <p className="font-semibold">🎞 Video phụ ({form.extraVideos.length}):</p>
        </div>

        {isAdmin && (
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              placeholder="Tên video"
              value={newExtraName}
              onChange={(e) => setNewExtraName(e.target.value)}
              className="border px-2 py-1 rounded w-1/3 text-xs"
            />
            <input
              type="text"
              placeholder="Link video"
              value={newExtraUrl}
              onChange={(e) => setNewExtraUrl(e.target.value)}
              className="border px-2 py-1 rounded w-2/3 text-xs"
            />
            <button
              type="button"
              onClick={handleAddExtra}
              className="text-xs bg-blue-500 text-white px-3 rounded hover:bg-blue-600"
            >Thêm</button>
          </div>
        )}

        <ul className="list-disc pl-5 space-y-1">
          {form.extraVideos.map((v, i) => (
            <li key={i} className="flex justify-between items-center gap-2">
              <a href={v.url} target="_blank" rel="noreferrer" className="text-blue-600 underline text-xs">
                {v.name || v.url?.split("/").pop() || `Video ${i + 1}`}
              </a>
              {isAdmin && (
                <button type="button" onClick={() => handleRemoveExtra(i)} className="text-red-500 hover:underline text-xs">Xoá</button>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex gap-3">
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full">
          Cập nhật
        </button>

        {canDelete && (
          <button
            type="button"
            onClick={() => {
              if (!form.id) return alert("Không tìm thấy ID để xoá.");
              onDelete(form.id);
            }}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 w-full"
          >
            Xoá đơn hàng
          </button>
        )}
      </div>
    </form>
  );
};

export default EditOrderForm;
