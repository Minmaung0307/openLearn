/* =========================================================
   OpenLearn · app.js (Improved)
   Part 1/6 — Imports, helpers, theme, state, roles
   ========================================================= */
/* app.js — single-source imports only */

// ===== Imports =====
import {
  app,
  db,
  storage,
  auth,
  // ----- Auth
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  signInAnonymously,
  // ----- Firestore
  collection,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  doc,
  getDoc,
  getDocs,
  fsQuery,
  fsOrderBy,
  where,
  limit,
  onSnapshot,
  // ----- Storage
  storageRef,
  uploadBytes,
  getDownloadURL,

  // ----- RTDB (optional)
  getDatabase,
  ref,
  push,
  onChildAdded,
  set as rtdbSet,
  rtdbGet,
  child,
  rtdbRemove,
  rtdbQuery,
  orderByChild,
  rtdbEndAt,
  rtdbStartAt,
  limitToLast,
} from "./firebase.js";

/* =========================================================
   Globals / State (LS-backed)
========================================================= */

const LS = window.localStorage;
const SS = window.sessionStorage;

const _OL = {
  version: "2025-09-14",
  build: "clean-ux",
  bootTS: Date.now(),
};

// Feature flags
const FF = {
  CHAT_RTC: false,
  DASH_NEW_CARD: true,
  FORCE_NO_FINALS: true,
};

// Roles
const ROLES = ["owner", "admin", "instructor", "ta", "student"];

// Reactive auth flag
let IS_AUTHED = false;

// UI cache
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/* =========================================================
   Theme / Fonts
========================================================= */
function applyPalette(name) {
  try {
    document.documentElement.dataset.theme = name;
    LS.setItem("ol_theme", name);
  } catch {}
}
function applyFont(size) {
  try {
    document.documentElement.style.setProperty("--fontSize", `${size}px`);
    LS.setItem("ol_font", size);
  } catch {}
}

