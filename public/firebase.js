/* firebase.js — ESM build (v10) */

// ---- Mute noisy terminate logs ----
(function muteFirestoreTerminate400(){
  const noisy = /google\.firestore\.v1\.Firestore\/(Write|Listen)\/channel.*TYPE=terminate/i;
  const E = console.error, W = console.warn;
  console.error = (...args)=> args.some(a=> typeof a==="string" && noisy.test(a)) ? void 0 : E.apply(console,args);
  console.warn  = (...args)=> args.some(a=> typeof a==="string" && noisy.test(a)) ? void 0 : W.apply(console,args);
})();

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

/* Auth (CDN) */
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signOut,
  useDeviceLanguage,
  signInAnonymously,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

/* Firestore (CDN) */
import {
  getFirestore,
  collection,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  doc,
  getDoc,
  getDocs,
  query as fsQuery,
  orderBy as fsOrderBy,
  where,
  limit,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* RTDB (CDN) */
import {
  getDatabase,
  ref,
  push,
  onChildAdded,
  set,
  get as rtdbGet,
  child,
  remove as rtdbRemove,
  query as rtdbQuery,
  orderByChild,
  endAt as rtdbEndAt,
  startAt as rtdbStartAt,
  limitToLast,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

/* Storage (CDN) */
import {
  getStorage, ref as sRef, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

/* ===== Config guard ===== */
const cfg = (window.OPENLEARN_CFG && window.OPENLEARN_CFG.firebase) || null;
if (!cfg) throw new Error("config.js missing: window.OPENLEARN_CFG.firebase");

/* ===== Initialize Firebase ===== */
export const app = initializeApp(cfg);

/* Auth */
export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch(() => {});
try { useDeviceLanguage(auth); } catch {}

/* Firestore / RTDB / Storage instances */
export const db = getFirestore(app);
export const storage = getStorage(app);

/* ===== Re-exports (ONLY from CDN modules above) ===== */
// Auth
export {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signOut,
  signInAnonymously,
};

// Firestore
export {
  collection,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  doc,
  getDoc,
  getDocs,
  fsQuery,
  fsOrderBy,
  where,
  limit,
  onSnapshot,
};

// RTDB
export {
  getDatabase,
  ref,
  push,
  onChildAdded,
  set,
  rtdbGet,
  child,
  rtdbRemove,
  rtdbQuery,
  orderByChild,
  rtdbEndAt,
  rtdbStartAt,
  limitToLast,
};

// Storage
export { sRef as storageRef, uploadBytes, getDownloadURL };

/* ===== Optional: PayPal loader ===== */
export async function ensurePayPal() {
  const cid = (window.OPENLEARN_CFG && window.OPENLEARN_CFG.paypalClientId) || "";
  if (!cid) { console.warn("PayPal client ID not set; demo flow only."); return null; }
  if (window.paypal) return window.paypal;
  await new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(cid)}&currency=USD`;
    s.async = true;
    s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
  return window.paypal || null;
}

/* ===== Optional: EmailJS init ===== */
export function initEmailJS() {
  const e = window.OPENLEARN_CFG && window.OPENLEARN_CFG.emailjs;
  if (!e || !e.publicKey) { console.warn("EmailJS publicKey not set."); return; }
  if (!window.emailjs) {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/emailjs-com@3/dist/email.min.js";
    s.async = true;
    s.onload = () => window.emailjs.init(e.publicKey);
    document.head.appendChild(s);
  } else {
    try { window.emailjs.init(e.publicKey); } catch {}
  }
}