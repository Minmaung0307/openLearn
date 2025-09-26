/* firebase.js — ESM build (v10)
   Make sure config.js is loaded BEFORE this file:
   <script src="/config.js"></script>
   <script type="module" src="/firebase.js"></script>
*/
// (firebase.js very top)
(function muteFirestoreWebChannelNoise(){
  const noisy = /google\.firestore\.v1\.Firestore\/Listen\/channel/i;
  const origE = console.error, origW = console.warn;
  console.error = function(...a){ if(a.some(x=> typeof x==="string" && noisy.test(x))) return; origE.apply(console,a); };
  console.warn  = function(...a){ if(a.some(x=> typeof x==="string" && noisy.test(x))) return; origW.apply(console,a); };
})();
// ---- Put this at TOP of firebase.js, BEFORE initializing Firebase ----
(function muteFirestoreTerminate400(){
  const noisy = /google\.firestore\.v1\.Firestore\/(Write|Listen)\/channel.*TYPE=terminate/i;
  const origE = console.error, origW = console.warn;
  console.error = function(...args){ if(args.some(a=> typeof a==="string" && noisy.test(a))) return; origE.apply(console,args); };
  console.warn  = function(...args){ if(args.some(a=> typeof a==="string" && noisy.test(a))) return; origW.apply(console,args); };
})();

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
  signOut,
  useDeviceLanguage,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  initializeFirestore,
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
  limit,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* (Optional) RTDB — used by Live Chat if available */
import {
  getDatabase,
  ref,
  push,
  onChildAdded,
  onChildChanged,   // ★ add
  onChildRemoved,   // ★ add
  set,
  get, 
  child,
  remove,
  // Optional client-side filtering (if your app.js uses it):
  query as rtdbQuery,
  orderByChild,
  startAt as rtdbStartAt,
  limitToLast
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

import {
  getStorage, ref as sRef, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

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
try { useDeviceLanguage(auth); } catch {}

/* Firestore */
// export const db = getFirestore(app);
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,   // သာမာန် dev/proxy အပြင်အဆင်တွေမှာ work ပိုတည်ငြိမ်
  // experimentalForceLongPolling: true,     // ဒီတန်းပြန်ဖွင့်ရင် long-polling ကို အမြဲသုံး
  ignoreUndefinedProperties: true
});

/* RTDB instance (★ add this) */
export const rtdb = getDatabase(app);

export const storage = getStorage(app);

export { sRef as storageRef, uploadBytes, getDownloadURL };

/* RTDB (exported for optional chat) */
export { 
  getDatabase, 
  ref, 
  push, 
  onChildAdded, 
  onChildChanged,   // ★
  onChildRemoved,   // ★
  set, 
  get, 
  child, 
  remove,
  // Optional client-side filtering:
  rtdbQuery,
  orderByChild,
  rtdbStartAt,
  limitToLast };

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
  limit,
  onSnapshot
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

export { signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

(function muteFirestoreNoise(){
  const noisy = /(google\.firestore\.v1\.Firestore\/(Write|Listen)\/channel.*(TYPE=terminate|RID=rpc)|WebChannelConnection.*transport errored|net::ERR_QUIC_PROTOCOL_ERROR)/i;
  const origE = console.error, origW = console.warn;
  console.error = function(...args){
    if (args.some(a => typeof a === "string" && noisy.test(a))) return;
    origE.apply(console, args);
  };
  console.warn = function(...args){
    if (args.some(a => typeof a === "string" && noisy.test(a))) return;
    origW.apply(console, args);
  };
})();