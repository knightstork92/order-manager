import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ Thêm hàm login
  const login = async (email, password) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Lấy dữ liệu từ Firestore
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      throw new Error("Không tìm thấy thông tin người dùng.");
    }

    const userData = userSnap.data();
	
	if (userData.disabled) {
    await signOut(auth); // bắt buộc sign out
    throw new Error("Tài khoản đã bị vô hiệu hoá.");
  }
    setCurrentUser({
      uid: user.uid,
      email: user.email,
      name: userData.name,
      role: userData.role,
	  username: userData.username,
    });
  };

  const logout = () => signOut(auth);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          setCurrentUser({
            uid: user.uid,
            email: user.email,
            name: snap.data().name,
            role: snap.data().role,
			username: snap.data().username,
          });
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, login, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
