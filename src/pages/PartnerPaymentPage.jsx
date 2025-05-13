import { useState, useEffect } from "react";
import Select from "react-select";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  addDoc,
  serverTimestamp,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase";

const PartnerPaymentPage = () => {
  const [partnerData, setPartnerData] = useState("");
  const [partnerList, setPartnerList] = useState([]);
  const [selectedPartner, setSelectedPartner] = useState(null);

  const [matched, setMatched] = useState([]);
  const [unmatchedPrice, setUnmatchedPrice] = useState([]);
  const [notInSystem, setNotInSystem] = useState([]);
  const [missingInPartner, setMissingInPartner] = useState([]);
  const [selectedCodes, setSelectedCodes] = useState([]);

  const fetchPartners = async () => {
    const q = query(collection(db, "users"), where("role", "==", "partner"));
    const snapshot = await getDocs(q);
    const partners = snapshot.docs.map((doc) => {
      const d = doc.data();
      return {
        label: d.name || d.username,
        value: d.username,
      };
    });
    setPartnerList(partners);
  };

  useEffect(() => {
    fetchPartners();
  }, []);

  const parsePartnerList = () => {
    const lines = partnerData.split("\n");
    const list = [];

    for (let line of lines) {
      const [code, priceRaw] = line.trim().split(/\s+/);
      if (code && priceRaw && code.startsWith("PAL")) {
        const price = parseInt(priceRaw.replace(/\D/g, "")) * 1000;
        list.push({ code: code.trim(), price });
      }
    }

    return list;
  };

  const analyze = async () => {
    const parsedList = parsePartnerList();
    const codesFromPartner = parsedList.map((p) => p.code);

    const snapshot = await getDocs(collection(db, "orders"));
    const orders = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));

    const completedOrders = orders.filter(
      (o) =>
        ["Completed", "Done - Payed", "Completed-Verify"].includes(o.status) &&
        (!selectedPartner || o.partner === selectedPartner.value)
    );

    const matchedInOrder = completedOrders.filter((o) =>
      codesFromPartner.includes(o.code)
    );

    if (matchedInOrder.length === 0) {
      alert("Không tìm thấy đơn nào khớp.");
      return;
    }

    const sortedByTime = [...matchedInOrder].sort(
      (a, b) =>
        new Date(a.createdAt?.seconds * 1000 || a.createdAt) -
        new Date(b.createdAt?.seconds * 1000 || b.createdAt)
    );

    const fromDate = new Date(
      sortedByTime[0].createdAt?.seconds * 1000 || sortedByTime[0].createdAt
    );
    const toDate = new Date(
      sortedByTime[sortedByTime.length - 1].createdAt?.seconds * 1000 ||
        sortedByTime[sortedByTime.length - 1].createdAt
    );

    const inRangeOrders = completedOrders.filter((o) => {
      const t = new Date(o.createdAt?.seconds * 1000 || o.createdAt);
      return t >= fromDate && t <= toDate;
    });

    const _matched = [];
    const _unmatchedPrice = [];
    const _notInSystem = [];

    parsedList.forEach((p) => {
      const found = inRangeOrders.find((o) => o.code === p.code);
      if (!found) {
        _notInSystem.push(p);
      } else {
        const systemPrice = Number(found.price);
        if (systemPrice === p.price) {
          if (found.status !== "Done - Payed") {
            _matched.push({ ...p, order: found });
          }
        } else {
          if (found.status !== "Done - Payed") {
            _unmatchedPrice.push({
              ...p,
              systemPrice,
              order: found,
            });
          }
        }
      }
    });

    const _missingInPartner = inRangeOrders.filter(
      (o) => !codesFromPartner.includes(o.code) && o.status !== "Done - Payed"
    );

    setMatched(_matched);
    setUnmatchedPrice(_unmatchedPrice);
    setNotInSystem(_notInSystem);
    setMissingInPartner(_missingInPartner);
    setSelectedCodes([]);
  };

  const handleSelect = (code) => {
    setSelectedCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const handleConfirmPayment = async () => {
    if (selectedCodes.length === 0) return alert("Chưa chọn đơn nào.");

    const confirm = window.confirm(
      `Xác nhận đã thanh toán ${selectedCodes.length} đơn?`
    );
    if (!confirm) return;

    const batchTime = new Date().toISOString();

    for (let code of selectedCodes) {
      const found = matched.find((m) => m.code === code);
      if (!found) continue;

      const ref = doc(db, "orders", found.order.id);
      await updateDoc(ref, { status: "Done - Payed" });

      await addDoc(collection(db, "partner_payments"), {
        code: found.code,
        amount: found.price,
        partner: selectedPartner?.value || "",
        timestamp: batchTime,
        orderId: found.order.id,
      });
    }

    alert("✅ Đã xác nhận thanh toán.");
    setSelectedCodes([]);
    analyze();
  };

  const totalAmount = matched.reduce((sum, m) => sum + m.price, 0);

  return (
    <div className="max-w-5xl mx-auto p-4">
      <h1 className="text-xl font-bold mb-4">Đối soát thanh toán từ đối tác</h1>

      <div className="flex gap-4 mb-4">
        <Select
          options={partnerList}
          value={selectedPartner}
          onChange={setSelectedPartner}
          placeholder="Chọn đối tác..."
          className="w-1/2"
        />
        <button
          onClick={analyze}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Bước 2: Đối chiếu với hệ thống
        </button>
      </div>

      <textarea
        rows={8}
        value={partnerData}
        onChange={(e) => setPartnerData(e.target.value)}
        placeholder="Dán danh sách từ đối tác vào đây (Mỗi dòng: MÃ ĐƠN + GIÁ)..."
        className="w-full border rounded p-2 mb-4"
      ></textarea>

      {matched.length > 0 && (
        <>
          <h3 className="font-semibold text-green-700 mb-1">
            ✅ Đơn khớp ({matched.length}) – Tổng: {totalAmount.toLocaleString()} đ
          </h3>
          <table className="w-full border text-sm mb-6">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 border">
                  <input
                    type="checkbox"
                    checked={selectedCodes.length === matched.length}
                    onChange={(e) =>
                      setSelectedCodes(
                        e.target.checked ? matched.map((m) => m.code) : []
                      )
                    }
                  />
                </th>
                <th className="p-2 border">Mã đơn</th>
                <th className="p-2 border">Số tiền</th>
                <th className="p-2 border">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {matched.map((m) => (
                <tr key={m.code}>
                  <td className="p-2 border text-center">
                    <input
                      type="checkbox"
                      checked={selectedCodes.includes(m.code)}
                      onChange={() => handleSelect(m.code)}
                    />
                  </td>
                  <td className="p-2 border">{m.code}</td>
                  <td className="p-2 border">{m.price.toLocaleString()} đ</td>
                  <td className="p-2 border">{m.order.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {selectedCodes.length > 0 && (
            <button
              onClick={handleConfirmPayment}
              className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 mb-4"
            >
              ✅ Xác nhận thanh toán {selectedCodes.length} đơn
            </button>
          )}
        </>
      )}

      {unmatchedPrice.length > 0 && (
        <>
          <h3 className="mt-6 font-semibold text-lg text-yellow-600">
            ⚠️ Đơn lệch số tiền ({unmatchedPrice.length})
          </h3>
          <table className="w-full border text-sm mb-4">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 border">Mã đơn</th>
                <th className="p-2 border">Giá đối tác</th>
                <th className="p-2 border">Giá hệ thống</th>
              </tr>
            </thead>
            <tbody>
              {unmatchedPrice.map((o) => (
                <tr key={o.code}>
                  <td className="border p-2">{o.code}</td>
                  <td className="border p-2 text-red-600">{o.price.toLocaleString()} đ</td>
                  <td className="border p-2 text-green-700">
                    {Number(o.systemPrice).toLocaleString()} đ
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {notInSystem.length > 0 && (
        <>
          <h3 className="font-semibold text-red-700 mb-1">
            ❌ Đơn không có trong hệ thống ({notInSystem.length})
          </h3>
          <ul className="list-disc ml-6 text-sm text-red-600 mb-6">
            {notInSystem.map((o) => (
              <li key={o.code}>
                {o.code} – {o.price.toLocaleString()} đ
              </li>
            ))}
          </ul>
        </>
      )}

      {missingInPartner.length > 0 && (
        <>
          <h3 className="font-semibold text-blue-700 mb-1">
            📌 Đơn chưa được đối tác ghi nhận ({missingInPartner.length})
          </h3>
          <ul className="list-disc ml-6 text-sm text-blue-700">
            {missingInPartner.map((o) => (
              <li key={o.id}>
                {o.code} – {Number(o.price).toLocaleString()} đ
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};

export default PartnerPaymentPage;
