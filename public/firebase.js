// /firebase.js  (type="module" ဖြင့် load မယ်)
// No template strings on top; no ESM export mistakes.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  getDocs,
  query,
  orderBy,
  where,
  limit,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ---- Config guard (no backticks here)
const CFG_ROOT = (window && window.OPENLEARN_CFG) ? window.OPENLEARN_CFG : null;
if (!CFG_ROOT || !CFG_ROOT.firebase) {
  // throw a *plain* Error so you see a clear message but no syntax errors
  throw new Error("config.js missing: window.OPENLEARN_CFG.firebase");
}
const firebaseConfig = CFG_ROOT.firebase;

// ---- Init
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// ---- Re-exports (exact names your app imports)
export {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  collection,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  getDocs,
  query,
  orderBy,
  where,
  limit,
};