// firebase.js — LIVE + Local fallback
// Fill your real config below. If left empty, the app stays in local demo mode.
const firebaseConfig = {
  apiKey: "AIzaSyBEkph2jnubq_FvZUcHOR2paKoOKhRaULg",
  authDomain: "openlearn-mm.firebaseapp.com",
  projectId: "openlearn-mm",
  storageBucket: "openlearn-mm.firebasestorage.app",
  messagingSenderId: "977262127138",
  appId: "1:977262127138:web:0ee1d4ac3c45f1334f427b",
  measurementId: "G-E65G177ZNJ",
  databaseURL: "https://openlearn-mm-default-rtdb.firebaseio.com/"
};

let LIVE = !!firebaseConfig.apiKey;

let app, auth, db, storage, rtdb;
// Realtime Database helpers re-exports
let rtdbRef, rtdbOnChildAdded, rtdbPush, rtdbSet, rtdbServerTs;

let onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
    signOut, sendPasswordResetEmail, updateProfile;

let fsCollection, fsAddDoc, fsSetDoc, fsServerTimestamp,
    fsDoc, fsGetDoc, fsGetDocs, fsQuery, fsOrderBy, fsWhere, fsLimit;

if (LIVE) {
  // Import from CDN (Firebase v10+)
  const [
    appMod,
    authMod,
    fsMod,
    stMod,
    dbMod
  ] = await Promise.all([
    import("https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js"),
    import("https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js"),
    import("https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js"),
    import("https://www.gstatic.com/firebasejs/10.12.3/firebase-storage.js"),
    import("https://www.gstatic.com/firebasejs/10.12.3/firebase-database.js")
  ]);

  app = appMod.initializeApp(firebaseConfig);

  // Auth
  auth = authMod.getAuth(app);
  ({ onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
     signOut, sendPasswordResetEmail, updateProfile } = authMod);

  // Firestore
  db = fsMod.getFirestore(app);
  fsCollection = fsMod.collection;
  fsAddDoc     = fsMod.addDoc;
  fsSetDoc     = fsMod.setDoc;
  fsServerTimestamp = fsMod.serverTimestamp;
  fsDoc        = fsMod.doc;
  fsGetDoc     = fsMod.getDoc;
  fsGetDocs    = fsMod.getDocs;
  fsQuery      = fsMod.query;
  fsOrderBy    = fsMod.orderBy;
  fsWhere      = fsMod.where;
  fsLimit      = fsMod.limit;

  // Storage (export only if you need later)
  storage = stMod.getStorage(app);

  // Realtime DB (chat/announcements/presence)
  rtdb = dbMod.getDatabase(app);
  rtdbRef = dbMod.ref;
  rtdbOnChildAdded = dbMod.onChildAdded;
  rtdbPush = dbMod.push;
  rtdbSet = dbMod.set;
  rtdbServerTs = dbMod.serverTimestamp;
} else {
  // Local demo stubs (keeps previous behavior)
  app = {}; auth = {}; db = {};
  onAuthStateChanged = (a, cb) => cb(null);
  signInWithEmailAndPassword = async()=>({user:null});
  createUserWithEmailAndPassword = async()=>({user:null});
  signOut = async()=>({}); sendPasswordResetEmail = async()=>({}); updateProfile = async()=>({});

  fsCollection=()=>({}); fsAddDoc=async()=>({id:"loc"}); fsSetDoc=async()=>({});
  fsServerTimestamp = ()=>Date.now();
  fsDoc=()=>({}); fsGetDoc=async()=>({exists:()=>false,data:()=>null});
  fsGetDocs=async()=>({docs:[]}); fsQuery=()=>({}); fsOrderBy=()=>({}); fsWhere=()=>({}); fsLimit=()=>({});

  rtdb = null; rtdbRef=()=>({}); rtdbOnChildAdded=()=>{}; rtdbPush=async()=>({}); rtdbSet=async()=>({}); rtdbServerTs=()=>Date.now();
}

// Export common API for app.js
export {
  LIVE, app, auth, db, storage, rtdb,
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, sendPasswordResetEmail, updateProfile,
  fsCollection as collection, fsAddDoc as addDoc, fsSetDoc as setDoc, fsServerTimestamp as serverTimestamp,
  fsDoc as doc, fsGetDoc as getDoc, fsGetDocs as getDocs, fsQuery as query, fsOrderBy as orderBy,
  fsWhere as where, fsLimit as limit,
  rtdbRef as rRef, rtdbOnChildAdded as onChildAdded, rtdbPush as push, rtdbSet as rSet, rtdbServerTs as rServerTs
};