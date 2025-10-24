import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAkxZ-JquqaVtA61THhGufGpf6V1YEEBZM",
  authDomain: "ai-image-19627.firebaseapp.com",
  projectId: "ai-image-19627",
  storageBucket: "ai-image-19627.appspot.com",
  messagingSenderId: "79218128745",
  appId: "1:79218128745:web:837e0366e41943ff442ff8",
  measurementId: "G-ZSZD7YRF6P"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();