// export const app = { options: { projectId: "LOCAL_ONLY" } };
// export const auth = {}; export const db = {};
export const onAuthStateChanged = (a, cb)=> cb(null);
export const signInWithEmailAndPassword = async()=>({});
export const createUserWithEmailAndPassword = async()=>({});
export const signOut = async()=>({}); export const sendPasswordResetEmail = async()=>({});
export const updateProfile = async()=>({});
export const collection = ()=>({}); export const addDoc = async()=>({});
export const serverTimestamp = ()=> Date.now(); export const doc=()=>({});
export const getDoc=async()=>({}); export const getDocs=async()=>({docs:[]});
export const query=()=>({}); export const orderBy=()=>({}); export const where=()=>({}); export const limit=()=>({});


// /public/firebase.js
// Firebase v10+ Modular
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, onAuthStateChanged,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, sendPasswordResetEmail, updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, collection, addDoc, serverTimestamp,
  doc, getDoc, getDocs, query, orderBy, where, limit
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export const app = initializeApp({
  apiKey: "AIzaSyBEkph2jnubq_FvZUcHOR2paKoOKhRaULg",
  authDomain: "openlearn-mm.firebaseapp.com",
  projectId: "openlearn-mm",
  storageBucket: "openlearn-mm.firebasestorage.app",
  messagingSenderId: "977262127138",
  appId: "1:977262127138:web:0ee1d4ac3c45f1334f427b",
  measurementId: "G-E65G177ZNJ",
});
export const auth = getAuth(app);
export const db   = getFirestore(app);

// Re-exports used by app.js
export {
  onAuthStateChanged,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, sendPasswordResetEmail, updateProfile,
  collection, addDoc, serverTimestamp,
  doc, getDoc, getDocs, query, orderBy, where, limit
};