/* =========================================================
   Utility — toast / sleep
========================================================= */
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function toast(msg, ms = 2000) {
  let t = $("#toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "toast";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), ms);
}

/* =========================================================
   Local Profile & Progress (scoped by uid/email)
========================================================= */
function currentUidKey() {
  const u = auth?.currentUser;
  if (u?.uid) return `uid:${u.uid}`;
  const e = getUser()?.email;
  return e ? `email:${e}` : "anon";
}

function getUser() {
  try { return JSON.parse(LS.getItem("ol_user") || "null"); } catch { return null; }
}
function setUser(u) {
  try {
    if (!u) LS.removeItem("ol_user");
    else LS.setItem("ol_user", JSON.stringify(u));
  } catch {}
}
function setLogged(ok, email = "") {
  document.body.classList.toggle("logged", !!ok);
  document.body.classList.toggle("anon", !ok);
  const bLogin = $("#btn-login");
  const bLogout = $("#btn-logout");
  if (bLogin)  bLogin.style.display  = ok ? "none" : "";
  if (bLogout) bLogout.style.display = ok ? "" : "none";
  if (ok) setUser({ ...(getUser()||{}), email: email || (getUser()?.email||"") });
}

function _scopeKey(base) {
  return `ol_scope:${base}`;
}
function _snapshotBaseToScope(scopeKey) {
  try {
    const base = {
      progress: LS.getItem("ol_progress") || "[]",
      enrolls:  LS.getItem("ol_enrolls") || "[]",
      profile:  LS.getItem("ol_profile") || "{}",
    };
    LS.setItem(_scopeKey(scopeKey), JSON.stringify(base));
  } catch {}
}
function _restoreScopeToBase(scopeKey) {
  try {
    const s = JSON.parse(LS.getItem(_scopeKey(scopeKey)) || "null");
    if (!s) return;
    if (s.progress) LS.setItem("ol_progress", s.progress);
    if (s.enrolls)  LS.setItem("ol_enrolls", s.enrolls);
    if (s.profile)  LS.setItem("ol_profile", s.profile);
  } catch {}
}

let _ACTIVE_UID_SCOPE = null;
function switchLocalStateForUser(newUidKey) {
  const target = newUidKey || "anon";
  if (_ACTIVE_UID_SCOPE === target) return;

  if (_ACTIVE_UID_SCOPE !== null) {
    try { _snapshotBaseToScope(_ACTIVE_UID_SCOPE); } catch {}
    queueMicrotask(() => requestIdleCallback?.(()=>{}));
  }
  _ACTIVE_UID_SCOPE = target;
  try { _restoreScopeToBase(_ACTIVE_UID_SCOPE); } catch {}

  try {
    renderCatalog();
    const hash = (location.hash || "#catalog").slice(1);
    if (hash === "mylearning") window.renderMyLearning?.();
    else if (hash === "profile") window.renderProfilePanel?.();
    else if (hash === "gradebook") window.renderGradebook?.();
  } catch {}
}

/* =========================================================
   Courses / Catalog — LS + FS
========================================================= */

function getCourses() {
  try { return JSON.parse(LS.getItem("ol_courses") || "[]"); } catch { return []; }
}
function setCourses(arr) {
  try { LS.setItem("ol_courses", JSON.stringify(arr || [])); } catch {}
}

async function loadCatalog() {
  // In demo, we may use static JSON or Firestore
  try {
    const col = collection(db, "courses");
    const q = fsQuery(col, fsOrderBy("ts","desc"), limit(50));
    const snap = await getDocs(q);
    const out = [];
    snap.forEach(d => out.push({ id: d.id, ...d.data() }));
    setCourses(out);
  } catch (e) {
    console.warn("loadCatalog fallback:", e?.message);
    // fallback to cached
  }
}

function renderCatalog() {
  const grid = $("#coursesGrid");
  if (!grid) return;
  const data = getCourses();
  grid.innerHTML = data.map(c => `
    <div class="card course" data-id="${c.id}">
      <div class="course-cover" style="background-image:url('${c.cover||""}')"></div>
      <div class="course-body">
        <div class="row">
          <h4 class="h4 grow">${c.title||"Untitled"}</h4>
          <button class="btn small" data-enroll="${c.id}">Enroll</button>
        </div>
        <div class="muted">${c.desc||""}</div>
      </div>
    </div>
  `).join("");
}

/* =========================================================
   Enrolls/Progress (LS; cloud sync helpers below)
========================================================= */
function getEnrolls() {
  try { return JSON.parse(LS.getItem("ol_enrolls") || "[]"); } catch { return []; }
}
function setEnrolls(arr) {
  try { LS.setItem("ol_enrolls", JSON.stringify(arr||[])); } catch {}
}

function getCompletedRaw() {
  try { return JSON.parse(LS.getItem("ol_progress") || "[]"); } catch { return []; }
}
function setCompletedRaw(arr) {
  try { LS.setItem("ol_progress", JSON.stringify(arr||[])); } catch {}
}
function getCompleted() { return new Set(getCompletedRaw()); }
function markCourseComplete(id) {
  const s = getCompleted();
  s.add(id);
  setCompletedRaw(Array.from(s));
}

/* =========================================================
   Profile panel / Gradebook (render stubs)
========================================================= */
function renderProfilePanel() {
  const host = $("#profilePanel");
  if (!host) return;
  const u = getUser();
  host.innerHTML = `
    <div class="card">
      <div class="row">
        <strong class="grow">${u?.email || "Guest"}</strong>
        <span class="muted">${u?.role || "student"}</span>
      </div>
    </div>`;
}

function renderMyLearning() {
  const host = $("#myLearning");
  if (!host) return;
  const enrolled = new Set(getEnrolls());
  const data = getCourses().filter(c=>enrolled.has(c.id));
  host.innerHTML = data.length
    ? data.map(c=> `<div class="card"><strong>${c.title}</strong><div class="muted">${c.desc||""}</div></div>`).join("")
    : `<div class="card muted">No courses yet.</div>`;
}

function renderGradebook() {
  const host = $("#gradebook");
  if (!host) return;
  const s = Array.from(getCompleted());
  host.innerHTML = `<div class="card">Completed: ${s.length}</div>`;
}

/* =========================================================
   Admin import/export (one-time wiring)
========================================================= */
function wireAdminImportExportOnce() {
  if (window._wiredAdminIO) return; window._wiredAdminIO = true;
  const imp = $("#btnAdminImport");
  const exp = $("#btnAdminExport");
  imp?.addEventListener("change", async (e) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      const txt = await file.text();
      const arr = JSON.parse(txt);
      setCourses(arr);
      renderCatalog();
      toast("Imported");
    } catch (e) { console.error(e); toast("Import failed"); }
  });
  exp?.addEventListener("click", () => {
    try {
      const blob = new Blob([JSON.stringify(getCourses(), null, 2)], {type:"application/json"});
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "courses.json";
      a.click();
      toast("Exported");
    } catch (e) { console.error(e); toast("Export failed"); }
  });
}

