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
  updateProfile
} from `${CDN}/firebase-auth.js`;
import {
  getFirestore,
  collection, addDoc, serverTimestamp,
  doc, getDoc, getDocs, query, orderBy, where, limit
} from `${CDN}/firebase-firestore.js`;

// ---- Config (no-throw)
const cfg = (window.OPENLEARN_CFG && window.OPENLEARN_CFG.firebase) || null;
export const HAS_CONFIG = !!cfg;

if (!HAS_CONFIG) {
  console.warn("[OpenLearn] config.js missing → demo init (auth will fail until you add real config)");
}

// ---- Initialize
const app = getApps().length
  ? getApps()[0]
  : initializeApp(
      cfg || {
        apiKey: "demo",
        authDomain: "demo.firebaseapp.com",
        projectId: "demo",
        appId: "1:demo:web:demo"
      }
    );

const auth = getAuth(app);
const db   = getFirestore(app);

// Exports
export {
  app, auth, db,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  collection, addDoc, serverTimestamp,
  doc, getDoc, getDocs, query, orderBy, where, limit
};