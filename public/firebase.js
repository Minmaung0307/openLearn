// public/firebase.js
const CDN = "https://www.gstatic.com/firebasejs/10.12.2";

import { initializeApp, getApps } from `${CDN}/firebase-app.js`;
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
} from `${CDN}/firebase-auth.js`;
import {
  getFirestore,
  collection, addDoc, serverTimestamp,
  doc, getDoc, getDocs,
  query, orderBy, where, limit
} from `${CDN}/firebase-firestore.js`;

const cfg = (window.OPENLEARN_CFG && window.OPENLEARN_CFG.firebase) || null;
if (!cfg) {
  // ဒီတန်းမှာ throw လုပ်နေတဲ့အတွက် error ပေါ်နေတာ — နူးညံ့အောင် ပြောင်းပေးထားတယ်
  console.error("config.js missing or invalid → window.OPENLEARN_CFG.firebase not found");
  // သို့သော် app boot မစောင်းအောင် early return အစား throw (ရွေးချယ်နိုင်)
  // throw new Error("config.js missing: window.OPENLEARN_CFG.firebase");
}

// init (guard against double init)
const app = getApps().length ? getApps()[0] : initializeApp(cfg || {
  apiKey:"demo", projectId:"demo", appId:"demo"
});

const auth = getAuth(app);
const db   = getFirestore(app);

// ---- Re-exports for app.js / login.js
export {
  app, auth, db,
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, sendPasswordResetEmail, updateProfile,
  collection, addDoc, serverTimestamp,
  doc, getDoc, getDocs, query, orderBy, where, limit
};