/* =========================================================
   Chat (RTDB minimal demo)
========================================================= */
function gateChatUI() {
  const input = $("#chatInput");
  const btn = $("#chatSend");
  const authed = !!auth?.currentUser && !auth.currentUser.isAnonymous;
  input?.classList.toggle("gated", !authed);
  btn?.classList.toggle("gated", !authed);
}

function initChatRealtime() {
  try {
    const dbR = getDatabase();
    const q = rtdbQuery(ref(dbR, "announcements/global"), orderByChild("ts"), limitToLast(20));
    onChildAdded(q, (snap) => {
      // could render to dashboard ticker...
    });
  } catch {}
}

/* =========================================================
   Sidebar / Router (fast)
========================================================= */
let _CURRENT_PAGE_ID = null;

function showPage(id, push = true) {
  if (!id) id = "catalog";
  if (id === _CURRENT_PAGE_ID) return;

  const prev = document.querySelector("main .page.visible");
  if (prev) prev.classList.remove("visible");

  const next = document.getElementById("page-" + id);
  if (next) next.classList.add("visible");

  const activeBtn = document.querySelector('#sidebar .navbtn.active');
  if (activeBtn) activeBtn.classList.remove('active');
  const nextBtn = document.querySelector(`#sidebar .navbtn[data-page="${id}"]`);
  if (nextBtn) nextBtn.classList.add('active');

  if (id === "mylearning") window.renderMyLearning?.();
  else if (id === "gradebook") window.renderGradebook?.();
  else if (id === "admin") window.renderAdminTable?.();
  else if (id === "dashboard") window.renderAnnouncements?.();

  if (push) history.pushState({ page: id }, "", "#" + id);

  _CURRENT_PAGE_ID = id;

  requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "instant" }));
}

function initSidebar() {
  const sb = $("#sidebar"), burger = $("#btn-burger");
  const mqNarrow = matchMedia("(max-width:1024px)");
  const mqNoHover = matchMedia("(hover: none)");
  const mqCoarse = matchMedia("(pointer: coarse)");
  const isTouchLike = () => mqNarrow.matches || mqNoHover.matches || mqCoarse.matches;

  const setBurger = () => { if (burger) burger.style.display = isTouchLike() ? "" : "none"; };
  setBurger(); addEventListener("resize", setBurger);

  const setExpandedFlag = (on) => document.body.classList.toggle("sidebar-expanded", !!on);

  burger?.addEventListener("click", (e) => {
    e.stopPropagation();
    sb?.classList.toggle("show");
    setExpandedFlag(sb?.classList.contains("show"));
  });

  sb?.addEventListener("click", (e) => {
    const navBtn = e.target.closest(".navbtn");
    if (!navBtn) {
      if (isTouchLike()) {
        const on = !document.body.classList.contains("sidebar-expanded");
        setExpandedFlag(on);
      }
      return;
    }
    const page = navBtn.dataset.page;
    if (page) showPage(page);
    if (isTouchLike()) { sb.classList.remove("show"); setExpandedFlag(false); }
  });

  document.addEventListener("click", (e) => {
    if (!isTouchLike() || !sb?.classList.contains("show")) return;
    if (!e.target.closest("#sidebar") && e.target !== burger) {
      sb.classList.remove("show"); setExpandedFlag(false);
    }
  });

  window.addEventListener("popstate", (e) => {
    const id = e.state?.page || location.hash.replace("#", "") || "catalog";
    showPage(id, false);
  });
  const initial = location.hash.replace("#", "") || "catalog";
  showPage(initial, false);
}

