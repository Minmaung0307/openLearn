// firebase.js — Fill your Firebase config then reload.
// Uses Firebase v10 modular CDN builds.

export const ADMIN_KEY = "ADMIN2025";

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// === Fill your Firebase config here ===
const firebaseConfig = {
  apiKey: "AIzaSyBEkph2jnubq_FvZUcHOR2paKoOKhRaULg",
  authDomain: "openlearn-mm.firebaseapp.com",
  projectId: "openlearn-mm",
  storageBucket: "openlearn-mm.firebasestorage.app",
  messagingSenderId: "977262127138",
  appId: "1:977262127138:web:0ee1d4ac3c45f1334f427b",
  measurementId: "G-E65G177ZNJ",
};
// =====================================

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// re-export helpers for convenience
export {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  serverTimestamp,
  ref,
  uploadBytesResumable,
  getDownloadURL,
};
