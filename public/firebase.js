const CDN = "https://www.gstatic.com/firebasejs/10.12.2";

import { initializeApp, getApps } from `${CDN}/firebase-app.js`;
import {
  getAuth, onAuthStateChanged,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendPasswordResetEmail, signOut, updateProfile
} from `${CDN}/firebase-auth.js`;
import {
  getFirestore, collection, addDoc, setDoc, getDoc, getDocs,
  doc, query, orderBy, limit, serverTimestamp, updateDoc, deleteDoc
} from `${CDN}/firebase-firestore.js`;

let cfg = (window.OPENLEARN_CFG && window.OPENLEARN_CFG.firebase) || null;
export const HAS_CONFIG = !!cfg;

const app = getApps().length
  ? getApps()[0]
  : initializeApp(
      cfg || { apiKey:"demo", authDomain:"demo.firebaseapp.com", projectId:"demo", appId:"demo" }
    );

const auth = getAuth(app);
const db   = getFirestore(app);

export {
  app, auth, db,
  onAuthStateChanged,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendPasswordResetEmail, signOut, updateProfile,
  collection, addDoc, setDoc, getDoc, getDocs, doc, query, orderBy, limit, serverTimestamp, updateDoc, deleteDoc
};