/* =========================================================
   Dashboard Announcements (stub)
========================================================= */
function startLiveAnnouncements() {
  // renderAnnouncements()? rtdb onChildAdded? kept minimal
}

window.renderAnnouncements = function renderAnnouncements() {
  const host = $("#annGrid");
  if (!host) return;
  host.innerHTML = `<div class="card">Announcements will appear here.</div>`;
};

/* =========================================================
   Certificates helper (close/cleanup)
========================================================= */
function hardCloseCert() {
  const d = $("#certModal");
  if (d?.open) {
    try { d.close(); } catch {}
  }
  document.body.classList.remove("printing");
}

/* =========================================================
   Admin table (stub)
========================================================= */
window.renderAdminTable = function renderAdminTable() {
  const host = $("#adminTable");
  if (!host) return;
  const data = getCourses();
  host.innerHTML = data.length
    ? `<table class="ol-table"><thead><tr><th>Title</th><th>ID</th></tr></thead>
       <tbody>${data.map(c=>`<tr><td>${c.title||""}</td><td class="muted">${c.id}</td></tr>`).join("")}</tbody></table>`
    : `<div class="card">No courses in catalog.</div>`;
};

/* =========================================================
   Enroll/Action bindings (courses grid)
========================================================= */
document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-enroll]");
  if (!btn) return;
  const id = btn.getAttribute("data-enroll");
  const arr = new Set(getEnrolls());
  if (arr.has(id)) {
    arr.delete(id); toast("Unenrolled");
  } else {
    arr.add(id); toast("Enrolled");
  }
  setEnrolls(Array.from(arr));
  renderMyLearning();
});

/* =========================================================
   New Course Modal (demo wiring)
========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  const newCourseBtn = document.getElementById("btn-new-course");
  const courseModal = document.getElementById("courseModal");
  const closeBtn = document.getElementById("btn-course-close");
  const cancelBtn = document.getElementById("btn-course-cancel");
  const saveBtn = document.getElementById("btn-course-save");

  newCourseBtn?.addEventListener("click", () => { courseModal?.showModal(); });
  closeBtn?.addEventListener("click", () => { courseModal?.close(); });
  cancelBtn?.addEventListener("click", () => { courseModal?.close(); });
  saveBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    // TODO validate and push to Firestore
    courseModal?.close();
  });
});

/* =========================================================
   Reader navigation / history integration
========================================================= */
function openReader(courseId) {
  // stub: open reader panel
  const r = $("#reader");
  if (!r) return;
  r.classList.remove("hidden");
  history.pushState({ol:"reader", cid: courseId}, "", location.href);
}
function closeReader() {
  const r = $("#reader"); if (!r) return;
  r.classList.add("hidden");
  // history back handled at popstate boot
}

/* =========================================================
   Boot — main
========================================================= */
document.addEventListener("DOMContentLoaded", async () => {
  // Theme / font
  applyPalette(LS.getItem("ol_theme") || "slate");
  applyFont(LS.getItem("ol_font") || "16");

  // Auth modal bootstrap (project’s system)
  try { initAuthModal?.(); } catch {}

  // Restore login from LS flag (UI only)
  const u = getUser();
  setLogged(!!u, u?.email);
  if (u) { migrateProfileToScopedOnce?.(); renderProfilePanel?.(); }

  // Gate chat inputs
  gateChatUI();

  // UI
  initSidebar();
  initSearch?.();
  initChatRealtime();

  // Data load
  await loadCatalog().catch(()=>{});
  window.ALL = getCourses();

  if (getUser() && !!db) {
    try {
      await Promise.all([syncEnrollsBothWays?.(), syncProgressBothWays?.()]);
    } catch {}
  }

  renderCatalog();
  window.renderAdminTable?.();
  window.renderProfilePanel?.();
  window.renderMyLearning?.();
  window.renderGradebook?.();
  window.renderAnnouncements?.();

  wireAdminImportExportOnce();

  // Remove Finals if exists
  stripFinalsUI();

  // Keep auth-required items clickable (CSS gates by JS)
  $$("[data-requires-auth]").forEach(el => el.style.pointerEvents = "auto");

  $$("#certPrint, #certClose").forEach(el => { if (!el.closest("#certModal")) el.remove(); });

  if (!window._olPopstateWired) {
    window._olPopstateWired = true;
    addEventListener("popstate", (e) => {
      const readerEl = $("#reader");
      const readerOpen = readerEl && !readerEl.classList.contains("hidden");
      const st = e.state;

      if (readerOpen && (!st || st.ol !== "reader")) { closeReader(); return; }
      if (!readerOpen && st && st.ol === "reader" && st.cid) { openReader(st.cid); return; }
      if (!st && !readerOpen) { showPage("mylearning"); }
    });
  }

  setTimeout(() => {
    const certOpen = $("#certModal")?.open;
    if (certOpen || document.body.classList.contains("printing")) hardCloseCert();
  }, 0);

  addEventListener("hashchange", () => hardCloseCert());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") hardCloseCert();
  });
  addEventListener("pageshow", () => document.body.classList.remove("printing"));

  startLiveAnnouncements();
});

