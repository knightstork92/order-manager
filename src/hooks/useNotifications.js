import { useEffect, useState } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "../firebase";

const useNotifications = (currentUser) => {
  const [notifications, setNotifications] = useState([]);
  const [lastNotificationTime, setLastNotificationTime] = useState(null);

useEffect(() => {
  const q = query(
    collection(db, "notifications"),
    orderBy("timestamp", "desc")
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const allData = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // ✅ Lọc theo role
    const filtered = allData.filter((n) => {
      if (currentUser.role === "admin" || currentUser.role === "employee") return true;
      return n.partner === currentUser.username;
    });

    setNotifications(filtered.slice(0, 20));
    if (filtered.length > 0 && filtered[0].timestamp?.toDate) {
      setLastNotificationTime(filtered[0].timestamp.toDate());
    }
  });

  return () => unsubscribe();
}, []);

  const markAllAsRead = async () => {
    const unread = notifications.filter(
      (n) => !n.readBy?.includes(currentUser.name)
    );

    for (const notif of unread) {
      const ref = doc(db, "notifications", notif.id);
      await updateDoc(ref, {
        readBy: [...(notif.readBy || []), currentUser.name],
      });
    }
  };

  const unreadCount = notifications.filter(
    (n) => !n.readBy?.includes(currentUser.name)
  ).length;

  return {
    notifications,
    unreadCount,
    markAllAsRead,
    lastNotificationTime,
  };
};

export default useNotifications;
