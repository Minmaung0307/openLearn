// app.js — OpenLearn (Firebase Auth + RTDB chat, local-first courses)

/* ================= Helpers & State ================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[
        c
      ])
  );
const toast = (m, ms = 2200) => {
  let t = $("#toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "toast";
    document.body.appendChild(t);
  }
  t.textContent = m;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), ms);
};
const read = (k, d) => {
  try {
    return JSON.parse(localStorage.getItem(k) || JSON.stringify(d));
  } catch {
    return d;
  }
};
const write = (k, v) => localStorage.setItem(k, JSON.stringify(v));

// ----- Admin / role helpers (put once, near top-level helpers) -----
const ADMIN_EMAILS = (window.OPENLEARN_CFG?.admins || []).map(e => (e||"").toLowerCase());

function isLogged(){ try{ return !!(getUser?.() || window.currentUser); }catch{ return false; } }

// Prevent any click unless logged in
// NEW - gate only elements marked with [data-requires-auth]
document.addEventListener("click", (e) => {
  const gated = e.target.closest("[data-requires-auth]");
  if (gated && !isLogged()) {
    e.preventDefault();
    e.stopPropagation();
    window._showLoginPane?.("authLogin");   // initAuthModal() ထဲမှာ expose လုပ်ထားဖို့
  }
  window._showLoginPane = (pane = "authLogin") => showPane(pane);
});
// document.addEventListener("click", (e) => {
//   if (isLogged()) return;          // <--- here
//   if (e.target.closest("#btn-login") || e.target.closest("#authModal")) return;
//   e.preventDefault();
//   e.stopPropagation();
//   if (typeof window._showLoginPane === "function") window._showLoginPane();
// });

function getRole(){
  const u = (getUser?.() || {}) || {};
  return u.role || "student";
}

function isAdminLike(){
  const u = (getUser?.() || {}) || {};
  const email = (u.email || "").toLowerCase();
  const role = u.role || "";
  return role === "owner" || role === "admin" || ADMIN_EMAILS.includes(email);
}

// (optional) quick toggle for testing
window.DEBUG_FORCE_DELETE = false; // set to true in console to always show delete

/* === Auth/Role helpers (safe guards) — PLACE NEAR TOP, before chat/RTDB uses === */
window.getUser = window.getUser || (() => {
  try { return JSON.parse(localStorage.getItem("ol_user") || "null"); }
  catch { return null; }
});

window.isLogged = window.isLogged || (() => !!window.getUser());

window.getRole = window.getRole || (() => {
  // default role if none stored with the user object
  return (window.getUser()?.role) || "student";
});

// window.isAdminLike = window.isAdminLike || (() => {
//   const r = window.getRole();
//   return r === "owner" || r === "admin" || r === "instructor" || r === "ta";
// });

/* ================= THEME ================= */
const PALETTES = {
  slate: {
    bg: "#0b0f17",
    fg: "#eaf1ff",
    card: "#111827",
    muted: "#9fb0c3",
    border: "#1f2a3b",
    btnBg: "#0f172a",
    btnFg: "#eaf1ff",
    btnPrimaryBg: "#2563eb",
    btnPrimaryFg: "#fff",
    top: "#0e1625",
    side: "#0b1220f2",
  },
  rose: {
    bg: "#1a0d12",
    fg: "#ffe7ee",
    card: "#241318",
    muted: "#d9a7b5",
    border: "#3a1b27",
    btnBg: "#2a1720",
    btnFg: "#ffe7ee",
    btnPrimaryBg: "#fb7185",
    btnPrimaryFg: "#240b12",
    top: "#2a0f18",
    side: "#1d0d14",
  },
  ocean: {
    bg: "#07131d",
    fg: "#dff3ff",
    card: "#0c2030",
    muted: "#8fb3c6",
    border: "#113347",
    btnBg: "#123247",
    btnFg: "#dff3ff",
    btnPrimaryBg: "#4cc9f0",
    btnPrimaryFg: "#08222f",
    top: "#0b2233",
    side: "#0a1a28",
  },
  amber: {
    bg: "#0f130b",
    fg: "#fefce8",
    card: "#151b0e",
    muted: "#e7e3b5",
    border: "#263112",
    btnBg: "#1a250f",
    btnFg: "#fefce8",
    btnPrimaryBg: "#facc15",
    btnPrimaryFg: "#231b02",
    top: "#1b210f",
    side: "#151b0e",
  },
  /* Light-friendly palette */
  light: {
    bg: "#f7f9fc",
    fg: "#0b1220",
    card: "#ffffff",
    muted: "#5b6b7e",
    border: "#e5e9f0",
    btnBg: "#ffffff",
    btnFg: "#0b1220",
    btnPrimaryBg: "#2563eb",
    btnPrimaryFg: "#fff",
    top: "#ffffff",
    side: "#ffffff",
  },
  forest: {
    bg: "#0e1510",
    fg: "#e8ffe8",
    card: "#132017",
    muted: "#9bd3a0",
    border: "#223428",
    btnBg: "#18281f",
    btnFg: "#e8ffe8",
    btnPrimaryBg: "#34d399",
    btnPrimaryFg: "#062012",
    top: "#0f1d16",
    side: "#102219",
  },
  sunset: {
    bg: "#1a1412",
    fg: "#ffe9df",
    card: "#241915",
    muted: "#e6b8a4",
    border: "#3a2720",
    btnBg: "#2a1d18",
    btnFg: "#ffe9df",
    btnPrimaryBg: "#f97316",
    btnPrimaryFg: "#1c0f08",
    top: "#241a16",
    side: "#211813",
  },
  lavender: {
    bg: "#141225",
    fg: "#efe7ff",
    card: "#1c1a33",
    muted: "#c3b4f0",
    border: "#2a274b",
    btnBg: "#1e1b3a",
    btnFg: "#efe7ff",
    btnPrimaryBg: "#8b5cf6",
    btnPrimaryFg: "#160f2c",
    top: "#1a1730",
    side: "#181632",
  },
  emerald: {
    bg: "#0c1412",
    fg: "#e6fffb",
    card: "#12201c",
    muted: "#a0d5cc",
    border: "#1e2f2a",
    btnBg: "#152620",
    btnFg: "#e6fffb",
    btnPrimaryBg: "#10b981",
    btnPrimaryFg: "#06130f",
    top: "#0f1c17",
    side: "#0e1a17",
  },
};
function applyPalette(name) {
  const p = PALETTES[name] || PALETTES.slate,
    r = document.documentElement;
  r.style.setProperty("--bg", p.bg);
  r.style.setProperty("--fg", p.fg);
  r.style.setProperty("--card", p.card);
  r.style.setProperty("--muted", p.muted);
  r.style.setProperty("--border", p.border);
  r.style.setProperty("--btnBg", p.btnBg);
  r.style.setProperty("--btnFg", p.btnFg);
  r.style.setProperty("--btnPrimaryBg", p.btnPrimaryBg);
  r.style.setProperty("--btnPrimaryFg", p.btnPrimaryFg);
  r.style.setProperty("--topbar-bg", p.top || p.card);
  r.style.setProperty("--sidebar-bg", p.side || p.card);
  // light mode readable inputs
  r.style.setProperty("--inputBg", name === "light" ? "#ffffff" : "#0b1220");
  r.style.setProperty("--inputFg", name === "light" ? "#0b1220" : "#eaf1ff");
}
function applyFont(px) {
  document.documentElement.style.setProperty("--fontSize", (px || 16) + "px");
}

/* ---------- auth (local modal) ---------- */
let currentUser = null;