/* =========================================================
   Debug window hooks
========================================================= */
Object.assign(window, {
  getCompletedRaw,
  setCompletedRaw,
  getCompleted,
  markCourseComplete,
  syncProgressBothWays,
  migrateProgressKey,
  renderMyLearning,
  renderProfilePanel,
  renderGradebook,
});

/* =========================================================
   Finals Removal already defined above (stripFinalsUI)
========================================================= */

/* ---------- Hard unlock ---------- */
document.addEventListener("DOMContentLoaded", () => {
  document.body.classList.remove("locked");
});

/* =========================================================
   Fallback auth modal (only if project modal missing)
========================================================= */
function ensureLoginModal() {
  let dlg = document.getElementById("authModal");
  if (!dlg) {
    dlg = document.createElement("dialog");
    dlg.id = "authModal";
    dlg.className = "card";
    dlg.innerHTML = `
      <form id="authLoginForm" method="dialog">
        <h3 class="h4" style="margin:0 0 10px">Login</h3>
        <div class="stack" style="gap:8px">
          <input id="authEmail" class="input" type="email" placeholder="Email" required />
          <input id="authPass" class="input" type="password" placeholder="Password" required />
          <div class="row" style="justify-content:flex-end;gap:8px">
            <button type="button" id="btnAuthCancel" class="btn">Cancel</button>
            <button type="submit" class="btn primary">Sign in</button>
          </div>
        </div>
      </form>`;
    document.body.appendChild(dlg);
  }
  return dlg;
}

/* =========================================================
   Delegated clicks for login/logout
========================================================= */
document.addEventListener("click", (e) => {
  const btn = e.target.closest("#btn-login, #btn-logout, #btnAuthCancel");
  if (!btn) return;

  const showLoginPane = window._showLoginPane; // project modal helper

  if (btn.id === "btn-login") {
    document.body.classList.remove("locked");
    if (typeof showLoginPane === "function") {
      showLoginPane();
    } else {
      const dlg = ensureLoginModal();
      try { dlg.showModal(); } catch { dlg.setAttribute("open", ""); }
    }
  }

  if (btn.id === "btnAuthCancel") {
    const dlg = $("#authModal");
    try { dlg?.close(); } catch { dlg?.removeAttribute("open"); }
  }

  if (btn.id === "btn-logout") {
    (async () => {
      try { await signOut(auth); toast("Signed out"); }
      catch (err) { console.error(err); toast("Logout failed"); }
    })();
  }
});

/* =========================================================
   Login form submit (project or fallback)
========================================================= */
document.addEventListener("submit", async (e) => {
  const form = e.target;
  if (form.id !== "authLoginForm" && form.id !== "loginForm") return;

  e.preventDefault();
  const emailEl = $("#authEmail") || $("#loginEmail");
  const passEl  = $("#authPass")  || $("#loginPass");
  const email = (emailEl?.value || "").trim();
  const pass  = (passEl?.value  || "").trim();
  if (!email || !pass) return;

  try {
    await signInWithEmailAndPassword(auth, email, pass);
    ($("#authModal") || $("#loginModal"))?.close?.();
    toast("Signed in");
  } catch (err) {
    console.error(err);
    toast("Login failed: " + (err?.code || "unknown"));
  }
});

