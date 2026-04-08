import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../utils/firebase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setRole(null);
        setUserData(null);
        setLoading(false);
        return;
      }

      try {
        const userRef = doc(db, "users", firebaseUser.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const data = userSnap.data();
          setUser(firebaseUser);
          setRole(data.role || null);
          setUserData({ id: userSnap.id, ...data });
        } else {
          // ── Orphan Auth Security Check ──
          // Firebase Auth account exists but Firestore user doc is missing.
          // This means the user was deleted by an admin cascade.
          // Immediately sign them out and block access.
          console.warn(
            "Orphan Auth detected: Firebase Auth user exists but Firestore doc is missing. Signing out.",
            firebaseUser.uid
          );
          await signOut(auth);
          setUser(null);
          setRole(null);
          setUserData(null);
        }
      } catch (error) {
        console.error("Failed to load user role:", error);
        setUser(null);
        setRole(null);
        setUserData(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Derive convenience fields from userData
  const schoolId = userData?.schoolId || null;
  const orgId = userData?.orgId || null;
  const classIds = userData?.classIds || [];

  return (
    <AuthContext.Provider
      value={{ user, role, userData, loading, schoolId, orgId, classIds }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