// Inject the modal markup once (no need to put modal HTML in index.html)
function ensureAuthModalMarkup() {
  if (document.getElementById("authModal")) return;

  const html = `
  <dialog id="authModal" class="ol-modal auth-modern">
    <div class="auth-brand">🎓 OpenLearn</div>

    <form id="authLogin" class="authpane" method="dialog">
      <label>Email</label>
      <input id="loginEmail" class="input" type="email" placeholder="you@example.com" required/>
      <label>Password</label>
      <input id="loginPass" class="input" type="password" placeholder="••••••••" required/>
      <button class="btn primary wide" id="doLogin" type="submit">Login</button>
      <div class="auth-links">
        <a href="#" id="linkSignup">Sign up</a>
        <span>·</span>
        <a href="#" id="linkForgot">Forgot password?</a>
      </div>
    </form>

    <form id="authSignup" class="authpane ol-hidden" method="dialog">
      <div class="h4" style="color:#eaf1ff;font-weight:700;margin-bottom:6px">Create Account</div>
      <label>Email</label>
      <input id="signupEmail" class="input" type="email" placeholder="you@example.com" required/>
      <label>Password</label>
      <input id="signupPass" class="input" type="password" placeholder="Choose a password" required/>
      <button class="btn primary wide" id="doSignup" type="submit">Create account</button>
      <div class="auth-links"><a href="#" id="backToLogin1">Back to login</a></div>
    </form>

    <form id="authForgot" class="authpane ol-hidden" method="dialog">
      <div class="h4" style="color:#eaf1ff;font-weight:700;margin-bottom:6px">Reset Password</div>
      <label>Email</label>
      <input id="forgotEmail" class="input" type="email" placeholder="you@example.com" required/>
      <button class="btn wide" id="doForgot" type="submit">Send reset link</button>
      <div class="auth-links"><a href="#" id="backToLogin2">Back to login</a></div>
    </form>
  </dialog>`;
  document.body.insertAdjacentHTML("beforeend", html);
}

// Update UI when logged in/out
function setLogged(on, email) {
  // persist user
  const prev = getUser();
  const role = prev?.role || "student";
  const u = on ? { email: email || prev?.email || "you@example.com", role } : null;
  setUser(u);

  // toggle UI
  document.body.classList.toggle("locked", !on);
  const btnLogin  = document.getElementById("btn-login");
  const btnLogout = document.getElementById("btn-logout");
  if (btnLogin)  btnLogin.style.display  = on ? "none" : "";
  if (btnLogout) btnLogout.style.display = on ? "" : "none";

  // optional: role marker
  document.body.dataset.role = role;
}
// function setLogged(on, email) {
//   currentUser = on ? { email: email || "you@example.com" } : null;
//   const btnLogin  = document.getElementById("btn-login");
//   const btnLogout = document.getElementById("btn-logout");
//   if (btnLogin)  btnLogin.style.display  = on ? "none" : "";
//   if (btnLogout) btnLogout.style.display = on ? "" : "none";
//   // optional: show a default page after login
//   try { showPage("catalog"); } catch {}
//   try { renderProfilePanel?.(); } catch {}
// }

// Wire up the modal and buttons
function initAuthModal() {
  ensureAuthModalMarkup();
  const modal = document.getElementById("authModal");
  if (!modal) return;

  const showPane = (id) => {
    ["authLogin","authSignup","authForgot"].forEach(x=>{
      const pane = document.getElementById(x);
      if (pane) pane.classList.add("ol-hidden");
    });
    document.getElementById(id)?.classList.remove("ol-hidden");
    modal.showModal();
  };

  // Topbar buttons (delegation so it survives rerenders)
  document.addEventListener("click", (e) => {
    const loginBtn = e.target.closest("#btn-login");
    const logoutBtn = e.target.closest("#btn-logout");
    if (loginBtn) { e.preventDefault(); showPane("authLogin"); }
    if (logoutBtn) {
      e.preventDefault();
      try { setUser(null); } catch {}
      setLogged(false);
      try { toast("Logged out"); } catch {}
    }
  });

  // Pane links
  document.getElementById("linkSignup")?.addEventListener("click", (e)=>{ e.preventDefault(); showPane("authSignup"); });
  document.getElementById("linkForgot")?.addEventListener("click", (e)=>{ e.preventDefault(); showPane("authForgot"); });
  document.getElementById("backToLogin1")?.addEventListener("click", (e)=>{ e.preventDefault(); showPane("authLogin"); });
  document.getElementById("backToLogin2")?.addEventListener("click", (e)=>{ e.preventDefault(); showPane("authLogin"); });

  // Actions (demo local auth — stores user in localStorage)
  document.getElementById("doLogin")?.addEventListener("click", (e)=>{
    e.preventDefault();
    const em = document.getElementById("loginEmail")?.value.trim();
    const pw = document.getElementById("loginPass")?.value;
    if (!em || !pw) return toast("Fill email/password");
    try { setUser({ email: em }); } catch {}
    setLogged(true, em);
    modal.close();
    try { toast("Welcome back"); } catch {}
  });

  document.getElementById("doSignup")?.addEventListener("click", (e)=>{
    e.preventDefault();
    const em = document.getElementById("signupEmail")?.value.trim();
    const pw = document.getElementById("signupPass")?.value;
    if (!em || !pw) return toast("Fill email/password");
    try { setUser({ email: em }); } catch {}
    setLogged(true, em);
    modal.close();
    try { toast("Account created"); } catch {}
  });

  document.getElementById("doForgot")?.addEventListener("click", (e)=>{
    e.preventDefault();
    const em = document.getElementById("forgotEmail")?.value.trim();
    if (!em) return toast("Enter email");
    modal.close();
    try { toast("Reset link sent (demo)"); } catch {}
  });
}

/* ================= Local Storage Models ================= */
const getCourses = () => read("ol_courses", []);
const setCourses = (a) => write("ol_courses", a || []);
const getEnrolls = () => new Set(read("ol_enrolls", []));
const setEnrolls = (s) => write("ol_enrolls", Array.from(s));
const getAnns = () => read("ol_anns", []);
const setAnns = (a) => write("ol_anns", a || []);
const getProfile = () =>
  read("ol_profile", {
    displayName: "",
    photoURL: "",
    bio: "",
    skills: "",
    links: "",
    social: "",
  });
const setProfile = (p) => write("ol_profile", p || {});
const getUserLS = () => read("ol_user", null);
const setUserLS = (u) => write("ol_user", u);
let ALL = [];

/* ================= Firebase (ESM) ================= */
import {
  app,
  auth,
  db, // from firebase.js
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  // RTDB for chat
  getDatabase,
  ref,
  push,
  onChildAdded,
  remove,
  signInAnonymously,
  // optional PayPal loader (safe if not used)
  ensurePayPal,
} from "./firebase.js";

// ------- local user state helpers (must be defined early) -------
const _read  = (k,d)=>{ try{ return JSON.parse(localStorage.getItem(k) ?? JSON.stringify(d)); } catch { return d; } };
const _write = (k,v)=> localStorage.setItem(k, JSON.stringify(v));

/** Get/set the signed-in user snapshot we mirror in localStorage.
 *  Shape we expect: { email, role?, uid? }
 */
const getUser  = ()=> _read("ol_user", null);
const setUser  = (u)=> _write("ol_user", u);
const isLogged = () => !!getUser();
const getRole  = () => (getUser()?.role) || "student";

// (optional) expose to global once to avoid “already declared” if other files use them
if (!("getUser" in window))  window.getUser  = getUser;
if (!("setUser" in window))  window.setUser  = setUser;
if (!("isLogged" in window)) window.isLogged = isLogged;
if (!("getRole" in window))  window.getRole  = getRole;

/* ================= Router & Gate ================= */
function showPage(id) {
  $$(".page").forEach((p) => p.classList.remove("visible"));
  $("#page-" + id)?.classList.add("visible");
  if (id === "mylearning") renderMyLearning();
  if (id === "gradebook") renderGradebook();
  if (id === "admin") renderAdminTable();
  if (id === "dashboard") renderAnnouncements();
}
function requireLogin(action) {
  if (!auth.currentUser) {
    toast("Please log in first");
    $("#btn-login")?.click();
    return false;
  }
  return true;
}

/* ================= Topbar / Sidebar ================= */
function initSidebar(){
  const sb = document.getElementById("sidebar");
  const burger = document.getElementById("btn-burger");
  const isMobile = () => matchMedia("(max-width:1024px)").matches;

  const setBurger = () => { if (burger) burger.style.display = isMobile()? "":"none"; };
  setBurger(); addEventListener("resize", setBurger);

  burger?.addEventListener("click",(e)=>{ e.stopPropagation(); sb?.classList.toggle("show"); });

  sb?.addEventListener("click",(e)=>{
    const btn = e.target.closest(".navbtn");
    if (!btn) return;
    const page = btn.dataset.page;
    if (!page) return;

    // If this button requires auth → gate here
    if (btn.hasAttribute("data-requires-auth") && !isLogged()) {
      window._showLoginPane?.();
      return;
    }

    showPage(page);
    if (isMobile()) sb.classList.remove("show");
  });

  document.addEventListener("click",(e)=>{
    if(!isMobile()) return;
    if(!sb?.classList.contains("show")) return;
    if(!e.target.closest("#sidebar") && e.target!==burger) sb.classList.remove("show");
  });
}
// function initSidebar() {
//   const sb = $("#sidebar"),
//     burger = $("#btn-burger");
//   const isMobile = () => matchMedia("(max-width:1024px)").matches;
//   const setBurger = () => {
//     if (burger) burger.style.display = isMobile() ? "" : "none";
//   };
//   setBurger();
//   addEventListener("resize", setBurger);