/* =========================================================
   Auth → UI (single source of truth)
========================================================= */
onAuthStateChanged(auth, async (u) => {
  const authed = !!u && !u.isAnonymous;
  IS_AUTHED = authed;

  document.body.classList.toggle("logged", authed);
  document.body.classList.toggle("anon", !authed);

  const bLogin = $("#btn-login");
  const bLogout = $("#btn-logout");
  if (bLogin)  bLogin.style.display  = authed ? "none" : "";
  if (bLogout) bLogout.style.display = authed ? "" : "none";

  if (authed) {
    setUser?.({ email: u.email || "", role: getUser?.()?.role || "student" });
    setLogged?.(true, u.email || "");
    migrateProfileToScopedOnce?.();
  } else {
    setUser?.(null);
    setLogged?.(false);
  }

  try { setAppLocked?.(!authed); } catch {}

  try {
    switchLocalStateForUser?.(currentUidKey?.());
    await Promise.allSettled([
      migrateProgressKey?.(),
      syncEnrollsBothWays?.(),
      syncProgressBothWays?.()
    ]);
  } catch (e) {
    console.warn("auth sync warn:", e?.message||e);
  }

  window.renderProfilePanel?.();
  if (location.hash === "#mylearning") window.renderMyLearning?.();
  if (location.hash === "#gradebook") window.renderGradebook?.();

  gateChatUI?.();
});

/* =========================================================
   Search (minimal stub)
========================================================= */
function initSearch() {
  const input = $("#topSearch");
  input?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const q = input.value.trim().toLowerCase();
      const data = getCourses().filter(c =>
        (c.title||"").toLowerCase().includes(q) ||
        (c.desc ||"").toLowerCase().includes(q)
      );
      const grid = $("#coursesGrid");
      if (grid) {
        grid.innerHTML = data.map(c => `
          <div class="card course" data-id="${c.id}">
            <div class="course-cover" style="background-image:url('${c.cover||""}')"></div>
            <div class="course-body">
              <div class="row">
                <h4 class="h4 grow">${c.title||"Untitled"}</h4>
                <button class="btn small" data-enroll="${c.id}">Enroll</button>
              </div>
              <div class="muted">${c.desc||""}</div>
            </div>
          </div>
        `).join("");
      }
    }
  });
}

/* =========================================================
   Cloud Sync (Enrolls / Progress) — Firestore 두 방향 동기화
   - Client ↔ Cloud merge with simple "last-writer-wins" (ts)
========================================================= */

async function syncEnrollsBothWays() {
  if (!db || !auth?.currentUser) return;
  const u = auth.currentUser;
  const uid = u.uid;

  // Local → Cloud
  const localArr = getEnrolls();
  try {
    const refDoc = doc(db, "enrolls", uid);
    const cloudSnap = await getDoc(refDoc);
    let cloudArr = [];
    if (cloudSnap.exists()) {
      cloudArr = cloudSnap.data()?.list || [];
    }
    // merge: union
    const setLocal = new Set(localArr);
    cloudArr.forEach(x => setLocal.add(x));
    const merged = Array.from(setLocal);

    // write back cloud
    await setDoc(refDoc, { list: merged, ts: serverTimestamp() }, { merge: true });

    // local update too
    setEnrolls(merged);
  } catch (e) {
    console.warn("syncEnrollsBothWays:", e?.message || e);
  }
}

async function syncProgressBothWays() {
  if (!db || !auth?.currentUser) return;
  const uid = auth.currentUser.uid;

  const local = getCompletedRaw(); // array
  try {
    const refDoc = doc(db, "progress", uid);
    const cloudSnap = await getDoc(refDoc);
    let cloud = [];
    if (cloudSnap.exists()) {
      cloud = cloudSnap.data()?.done || [];
    }

    const set = new Set(local);
    cloud.forEach(id => set.add(id));
    const merged = Array.from(set);

    await setDoc(refDoc, { done: merged, ts: serverTimestamp() }, { merge: true });
    setCompletedRaw(merged);
  } catch (e) {
    console.warn("syncProgressBothWays:", e?.message || e);
  }
}

/* =========================================================
   Migration helpers
========================================================= */

async function migrateProgressKey() {
  // Move from email-based to uid-based key if needed
  try {
    // nothing heavy here in this minimal build
    return true;
  } catch { return false; }
}

