/* firebase.js — ESM build (v10)
   Make sure config.js is loaded BEFORE this file:
   <script src="/config.js"></script>
   <script type="module" src="/firebase.js"></script>
*/

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

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
  query,
  orderBy,
  where,
  limit
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* (Optional) RTDB — used by Live Chat if available */
import {
  getDatabase,
  ref,
  push,
  onChildAdded
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

/* ===== Config guard ===== */
const cfg = (window.OPENLEARN_CFG && window.OPENLEARN_CFG.firebase) || null;
if (!cfg) {
  throw new Error("config.js missing: window.OPENLEARN_CFG.firebase");
}

/* ===== Initialize Firebase ===== */
export const app = initializeApp(cfg);

/* Auth */
export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch(() => {});
// (Optional) nicer emails for some locales
try { auth.useDeviceLanguage(); } catch {}

/* Firestore */
export const db = getFirestore(app);

/* RTDB (exported for optional chat) */
export { getDatabase, ref, push, onChildAdded };

/* Re-export frequently used Firebase helpers for convenience */
export {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signOut,
  collection,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  doc,
  getDoc,
  getDocs,
  query,
  orderBy,
  where,
  limit
};

/* ===== PayPal SDK injector (optional) =====
   Use like:
   import { ensurePayPal } from "./firebase.js";
   await ensurePayPal(); // window.paypal becomes available
*/
export async function ensurePayPal() {
  const cid = (window.OPENLEARN_CFG && window.OPENLEARN_CFG.paypalClientId) || "";
  if (!cid) {
    console.warn("PayPal client ID not set in config.js; demo flow will be used.");
    return null;
  }
  if (window.paypal) return window.paypal;
  await new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(cid)}&currency=USD`;
    s.async = true;
    s.onload = res;
    s.onerror = rej;
    document.head.appendChild(s);
  });
  return window.paypal || null;
}

/* ===== EmailJS init helper (optional) =====
   Use like:
   import { initEmailJS } from "./firebase.js";
   initEmailJS();
*/
export function initEmailJS() {
  const e = window.OPENLEARN_CFG && window.OPENLEARN_CFG.emailjs;
  if (!e || !e.publicKey) {
    console.warn("EmailJS publicKey not set; contact form will be local-only.");
    return;
  }
  // Load SDK if not present
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