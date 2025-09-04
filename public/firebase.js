// /firebase.js  (type=module)
const CDN = "https://www.gstatic.com/firebasejs/10.12.2";

const appMod   = await import(`${CDN}/firebase-app.js`);
const authMod  = await import(`${CDN}/firebase-auth.js`);
const fsMod    = await import(`${CDN}/firebase-firestore.js`);

const cfg = (window.OPENLEARN_CFG && window.OPENLEARN_CFG.firebase) || null;

let app = null, auth = null, db = null;
let USE_DB = false;

if (cfg) {
  app = appMod.initializeApp(cfg);
  auth = authMod.getAuth(app);
  try {
    db = fsMod.getFirestore(app);
    USE_DB = true;
  } catch {
    USE_DB = false;
  }
} else {
  console.warn("config.js missing firebase → running in LOCAL mode (no login, no cloud DB).");
  // create a dummy app/auth to avoid crashes where imported names are expected
  app = { options: { localOnly: true } };
  // Fake auth shim (minimal) so onAuthStateChanged etc. won’t crash in local mode
  const listeners = new Set();
  auth = {
    currentUser: null,
    _emit(u){ this.currentUser=u; listeners.forEach(fn=>fn(u)); }
  };
  // emit null once
  setTimeout(()=>auth._emit(null), 0);
  USE_DB = false;
}

// ==== re-exports (named) ====
// app/auth/db handles
export { app, auth, db };
// auth functions
export const {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile
} = authMod;
// firestore functions
export const {
  collection, addDoc, serverTimestamp,
  doc, getDoc, getDocs, query, orderBy, where, limit
} = fsMod;

// helper for other modules to know mode
export { USE_DB };