function migrateProfileToScopedOnce() {
  // If we ever stored unscoped profile -> move into current scope
  try {
    const uKey = currentUidKey();
    const marker = LS.getItem(`ol_profile_migrated:${uKey}`);
    if (marker) return;

    const prof = LS.getItem("ol_profile");
    if (prof) {
      // mark migrated
      LS.setItem(`ol_profile_migrated:${uKey}`, "1");
    }
  } catch {}
}

/* =========================================================
   Admin helpers — create/update/delete (stubs)
========================================================= */

async function adminCreateCourse(payload) {
  try {
    if (!db) throw new Error("no db");
    const refCol = collection(db, "courses");
    const docRef = await addDoc(refCol, { ...payload, ts: Date.now() });
    toast("Course created");
    return docRef.id;
  } catch (e) {
    console.error(e); toast("Create failed");
  }
}

async function adminUpdateCourse(id, patch) {
  try {
    if (!db) throw new Error("no db");
    await updateDoc(doc(db, "courses", id), patch);
    toast("Course updated");
  } catch (e) { console.error(e); toast("Update failed"); }
}

async function adminDeleteCourse(id) {
  try {
    if (!db) throw new Error("no db");
    await deleteDoc(doc(db, "courses", id));
    toast("Course deleted");
  } catch (e) { console.error(e); toast("Delete failed"); }
}

/* =========================================================
   Storage uploads (avatars / course cover) — minimal
========================================================= */

async function uploadAvatar(file) {
  if (!storage || !auth?.currentUser) return null;
  try {
    const uid = auth.currentUser.uid;
    const key = `avatars/${uid}/${Date.now()}_${file.name}`;
    const rf = storageRef(storage, key);
    await uploadBytes(rf, file);
    return await getDownloadURL(rf);
  } catch (e) {
    console.error(e); toast("Avatar upload failed");
    return null;
  }
}

async function uploadCourseCover(file, courseId) {
  if (!storage) return null;
  try {
    const key = `course-images/${courseId}/${Date.now()}_${file.name}`;
    const rf = storageRef(storage, key);
    await uploadBytes(rf, file);
    return await getDownloadURL(rf);
  } catch (e) {
    console.error(e); toast("Cover upload failed");
    return null;
  }
}

/* =========================================================
   UI: Small utilities (class toggles, gating)
========================================================= */

function setAppLocked(lock) {
  // Keep topbar buttons always clickable via CSS; lock app area if needed
  document.body.classList.toggle("locked", !!lock);
}

function showToastError(e, fallback = "Something went wrong") {
  toast(e?.message || e?.code || fallback);
}

function safeJSON(v, dflt) {
  try { return JSON.parse(v); } catch { return dflt; }
}

/* =========================================================
   Keyboard shortcuts (optional)
========================================================= */
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    // close dialogs if open
    try { $("#authModal")?.close?.(); } catch {}
    try { $("#courseModal")?.close?.(); } catch {}
  }
});

/* =========================================================
   Drag & Drop file helpers (optional)
========================================================= */
async function handleFileDrop(e, onFile) {
  e.preventDefault();
  const dt = e.dataTransfer;
  if (!dt) return;
  for (const item of dt.items) {
    if (item.kind === "file") {
      const file = item.getAsFile();
      file && (await onFile(file));
    }
  }
}

/* =========================================================
   Reader/Player (placeholder stubs to avoid null refs)
========================================================= */

function initReader() {
  // placeholder if your UI needs it
}
function renderReader(courseId) {
  // draw reader UI for a course
}
function teardownReader() {}

/* =========================================================
   Dashboard cards (new style)
========================================================= */
function renderDashboardCards() {
  const host = $("#dashCards");
  if (!host) return;
  const data = getCourses().slice(0, 6);
  host.innerHTML = data.map(c => `
    <div class="card hoverable" data-open="${c.id}">
      <div class="row">
        <strong class="grow">${c.title||"Untitled"}</strong>
        <span class="muted">${(c.category||"Course")}</span>
      </div>
      <div class="muted">${c.desc||""}</div>
    </div>
  `).join("");
}

