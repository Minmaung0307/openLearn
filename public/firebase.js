// firebase.js — wire your real Firebase config here (Auth + Firestore re-exports)
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
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  getDocs,
  query,
  orderBy,
  where,
  limit,
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

/* Replace with YOUR Firebase web config */
const firebaseConfig = {
  apiKey: "AIzaSyBEkph2jnubq_FvZUcHOR2paKoOKhRaULg",
  authDomain: "openlearn-mm.firebaseapp.com",
  projectId: "openlearn-mm",
  storageBucket: "openlearn-mm.firebasestorage.app",
  messagingSenderId: "977262127138",
  appId: "1:977262127138:web:0ee1d4ac3c45f1334f427b",
  measurementId: "G-E65G177ZNJ",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Re-exports so app.js can import from here only
export {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
  collection,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  getDocs,
  query,
  orderBy,
  where,
  limit,
};
