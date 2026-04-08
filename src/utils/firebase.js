import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDOKjVgOuLviniw3NzW3h6ngDtRrM4s7DM",
  authDomain: "komodo-hub-dfbd6.firebaseapp.com",
  projectId: "komodo-hub-dfbd6",
  storageBucket: "komodo-hub-dfbd6.appspot.com",
  messagingSenderId: "515579200402",
  appId: "1:515579200402:web:cffd26eadea488e364b74b",
  measurementId: "G-77T57N7M5R"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