document.addEventListener("click", (e) => {
  const open = e.target.closest("[data-open]");
  if (!open) return;
  const cid = open.getAttribute("data-open");
  openReader(cid);
});

/* =========================================================
   Profile actions (upload avatar)
========================================================= */
document.addEventListener("change", async (e) => {
  const fileInput = e.target.closest("#avatarUpload");
  if (!fileInput) return;
  const f = fileInput.files?.[0];
  if (!f) return;
  const url = await uploadAvatar(f);
  if (!url) return;
  const prof = safeJSON(LS.getItem("ol_profile") || "{}", {});
  prof.avatar = url;
  LS.setItem("ol_profile", JSON.stringify(prof));
  renderProfilePanel?.();
  toast("Avatar updated");
});

/* =========================================================
   Admin: course editor (simple stub modal)
========================================================= */
document.addEventListener("click", async (e) => {
  const edit = e.target.closest("[data-edit-course]");
  if (!edit) return;
  const id = edit.getAttribute("data-edit-course");
  const data = getCourses().find(c=>c.id===id);
  if (!data) return;

  const dlg = $("#courseModal");
  if (!dlg) return;
  dlg.querySelector("#courseTitle")?.value = data.title || "";
  dlg.querySelector("#courseDesc")?.value  = data.desc  || "";
  dlg.dataset.editing = id;
  try { dlg.showModal(); } catch { dlg.setAttribute("open",""); }
});

document.addEventListener("click", async (e) => {
  const save = e.target.closest("#btn-course-save");
  if (!save) return;
  const dlg = $("#courseModal");
  if (!dlg) return;
  const id = dlg.dataset.editing;
  const title = dlg.querySelector("#courseTitle")?.value?.trim() || "";
  const desc  = dlg.querySelector("#courseDesc")?.value?.trim()  || "";

  // update local cache
  const arr = getCourses().map(c => c.id===id ? { ...c, title, desc } : c);
  setCourses(arr);
  renderCatalog();
  toast("Saved (local)");
  try { await adminUpdateCourse(id, { title, desc }); } catch {}
  try { dlg.close(); } catch { dlg.removeAttribute("open"); }
});

document.addEventListener("click", async (e) => {
  const del = e.target.closest("[data-del-course]");
  if (!del) return;
  const id = del.getAttribute("data-del-course");
  if (!confirm("Delete this course?")) return;
  setCourses(getCourses().filter(c=>c.id!==id));
  renderCatalog();
  try { await adminDeleteCourse(id); } catch {}
  toast("Deleted");
});

/* =========================================================
   Keyboard nav between pages (optional UX)
========================================================= */
document.addEventListener("keydown", (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (["INPUT","TEXTAREA"].includes(e.target.tagName)) return;
  // quick switch
  if (e.key === "1") showPage("catalog");
  if (e.key === "2") showPage("mylearning");
  if (e.key === "3") showPage("dashboard");
  if (e.key === "4") showPage("gradebook");
  if (e.key === "5") showPage("admin");
});

/* =========================================================
   Progressive enhancement guards
========================================================= */
(function ensurePointerEvents() {
  // guard: keep auth-required items clickable (CSS may gate)
  $$("[data-requires-auth]").forEach(el => el.style.pointerEvents = "auto");
})();

/* =========================================================
   Minimal accessibility helpers
========================================================= */
function focusTrap(container) {
  // small util to cycle focus within a dialog if needed
  const sel = 'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])';
  const nodes = Array.from(container.querySelectorAll(sel)).filter(el => !el.hasAttribute("disabled"));
  const first = nodes[0], last = nodes[nodes.length-1];
  function onKey(e) {
    if (e.key !== "Tab") return;
    if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
    else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
  }
  container.addEventListener("keydown", onKey);
  return () => container.removeEventListener("keydown", onKey);
}

/* =========================================================
   FINAL: expose bits for external scripts (if any)
========================================================= */
Object.assign(window, {
  showPage,
  openReader,
  closeReader,
  renderCatalog,
  renderDashboardCards,
  initSidebar,
  initSearch,
  startLiveAnnouncements,
  // profile
  uploadAvatar,
  // admin
  adminCreateCourse,
  adminUpdateCourse,
  adminDeleteCourse,
});

/* =========================================================
   END OF FILE
========================================================= */