import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../utils/firebase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let docUnsub = null;

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setRole(null);
        setUserData(null);
        setLoading(false);
        if (docUnsub) { docUnsub(); docUnsub = null; }
        return;
      }

      setUser(firebaseUser); // Have auth credential, but need Firestore data

      const userRef = doc(db, "users", firebaseUser.uid);
      
      docUnsub = onSnapshot(userRef, async (userSnap) => {
        if (userSnap.exists()) {
          const data = userSnap.data();
          setRole(data.role || null);
          setUserData({ id: userSnap.id, ...data });
          setLoading(false);
        } else {
          // ── Orphan Auth Security Check ──
          // Firebase Auth account exists but Firestore user doc is missing.
          // Could be a new registration in progress OR an admin deleted the user.
          
          const creationTime = new Date(firebaseUser.metadata.creationTime).getTime();
          const now = Date.now();
          const ageMs = Math.abs(now - creationTime);

          if (ageMs < 15000) {
            // Less than 15 seconds old: user is currently registering.
            // Wait for AuthPage to write the Firestore document.
            console.log("Waiting for new user document to be created...");
            // Keep loading=true so App doesn't prematurely boot them with ProtectedRoute
          } else {
            // Older than 15 seconds without a document = Orphan Auth (admin cascade delete)
            console.warn("Orphan Auth detected: Firebase Auth user exists but Firestore doc is missing. Signing out.", firebaseUser.uid);
            await signOut(auth);
            setUser(null);
            setRole(null);
            setUserData(null);
            setLoading(false);
          }
        }
      }, (error) => {
        console.error("Failed to load user document:", error);
        setUser(null);
        setRole(null);
        setUserData(null);
        setLoading(false);
      });
    });

    return () => {
      unsubscribe();
      if (docUnsub) docUnsub();
    };
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
