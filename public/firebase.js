export const firebaseConfig = {
  apiKey: "AIzaSyBEkph2jnubq_FvZUcHOR2paKoOKhRaULg",
  authDomain: "openlearn-mm.firebaseapp.com",
  projectId: "openlearn-mm",
  storageBucket: "openlearn-mm.firebasestorage.app",
  messagingSenderId: "977262127138",
  appId: "1:977262127138:web:0ee1d4ac3c45f1334f427b",
  measurementId: "G-E65G177ZNJ",
};
let app, auth, db, storage;
let compat = {};
async function ensure() {
  if (app) return;
  const sdk = await import(
    "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js"
  );
  const au = await import(
    "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js"
  );
  const fs = await import(
    "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js"
  );
  const st = await import(
    "https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js"
  );
  app = sdk.initializeApp(firebaseConfig);
  auth = au.getAuth(app);
  db = fs.getFirestore(app);
  storage = st.getStorage(app);
  Object.assign(compat, { ...au, ...fs, ...st });
}
await ensure();
export { app, auth, db, storage };
export const {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  limit,
  ref,
  uploadBytes,
  getDownloadURL,
} = compat;
