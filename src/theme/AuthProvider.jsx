import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { auth, db } from "../firebase";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

const AuthContext = createContext({
  user: null,
  loading: true,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      async signIn(email, password) {
        await signInWithEmailAndPassword(auth, email, password);
      },
      async signUp({ firstName, lastName, email, password }) {
        const cred = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );
        const displayName = [firstName, lastName].filter(Boolean).join(" ");
        if (displayName) {
          try {
            await updateProfile(cred.user, { displayName });
          } catch {}
        }

        // Store user data in Firestore
        try {
          await setDoc(doc(db, "users", cred.user.uid), {
            email: email,
            firstName: firstName,
            lastName: lastName,
            createdAt: new Date(),
          });
        } catch (error) {
          console.error("Error storing user data:", error);
        }

        return cred.user;
      },
      async signOut() {
        await signOut(auth);
      },
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
