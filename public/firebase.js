import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
const firebaseConfig = { apiKey: "AIzaSyBEkph2jnubq_FvZUcHOR2paKoOKhRaULg", authDomain: "openlearn-mm.firebaseapp.com", projectId: "openlearn-mm", storageBucket: "openlearn-mm.firebasestorage.app", messagingSenderId: "977262127138", appId: "1:977262127138:web:0ee1d4ac3c45f1334f427b" };
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut, doc, getDoc, setDoc };
