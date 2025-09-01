// firebase.js — wire your real Firebase config here
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

/* 1) Replace with YOUR Firebase web config (Project settings → General → Your apps → Web) */
const firebaseConfig = {
  apiKey: "AIzaSyBEkph2jnubq_FvZUcHOR2paKoOKhRaULg",
  authDomain: "openlearn-mm.firebaseapp.com",
  projectId: "openlearn-mm",
  storageBucket: "openlearn-mm.firebasestorage.app",
  messagingSenderId: "977262127138",
  appId: "1:977262127138:web:0ee1d4ac3c45f1334f427b",
  measurementId: "G-E65G177ZNJ",
};

/* 2) Initialize */
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

/* 3) Re-exports for app.js */
export {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
};
