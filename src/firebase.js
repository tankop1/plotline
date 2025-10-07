import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyCjHyet99GsVjIZZ-nUjzmTIJxZ1b1ZirM",
  authDomain: "plotlinescript.firebaseapp.com",
  projectId: "plotlinescript",
  storageBucket: "plotlinescript.firebasestorage.app",
  messagingSenderId: "724797374477",
  appId: "1:724797374477:web:49a0367edc366725ec9544",
  measurementId: "G-4FKBQ3EXCR",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Analytics is optional and only in browsers that support it
isSupported()
  .then((ok) => {
    if (ok) getAnalytics(app);
  })
  .catch(() => {});