//   burger?.addEventListener("click", (e) => {
//     e.stopPropagation();
//     sb?.classList.toggle("show");
//   });
//   sb?.addEventListener("click", (e) => {
//     const b = e.target.closest(".navbtn");
//     if (!b) return;
//     if (!requireLogin()) return; // lock menu until login
//     showPage(b.dataset.page);
//     if (isMobile()) sb.classList.remove("show");
//   });
//   document.addEventListener("click", (e) => {
//     if (!isMobile()) return;
//     if (!sb?.classList.contains("show")) return;
//     if (!e.target.closest("#sidebar") && e.target !== burger)
//       sb.classList.remove("show");
//   });
// }
function initSearch() {
  const input = $("#topSearch");
  const apply = () => {
    const q = (input?.value || "").toLowerCase().trim();
    showPage("catalog");
    $("#courseGrid")
      ?.querySelectorAll(".card.course")
      .forEach((card) => {
        const t = (card.dataset.search || "").toLowerCase();
        card.style.display = !q || t.includes(q) ? "" : "none";
      });
  };
  input?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") apply();
  });
}

/* ================= Auth Modal (Firebase) ================= */
function ensureAuthModal() {
  if ($("#authModal")) return;
  document.body.insertAdjacentHTML(
    "beforeend",
    `
  <dialog id="authModal" class="ol-modal auth-modern">
    <div class="auth-brand">🎓 OpenLearn</div>
    <form id="authLogin" class="authpane" method="dialog">
      <label>Email</label>
      <input id="loginEmail" class="input" type="email" placeholder="you@example.com" required/>
      <label>Password</label>
      <input id="loginPass" class="input" type="password" placeholder="••••••••" required/>
      <button class="btn primary wide" id="doLogin" type="submit">Login</button>
      <div class="auth-links">
        <a href="#" id="linkSignup">Sign up</a><span>·</span><a href="#" id="linkForgot">Forgot password?</a>
      </div>
    </form>
    <form id="authSignup" class="authpane ol-hidden" method="dialog">
      <div class="h4" style="color:var(--fg);font-weight:700;margin-bottom:6px">Create Account</div>
      <label>Email</label>
      <input id="signupEmail" class="input" type="email" placeholder="you@example.com" required/>
      <label>Password</label>
      <input id="signupPass" class="input" type="password" placeholder="Choose a password" required/>
      <button class="btn primary wide" id="doSignup" type="submit">Create account</button>
      <div class="auth-links"><a href="#" id="backToLogin1">Back to login</a></div>
    </form>
    <form id="authForgot" class="authpane ol-hidden" method="dialog">
      <div class="h4" style="color:var(--fg);font-weight:700;margin-bottom:6px">Reset Password</div>
      <label>Email</label>
      <input id="forgotEmail" class="input" type="email" placeholder="you@example.com" required/>
      <button class="btn wide" id="doForgot" type="submit">Send reset link</button>
      <div class="auth-links"><a href="#" id="backToLogin2">Back to login</a></div>
    </form>
  </dialog>`
  );
}
function initAuth() {
  ensureAuthModal();
  const modal = $("#authModal");
  const showPane = (id) => {
    ["authLogin", "authSignup", "authForgot"].forEach((x) =>
      $("#" + x)?.classList.add("ol-hidden")
    );
    $("#" + id)?.classList.remove("ol-hidden");
    modal?.showModal();
  };
  document.addEventListener("click", (e) => {
    const loginBtn = e.target.closest("#btn-login");
    const logoutBtn = e.target.closest("#btn-logout");
    if (loginBtn) {
      e.preventDefault();
      showPane("authLogin");
    }
    if (logoutBtn) {
      e.preventDefault();
      signOut(auth).catch(() => {});
    }
  });
  $("#linkSignup")?.addEventListener("click", (e) => {
    e.preventDefault();
    showPane("authSignup");
  });
  $("#linkForgot")?.addEventListener("click", (e) => {
    e.preventDefault();
    showPane("authForgot");
  });
  $("#backToLogin1")?.addEventListener("click", (e) => {
    e.preventDefault();
    showPane("authLogin");
  });
  $("#backToLogin2")?.addEventListener("click", (e) => {
    e.preventDefault();
    showPane("authLogin");
  });

  $("#doLogin")?.addEventListener("click", async (e) => {
    e.preventDefault();
    const em = $("#loginEmail")?.value.trim(),
      pw = $("#loginPass")?.value;
    if (!em || !pw) return toast("Fill email/password");
    try {
      await signInWithEmailAndPassword(auth, em, pw);
      modal?.close();
      toast("Welcome back");
    } catch (err) {
      console.error(err);
      toast("Login failed");
    }
  });
  $("#doSignup")?.addEventListener("click", async (e) => {
    e.preventDefault();
    const em = $("#signupEmail")?.value.trim(),
      pw = $("#signupPass")?.value;
    if (!em || !pw) return toast("Fill email/password");
    try {
      await createUserWithEmailAndPassword(auth, em, pw);
      modal?.close();
      toast("Account created");
    } catch (err) {
      console.error(err);
      toast("Signup failed");
    }
  });
  $("#doForgot")?.addEventListener("click", async (e) => {
    e.preventDefault();
    const em = $("#forgotEmail")?.value.trim();
    if (!em) return toast("Enter email");
    try {
      await sendPasswordResetEmail(auth, em);
      modal?.close();
      toast("Reset link sent");
    } catch (err) {
      console.error(err);
      toast("Failed to send link");
    }
  });

  onAuthStateChanged(auth, (u) => {
    const btnLogin = $("#btn-login"),
      btnLogout = $("#btn-logout");
    if (btnLogin) btnLogin.style.display = u ? "none" : "";
    if (btnLogout) btnLogout.style.display = u ? "" : "none";
    if (u) {
      setUserLS({ email: u.email || "user" });
      renderProfilePanel();
    }
    showPage("catalog");
  });
}

/* ================= Data (local-first; optional external) ================= */
const DATA_BASE_CANDIDATES = ["/data", "/public/data", "./data"];
let DATA_BASE = null;
async function resolveDataBase() {
  for (const base of DATA_BASE_CANDIDATES) {
    try {
      const r = await fetch(`${base}/catalog.json`, { cache: "no-cache" });
      if (r.ok) {
        DATA_BASE = base;
        return;
      }
    } catch {}
  }
  DATA_BASE = null; // fallback → seed only
}
async function loadJSON(p) {
  const r = await fetch(p, { cache: "no-cache" });
  if (!r.ok) return null;
  return r.json();
}
async function loadText(p) {
  const r = await fetch(p, { cache: "no-cache" });
  if (!r.ok) return "";
  return r.text();
}

async function loadCatalog() {
  await resolveDataBase();
  let items = [];
  if (DATA_BASE) {
    try {
      const cat = await loadJSON(`${DATA_BASE}/catalog.json`);
      items = cat?.items || [];
    } catch {}
  }
  if (!items.length) {
    items = [
      {
        id: "js-essentials",
        title: "JavaScript Essentials",
        category: "Web",
        level: "Beginner",
        price: 0,
        credits: 3,
        rating: 4.7,
        hours: 10,
        summary: "Start JavaScript from zero.",
      },
      {
        id: "react-fast",
        title: "React Fast-Track",
        category: "Web",
        level: "Intermediate",
        price: 49,
        credits: 2,
        rating: 4.6,
        hours: 8,
        summary: "Build modern UIs.",
      },
      {
        id: "py-data",
        title: "Data Analysis with Python",
        category: "Data",
        level: "Intermediate",
        price: 79,
        credits: 3,
        rating: 4.8,
        hours: 14,
        summary: "Pandas & plots.",
      },
    ];
  }
  const local = getCourses();
  const merged = [
    ...items,
    ...local.filter((l) => !items.some((ci) => ci.id === l.id)),
  ];
  setCourses(merged);
  ALL = merged;
  renderCatalog();
}

