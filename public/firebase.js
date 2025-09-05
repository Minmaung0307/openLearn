// /firebase.js  (type="module")
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
  collection, addDoc, serverTimestamp,
  doc, getDoc, getDocs,
  query, orderBy, where, limit,
  setDoc, updateDoc, deleteDoc   // ← add these if your app uses them
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const CFG_ROOT = (window && window.OPENLEARN_CFG) ? window.OPENLEARN_CFG : null;
if (!CFG_ROOT || !CFG_ROOT.firebase) {
  throw new Error("config.js missing: window.OPENLEARN_CFG.firebase");
}
const firebaseConfig = CFG_ROOT.firebase;

export const app  = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);

// re-exports (app.js/importsမှာတိတိကျကျ ကိုက်အောင်)
export {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,

  collection, addDoc, serverTimestamp,
  doc, getDoc, getDocs,
  query, orderBy, where, limit,
  setDoc, updateDoc, deleteDoc
};