// /firebase.js  (type="module" ဖြင့် လှမ်းခေါ်မယ်)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, sendPasswordResetEmail, signOut, updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import {
  getFirestore, collection, addDoc, serverTimestamp, doc, getDoc,
  getDocs, setDoc, updateDoc, deleteDoc, query, orderBy, where, limit
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import {
  getStorage, ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js";

const cfg = window.OPENLEARN_CFG?.firebase;
if (!cfg) throw new Error("config.js missing: window.OPENLEARN_CFG.firebase");

export const app = initializeApp(cfg);
export const auth = getAuth(app);
export const db   = getFirestore(app);
export const stg  = getStorage(app);

// ===== Auth helpers =====
export async function doLogin(email, pass){ return signInWithEmailAndPassword(auth, email, pass); }
export async function doSignup(email, pass){ return createUserWithEmailAndPassword(auth, email, pass); }
export async function doForgot(email){ return sendPasswordResetEmail(auth, email); }
export async function doLogout(){ return signOut(auth); }
export function onAuth(cb){ return onAuthStateChanged(auth, cb); }

// ===== Firestore helpers (Announcements / Courses minimal) =====
export const col = (name)=> collection(db, name);
export const docRef = (name,id)=> doc(db, name, id);

export async function addAnnouncement({title,body,uid}){
  return addDoc(col("announcements"), { title, body, uid, ts: serverTimestamp() });
}
export async function listAnnouncements(){
  const q = query(col("announcements"), orderBy("ts","desc"), limit(50));
  const snap = await getDocs(q);
  return snap.docs.map(d=>({id:d.id, ...d.data()}));
}

// Courses (catalog)
export async function listCourses(limitN=50){
  const q = query(col("courses"), orderBy("title"), limit(limitN));
  const snap = await getDocs(q);
  return snap.docs.map(d=>({id:d.id, ...d.data()}));
}
export async function createCourse(data){
  data.ts = serverTimestamp();
  return addDoc(col("courses"), data);
}
export async function updateCourse(id, data){ return updateDoc(docRef("courses", id), data); }
export async function deleteCourse(id){ return deleteDoc(docRef("courses", id)); }