/* ================= Catalog / Details / Enroll ================= */
function renderCatalog() {
  const grid = $("#courseGrid");
  if (!grid) return;
  ALL = getCourses();
  if (!ALL.length) {
    grid.innerHTML = `<div class="muted">No courses yet.</div>`;
    return;
  }
  const cats = new Set();
  grid.innerHTML = ALL.map((c) => {
    cats.add(c.category || "");
    const search = [c.title, c.summary, c.category, c.level].join(" ");
    const r = Number(c.rating || 4.6),
      priceStr = (c.price || 0) > 0 ? "$" + c.price : "Free",
      enrolled = getEnrolls().has(c.id);
    return `<div class="card course" data-id="${c.id}" data-search="${esc(
      search
    )}">
      <img class="course-cover" src="${esc(
        c.image || `https://picsum.photos/seed/${c.id}/640/360`
      )}" alt="">
      <div class="course-body">
        <strong>${esc(c.title)}</strong>
        <div class="small muted">${esc(c.category || "")} • ${esc(
      c.level || ""
    )} • ★ ${r.toFixed(1)} • ${priceStr}</div>
        <div class="muted">${esc(c.summary || "")}</div>
        <div class="row" style="justify-content:flex-end; gap:8px">
          <button class="btn" data-details="${c.id}">Details</button>
          <button class="btn primary" data-enroll="${c.id}">${
      enrolled ? "Enrolled" : "Enroll"
    }</button>
        </div>
      </div>
    </div>`;
  }).join("");
  $("#filterCategory")?.replaceChildren(
    ...[
      new Option("All Categories", ""),
      ...[...cats].filter(Boolean).map((x) => new Option(x, x)),
    ]
  );

  const apply = () => {
    const cat = $("#filterCategory")?.value || "",
      lv = $("#filterLevel")?.value || "",
      sort = $("#sortBy")?.value || "";
    const cards = [...grid.querySelectorAll(".card.course")];
    cards.forEach((el) => {
      const meta = el.querySelector(".small.muted").textContent;
      el.style.display =
        (!cat || meta.includes(cat)) && (!lv || meta.includes(lv))
          ? ""
          : "none";
    });
    const vis = [...grid.querySelectorAll(".card.course")].filter(
      (el) => el.style.display !== "none"
    );
    vis
      .sort((a, b) => {
        const ta = a.querySelector("strong").textContent.toLowerCase();
        const tb = b.querySelector("strong").textContent.toLowerCase();
        const pa = a.querySelector(".small.muted").textContent;
        const pb = b.querySelector(".small.muted").textContent;
        const priceA = pa.includes("$") ? parseFloat(pa.split("$")[1]) : 0;
        const priceB = pb.includes("$") ? parseFloat(pb.split("$")[1]) : 0;
        if (sort === "title-asc") return ta.localeCompare(tb);
        if (sort === "title-desc") return tb.localeCompare(ta);
        if (sort === "price-asc") return priceA - priceB;
        if (sort === "price-desc") return priceB - priceA;
        return 0;
      })
      .forEach((el) => grid.appendChild(el));
  };
  $("#filterCategory")?.addEventListener("change", apply);
  $("#filterLevel")?.addEventListener("change", apply);
  $("#sortBy")?.addEventListener("change", apply);

  grid.querySelectorAll("[data-enroll]").forEach(
    (b) =>
      (b.onclick = () => {
        if (!requireLogin()) return;
        handleEnroll(b.getAttribute("data-enroll"));
      })
  );
  grid
    .querySelectorAll("[data-details]")
    .forEach(
      (b) => (b.onclick = () => openDetails(b.getAttribute("data-details")))
    );
}
function markEnrolled(id) {
  const s = getEnrolls();
  s.add(id);
  setEnrolls(s);
  toast("Enrolled");
  renderCatalog();
  renderMyLearning();
  showPage("mylearning");
}
function handleEnroll(id) {
  const c =
    ALL.find((x) => x.id === id) || getCourses().find((x) => x.id === id);
  if (!c) return toast("Course not found");
  if ((c.price || 0) <= 0) return markEnrolled(id);
  // Paid flow (PayPal) – safe if SDK missing
  const dlg = $("#payModal");
  $("#payTitle") && ($("#payTitle").textContent = "Checkout · " + c.title);
  const container = $("#paypal-container");
  if (container) container.innerHTML = "";
  const pp = window.paypal;
  if (pp?.Buttons && container) {
    pp.Buttons({
      createOrder: (d, a) =>
        a.order.create({
          purchase_units: [{ amount: { value: String(c.price || 0) } }],
        }),
      onApprove: async (d, a) => {
        await a.order.capture();
        markEnrolled(id);
        dlg?.close();
      },
      onError: (err) => {
        console.error(err);
        toast("Payment error");
      },
    }).render(container);
  } else if (container) {
    const sim = document.createElement("button");
    sim.className = "btn primary";
    sim.textContent = "Simulate PayPal Success";
    sim.onclick = () => {
      markEnrolled(id);
      dlg?.close();
    };
    container.appendChild(sim);
  }
  $("#closePay")?.addEventListener("click", () => dlg?.close());
  dlg?.showModal();
}
function openDetails(id) {
  const c =
    ALL.find((x) => x.id === id) || getCourses().find((x) => x.id === id);
  if (!c) return;
  const body = $("#detailsBody");
  if (!body) return;
  const b = c.benefits ? String(c.benefits).split(/\n+/).filter(Boolean) : [];
  body.innerHTML = `
    <div class="row" style="gap:12px; align-items:flex-start">
      <img src="${esc(
        c.image || `https://picsum.photos/seed/${c.id}/480/280`
      )}" alt="" style="width:320px;max-width:38vw;border-radius:12px">
      <div class="grow">
        <h3 class="h4" style="margin:.2rem 0">${esc(c.title)}</h3>
        <div class="small muted" style="margin-bottom:.25rem">${esc(
          c.category || ""
        )} • ${esc(c.level || "")} • ★ ${Number(c.rating || 4.6).toFixed(
    1
  )}</div>
        <p>${esc(c.description || c.summary || "")}</p>
        ${
          b.length
            ? `<ul>${b.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`
            : ""
        }
        <div class="row" style="justify-content:flex-end; gap:8px">
          <button class="btn" data-details-close>Close</button>
          <button class="btn primary" data-details-enroll="${c.id}">${
    (c.price || 0) > 0 ? "Buy • $" + c.price : "Enroll Free"
  }</button>
        </div>
      </div>
    </div>`;
  const dlg = $("#detailsModal");
  dlg?.showModal();
  body
    .querySelector("[data-details-close]")
    ?.addEventListener("click", () => dlg?.close());
  body
    .querySelector("[data-details-enroll]")
    ?.addEventListener("click", (e) => {
      if (!requireLogin()) return;
      handleEnroll(e.target.getAttribute("data-details-enroll"));
      dlg?.close();
    });
}
$("#closeDetails")?.addEventListener("click", () =>
  $("#detailsModal")?.close()
);

/* ================= My Learning (Reader) ================= */
const SAMPLE_PAGES = (title) => [
  {
    type: "lesson",
    html: `<h3>${esc(
      title
    )} — Welcome</h3><p>Intro video:</p><video controls style="width:100%;border-radius:10px" poster="https://picsum.photos/seed/v1/800/320"></video>`,
  },
  {
    type: "reading",
    html: `<h3>Chapter 1</h3><p>Reading with image & audio:</p><img style="width:100%;border-radius:10px" src="https://picsum.photos/seed/p1/800/360"><audio controls style="width:100%"></audio>`,
  },
  {
    type: "exercise",
    html: `<h3>Practice</h3><ol><li>Upload a file</li><li>Short answer</li></ol><input class="input" placeholder="Your answer">`,
  },
  {
    type: "quiz",
    html: `<h3>Quiz 1</h3><p>Q1) Short answer</p><input id="q1" class="input" placeholder="Your answer"><div style="margin-top:8px"><button class="btn" id="qSubmit">Submit</button> <span id="qMsg" class="small muted"></span></div>`,
  },
  {
    type: "final",
    html: `<h3>Final Project</h3><input type="file"><p class="small muted">Complete to earn certificate/transcript (demo).</p>`,
  },
];
let RD = { cid: null, pages: [], i: 0, credits: 0, score: 0 };
async function loadCourseBundle(slug) {
  if (!DATA_BASE) await resolveDataBase();
  if (!DATA_BASE) return { meta: null, pages: [], quiz: null };
  const meta = await loadJSON(`${DATA_BASE}/courses/${slug}/meta.json`);
  const pages = [];
  for (const l of meta?.lessons || []) {
    const html = await loadText(`${DATA_BASE}/courses/${slug}/${l.file}`);
    pages.push({ type: "reading", html });
  }
  let quiz = null;
  try {
    quiz = await loadJSON(`${DATA_BASE}/courses/${slug}/quiz.json`);
  } catch {}
  return { meta, pages, quiz };
}
function renderMyLearning() {
  const grid = $("#myCourses");
  if (!grid) return;
  const set = getEnrolls();
  const list = (ALL.length ? ALL : getCourses()).filter((c) => set.has(c.id));
  grid.innerHTML =
    list
      .map((c) => {
        const r = Number(c.rating || 4.6);
        return `<div class="card course" data-id="${c.id}">
      <img class="course-cover" src="${esc(
        c.image || `https://picsum.photos/seed/${c.id}/640/360`
      )}" alt="">
      <div class="course-body">
        <strong>${esc(c.title)}</strong>
        <div class="small muted">${esc(c.category || "")} • ${esc(
          c.level || ""
        )} • ★ ${r.toFixed(1)} • ${
          (c.price || 0) > 0 ? "$" + c.price : "Free"
        }</div>
        <div class="muted">${esc(c.summary || "")}</div>
        <div class="row" style="justify-content:flex-end"><button class="btn" data-read="${
          c.id
        }">Continue</button></div>
      </div>
    </div>`;
      })
      .join("") ||
    `<div class="muted">No enrollments yet. Enroll from Courses.</div>`;
  grid
    .querySelectorAll("[data-read]")
    .forEach(
      (b) => (b.onclick = () => openReader(b.getAttribute("data-read")))
    );
}
async function openReader(cid) {
  const c =
    ALL.find((x) => x.id === cid) || getCourses().find((x) => x.id === cid);
  if (!c) return;
  try {
    const { meta, pages } = await loadCourseBundle(c.id);
    RD = {
      cid: c.id,
      pages: pages.length ? pages : SAMPLE_PAGES(c.title),
      i: 0,
      credits: c.credits || meta?.credits || 3,
      score: 0,
    };
  } catch {
    RD = {
      cid: c.id,
      pages: SAMPLE_PAGES(c.title),
      i: 0,
      credits: c.credits || 3,
      score: 0,
    };
  }
  $("#myCourses").innerHTML = "";
  $("#reader")?.classList.remove("hidden");
  $("#rdMeta") && ($("#rdMeta").textContent = `Credits: ${RD.credits}`);
  renderPage();
  $("#rdBack")?.addEventListener("click", () => {
    $("#reader")?.classList.add("hidden");
    renderMyLearning();
  });
  $("#rdPrev")?.addEventListener("click", () => {
    RD.i = Math.max(0, RD.i - 1);
    renderPage();
  });
  $("#rdNext")?.addEventListener("click", () => {
    RD.i = Math.min(RD.pages.length - 1, RD.i + 1);
    renderPage();
  });
  // Chat room → switch to per-course while reading
  const chatBox = $("#chatBox");
  if (chatBox) chatBox.dataset.room = `course:${cid}`;
}
function renderPage() {
  const p = RD.pages[RD.i];
  $("#rdTitle") &&
    ($("#rdTitle").textContent = `${RD.i + 1}. ${p.type.toUpperCase()}`);
  $("#rdPage") && ($("#rdPage").innerHTML = p.html);
  $("#rdPageInfo") &&
    ($("#rdPageInfo").textContent = `${RD.i + 1} / ${RD.pages.length}`);
  $("#rdProgress") &&
    ($("#rdProgress").style.width =
      Math.round(((RD.i + 1) / RD.pages.length) * 100) + "%");
  const btn = $("#qSubmit"),
    msg = $("#qMsg");
  if (btn) {
    btn.onclick = () => {
      msg.textContent = "Submitted ✔️ (+5%)";
    };
  }
}

/* ================= Gradebook ================= */
function renderGradebook() {
  const tb = $("#gbTable tbody");
  if (!tb) return;
  const set = getEnrolls();
  const list = (ALL.length ? ALL : getCourses()).filter((c) => set.has(c.id));
  const rows = list.map((c) => ({
    student: auth.currentUser?.email || "you@example.com",
    course: c.title,
    score: 80 + Math.floor(Math.random() * 20) + "%",
    credits: c.credits || 3,
    progress: Math.floor(Math.random() * 90) + 10 + "%",
  }));
  tb.innerHTML =
    rows
      .map(
        (r) =>
          `<tr><td>${esc(r.student)}</td><td>${esc(r.course)}</td><td>${esc(
            r.score
          )}</td><td>${esc(r.credits)}</td><td>${esc(r.progress)}</td></tr>`
      )
      .join("") || "<tr><td colspan='5' class='muted'>No data</td></tr>";
}

/* ================= Admin (table + export/import) ================= */
$("#btn-new-course")?.addEventListener("click", () =>
  $("#courseModal")?.showModal()
);
$("#courseClose")?.addEventListener("click", () => $("#courseModal")?.close());
$("#courseCancel")?.addEventListener("click", () => $("#courseModal")?.close());
$("#courseForm")?.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!requireLogin()) return;
  const f = new FormData(e.target);
  const payload = {
    id:
      (f.get("title") || "")
        .toString()
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-") || "c_" + Math.random().toString(36).slice(2, 9),
    title: f.get("title")?.toString().trim(),
    category: f.get("category")?.toString().trim(),
    level: f.get("level")?.toString() || "Beginner",
    price: Number(f.get("price") || 0),
    rating: Number(f.get("rating") || 4.6),
    hours: Number(f.get("hours") || 8),
    credits: Number(f.get("credits") || 3),
    image: f.get("img")?.toString().trim(),
    summary: (f.get("description") || "").toString(),
    benefits: (f.get("benefits") || "").toString(),
    createdAt: Date.now(),
    progress: 0,
    source: "user",
  };
  const arr = getCourses();
  arr.push(payload);
  setCourses(arr);
  ALL = arr;
  $("#courseModal")?.close();
  renderCatalog();
  renderAdminTable();
  toast("Course created");
});
function renderAdminTable() {
  const tb = $("#adminTable tbody");
  if (!tb) return;
  const list = ALL.length ? ALL : getCourses();
  tb.innerHTML =
    list
      .map(
        (c) => `
    <tr data-id="${c.id}">
      <td>${esc(c.title)}</td><td>${esc(c.category || "")}</td><td>${esc(
          c.level || ""
        )}</td>
      <td>${esc(String(c.rating || 4.6))}</td><td>${esc(
          String(c.hours || 8)
        )}</td><td>${(c.price || 0) > 0 ? "$" + c.price : "Free"}</td>
      <td>
        <button class="btn small" data-edit="${c.id}">Edit</button>
        <button class="btn small" data-del="${c.id}">Delete</button>
      </td>
    </tr>`
      )
      .join("") || "<tr><td colspan='7' class='muted'>No courses</td></tr>";
  tb.querySelectorAll("[data-del]").forEach(
    (b) =>
      (b.onclick = () => {
        if (!requireLogin()) return;
        const id = b.getAttribute("data-del");
        const arr = getCourses().filter(
          (x) => !(x.source !== "user" && x.id === id)
        ); // don’t delete seed unless user
        setCourses(arr);
        ALL = arr;
        renderCatalog();
        renderAdminTable();
      })
  );
  tb.querySelectorAll("[data-edit]").forEach(
    (b) =>
      (b.onclick = () => {
        toast("Edit UI not implemented in this snippet");
      })
  );
}
// Export / Import (once)
document.getElementById("btn-export")?.addEventListener("click", () => {
  const user = getCourses().filter((c) => c.source === "user");
  const blob = new Blob([JSON.stringify(user, null, 2)], {
    type: "application/json",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "openlearn-my-courses.json";
  a.click();
});
document
  .getElementById("btn-import")
  ?.addEventListener("click", () =>
    document.getElementById("importFile")?.click()
  );
document.getElementById("importFile")?.addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const text = await file.text();
  let incoming = [];
  try {
    incoming = JSON.parse(text) || [];
  } catch {
    return toast("Invalid JSON");
  }
  const arr = getCourses();
  incoming.forEach((c) => {
    c.source = "user";
    const i = arr.findIndex((x) => x.id === c.id);
    if (i >= 0) arr[i] = c;
    else arr.push(c);
  });
  setCourses(arr);
  ALL = arr;
  renderCatalog();
  renderAdminTable();
  toast("Imported");
});

/* ================= Announcements (local) ================= */
$("#btn-new-post")?.addEventListener("click", () =>
  $("#postModal")?.showModal()
);
$("#closePostModal")?.addEventListener("click", () => $("#postModal")?.close());
$("#cancelPost")?.addEventListener("click", () => $("#postModal")?.close());
$("#postForm")?.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!requireLogin()) return;
  const t = $("#pmTitle")?.value.trim(),
    b = $("#pmBody")?.value.trim();
  if (!t || !b) return toast("Fill all fields");
  const arr = getAnns();
  arr.push({
    id: "a_" + Math.random().toString(36).slice(2, 9),
    title: t,
    body: b,
    ts: Date.now(),
  });
  setAnns(arr);
  $("#postModal")?.close();
  $("#pmTitle").value = "";
  $("#pmBody").value = "";
  renderAnnouncements();
  toast("Announcement posted");
});
function renderAnnouncements() {
  const box = $("#annList");
  if (!box) return;
  const arr = getAnns().slice().reverse();
  box.innerHTML =
    arr
      .map(
        (a) => `
    <div class="card" data-id="${a.id}">
      <div class="row" style="justify-content:space-between">
        <strong>${esc(a.title)}</strong><span class="small muted">${new Date(
          a.ts
        ).toLocaleString()}</span>
      </div>
      <div style="margin:.3rem 0 .5rem">${esc(a.body || "")}</div>
      <div class="row" style="justify-content:flex-end; gap:6px">
        <button class="btn small" data-edit="${a.id}">Edit</button>
        <button class="btn small" data-del="${a.id}">Delete</button>
      </div>
    </div>`
      )
      .join("") || `<div class="muted">No announcements yet.</div>`;
  box.querySelectorAll("[data-del]").forEach(
    (b) =>
      (b.onclick = () => {
        if (!requireLogin()) return;
        const id = b.getAttribute("data-del");
        const arr = getAnns().filter((x) => x.id !== id);
        setAnns(arr);
        renderAnnouncements();
        toast("Deleted");
      })
  );
  box.querySelectorAll("[data-edit]").forEach(
    (b) =>
      (b.onclick = () => {
        if (!requireLogin()) return;
        const id = b.getAttribute("data-edit");
        const arr = getAnns();
        const i = arr.findIndex((x) => x.id === id);
        if (i < 0) return;
        $("#pmTitle").value = arr[i].title || "";
        $("#pmBody").value = arr[i].body || "";
        $("#postModal")?.showModal();
        const form = $("#postForm");
        const orig = form.onsubmit;
        form.onsubmit = (e) => {
          e.preventDefault();
          arr[i].title = $("#pmTitle").value.trim();
          arr[i].body = $("#pmBody").value.trim();
          setAnns(arr);
          $("#postModal")?.close();
          renderAnnouncements();
          toast("Updated");
          form.onsubmit = orig;
        };
      })
  );
}

/* ================= Profile ================= */
function renderProfilePanel() {
  const p = getProfile();
  $("#profilePanel")?.replaceChildren();
  const host = $("#profilePanel");
  if (!host) return;
  host.innerHTML = `
    <div class="row" style="gap:12px">
      <img src="${esc(
        p.photoURL || "https://picsum.photos/seed/avatar/120/120"
      )}" style="width:86px;height:86px;border-radius:12px;object-fit:cover" alt="">
      <div class="grow">
        <div style="font-weight:700">${esc(
          p.displayName || auth.currentUser?.email || "—"
        )}</div>
        <div class="small muted">${esc(p.bio || "No bio yet")}</div>
        ${
          p.skills
            ? `<div class="small" style="margin-top:6px">Skills: ${esc(
                p.skills
              )}</div>`
            : ""
        }
        ${p.links ? `<div class="small">Links: ${esc(p.links)}</div>` : ""}
        ${p.social ? `<div class="small">Social: ${esc(p.social)}</div>` : ""}
      </div>
    </div>`;
}
$("#btn-edit-profile")?.addEventListener("click", () => {
  if (!requireLogin()) return;
  const p = getProfile();
  const dlg = $("#profileEditModal");
  const f = $("#profileForm");
  if (!dlg || !f) return;
  f.displayName.value = p.displayName || "";
  f.photoURL.value = p.photoURL || "";
  f.bio.value = p.bio || "";
  f.skills.value = p.skills || "";
  f.links.value = p.links || "";
  f.social.value = p.social || "";
  dlg.showModal();
});
$("#closeProfileModal")?.addEventListener("click", () =>
  $("#profileEditModal")?.close()
);
$("#cancelProfile")?.addEventListener("click", () =>
  $("#profileEditModal")?.close()
);
$("#profileForm")?.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!requireLogin()) return;
  const f = new FormData(e.target);
  const p = {
    displayName: f.get("displayName") || "",
    photoURL: f.get("photoURL") || "",
    bio: f.get("bio") || "",
    skills: f.get("skills") || "",
    links: f.get("links") || "",
    social: f.get("social") || "",
  };
  setProfile(p);
  $("#profileEditModal")?.close();
  renderProfilePanel();
  toast("Profile updated");
});

/* ================= Final Exam (local) ================= */
$("#btn-top-final")?.addEventListener("click", () => showPage("finals"));
$("#btn-start-final")?.addEventListener("click", startFinal);
$("#closeFinal")?.addEventListener("click", () => $("#finalModal")?.close());
function gatherAllQuestions() {
  return [
    {
      t: "short",
      q: "What does HTML stand for?",
      a: "hypertext markup language",
    },
    { t: "tf", q: "CSS is used for styling web pages.", a: "t" },
    {
      t: "short",
      q: "Name a JavaScript array method to add items at end.",
      a: "push",
    },
    { t: "tf", q: "React is a backend framework.", a: "f" },
    {
      t: "short",
      q: "Which lib is used for dataframes in Python?",
      a: "pandas",
    },
    { t: "tf", q: "In Git, 'commit' saves changes to history.", a: "t" },
    { t: "short", q: "HTTP status 404 means what?", a: "not found" },
    { t: "short", q: "SQL keyword to get unique rows?", a: "distinct" },
    { t: "tf", q: "CSS Flexbox helps layout.", a: "t" },
    {
      t: "short",
      q: "Command to create venv in python 3?",
      a: "python -m venv venv",
    },
    { t: "short", q: "Name one cloud provider.", a: "aws" },
    { t: "tf", q: "JSON stands for Java System Object Notation.", a: "f" },
  ];
}
function pickRandom(arr, n) {
  const a = [...arr],
    out = [];
  while (a.length && out.length < n) {
    out.push(a.splice(Math.floor(Math.random() * a.length), 1)[0]);
  }
  return out;
}
function startFinal() {
  if (!requireLogin()) return;
  const qs = pickRandom(gatherAllQuestions(), 12);
  const form = $("#finalForm");
  if (!form) return;
  form.innerHTML = "";
  qs.forEach((it, idx) => {
    const id = "qf_" + idx;
    if (it.t === "tf") {
      form.insertAdjacentHTML(
        "beforeend",
        `<div class="card"><div><b>${idx + 1}.</b> ${esc(it.q)}</div>
      <label><input type="radio" name="${id}" value="t"> True</label>
      <label><input type="radio" name="${id}" value="f"> False</label></div>`
      );
    } else {
      form.insertAdjacentHTML(
        "beforeend",
        `<div class="card"><div><b>${idx + 1}.</b> ${esc(
          it.q
        )}</div><input class="input" name="${id}" placeholder="Your answer"></div>`
      );
    }
  });
  form.insertAdjacentHTML(
    "beforeend",
    `<div class="row" style="justify-content:flex-end;gap:8px">
    <button class="btn" id="cancelFinal" type="button">Cancel</button>
    <button class="btn primary" id="submitFinal" type="button">Submit</button></div>`
  );
  $("#cancelFinal")?.addEventListener("click", () => $("#finalModal")?.close());
  $("#submitFinal")?.addEventListener("click", () => {
    let score = 0;
    qs.forEach((it, idx) => {
      const id = "qf_" + idx;
      const val = (
        form.querySelector(`[name="${id}"]`)?.value ||
        form.querySelector(`[name="${id}"]:checked`)?.value ||
        ""
      )
        .toString()
        .trim()
        .toLowerCase();
      const ans = String(it.a).toLowerCase();
      if (val && (val === ans || (it.t !== "tf" && ans && val.includes(ans))))
        score++;
    });
    const pct = Math.round((score / qs.length) * 100);
    if (pct >= 70) {
      toast(`Passed ${pct}% ✔ — downloading…`);
      downloadCertificate(auth.currentUser?.email || "Student", pct);
      downloadTranscript(
        auth.currentUser?.email || "Student",
        pct,
        qs.length,
        score
      );
    } else toast(`Failed ${pct}% — try again`);
    $("#finalModal")?.close();
  });
  $("#finalModal")?.showModal();
}
function downloadCertificate(name, pct) {
  const cvs = document.createElement("canvas");
  cvs.width = 1100;
  cvs.height = 700;
  const ctx = cvs.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, 1100, 700);
  g.addColorStop(0, "#0f172a");
  g.addColorStop(1, "#0b1220");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1100, 700);
  ctx.strokeStyle = "#3b82f6";
  ctx.lineWidth = 8;
  ctx.strokeRect(40, 40, 1020, 620);
  ctx.fillStyle = "#eaf1ff";
  ctx.font = "bold 48px ui-sans-serif";
  ctx.fillText("Certificate of Completion", 260, 160);
  ctx.font = "24px ui-sans-serif";
  ctx.fillText("This is to certify that", 430, 220);
  ctx.font = "700 42px ui-sans-serif";
  ctx.fillText(name, 420, 280);
  ctx.font = "24px ui-sans-serif";
  ctx.fillText("has successfully passed the Final Exam", 360, 330);
  ctx.fillText(`Score: ${pct}%`, 480, 370);
  ctx.font = "20px ui-sans-serif";
  ctx.fillText(`Date: ${new Date().toLocaleString()}`, 420, 420);
  ctx.beginPath();
  ctx.arc(940, 130, 40, 0, Math.PI * 2);
  ctx.fillStyle = "#22d3ee";
  ctx.fill();
  ctx.fillStyle = "#0b1220";
  ctx.font = "bold 26px ui-sans-serif";
  ctx.fillText("✔", 930, 140);
  const a = document.createElement("a");
  a.download = "OpenLearn-Certificate.png";
  a.href = cvs.toDataURL("image/png");
  a.click();
}
function downloadTranscript(name, pct, total, correct) {
  const blob = new Blob(
    [
      `OpenLearn Transcript
Student: ${name}
Date: ${new Date().toLocaleString()}
Final Exam: ${correct}/${total} (${pct}%)
Status: ${pct >= 70 ? "Pass" : "Fail"}
`,
    ],
    { type: "text/plain" }
  );
  const a = document.createElement("a");
  a.download = "OpenLearn-Transcript.txt";
  a.href = URL.createObjectURL(blob);
  a.click();
}

/* ================= Chat (RTDB realtime with fallback local) ================= */
// ====== Chat settings ======
const TEN_DAYS = 10 * 24 * 60 * 60 * 1000;
const BAD_WORDS = ["fuck","shit","asshole","bitch","cunt","dick","pussy","rape","nigger","faggot"]; // sample only
const isAdminLike = () => ["owner","admin","instructor","ta"].includes(getRole() || "student");
const clean = (s)=>s.normalize("NFKC").toLowerCase();
const hasBadWord = (text) => {
  const t = " " + clean(text) + " ";
  return BAD_WORDS.some(w => t.includes(" " + w + " "));
};

// ---- Chat auth helper ----
// Ensures we have a Firebase Auth user before writing to RTDB.
// If OPENLEARN_CFG.chat.allowAnon === true, it will try anonymous sign-in.
// If anonymous is disabled in your Firebase Auth settings, we’ll show a toast.
async function ensureAuthForChat() {
  try {
    // already authed with Firebase?
    if (auth?.currentUser) return auth.currentUser;

    // gate: if you want to force real login only, just throw here:
    // throw new Error("login-required");

    // optional anonymous flow (enable in config + Firebase console)
    if (window.OPENLEARN_CFG?.chat?.allowAnon === true) {
      await signInAnonymously(auth);
      return auth.currentUser;
    }

    // otherwise require a real login
    throw new Error("login-required");
  } catch (e) {
    // If console shows auth/admin-restricted-operation, enable Anonymous in Firebase Auth → Sign-in method
    console.warn("ensureAuthForChat:", e);
    if (String(e?.message || e).includes("login-required")) {
      toast("Please log in to chat.");
    } else {
      toast("Chat auth failed");
    }
    throw e;
  }
}

// ====== Global chat (dashboard) ======
function initChatRealtime(){
  const box = $("#chatBox"), input = $("#chatInput"), send = $("#chatSend");
  if (!box || !send) return;

  const displayName = getUser()?.email || "guest";

  try {
    const rtdb = getDatabase?.(db.app);
    if (rtdb) {
      const roomId = "global";
      const roomRef = ref(rtdb, `chats/${roomId}`);

      // Render helper
      const renderMsg = (key, m) => {
        const canDelete = (isAdminLike() || window.DEBUG_FORCE_DELETE === true); // your existing role helper
        const html = `
          <div class="msg" id="msg-${key}">
            <div class="row" style="justify-content:space-between;align-items:center">
              <div>
                <b>${esc(m.user)}</b>
                <span class="small muted">${new Date(m.ts).toLocaleTimeString()}</span>
              </div>
              ${canDelete ? `<button class="btn small" data-del="${key}">Delete</button>` : ""}
            </div>
            <div>${esc(m.text)}</div>
          </div>`;
        box.insertAdjacentHTML("beforeend", html);
        box.scrollTop = box.scrollHeight;

        if (canDelete) {
          box.querySelector(`[data-del="${key}"]`)?.addEventListener("click", async () => {
            // Optimistic remove in UI
            document.getElementById(`msg-${key}`)?.remove();
            try {
              await remove(ref(rtdb, `chats/${roomId}/${key}`));
            } catch (e) {
              toast("Delete failed");
              // (Optional) re-insert if you want strict consistency
            }
          });
        }
      };

      // live add
      onChildAdded(roomRef, (snap) => {
        const m = snap.val(); if (!m) return;
        renderMsg(snap.key, m);
      });

      // live delete
      onChildRemoved(roomRef, (snap) => {
        document.getElementById(`msg-${snap.key}`)?.remove();
      });

      // send
      send.addEventListener("click", async () => {
        const text = input?.value.trim(); if (!text) return;
        try {
          await ensureAuthForChat(); // your helper
          const uid = auth.currentUser?.uid || "nouid";
          await push(roomRef, { uid, user: displayName, text, ts: Date.now() });
          if (input) input.value = "";
        } catch {
          toast("Chat failed");
        }
      });

      return; // RTDB branch done
    }
  } catch {}

  // ---- Fallback: local only ----
  const KEY="ol_chat_local";
  const load=()=>JSON.parse(localStorage.getItem(KEY)||"[]");
  const save=(a)=>localStorage.setItem(KEY, JSON.stringify(a));
  const draw=(m)=>{
    box.insertAdjacentHTML("beforeend",
      `<div class="msg"><b>${esc(m.user)}</b> <span class="small muted">${new Date(m.ts).toLocaleTimeString()}</span><div>${esc(m.text)}</div></div>`);
    box.scrollTop=box.scrollHeight;
  };
  let arr=load().filter(m=>m.ts >= Date.now() - TEN_DAYS);
  box.innerHTML = ""; arr.forEach(draw);
  send.addEventListener("click", ()=>{
    const text=input?.value.trim(); if(!text) return;
    if (hasBadWord(text)) { toast("Message rejected (language)"); return; }
    const m={user:displayName, text, ts:Date.now()};
    arr.push(m); save(arr); draw(m); input.value="";
  });
}

// ====== Per-course chat (reader page) ======
function wireCourseChatRealtime(courseId){
  const list = $("#ccList"), input = $("#ccInput"), send = $("#ccSend"), label = $("#chatRoomLabel");
  if (!list || !send) return;
  if (label) label.textContent = "room: " + courseId;
  const displayName = getUser()?.email || "you";

  try {
    const rtdb = getDatabase?.(db.app);
    if (rtdb) {
      const roomRef = ref(rtdb, `chats/${courseId}`);

      const renderMsg = (key, m) => {
        const canDelete = (isAdminLike() || window.DEBUG_FORCE_DELETE === true);
        const html = `
          <div class="msg" id="msg-${key}">
            <div class="row" style="justify-content:space-between;align-items:center">
              <div>
                <b>${esc(m.user)}</b>
                <span class="small muted">${new Date(m.ts).toLocaleTimeString()}</span>
              </div>
              ${canDelete ? `<button class="btn small" data-del="${key}">Delete</button>` : ""}
            </div>
            <div>${esc(m.text)}</div>
          </div>`;
        list.insertAdjacentHTML("beforeend", html);
        list.scrollTop = list.scrollHeight;

        if (canDelete) {
          list.querySelector(`[data-del="${key}"]`)?.addEventListener("click", async () => {
            document.getElementById(`msg-${key}`)?.remove(); // optimistic
            try {
              await remove(ref(rtdb, `chats/${courseId}/${key}`));
            } catch {
              toast("Delete failed");
            }
          });
        }
      };

      onChildAdded(roomRef, (snap) => {
        const m = snap.val(); if (!m) return;
        renderMsg(snap.key, m);
      });

      onChildRemoved(roomRef, (snap) => {
        document.getElementById(`msg-${snap.key}`)?.remove();
      });

      boxOrList.querySelector(`[data-del="${key}"]`)?.addEventListener("click", async () => {
  document.getElementById(`msg-${key}`)?.remove(); // optimistic
  try { await remove(ref(rtdb, `chats/${roomPath}/${key}`)); }
  catch { toast("Delete failed"); }
});

      send.addEventListener("click", async () => {
        const text = (input?.value || "").trim(); if (!text) return;
        try {
          await ensureAuthForChat();
          const uid = auth.currentUser?.uid || "nouid";
          await push(roomRef, { uid, user: displayName, text, ts: Date.now() });
          if (input) input.value = "";
        } catch {
          toast("Chat failed");
        }
      });

      return;
    }
  } catch {}

  // ---- Local fallback (per-device) ----
  const KEY = "ol_chat_room_"+courseId;
  const load=()=>JSON.parse(localStorage.getItem(KEY)||"[]").filter(m=>m.ts >= Date.now()-TEN_DAYS);
  const save=(a)=>localStorage.setItem(KEY, JSON.stringify(a));
  const draw=(m)=>{
    list.insertAdjacentHTML("beforeend",
      `<div class="msg"><b>${esc(m.user)}</b> <span class="small muted">${new Date(m.ts).toLocaleString()}</span><div>${esc(m.text)}</div></div>`);
    list.scrollTop=list.scrollHeight;
  };
  let arr=load(); list.innerHTML=""; arr.forEach(draw);
  send.addEventListener("click", ()=>{
    const text=(input?.value||"").trim(); if(!text) return;
    if (hasBadWord(text)) { toast("Message rejected (language)"); return; }
    const m={user:displayName, text, ts:Date.now()};
    arr.push(m); save(arr); draw(m); input.value="";
  });
}
// function initChatRealtime() {
//   const box = $("#chatBox"),
//     input = $("#chatInput"),
//     send = $("#chatSend");
//   if (!box || !send) return;

//   // Decide room: global or per-course
//   const roomAttr = box.dataset.room || "global";
//   let roomId = "global";
//   if (roomAttr.startsWith("course:")) roomId = roomAttr.slice(7);

//   // If reader switched, update automatically
//   const setRoom = (rid) => {
//     roomId = rid || "global";
//   };

//   // Attach RTDB listener if possible
//   let useRTDB = false;
//   try {
//     const rtdb = getDatabase(app);
//     const path = roomId === "global" ? "chats/global" : `chats/${roomId}`;
//     const roomRef = ref(rtdb, path);
//     onChildAdded(roomRef, (snap) => {
//       const m = snap.val();
//       if (!m) return;
//       box.insertAdjacentHTML(
//         "beforeend",
//         `<div class="msg"><b>${esc(
//           m.user
//         )}</b> <span class="small muted">${new Date(
//           m.ts
//         ).toLocaleTimeString()}</span><div>${esc(m.text)}</div></div>`
//       );
//       box.scrollTop = box.scrollHeight;
//     });
//     send.addEventListener("click", async () => {
//       if (!auth.currentUser) {
//         toast("Please log in to chat");
//         return;
//       }
//       const text = input?.value.trim();
//       if (!text) return;
//       try {
//         await push(
//           ref(rtdb, roomId === "global" ? "chats/global" : `chats/${roomId}`),
//           {
//             uid: auth.currentUser.uid,
//             user: auth.currentUser.email || "user",
//             text,
//             ts: Date.now(),
//           }
//         );
//         if (input) input.value = "";
//       } catch (e) {
//         console.error(e);
//         toast("Chat failed");
//       }
//     });
//     useRTDB = true;
//   } catch {
//     useRTDB = false;
//   }

//   // Fallback: local-only chat
//   if (!useRTDB) {
//     const KEY = "ol_chat_local_" + roomId;
//     const load = () => JSON.parse(localStorage.getItem(KEY) || "[]");
//     const save = (a) => localStorage.setItem(KEY, JSON.stringify(a));
//     const draw = (m) => {
//       box.insertAdjacentHTML(
//         "beforeend",
//         `<div class="msg"><b>${esc(
//           m.user
//         )}</b> <span class="small muted">${new Date(
//           m.ts
//         ).toLocaleTimeString()}</span><div>${esc(m.text)}</div></div>`
//       );
//       box.scrollTop = box.scrollHeight;
//     };
//     let arr = load();
//     arr.forEach(draw);
//     send.addEventListener("click", () => {
//       const text = input?.value.trim();
//       if (!text) return;
//       const m = {
//         user: auth.currentUser?.email || "guest",
//         text,
//         ts: Date.now(),
//       };
//       arr.push(m);
//       save(arr);
//       draw(m);
//       if (input) input.value = "";
//     });
//   }

//   // Expose room setter if reader changes
//   window.__ol_setChatRoom = (rid) => setRoom(rid);
// }

/* ================= Settings ================= */
$("#themeSel")?.addEventListener("change", (e) => {
  localStorage.setItem("ol_theme", e.target.value);
  applyPalette(e.target.value);
});
$("#fontSel")?.addEventListener("change", (e) => {
  localStorage.setItem("ol_font", e.target.value);
  applyFont(e.target.value);
});
$("#btn-top-ann")?.addEventListener("click", () => showPage("dashboard"));
$("#btn-top-final")?.addEventListener("click", () => showPage("finals"));

/* ================= Boot ================= */
document.addEventListener("DOMContentLoaded", async () => {
  // 0) theme / font
  applyPalette(localStorage.getItem("ol_theme") || "slate");
  applyFont(localStorage.getItem("ol_font") || "16");

  // 1) Auth UI + restore user
  initAuth();                     // wires Firebase Auth + onAuthStateChanged
  initAuthModal();                    // builds modal + sets window._showLoginPane
  const u = (typeof getUser === "function" ? getUser() : null);
  setLogged?.(!!u, u?.email);          // reflect login state in UI

  // 2) Features that depend on user/DOM
  initSidebar?.();
  initSearch?.();
  // initAuth?.(); // ← remove unless you have a separate function called initAuth
  initChatRealtime?.();                // chat binds safely; no-op if DOM missing

  // 3) Data & initial render
  try { await loadCatalog?.(); } catch (e) { console.warn("Catalog load failed", e); }
  ALL = getCourses?.() || [];
  renderCatalog?.();
  renderAdminTable?.();
  renderProfilePanel?.();

  // 4) Small UX touches
  const annBtn = document.getElementById("btn-top-ann");
  const finBtn = document.getElementById("btn-top-final");
  if (annBtn) annBtn.title = "Open Announcements";
  if (finBtn) finBtn.title = "Open Final Exam";

  // (optional) titles
  $("#btn-top-ann") && ($("#btn-top-ann").title = "Open Announcements");
  $("#btn-top-final") && ($("#btn-top-final").title = "Open Final Exam");
});
