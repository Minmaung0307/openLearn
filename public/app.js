/* =========================================================
   OpenLearn · app.js (Improved)
   Part 1/6 — Imports, helpers, theme, state, roles
   ========================================================= */
import {
  db,
  auth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,

  // RTDB
  getDatabase,
  ref,
  push,
  onChildAdded,
  query,
  orderByChild,
  get,
  remove,

  // Firestore (for enroll sync)
  doc,
  getDoc,
  setDoc,
} from "./firebase.js";

/* ---------- tiny DOM helpers ---------- */
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));
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
const _read = (k, d) => {
  try {
    return JSON.parse(localStorage.getItem(k) || JSON.stringify(d));
  } catch {
    return d;
  }
};
const _write = (k, v) => localStorage.setItem(k, JSON.stringify(v));

// ---------- HARD SAFE STUBS (must be VERY FIRST lines) ----------
if (!("renderProfilePanel" in window)) window.renderProfilePanel = () => {};
if (!("renderMyLearning" in window)) window.renderMyLearning = () => {};
if (!("renderGradebook" in window)) window.renderGradebook = () => {};
if (!("renderAdminTable" in window)) window.renderAdminTable = () => {};
if (!("renderAnnouncements" in window)) window.renderAnnouncements = () => {};

/* ---------- responsive theme / font ---------- */
const PALETTES = {
  /* ... (unchanged palettes) ... */
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
  },
  light: {
    bg: "#f7f8fb",
    fg: "#0e1320",
    card: "#fff",
    muted: "#5b6b7c",
    border: "#e7eaf0",
    btnBg: "#eef2f7",
    btnFg: "#0e1320",
    btnPrimaryBg: "#2563eb",
    btnPrimaryFg: "#fff",
  },
  dark: {
    bg: "#111",
    fg: "#f1f1f1",
    card: "#1e1e1e",
    muted: "#aaa",
    border: "#333",
    btnBg: "#333",
    btnFg: "#eee",
    btnPrimaryBg: "#0d6efd",
    btnPrimaryFg: "#fff",
  },
  gray: {
    bg: "#e5e5e5",
    fg: "#222",
    card: "#f2f2f2",
    muted: "#555",
    border: "#ccc",
    btnBg: "#ddd",
    btnFg: "#222",
    btnPrimaryBg: "#555",
    btnPrimaryFg: "#fff",
  },
  offwhite: {
    bg: "#faf7f2",
    fg: "#222",
    card: "#fffefc",
    muted: "#666",
    border: "#ddd",
    btnBg: "#eee",
    btnFg: "#111",
    btnPrimaryBg: "#8c7851",
    btnPrimaryFg: "#fff",
  },
  forest: {
    bg: "#0f1713",
    fg: "#eaf7ef",
    card: "#15241c",
    muted: "#9cc5ae",
    border: "#1e3429",
    btnBg: "#183329",
    btnFg: "#eaf7ef",
    btnPrimaryBg: "#22c55e",
    btnPrimaryFg: "#082015",
  },
  sunset: {
    bg: "#1b1210",
    fg: "#ffefe7",
    card: "#221614",
    muted: "#e7b7a7",
    border: "#37201a",
    btnBg: "#2a1a17",
    btnFg: "#ffefe7",
    btnPrimaryBg: "#fb923c",
    btnPrimaryFg: "#1b100b",
  },
  lavender: {
    bg: "#120f1b",
    fg: "#f3eaff",
    card: "#181327",
    muted: "#c9b7e7",
    border: "#251b3b",
    btnBg: "#1d1631",
    btnFg: "#f3eaff",
    btnPrimaryBg: "#8b5cf6",
    btnPrimaryFg: "#150f24",
  },
  emerald: {
    bg: "#071914",
    fg: "#eafff8",
    card: "#0b241d",
    muted: "#9ad6c5",
    border: "#12362c",
    btnBg: "#0e2d25",
    btnFg: "#eafff8",
    btnPrimaryBg: "#10b981",
    btnPrimaryFg: "#06261e",
  },
  rose: {
    bg: "#fff5f7",
    fg: "#4a001f",
    card: "#ffe4ec",
    muted: "#995566",
    border: "#f3cbd1",
    btnBg: "#f8d7e0",
    btnFg: "#4a001f",
    btnPrimaryBg: "#e75480",
    btnPrimaryFg: "#fff",
  },
  ocean: {
    bg: "#f0f8fa",
    fg: "#003344",
    card: "#d9f0f6",
    muted: "#557d88",
    border: "#a5d8de",
    btnBg: "#cceef2",
    btnFg: "#003344",
    btnPrimaryBg: "#0077b6",
    btnPrimaryFg: "#fff",
  },
  amber: {
    bg: "#fffdf6",
    fg: "#442200",
    card: "#fff3cd",
    muted: "#886633",
    border: "#ffeeba",
    btnBg: "#ffe8a1",
    btnFg: "#442200",
    btnPrimaryBg: "#ff8c00",
    btnPrimaryFg: "#fff",
  },
};
function applyPalette(name = "slate") {
  const p = PALETTES[name] || PALETTES.slate;
  const r = document.documentElement;
  const map = {
    bg: "--bg",
    fg: "--fg",
    card: "--card",
    muted: "--muted",
    border: "--border",
    btnBg: "--btnBg",
    btnFg: "--btnFg",
    btnPrimaryBg: "--btnPrimaryBg",
    btnPrimaryFg: "--btnPrimaryFg",
  };
  Object.entries(map).forEach(([k, v]) => r.style.setProperty(v, p[k]));
  const rgb = (hex) => {
    const h = hex.replace("#", "");
    return h.length === 3
      ? h.split("").map((c) => parseInt(c + c, 16))
      : [h.slice(0, 2), h.slice(2, 4), h.slice(4, 6)].map((x) =>
          parseInt(x, 16)
        );
  };
  const [rr, gg, bb] = rgb(p.fg);
  r.style.setProperty("--fg-r", rr);
  r.style.setProperty("--fg-g", gg);
  r.style.setProperty("--fg-b", bb);
  document.querySelectorAll(".card, .input, .btn").forEach(() => {});
}
function applyFont(px = 16) {
  document.documentElement.style.setProperty("--fontSize", px + "px");
}

/* ---------- state (localStorage) ---------- */
const getCourses = () => _read("ol_courses", []);
const setCourses = (a) => _write("ol_courses", a || []);
const getEnrolls = () => new Set(_read("ol_enrolls", []));
const setEnrolls = (s) => _write("ol_enrolls", Array.from(s));
const getAnns = () => _read("ol_anns", []);
const setAnns = (a) => _write("ol_anns", a || []);
const getProfile = () =>
  _read("ol_profile", {
    displayName: "",
    photoURL: "",
    bio: "",
    skills: "",
    links: "",
    social: "",
  });
const setProfile = (p) => _write("ol_profile", p || {});
const getUser = () => JSON.parse(localStorage.getItem("ol_user") || "null");
const setUser = (u) => localStorage.setItem("ol_user", JSON.stringify(u));

/* ---------- roles ---------- */
const isLogged = () => !!getUser();
const getRole = () => getUser()?.role || "student";
const isAdminLike = () =>
  ["owner", "admin", "instructor", "ta"].includes(getRole());

/* ---------- globals ---------- */
let ALL = []; // merged catalog list
let currentUser = null;

/* ---------- quiz randomize + pass-state helpers ---------- */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const QUIZ_STATE_KEY = "ol_quiz_state"; // {"cid:idx":{best:0.8,passed:true}}
const getQuizState = () => _read(QUIZ_STATE_KEY, {});
const setQuizState = (o) => _write(QUIZ_STATE_KEY, o);
const quizKey = (cid, idx) => `${cid}:${idx}`;
const hasPassedQuiz = (cid, idx) => !!getQuizState()[quizKey(cid, idx)]?.passed;
const setPassedQuiz = (cid, idx, score) => {
  const s = getQuizState();
  const k = quizKey(cid, idx);
  const prev = s[k]?.best || 0;
  s[k] = { best: Math.max(prev, score), passed: score >= 0.75 };
  setQuizState(s);
  saveProgressCloud({ quiz: getQuizState(), ts: Date.now() });
};

// Add once (near top-level) to mute noisy Firestore channel terminate logs
(function muteFirestoreTerminate400() {
  const origError = console.error;
  const origWarn = console.warn;
  const noisy =
    /google\.firestore\.v1\.Firestore\/Write\/channel.*TYPE=terminate/i;
  console.error = function (...args) {
    if (args.some((a) => typeof a === "string" && noisy.test(a))) return;
    origError.apply(console, args);
  };
  console.warn = function (...args) {
    if (args.some((a) => typeof a === "string" && noisy.test(a))) return;
    origWarn.apply(console, args);
  };
})();

// ---- Certificate registry (local + optional cloud) ----
const CERTS_KEY = "ol_certs_v1"; // { "<uid>|<courseId>": { id, issuedAt, name, photo, score } }
const getCerts = () => _read(CERTS_KEY, {});
const setCerts = (o) => _write(CERTS_KEY, o);

function currentUidKey() {
  const uid = auth?.currentUser?.uid || "";
  const email = (getUser()?.email || "").toLowerCase();
  return uid || email || "anon";
}
function certKey(courseId) {
  return currentUidKey() + "|" + courseId;
}

// simple hash for ID (no crypto dependency)
function hashId(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return ("00000000" + (h >>> 0).toString(16)).slice(-8);
}

function ensureCertIssued(course, profile, score) {
  const key = certKey(course.id);
  const all = getCerts();
  if (all[key]) return all[key]; // already issued

  const seed = [currentUidKey(), course.id, Date.now()].join("|");
  const id = "OL-" + hashId(seed).toUpperCase();
  const rec = {
    id,
    courseId: course.id,
    issuedAt: Date.now(),
    name: profile.displayName || getUser()?.email || "Student",
    photo: profile.photoURL || "",
    score: typeof score === "number" ? score : null,
  };

  all[key] = rec;
  setCerts(all);

  // Optional: save to Firestore /certs (fire-and-forget)
  try {
    if (db && auth?.currentUser) {
      const cref = doc(db, "certs", `${currentUidKey()}_${course.id}`);
      setDoc(cref, rec, { merge: true }).catch(() => {});
    }
  } catch {}

  saveProgressCloud({ certs: getCerts(), ts: Date.now() });

  return rec;
}
function getIssuedCert(courseId) {
  return getCerts()[certKey(courseId)] || null;
}

// --- Add near top (after helpers) ---
function normalizeQuiz(raw) {
  // already in {questions:[...]} form
  if (raw && raw.questions) return raw;

  // your current files are arrays: [{ type, q, a, correct }]
  if (Array.isArray(raw)) {
    return {
      randomize: true,
      shuffleChoices: true,
      questions: raw.map((x) => {
        const isStrAnswer = typeof x.a === "string";
        return {
          type: x.type || "single",
          q: x.q || "",
          choices: Array.isArray(x.a) ? x.a : x.choices || [],
          correct: x.correct,
          // unify short-answer key name
          answers: isStrAnswer ? [String(x.a).trim()] : x.answers || [],
          answer: isStrAnswer ? String(x.a).trim() : x.answer || null,
        };
      }),
    };
  }
  return null;
}

// ===== Quiz config (add this near the top) =====
const QUIZ_PASS = 0.7; // 0.70 = 70% pass (လိုသလို 0.75 သို့ပြန်ခဲ့ရင် အလွယ်)
const QUIZ_SAMPLE_SIZE = 6; // bank ကနေ စမ်းမေးမယ့် အရေအတွက် (bank ထဲက မလုံလောက်ရင် အလောက်အလျားပဲယူမယ်)
const QUIZ_RANDOMIZE = true; // true = ကြိမ်ကို ကြိမ် အမေးခွန်း random

/* ---------- cloud enroll sync (Firestore) ---------- */
// const enrollDocRef = () => {
//   const uid = auth?.currentUser?.uid || (getUser()?.email || "").toLowerCase();
//   if (!uid) return null;
//   return doc(db, "enrolls", uid);
// };
const enrollDocRef = () => {
  const uid = auth?.currentUser?.uid || "";
  if (!uid || !db) return null;
  return doc(db, "enrolls", uid);
};

async function loadEnrollsCloud() {
  const ref = enrollDocRef();
  if (!ref) return null;
  try {
    const snap = await getDoc(ref);
    return snap.exists() ? new Set(snap.data().courses || []) : new Set();
  } catch {
    return null;
  }
}

// ---- Firestore check (fixed) ----
function hasFirestore() {
  // We only care that 'db' exists (already imported from ./firebase.js)
  return !!db;
}

async function saveEnrollsCloud(set) {
  if (!hasFirestore()) {
    // console.warn("Firestore not available → using local enrolls only");
    renderCatalog();
    // renderMyLearning?.();
    window.renderMyLearning?.();
    return;
  }
  const ref = enrollDocRef();
  if (!ref) return;
  try {
    await setDoc(
      ref,
      { courses: Array.from(set), ts: Date.now() },
      { merge: true }
    );
  } catch (e) {
    console.warn("saveEnrollsCloud failed:", e.message || e);
  }
}

async function syncEnrollsBothWays() {
  if (!hasFirestore()) {
    console.warn("Firestore not available → using local enrolls only");
    renderCatalog();
    window.renderMyLearning?.();
    return;
  }

  try {
    const local = getEnrolls();
    const cloud = await loadEnrollsCloud();
    if (cloud) {
      const merged = new Set([...local, ...cloud]);
      setEnrolls(merged);
      await saveEnrollsCloud(merged);
    } else {
      await saveEnrollsCloud(local);
    }
  } catch (e) {
    console.warn("syncEnrollsBothWays failed:", e.message || e);
  }

  renderCatalog();
  window.renderMyLearning?.();
}

/* =========================================================
   Part 2/6 — Data loaders, catalog, sidebar/topbar, search
   ========================================================= */

/* ---------- data base resolver ---------- */
const DATA_BASE_CANDIDATES = ["/data", "./data", "/public/data", "data"];
const COURSE_DIR_ALIAS = { "js-essentials": "js-ennentials" };
const courseDir = (id) => COURSE_DIR_ALIAS[id] || id;
let DATA_BASE = null;

async function resolveDataBase() {
  const cfg = (window.OPENLEARN_DATA_BASE || "").trim();
  if (cfg) {
    DATA_BASE = cfg;
    return;
  }
  for (const base of DATA_BASE_CANDIDATES) {
    try {
      const r = await fetch(`${base}/catalog.json`, { cache: "no-cache" });
      if (r.ok) {
        DATA_BASE = base;
        return;
      }
    } catch {}
  }
  DATA_BASE = null;
}
async function fetchJSON(path) {
  const r = await fetch(path, { cache: "no-cache" });
  if (!r.ok) return null;
  try {
    return await r.json();
  } catch {
    return null;
  }
}

/* ---------- catalog loader ---------- */
async function loadCatalog() {
  await resolveDataBase();
  let items = [];
  if (DATA_BASE) {
    try {
      const r = await fetch(`${DATA_BASE}/catalog.json`, { cache: "no-cache" });
      if (r.ok) items = (await r.json())?.items || [];
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
    ...local.filter((l) => !items.some((c) => c.id === l.id)),
  ];
  setCourses(merged);
  ALL = merged;
  renderCatalog();
}

/* ---------- filters + catalog ---------- */
function sortCourses(list, sort) {
  if (sort === "title-asc")
    return list.slice().sort((a, b) => a.title.localeCompare(b.title));
  if (sort === "title-desc")
    return list.slice().sort((a, b) => b.title.localeCompare(a.title));
  if (sort === "price-asc")
    return list.slice().sort((a, b) => (a.price || 0) - (b.price || 0));
  if (sort === "price-desc")
    return list.slice().sort((a, b) => (b.price || 0) - (a.price || 0));
  return list;
}
function renderCatalog() {
  const grid = $("#courseGrid");
  if (!grid) return;
  ALL = getCourses();

  const sel = $("#filterCategory");
  if (sel) {
    const cats = Array.from(new Set(ALL.map((c) => c.category || "")))
      .filter(Boolean)
      .sort();
    sel.innerHTML =
      `<option value="">All Categories</option>` +
      cats.map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join("");
  }

  const cat = ($("#filterCategory")?.value || "").trim();
  const lvl = ($("#filterLevel")?.value || "").trim();
  const sort = ($("#sortBy")?.value || "").trim();
  let list = ALL.filter(
    (c) => (!cat || c.category === cat) && (!lvl || c.level === lvl)
  );
  list = sortCourses(list, sort);

  if (!list.length) {
    grid.innerHTML = `<div class="muted">No courses match the filters.</div>`;
    return;
  }

  grid.innerHTML = list
    .map((c) => {
      const r = Number(c.rating || 4.6);
      const priceStr = (c.price || 0) > 0 ? "$" + c.price : "Free";
      const search = [c.title, c.summary, c.category, c.level].join(" ");
      const enrolled = getEnrolls().has(c.id);
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
    })
    .join("");

  grid
    .querySelectorAll("[data-enroll]")
    .forEach(
      (b) => (b.onclick = () => handleEnroll(b.getAttribute("data-enroll")))
    );
  grid
    .querySelectorAll("[data-details]")
    .forEach(
      (b) => (b.onclick = () => openDetails(b.getAttribute("data-details")))
    );
}

// default filter dropdown before data arrives
document.addEventListener("DOMContentLoaded", () => {
  const catSel = $("#filterCategory");
  if (catSel && !catSel.options.length)
    catSel.innerHTML = `<option value="">All Categories</option>`;
});
["filterCategory", "filterLevel", "sortBy"].forEach((id) =>
  document.getElementById(id)?.addEventListener("change", renderCatalog)
);

/* ---------- sidebar + topbar offset (iPad/touch-friendly) ---------- */
function initSidebar() {
  const sb = $("#sidebar"),
    burger = $("#btn-burger");
  const mqNarrow = matchMedia("(max-width:1024px)");
  const mqNoHover = matchMedia("(hover: none)");
  const mqCoarse = matchMedia("(pointer: coarse)");
  const isTouchLike = () =>
    mqNarrow.matches || mqNoHover.matches || mqCoarse.matches;

  const setBurger = () => {
    if (burger) burger.style.display = isTouchLike() ? "" : "none";
  };
  setBurger();
  addEventListener("resize", setBurger);

  const setExpandedFlag = (on) =>
    document.body.classList.toggle("sidebar-expanded", !!on);

  sb?.addEventListener("click", (e) => {
    const navBtn = e.target.closest(".navbtn");
    if (navBtn) return;
    if (isTouchLike()) {
      const on = !document.body.classList.contains("sidebar-expanded");
      setExpandedFlag(on);
    }
  });

  burger?.addEventListener("click", (e) => {
    e.stopPropagation();
    sb?.classList.toggle("show");
    setExpandedFlag(sb?.classList.contains("show"));
  });

  sb?.addEventListener("click", (e) => {
    const b = e.target.closest(".navbtn");
    if (!b) return;
    showPage(b.dataset.page);
    if (isTouchLike()) {
      sb.classList.remove("show");
      setExpandedFlag(false);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  document.addEventListener("click", (e) => {
    if (!isTouchLike()) return;
    if (!sb?.classList.contains("show")) return;
    if (!e.target.closest("#sidebar") && e.target !== burger) {
      sb.classList.remove("show");
      setExpandedFlag(false);
    }
  });
}

/* keep --topbar-offset accurate */
function setTopbarOffset() {
  const tb = $("#topbar");
  if (!tb) return;
  const h = Math.ceil(tb.getBoundingClientRect().height);
  document.documentElement.style.setProperty("--topbar-offset", h + "px");
}
const _runTopbarOffset = () => requestAnimationFrame(setTopbarOffset);
document.addEventListener("DOMContentLoaded", _runTopbarOffset);
addEventListener("resize", _runTopbarOffset);
addEventListener("orientationchange", _runTopbarOffset);
if (window.visualViewport) {
  visualViewport.addEventListener("resize", _runTopbarOffset);
  visualViewport.addEventListener("scroll", _runTopbarOffset);
}
if ("ResizeObserver" in window) {
  const tb = $("#topbar");
  tb && new ResizeObserver(_runTopbarOffset).observe(tb);
}

/* ---------- router + search ---------- */
function showPage(id, push = true) {
  $$(".page").forEach((p) => p.classList.remove("visible"));
  $("#page-" + id)?.classList.add("visible");

  // highlight nav
  $$("#sidebar .navbtn").forEach((b) =>
    b.classList.toggle("active", b.dataset.page === id)
  );

  if (id === "mylearning") window.renderMyLearning?.();
  if (id === "gradebook") window.renderGradebook?.();
  if (id === "admin") window.renderAdminTable?.();
  if (id === "dashboard") window.renderAnnouncements?.();

  // 🔑 update browser history (default true)
  if (push) {
    history.pushState({ page: id }, "", "#" + id);
  }
}

function updateAnnBadge() {
  const b = document.getElementById("annBadge");
  if (!b) return;
  const list = getAnns ? getAnns() : [];
  const n = Array.isArray(list) ? list.length : 0;
  if (n > 0) {
    b.textContent = String(n);
    b.style.display = "inline-flex";
  } else {
    b.textContent = "";
    b.style.display = "none";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // initial page already handled above
  updateAnnBadge();

  document.getElementById("btn-top-ann")?.addEventListener("click", () => {
    showPage("dashboard");
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
});

// handle browser back/forward
window.addEventListener("popstate", (e) => {
  const id = e.state?.page || location.hash.replace("#", "") || "catalog";
  showPage(id, false); // ⚠️ push=false မဟုတ်ရင် infinite loop ဖြစ်မယ်
});

// on first load → hash check
document.addEventListener("DOMContentLoaded", () => {
  const initial = location.hash.replace("#", "") || "catalog";
  showPage(initial, false);
});

document.addEventListener("DOMContentLoaded", () => {
  const newCourseBtn = document.getElementById("btn-new-course");
  const courseModal = document.getElementById("courseModal");
  const closeBtn = document.getElementById("btn-course-close");
  const cancelBtn = document.getElementById("btn-course-cancel");
  const saveBtn = document.getElementById("btn-course-save");

  // open modal
  newCourseBtn?.addEventListener("click", () => {
    courseModal?.showModal();
  });

  // Close button
  closeBtn?.addEventListener("click", () => {
    courseModal?.close();
  });

  // Cancel button
  cancelBtn?.addEventListener("click", () => {
    courseModal?.close();
  });

  // Save button
  saveBtn?.addEventListener("click", (e) => {
    e.preventDefault(); // stop auto-close if you want to validate
    // save logic...
    courseModal?.close();
  });

  // escape key / backdrop click auto works with <dialog>
});

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

// =========== Global Search ==============
(function setupGlobalSearch() {
  const input = document.getElementById("topSearch");
  const results = document.getElementById("searchResults");
  if (!input || !results) return;

  let INDEX = [];

  // Build index from modules/localStorage
  function buildIndex() {
    const safe = (fn, fb = []) => {
      try {
        return fn() || fb;
      } catch (_) {
        return fb;
      }
    };
    const anns = safe(
      () => getAnns?.() || JSON.parse(localStorage.getItem("anns") || "[]")
    );
    const courses = safe(
      () =>
        getCourses?.() || JSON.parse(localStorage.getItem("courses") || "[]")
    );
    const inv = safe(
      () =>
        getInventory?.() ||
        JSON.parse(localStorage.getItem("inventory") || "[]")
    );
    const sushi = safe(
      () =>
        getSushiItems?.() || JSON.parse(localStorage.getItem("sushi") || "[]")
    );
    const vendors = safe(
      () =>
        getVendors?.() || JSON.parse(localStorage.getItem("vendors") || "[]")
    );
    const tasks = safe(
      () => getTasks?.() || JSON.parse(localStorage.getItem("tasks") || "[]")
    );
    const cogs = safe(
      () => getCogs?.() || JSON.parse(localStorage.getItem("cogs") || "[]")
    );
    const users = safe(
      () => getUsers?.() || JSON.parse(localStorage.getItem("users") || "[]")
    );

    INDEX = [];
    anns.forEach((a) =>
      INDEX.push({
        type: "Announcements",
        title: a.title,
        body: a.body,
        page: "dashboard",
      })
    );
    courses.forEach((c) =>
      INDEX.push({
        type: "Courses",
        title: c.title,
        body: c.desc,
        page: "courses",
      })
    );
    inv.forEach((i) =>
      INDEX.push({
        type: "Inventory",
        title: i.name,
        body: `qty:${i.qty}`,
        page: "inventory",
      })
    );
    sushi.forEach((s) =>
      INDEX.push({
        type: "Sushi Items",
        title: s.name,
        body: s.ingredients,
        page: "sushi",
      })
    );
    vendors.forEach((v) =>
      INDEX.push({
        type: "Vendors",
        title: v.name,
        body: `${v.email || ""} ${v.contact || ""}`,
        page: "vendors",
      })
    );
    tasks.forEach((t) =>
      INDEX.push({ type: "Tasks", title: t.title, body: t.desc, page: "tasks" })
    );
    cogs.forEach((c) =>
      INDEX.push({
        type: "COGS",
        title: c.item,
        body: `cost:${c.cost} price:${c.price}`,
        page: "cogs",
      })
    );
    users.forEach((u) =>
      INDEX.push({
        type: "Users",
        title: u.name || u.email,
        body: u.role,
        page: "settings",
      })
    );
  }

  function search(q) {
    const n = q.toLowerCase();
    return INDEX.filter(
      (r) =>
        (r.title || "").toLowerCase().includes(n) ||
        (r.body || "").toLowerCase().includes(n)
    ).slice(0, 20);
  }

  function render(list, q) {
    results.innerHTML = "";
    if (!q) {
      results.hidden = true;
      return;
    }
    if (!list.length) {
      results.innerHTML = `<div class="search-item">No results for “${q}”</div>`;
      results.hidden = false;
      return;
    }
    list.forEach((item) => {
      const div = document.createElement("div");
      div.className = "search-item";
      div.innerHTML = `
        <div class="search-type">${item.type}</div>
        <div class="search-title">${item.title}</div>
        <div class="search-snippet">${item.body || ""}</div>
      `;
      div.onclick = () => {
        showPage?.(item.page);
        results.hidden = true;
        input.blur();
      };
      results.appendChild(div);
    });
    results.hidden = false;
  }

  input.addEventListener("input", (e) => {
    buildIndex();
    render(search(e.target.value), e.target.value);
  });

  document.addEventListener("click", (e) => {
    if (!results.contains(e.target) && e.target !== input) {
      results.hidden = true;
    }
  });
})();

/* =========================================================
   Part 3/6 — Auth, catalog actions, details
   ========================================================= */

/* ---------- auth modal ---------- */
function ensureAuthModalMarkup() {
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
      <div class="h4" style="margin-bottom:6px">Create Account</div>
      <label>Email</label>
      <input id="signupEmail" class="input" type="email" placeholder="you@example.com" required/>
      <label>Password</label>
      <input id="signupPass" class="input" type="password" placeholder="Choose a password" required/>
      <button class="btn primary wide" id="doSignup" type="submit">Create account</button>
      <div class="auth-links"><a href="#" id="backToLogin1">Back to login</a></div>
    </form>

    <form id="authForgot" class="authpane ol-hidden" method="dialog">
      <div class="h4" style="margin-bottom:6px">Reset Password</div>
      <label>Email</label>
      <input id="forgotEmail" class="input" type="email" placeholder="you@example.com" required/>
      <button class="btn wide" id="doForgot" type="submit">Send reset link</button>
      <div class="auth-links"><a href="#" id="backToLogin2">Back to login</a></div>
    </form>
  </dialog>`
  );
}
function setLogged(on, email) {
  currentUser = on ? { email: email || "you@example.com" } : null;
  $("#btn-login") && ($("#btn-login").style.display = on ? "none" : "");
  $("#btn-logout") && ($("#btn-logout").style.display = on ? "" : "none");
  document.body.classList.toggle("logged", !!on);
  document.body.classList.toggle("anon", !on);
  //   renderProfilePanel?.();
  // window.renderProfilePanel?.();
  try {
    window.renderProfilePanel?.();
  } catch (_) {}
}
function initAuthModal() {
  ensureAuthModalMarkup();
  const modal = $("#authModal");
  if (!modal) return;

  const showPane = (id) => {
    ["authLogin", "authSignup", "authForgot"].forEach((x) =>
      $("#" + x)?.classList.add("ol-hidden")
    );
    $("#" + id)?.classList.remove("ol-hidden");
    modal.showModal();
  };
  window._showLoginPane = () => showPane("authLogin");

  document.addEventListener("click", (e) => {
    const loginBtn = e.target.closest("#btn-login");
    const logoutBtn = e.target.closest("#btn-logout");
    if (loginBtn) {
      e.preventDefault();
      showPane("authLogin");
    }
    if (logoutBtn) {
      e.preventDefault();
      (async () => {
        try {
          await signOut(auth);
        } catch {}
        setUser(null);
        setLogged(false);
        gateChatUI();
        toast("Logged out");
      })();
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
    const em = $("#loginEmail")?.value.trim();
    const pw = $("#loginPass")?.value;
    if (!em || !pw) return toast("Fill email/password");
    try {
      await signInWithEmailAndPassword(auth, em, pw);
      setUser({ email: em, role: "student" });
      setLogged(true, em);
      modal.close();
      gateChatUI();
      toast("Welcome back");
      await syncEnrollsBothWays(); // ✅ sync enrolls on login
    } catch {
      toast("Login failed");
    }
  });

  $("#doSignup")?.addEventListener("click", async (e) => {
    e.preventDefault();
    const em = $("#signupEmail")?.value.trim();
    const pw = $("#signupPass")?.value;
    if (!em || !pw) return toast("Fill email/password");
    try {
      await createUserWithEmailAndPassword(auth, em, pw);
      setUser({ email: em, role: "student" });
      setLogged(true, em);
      modal.close();
      gateChatUI();
      toast("Account created");
      await syncEnrollsBothWays(); // ✅ sync enrolls on signup
    } catch {
      toast("Signup failed");
    }
  });

  $("#doForgot")?.addEventListener("click", (e) => {
    e.preventDefault();
    const em = $("#forgotEmail")?.value.trim();
    if (!em) return toast("Enter email");
    modal.close();
    toast("Reset link sent (demo)");
  });

  document.addEventListener("click", (e) => {
    const gated = e.target.closest("[data-requires-auth]");
    if (gated && !isLogged()) {
      e.preventDefault();
      e.stopPropagation();
      window._showLoginPane?.();
    }
  });
}

/* ---------- catalog actions (enroll, details, payment) ---------- */
function markEnrolled(id) {
  const s = getEnrolls();
  s.add(id);
  setEnrolls(s);
  saveEnrollsCloud(s); // fire-and-forget cloud update
  //   toast("Enrolled"); renderCatalog(); renderMyLearning(); showPage("mylearning");
  toast("Enrolled");
  renderCatalog();
  window.renderMyLearning?.();
  showPage("mylearning");
}
function handleEnroll(id) {
  const c =
    ALL.find((x) => x.id === id) || getCourses().find((x) => x.id === id);
  if (!c) return toast("Course not found");
  if ((c.price || 0) <= 0) return markEnrolled(id);
  openPay(c); // paid
}

/* ---------- PayPal ---------- */
let _paypalButtons = null;
async function renderButtonsUSD(priceUSD, onApproved) {
  if (!window.paypal) {
    toast("PayPal SDK not loaded");
    return null;
  }
  try {
    _paypalButtons?.close?.();
  } catch {}
  _paypalButtons = null;

  const container = document.getElementById("paypal-container");
  if (!container) return null;
  container.innerHTML = "";

  _paypalButtons = window.paypal.Buttons({
    style: { layout: "vertical", shape: "rect" },
    createOrder: (data, actions) =>
      actions.order.create({
        intent: "CAPTURE",
        purchase_units: [
          { amount: { currency_code: "USD", value: String(priceUSD ?? 1) } },
        ],
      }),
    onApprove: async (data, actions) => {
      try {
        const details = await actions.order.capture();
        onApproved?.(details);
      } catch (e) {
        console.warn("PayPal capture error", e);
        toast("Payment failed. Try again.");
      }
    },
    onError: (err) => {
      console.warn("PayPal error", err);
      toast("PayPal error");
    },
  });

  try {
    await _paypalButtons.render("#paypal-container");
  } catch (e) {
    console.warn("Buttons render failed", e);
  }
  return _paypalButtons;
}
function closePayModal() {
  try {
    _paypalButtons?.close?.();
  } catch {}
  _paypalButtons = null;
  const dlg = document.getElementById("payModal");
  if (dlg && typeof dlg.close === "function") dlg.close();
  const container = document.getElementById("paypal-container");
  if (container) container.innerHTML = "";
}
async function openPay(course) {
  const dlg = document.getElementById("payModal");
  if (!dlg) return;
  dlg.showModal();

  const closeBtn = document.getElementById("closePay");
  if (closeBtn && !closeBtn._wired) {
    closeBtn._wired = true;
    closeBtn.addEventListener("click", closePayModal);
  }
  dlg.addEventListener(
    "cancel",
    (e) => {
      e.preventDefault();
      closePayModal();
    },
    { once: true }
  );

  const price = Number(course.price || 0) || 1;
  await renderButtonsUSD(price, () => {
    toast("Payment successful 🎉");
    markEnrolled(course.id);
    closePayModal();
  });

  const mmkBtn = document.getElementById("mmkPaid");
  if (mmkBtn && !mmkBtn._wired) {
    mmkBtn._wired = true;
    mmkBtn.addEventListener("click", () => {
      toast("Payment recorded (MMK)");
      markEnrolled(course.id);
      closePayModal();
    });
  }
}

/* ---------- details (catalog + meta merge) ---------- */
async function openDetails(id) {
  const base =
    ALL.find((x) => x.id === id) || getCourses().find((x) => x.id === id);
  if (!base) return toast("Course not found");

  let meta = null;
  try {
    if (!DATA_BASE) await resolveDataBase();
    if (DATA_BASE)
      meta = await fetchJSON(`${DATA_BASE}/courses/${id}/meta.json`);
  } catch {}
  const m = (() => {
    if (!meta)
      return {
        cover: "",
        description: "",
        benefits: [],
        modules: [],
        lessonCount: 0,
      };
    const cover = meta.cover || meta.image || meta.banner || "";
    const description = meta.description || meta.desc || meta.summary || "";
    let benefits = meta.benefits || meta.bullets || meta.points || "";
    if (typeof benefits === "string")
      benefits = benefits
        .split(/\n+/)
        .map((s) => s.trim())
        .filter(Boolean);
    if (!Array.isArray(benefits)) benefits = [];
    const modules = Array.isArray(meta.modules) ? meta.modules : [];
    const lessonCount = modules.reduce(
      (n, mod) => n + ((mod.lessons || []).length || 0),
      0
    );
    return { cover, description, benefits, modules, lessonCount };
  })();

  const merged = {
    ...base,
    image: base.image || m.cover || "",
    description: base.description || m.description || base.summary || "",
    benefits:
      Array.isArray(m.benefits) && m.benefits.length
        ? m.benefits
        : base.benefits || "",
  };

  const body = $("#detailsBody");
  if (!body) return;
  const b = Array.isArray(merged.benefits)
    ? merged.benefits
    : String(merged.benefits || "")
        .split(/\n+/)
        .map((s) => s.trim())
        .filter(Boolean);
  const r = Number(merged.rating || 4.6);
  const priceStr = (merged.price || 0) > 0 ? "$" + merged.price : "Free";

  body.innerHTML = `
    <div class="row" style="gap:12px; align-items:flex-start">
      <img src="${esc(
        merged.image || `https://picsum.photos/seed/${merged.id}/480/280`
      )}"
           alt="" style="width:320px;max-width:38vw;border-radius:12px">
      <div class="grow">
        <h3 class="h4" style="margin:.2rem 0">${esc(merged.title)}</h3>
        <div class="small muted" style="margin-bottom:.25rem">${esc(
          merged.category || ""
        )} • ${esc(merged.level || "")} • ★ ${r.toFixed(1)} • ${priceStr}</div>
        ${merged.description ? `<p>${esc(merged.description)}</p>` : ""}
        ${
          b.length
            ? `<ul>${b.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`
            : ""
        }
        ${
          m.modules?.length
            ? `<div class="small muted" style="margin:.4rem 0 0">Modules: ${m.modules.length} • Lessons: ${m.lessonCount}</div>`
            : ""
        }
        <div class="row" style="justify-content:flex-end; gap:8px; margin-top:.6rem">
          <button class="btn" data-details-close>Close</button>
          <button class="btn primary" data-details-enroll="${merged.id}">${
    (merged.price || 0) > 0 ? "Buy • $" + merged.price : "Enroll Free"
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
      handleEnroll(e.currentTarget?.getAttribute("data-details-enroll"));
      dlg?.close();
    });
}
$("#closeDetails")?.addEventListener("click", () =>
  $("#detailsModal")?.close()
);

/* =========================================================
   Part 4/6 — Profile, transcript, reader + quiz gating
   ========================================================= */
// Pick a single, stable id to use everywhere
function canonicalUserId() {
  const uid = auth?.currentUser?.uid || "";
  const email = (getUser()?.email || "").toLowerCase();
  // prefer uid if present, else email
  return uid || email || "";
}

function progressDocRefFor(id) {
  return id && db ? doc(db, "progress", id) : null;
}

function progressDocRef() {
  const id = canonicalUserId();
  return progressDocRefFor(id);
}

// Migrate once: if we have both <email> and <uid>, merge into <uid>
async function migrateProgressKey() {
  const uid = auth?.currentUser?.uid || "";
  const email = (getUser()?.email || "").toLowerCase();
  if (!db || !uid || !email || uid === email) return;

  const refEmail = progressDocRefFor(email);
  const refUid = progressDocRefFor(uid);

  try {
    const [snapEmail, snapUid] = await Promise.all([
      getDoc(refEmail),
      getDoc(refUid),
    ]);
    if (!snapEmail.exists()) return; // nothing under email → done

    const dataE = snapEmail.data() || {};
    const dataU = snapUid.exists() ? snapUid.data() || {} : {};

    // merge strategy: completed by latest ts, quiz keep higher best/OR passed, certs prefer uid then email
    const L_completed = dataE.completed || [];
    const R_completed = dataU.completed || [];
    const mapC = new Map();
    [...L_completed, ...R_completed].forEach((x) => {
      const prev = mapC.get(x.id);
      if (!prev || (x.ts || 0) > (prev.ts || 0)) mapC.set(x.id, x);
    });
    const mergedCompleted = Array.from(mapC.values());

    const keys = new Set([
      ...Object.keys(dataE.quiz || {}),
      ...Object.keys(dataU.quiz || {}),
    ]);
    const mergedQuiz = {};
    keys.forEach((k) => {
      const a = (dataE.quiz || {})[k] || {};
      const b = (dataU.quiz || {})[k] || {};
      mergedQuiz[k] = {
        best: Math.max(a.best || 0, b.best || 0),
        passed: !!(a.passed || b.passed),
      };
    });

    const mergedCerts = { ...(dataE.certs || {}), ...(dataU.certs || {}) };

    await setDoc(
      refUid,
      {
        completed: mergedCompleted,
        quiz: mergedQuiz,
        certs: mergedCerts,
        ts: Date.now(),
      },
      { merge: true }
    );

    // (optional) You can keep email doc or clean it up later.
    // await deleteDoc(refEmail);
  } catch (e) {
    console.warn("migrateProgressKey failed:", e?.message || e);
  }
}

async function loadProgressCloud() {
  const ref = progressDocRef();
  if (!ref) return null;
  try {
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
  } catch {
    return null;
  }
}
async function saveProgressCloud(patch) {
  const ref = progressDocRef();
  if (!ref) return;
  try {
    await setDoc(ref, patch, { merge: true });
  } catch {}
}

// Cloud → Local fallback
async function getProgress(courseId) {
  // 1) Cloud (Firestore)
  const cloud = await loadProgressCloud(); // <- သင့် function ကိုပဲခေါ်မယ်
  if (cloud && cloud[courseId]) return cloud[courseId];

  // 2) Local fallback (ရှိပြီးသား old data အသုံးပြု)
  try {
    const raw = localStorage.getItem("progress");
    if (raw) {
      const obj = JSON.parse(raw);
      return obj[courseId] || null;
    }
  } catch {}
  return null;
}

// UI မှာ Continue/Review ပြောင်းတိုင်း ခေါ်ပေးရန်
async function markCourseProgress(courseId, status, lesson = 0) {
  const patch = { [courseId]: { status, lesson, ts: Date.now() } };
  await saveProgressCloud(patch); // <- သင့် function ကိုပဲသုံးမယ် (merge:true)

  // optional local backup
  try {
    const raw = localStorage.getItem("progress");
    const obj = raw ? JSON.parse(raw) : {};
    obj[courseId] = patch[courseId];
    localStorage.setItem("progress", JSON.stringify(obj));
  } catch {}
}

// course card/buttons ပြထားတဲ့ loop/render function အတွင်း
// (async () => {
//   const p = await getProgress(course.id);   // ← Cloud-first
//   if (p && p.status === "review") {
//     showReviewButton(course.id);
//   } else {
//     showContinueButton(course.id, p?.lesson || 0);
//   }
// })();

async function syncProgressBothWays() {
  const cloud = await loadProgressCloud();

  // local
  const L_completed = getCompletedRaw(); // [{id,ts,score}]
  const L_quiz = getQuizState(); // {"cid:idx":{best,passed}}
  const L_certs = getCerts(); // {"uid|courseId":{...}}

  if (!cloud) {
    await saveProgressCloud({
      completed: L_completed,
      quiz: L_quiz,
      certs: L_certs,
      ts: Date.now(),
    });
    return;
  }

  // merge completed by latest ts
  const mapC = new Map();
  [...(cloud.completed || []), ...L_completed].forEach((x) => {
    const prev = mapC.get(x.id);
    if (!prev || (x.ts || 0) > (prev.ts || 0)) mapC.set(x.id, x);
  });
  const M_completed = Array.from(mapC.values());

  // merge quiz: keep higher best + OR of passed
  const keys = new Set([
    ...Object.keys(cloud.quiz || {}),
    ...Object.keys(L_quiz),
  ]);
  const M_quiz = {};
  keys.forEach((k) => {
    const a = (cloud.quiz || {})[k] || {};
    const b = L_quiz[k] || {};
    M_quiz[k] = {
      best: Math.max(a.best || 0, b.best || 0),
      passed: !!(a.passed || b.passed),
    };
  });

  // merge certs: prefer cloud (already verified) then local
  const M_certs = { ...(cloud.certs || {}), ...L_certs };

  // write back both sides
  setCompletedRaw(M_completed);
  setQuizState(M_quiz);
  setCerts(M_certs);
  await saveProgressCloud({
    completed: M_completed,
    quiz: M_quiz,
    certs: M_certs,
    ts: Date.now(),
  });
}

/* ---------- Transcript v2 + Profile panel ---------- */
const getCompletedRaw = () => _read("ol_completed_v2", []); // [{id, ts, score}]
const setCompletedRaw = (arr) => _write("ol_completed_v2", arr || []);
// const hasCompleted    = (id) => getCompletedRaw().some((x) => x.id === id);
const getCompleted = () => new Set(getCompletedRaw().map((x) => x.id));

function markCourseComplete(id, score = null) {
  const arr = getCompletedRaw();
  if (!arr.some((x) => x.id === id)) {
    arr.push({
      id,
      ts: Date.now(),
      score: typeof score === "number" ? score : null,
    });
    setCompletedRaw(arr);
  }
  window.renderProfilePanel?.();
  window.renderMyLearning?.();
  saveProgressCloud({ completed: getCompletedRaw(), ts: Date.now() });
}

function renderProfilePanel() {
  const box = $("#profilePanel");
  if (!box) return;

  const p = getProfile();
  const name = p.displayName || getUser()?.email || "Guest";
  const avatar = p.photoURL || "https://i.pravatar.cc/80?u=openlearn";

  //   const completed = getCompletedRaw();                       // ← all completed
  const dic = new Map((ALL.length ? ALL : getCourses()).map((c) => [c.id, c]));

  //   const transcriptItems = getCompletedRaw().map(x => {
  //   const c = dic.get(x.id);
  //   return { meta:x, course:c, title: c?.title || x.id };
  // });
  const transcriptItems = getCompletedRaw()
    .map((x) => {
      const c = dic.get(x.id);
      return { meta: x, course: c, title: c?.title || x.id };
    })
    .filter((x) => x.course); // ✅ guard

  const certItems = transcriptItems
    .map((x) => ({ ...x, cert: getIssuedCert(x.course?.id) }))
    .filter((x) => x.cert); // only those issued

  const transcriptHtml = transcriptItems.length
    ? `
  <table class="ol-table small" style="margin-top:.35rem">
    <thead><tr><th>Course</th><th>Date</th><th>Score</th></tr></thead>
    <tbody>
      ${transcriptItems
        .map(
          (r) => `
        <tr>
          <td>${esc(r.title)}</td>
          <td>${new Date(r.meta.ts).toLocaleDateString()}</td>
          <td>${
            r.meta.score != null ? Math.round(r.meta.score * 100) + "%" : "—"
          }</td>
        </tr>`
        )
        .join("")}
    </tbody>
  </table>`
    : `<div class="small muted">No completed courses yet.</div>`;

  const certSection = certItems.length
    ? `
    <div style="margin-top:14px">
      <b class="small">Certificates</b>
      <table class="ol-table small" style="margin-top:.35rem">
        <thead><tr><th>Course</th><th style="text-align:right">Actions</th></tr></thead>
        <tbody>
          ${certItems
            .map(
              ({ course }) => `
            <tr>
              <td>${esc(course.title)}</td>
              <td style="text-align:right">
                <button class="btn small" data-cert-view="${esc(
                  course.id
                )}">View</button>
                <button class="btn small" data-cert-dl="${esc(
                  course.id
                )}">Download PDF</button>
              </td>
            </tr>`
            )
            .join("")}
        </tbody>
      </table>
    </div>`
    : "";

  box.innerHTML = `
    <div class="row" style="gap:12px;align-items:flex-start">
      <img src="${esc(
        avatar
      )}" alt="" style="width:72px;height:72px;border-radius:50%">
      <div class="grow">
        <div class="h4" style="margin:.1rem 0">${esc(name)}</div>
        ${
          p.bio
            ? `<div class="muted" style="margin:.25rem 0">${esc(p.bio)}</div>`
            : ""
        }
        ${
          p.skills
            ? `<div class="small muted">Skills: ${esc(p.skills)}</div>`
            : ""
        }
        <div style="margin-top:10px"><b class="small">Transcript</b>${transcriptHtml}</div>
        ${certSection}
      </div>
    </div>`;

  box.querySelectorAll("[data-cert-view]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-cert-view");
      const c = (ALL.length ? ALL : getCourses()).find((x) => x.id === id);
      if (c) showCertificate(c, { issueIfMissing: false });
    });
  });
  box.querySelectorAll("[data-cert-dl]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-cert-dl");
      const c = (ALL.length ? ALL : getCourses()).find((x) => x.id === id);
      if (!c) return;
      showCertificate(c, { issueIfMissing: false });
      setTimeout(() => window.print(), 200);
    });
  });
}
window.renderProfilePanel = renderProfilePanel;

/* ---------- Profile Edit modal wiring ---------- */
$("#btn-edit-profile")?.addEventListener("click", () => {
  const m = $("#profileEditModal");
  const f = $("#profileForm");
  const p = getProfile();
  if (f) {
    f.displayName.value = p.displayName || "";
    f.photoURL.value = p.photoURL || "";
    f.bio.value = p.bio || "";
    f.skills.value = p.skills || "";
    f.links.value = p.links || "";
    f.social.value = p.social || "";
  }
  m?.showModal();
});
$("#closeProfileModal")?.addEventListener("click", () =>
  $("#profileEditModal")?.close()
);
$("#cancelProfile")?.addEventListener("click", () =>
  $("#profileEditModal")?.close()
);
$("#profileForm")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const f = e.currentTarget;
  const data = {
    displayName: f.displayName.value.trim(),
    photoURL: f.photoURL.value.trim(),
    bio: f.bio.value.trim(),
    skills: f.skills.value.trim(),
    links: f.links.value.trim(),
    social: f.social.value.trim(),
  };
  setProfile(data);
  renderProfilePanel();
  $("#profileEditModal")?.close();
  toast("Profile saved");
});

// ---- Reader state (for delegation) ----
window.READER_STATE = { courseId: null, lesson: 0 };

function findCourse(courseId) {
  const list =
    window.ALL && window.ALL.length ? window.ALL : window.getCourses?.() || [];
  return list.find((c) => c.id === courseId) || null;
}

function isLastLesson(courseId, lessonIndex) {
  const c = findCourse(courseId);
  const len =
    c && Array.isArray(c.lessons)
      ? c.lessons.length
      : window.RD?.pages?.length || 0;
  return len ? lessonIndex >= len - 1 : false;
}

function goToLesson(courseId, nextIndex) {
  // RD ကိုသုံး/သတ်မှတ်ထားတဲ့ renderPage() ကို အသုံးပြု
  window.RD.i = Math.max(0, Math.min(window.RD.pages.length - 1, nextIndex));
  renderPage();
  // mirror to READER_STATE
  window.READER_STATE.courseId = courseId;
  window.READER_STATE.lesson = window.RD.i;
}

/* ---------- My Learning / Reader ---------- */
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
    quiz: {
      randomize: true,
      shuffleChoices: true,
      questions: [
        {
          type: "single",
          q: "2 + 2 = ?",
          choices: ["3", "4", "5"],
          correct: 1,
        },
        {
          type: "single",
          q: "JS array method to add at end?",
          choices: ["push", "shift", "map"],
          correct: 0,
        },
        {
          type: "single",
          q: "typeof null = ?",
          choices: ["'object'", "'null'", "'undefined'"],
          correct: 0,
        },
        {
          type: "single",
          q: "CSS for color?",
          choices: ["color", "fill", "paint"],
          correct: 0,
        },
      ],
    },
  },
  {
    type: "project",
    html: `<h3>Mini Project</h3><input type="file"><p class="small muted">Upload your work (demo).</p>`,
  },
];
let RD = { cid: null, pages: [], i: 0, credits: 0 };
let LAST_QUIZ_SCORE = 0;
let PROJECT_UPLOADED = false;

// --- Reader close helper (unchanged except ensuring grid shows) ---
function closeReader() {
  const r = document.getElementById("reader");
  if (r) r.classList.add("hidden");
  const grid = document.getElementById("myCourses");
  if (grid) grid.style.display = "";
  LAST_QUIZ_SCORE = 0;
  PROJECT_UPLOADED = false;
  showPage("mylearning", false);
}

// --- normalizeQuiz unchanged ---

function renderQuiz(p) {
  const bank = Array.isArray(p.quiz?.questions) ? p.quiz.questions.slice() : [];
  const picked = QUIZ_RANDOMIZE
    ? shuffle(bank).slice(0, QUIZ_SAMPLE_SIZE || bank.length)
    : bank.slice();
  const q = picked;

  const wrap = document.createElement("div");
  wrap.innerHTML = `<h3>Quiz</h3>`;
  const list = document.createElement("ol");
  list.style.lineHeight = "1.7";

  q.forEach((it, i) => {
    const li = document.createElement("li");
    li.style.margin = "8px 0";
    li.insertAdjacentHTML("beforeend", `<div>${esc(it.q)}</div>`);
    if (it.type === "single") {
      (it.choices || it.a || []).forEach((c, j) => {
        li.insertAdjacentHTML(
          "beforeend",
          `<label style="display:block;margin-left:.5rem">
             <input type="radio" name="q${i}" value="${j}"> ${esc(c)}
           </label>`
        );
      });
    } else if (it.type === "multiple") {
      (it.choices || it.a || []).forEach((c, j) => {
        li.insertAdjacentHTML(
          "beforeend",
          `<label style="display:block;margin-left:.5rem">
             <input type="checkbox" name="q${i}" value="${j}"> ${esc(c)}
           </label>`
        );
      });
    } else {
      li.insertAdjacentHTML(
        "beforeend",
        `<input class="input" name="q${i}" placeholder="Your answer" style="margin-left:.5rem">`
      );
    }
    list.appendChild(li);
  });

  const controls = document.createElement("div");
  controls.className = "row";
  controls.style.cssText = "gap:8px;margin-top:8px";
  controls.innerHTML = `
    <button class="btn" id="qCheck">Check</button>
    <button class="btn" id="qRetake" style="display:none">Retake</button>
    <span class="small muted" id="qMsg"></span>`;
  wrap.appendChild(list);
  wrap.appendChild(controls);
  $("#rdPage").innerHTML = "";
  $("#rdPage").appendChild(wrap);

  const isLastPage = () => RD.i === RD.pages.length - 1;

  $("#qCheck").onclick = () => {
    let correct = 0;

    q.forEach((it, i) => {
      if (it.type === "single") {
        const picked = document.querySelector(`input[name="q${i}"]:checked`);
        const val = picked ? Number(picked.value) : -1;
        const ans =
          typeof it.correct === "number"
            ? it.correct
            : Number(it.correct ?? -1);
        if (val === ans) correct++;
      } else if (it.type === "multiple") {
        const picks = Array.from(
          document.querySelectorAll(`input[name="q${i}"]:checked`)
        )
          .map((x) => Number(x.value))
          .sort();
        const want = Array.isArray(it.correct) ? it.correct.slice().sort() : [];
        const ok =
          picks.length === want.length &&
          picks.every((v, idx) => v === want[idx]);
        if (ok) correct++;
      } else {
        const input = document.querySelector(`input[name="q${i}"]`);
        const ans = (input?.value || "").trim().toLowerCase();
        const accepts = Array.isArray(it.answers)
          ? it.answers
          : it.answer
          ? [it.answer]
          : [];
        const norm = (s) =>
          String(s ?? "")
            .trim()
            .toLowerCase();
        if (accepts.some((x) => norm(x) === ans)) correct++;
      }
    });

    const score = correct / (q.length || 1);
    LAST_QUIZ_SCORE = score;
    $("#qMsg").textContent = `Score: ${Math.round(score * 100)}% (${correct}/${
      q.length
    })`;

    if (score >= QUIZ_PASS) {
      setPassedQuiz(RD.cid, RD.i, score);
      if (score >= 0.85) launchFireworks();
      if (isLastPage()) {
        markCourseComplete(RD.cid, score);
        showCongrats();
      } else {
        toast("Great! You unlocked the next lesson 🎉");
      }
      $("#qRetake").style.display = "none";
    } else {
      toast(`Need ≥ ${Math.round(QUIZ_PASS * 100)}% — try again`);
      $("#qRetake").style.display = "";
    }

    $("#rdFinish")?.toggleAttribute("disabled", score < QUIZ_PASS);
  };

  $("#qRetake").onclick = () => {
    LAST_QUIZ_SCORE = 0;
    renderQuiz(p); // redraw (randomize again)
  };
}

function renderPage() {
  const p = RD.pages[RD.i];
  if (!p) return;

  $("#rdTitle").textContent = `${RD.i + 1}. ${(
    p.type || "PAGE"
  ).toUpperCase()}`;
  $("#rdPageInfo").textContent = `${RD.i + 1} / ${RD.pages.length}`;
  $("#rdProgress").style.width =
    Math.round(((RD.i + 1) / RD.pages.length) * 100) + "%";

  if (p.type === "quiz" && p.quiz) {
    renderQuiz(p);
  } else if (p.type === "project") {
    PROJECT_UPLOADED = false;
    $("#rdPage").innerHTML =
      p.html || `<h3>Mini Project</h3><input id="projFile" type="file">`;
    const f = $("#rdPage input[type='file']");
    if (f) {
      f.addEventListener("change", () => {
        if (f.files && f.files.length) {
          PROJECT_UPLOADED = true;
          toast("Upload successful ✔️");
          $("#rdFinish")?.toggleAttribute("disabled", false);
        }
      });
    }
  } else {
    $("#rdPage").innerHTML = p.html || "";
  }

  // --- Navigation ---
  const btnPrev = $("#rdPrev"),
    btnNext = $("#rdNext");
  if (btnPrev) btnPrev.disabled = RD.i <= 0;
  if (btnNext) btnNext.disabled = RD.i >= RD.pages.length - 1;
  // if (btnPrev)
  //   btnPrev.onclick = () => {
  //     RD.i = Math.max(0, RD.i - 1);
  //     renderPage();
  //   };
  // if (btnNext)
  //   btnNext.onclick = () => {
  //     // Next button guard
  //     if (
  //       p?.type === "quiz" &&
  //       !hasPassedQuiz(RD.cid, RD.i) &&
  //       LAST_QUIZ_SCORE < QUIZ_PASS
  //     ) {
  //       toast(`Need ≥ ${Math.round(QUIZ_PASS * 100)}% to continue`);
  //       return;
  //     }
  //     if (p?.type === "project" && !PROJECT_UPLOADED) {
  //       toast("Please upload your project file first");
  //       return;
  //     }
  //     RD.i = Math.min(RD.pages.length - 1, RD.i + 1);
  //     renderPage();
  //   };

  // --- Finish button on LAST page only ---
  const isLast = RD.i === RD.pages.length - 1;
  $("#rdFinishBar")?.remove();
  if (isLast) {
    const bar = document.createElement("div");
    bar.id = "rdFinishBar";
    bar.className = "row";
    bar.style.cssText = "justify-content:flex-end; gap:8px; margin-top:10px";
    bar.innerHTML = `<button id="rdFinish" class="btn primary">Finish Course</button>`;
    $("#rdPage").appendChild(bar);

    const btn = $("#rdFinish");
    const canFinishNow =
      (p.type === "quiz" && LAST_QUIZ_SCORE >= QUIZ_PASS) ||
      (p.type === "project" && PROJECT_UPLOADED) ||
      (p.type !== "quiz" && p.type !== "project");

    btn.disabled = !canFinishNow;
    btn.onclick = () => {
      // Finish button guard
      if (
        p.type === "quiz" &&
        !(hasPassedQuiz(RD.cid, RD.i) || LAST_QUIZ_SCORE >= QUIZ_PASS)
      ) {
        return toast(`Need ≥ ${Math.round(QUIZ_PASS * 100)}% to finish`);
      }
      markCourseComplete(RD.cid, LAST_QUIZ_SCORE || null);
      showCongrats();
    };
  }
  // mirror RD → READER_STATE (delegation needs this)
  window.READER_STATE.courseId = RD.cid;
  window.READER_STATE.lesson = RD.i;
}

function launchFireworks() {
  const burst = document.createElement("div");
  Object.assign(burst.style, {
    position: "fixed",
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    pointerEvents: "none",
    zIndex: 2000,
  });
  burst.innerHTML = `<div class="confetti"></div>`;
  document.body.appendChild(burst);
  setTimeout(() => burst.remove(), 1200);
}

function showCongrats() {
  // ✅ previous printing/modal/backdrop state မကျန်အောင်
  hardCloseCert();

  // ✅ issue cert (once)
  const course =
    ALL.find((x) => x.id === RD.cid) ||
    getCourses().find((x) => x.id === RD.cid);
  if (course) {
    const prof = getProfile();
    ensureCertIssued(course, prof, LAST_QUIZ_SCORE || null);
  }

  const dlg = document.createElement("dialog");
  dlg.className = "ol-modal card";
  dlg.innerHTML = `
    <div style="text-align:center;padding:10px">
      <div style="font-size:22px;font-weight:800">🎓 Congratulations!</div>
      <p class="muted">You’ve completed this course. Great work!</p>
      <div class="row" style="justify-content:center;gap:8px;margin-top:8px">
        <button class="btn" id="cgClose">Close</button>
        <button class="btn primary" id="cgCert">View Certificate</button>
      </div>
    </div>`;
  document.body.appendChild(dlg);
  dlg.showModal();

  // ✅ once-only, safe wiring
  dlg.querySelector("#cgClose")?.addEventListener(
    "click",
    () => {
      dlg.close();
      dlg.remove();
    },
    { once: true }
  );

  dlg.querySelector("#cgCert")?.addEventListener(
    "click",
    (e) => {
      e.preventDefault();
      dlg.close();
      dlg.remove();
      // printing class / stale handlers မကျန်အောင်
      document.body.classList.remove("printing");
      window.onbeforeprint = null;
      window.onafterprint = null;
      // dialog ပိတ်ပြီး DOM settle သင့်—microtask နဲ့ဖွင့်
      queueMicrotask(() => {
        const c =
          course ||
          ALL.find((x) => x.id === RD.cid) ||
          getCourses().find((x) => x.id === RD.cid);
        if (c) showCertificate(c, { issueIfMissing: false });
      });
    },
    { once: true }
  );

  // ESC ပိတ်နိုင်အောင်
  dlg.addEventListener(
    "cancel",
    (e) => {
      e.preventDefault();
      dlg.close();
      dlg.remove();
    },
    { once: true }
  );
}

function renderMyLearning() {
  const grid = $("#myCourses"); // <-- ဒီလို define လုပ်ဖို့လို
  if (!grid) return;

  // Hide cards while reader open
  if (!$("#reader")?.classList.contains("hidden")) {
    grid.style.display = "none";
  } else {
    grid.style.display = "";
  }

  const set = getEnrolls();
  const completed = getCompleted();
  const list = (ALL.length ? ALL : getCourses()).filter((c) => set.has(c.id));

  if (!list.length) {
    grid.innerHTML = `<div class="muted">No enrollments yet. Enroll from Courses.</div>`;
    return;
  }

  // --- renderMyLearning() မထဲက buttons template ကို ဒီလို ပြောင်း ---
  grid.innerHTML = list
    .map((c) => {
      const isDone = completed.has(c.id);
      const issued = !!getIssuedCert(c.id);
      const label = isDone ? "Review" : "Continue";

      return `<div class="card course" data-id="${c.id}">
    <img class="course-cover" src="${esc(
      c.image || `https://picsum.photos/seed/${c.id}/640/360`
    )}" alt="">
    <div class="course-body">
      <strong>${esc(c.title)}</strong>
      <div class="small muted">${esc(c.category || "")} • ${esc(
        c.level || ""
      )} • ★ ${Number(c.rating || 4.6).toFixed(1)}</div>
      <div class="muted">${esc(c.summary || "")}</div>
      <div class="row" style="justify-content:flex-end; gap:8px">
        <button class="btn" data-read="${c.id}">${label}</button>
        <button class="btn" data-cert="${c.id}" ${
        issued ? "" : "disabled"
      }>Certificate</button>
      </div>
    </div>
  </div>`;
    })
    .join("");

  // wire buttons (this was missing → caused “can’t click”)
  grid.querySelectorAll("[data-read]").forEach(
    (b) =>
      (b.onclick = () => {
        const id = b.getAttribute("data-read");
        openReader(id);
      })
  );

  // --- Cloud-first label adjust (ensure 'Review' shows in all browsers) ---
  (async function updateMyLearningLabelsCloud() {
    try {
      // 🔁 scope to this grid only
      const cards = Array.from(grid.querySelectorAll(".card.course"));
      for (const card of cards) {
        const id = card.getAttribute("data-id");
        if (!id) continue;
        const p = await getProgress(id); // Cloud → Local fallback
        if (p && p.status === "review") {
          const btn = card.querySelector("[data-read]");
          if (btn) btn.textContent = "Review";
        }
      }
    } catch {}
  })();

  grid.querySelectorAll("[data-cert]").forEach(
    (b) =>
      (b.onclick = () => {
        const id = b.getAttribute("data-cert");
        const rec = getIssuedCert(id);
        if (!rec) return toast("Certificate not issued yet");
        const c = (ALL.length ? ALL : getCourses()).find((x) => x.id === id);
        if (c) showCertificate(c); // view only; won’t issue new
      })
  );
}
window.renderMyLearning = renderMyLearning;

function renderCertificate(course, cert) {
  const p = getProfile();
  const name = cert?.name || p.displayName || getUser()?.email || "Student";
  const avatar = cert?.photo || p.photoURL || "/assets/default-avatar.png";
  const dateTxt = new Date(cert?.issuedAt || Date.now()).toLocaleDateString();
  const scoreTxt =
    typeof cert?.score === "number" ? `${Math.round(cert.score * 100)}%` : "—";
  const certId = cert?.id || "PENDING";

  const verifyUrl = `https://openlearn.example/verify?cid=${encodeURIComponent(
    certId
  )}`;
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=${encodeURIComponent(
    verifyUrl
  )}`;

  return `
    <div class="cert-doc">
      <img src="/assets/logo.png" class="cert-logo" alt="OpenLearn Logo">

      <div class="cert-head">OpenLearn Institute</div>
      <div class="cert-sub">Certificate of Completion</div>

      <img src="${esc(avatar)}" class="cert-photo" alt="Student Photo">
      <div class="cert-name">${esc(name)}</div>
      <div class="cert-sub">has successfully completed</div>

      <div class="cert-course">${esc(course.title)}</div>

      <div class="cert-meta">
        Certificate No.: <b>${esc(certId)}</b> • Credits: ${
    course.credits || 3
  } • Score: ${scoreTxt} • Issued: ${dateTxt}
      </div>

      <div class="row" style="justify-content:center; gap:16px; margin-top:10px">
        <img class="qr" alt="Verify" src="${qr}">
      </div>

      <div class="cert-signs">
        <div class="sig">
          <img src="/assets/sign-registrar.png" class="sig-img" alt="">
          <div>Registrar</div>
        </div>
        <div class="sig">
          <img src="/assets/sign-dean.png" class="sig-img" alt="">
          <div>Dean of Studies</div>
        </div>
      </div>

      <div class="cert-forgery small">
        Printed: <span class="prt-date"></span> • Timezone: <span class="prt-tz"></span> • UA: <span class="prt-ua"></span>
      </div>
    </div>

    <div id="certActions" class="row no-print" style="justify-content:flex-end; gap:8px; margin-top:10px">
      <button class="btn" id="certPrint">Print / Save PDF</button>
      <button class="btn" id="certClose">Close</button>
    </div>
  `;
}

// stamp forgery footer
document.addEventListener("DOMContentLoaded", () => {
  const stamp = () => {
    const elD = document.querySelector(".cert-forgery .prt-date");
    const elT = document.querySelector(".cert-forgery .prt-tz");
    const elU = document.querySelector(".cert-forgery .prt-ua");
    if (elD) elD.textContent = new Date().toLocaleString();
    if (elT)
      elT.textContent = Intl.DateTimeFormat().resolvedOptions().timeZone || "—";
    if (elU) elU.textContent = navigator.userAgent;
  };
  stamp();
  window.addEventListener("beforeprint", stamp);
});

// Hard reset for stuck UI after print/backdrop
// ===== UI hard reset when things get stuck (modal/backdrop/printing) =====
function hardCloseCert() {
  try {
    window.onbeforeprint = null;
    window.onafterprint = null;
  } catch {}
  document.body.classList.remove("printing");

  const dlg = document.getElementById("certModal");
  if (dlg) {
    try {
      dlg.close();
    } catch {}
    dlg.removeAttribute("open");
    // 🔑 previous content + handlers reset
    const body = document.getElementById("certBody");
    if (body) body.innerHTML = "";
  }

  // Reader/cards ပြန်ပေါ်
  const r = document.getElementById("reader");
  if (r) r.classList.add("hidden");
  const grid = document.getElementById("myCourses");
  if (grid) grid.style.display = "";

  showPage("mylearning", false);
}

function cleanupStrayCertButtons() {
  document.querySelectorAll("#certPrint, #certClose").forEach((el) => {
    if (!el.closest("#certModal")) el.remove();
  });
}

function showCertificate(course, opts = { issueIfMissing: true }) {
  hardCloseCert(); // old/stale modal/backdrop cleanup

  const dlg = document.getElementById("certModal");
  const body = document.getElementById("certBody");
  if (!dlg || !body) return;

  // ✅ buttons duplicate guard: remove any existing action bars inside the modal
  dlg
    .querySelectorAll("#certActions, .row.no-print")
    .forEach((n) => n.remove());

  // render once (this already includes the action bar)
  body.innerHTML = renderCertificate(
    course,
    getIssuedCert(course.id) || ensureCertIssued(course, getProfile())
  );

  dlg.showModal();

  // wire only INSIDE the modal
  dlg
    .querySelector("#certPrint")
    ?.addEventListener("click", () => window.print(), { once: true });
  dlg
    .querySelector("#certClose")
    ?.addEventListener("click", () => hardCloseCert(), { once: true });
  dlg.addEventListener(
    "cancel",
    (e) => {
      e.preventDefault();
      hardCloseCert();
    },
    { once: true }
  );
}

// function showCertificate(course, opts = { issueIfMissing: true }) {
//   cleanupStrayCertButtons(); // ← stray buttons မဖော်မိအောင် အစဲဝင် ဖယ်
//   const prof = getProfile();
//   const completed = getCompletedRaw().find(x => x.id === course.id);
//   const score = completed?.score ?? null;

//   let rec = getIssuedCert(course.id);
//   if (!rec && opts.issueIfMissing) rec = ensureCertIssued(course, prof, score);
//   if (!rec) return toast("Certificate not issued yet");

//   const dlg  = document.getElementById("certModal");
//   const body = document.getElementById("certBody");
//   if (!dlg || !body) return;

//   body.innerHTML = renderCertificate(course, rec);
//   dlg.showModal();

//   // wire just the modal's own buttons
//   const printBtn = dlg.querySelector("#certPrint");
//   const closeBtn = dlg.querySelector("#certClose");
//   printBtn?.addEventListener("click", () => window.print(), { once:true });
//   closeBtn?.addEventListener("click", () => hardCloseCert(), { once:true });

//   dlg.addEventListener("cancel", (e)=>{ e.preventDefault(); hardCloseCert(); }, { once:true });

//   window.onbeforeprint = () => document.body.classList.add("printing");
//   window.onafterprint  = () => hardCloseCert();

//   // safety: one more cleanup after modal opens
//   cleanupStrayCertButtons();
// }

async function tryFetch(path) {
  try {
    const r = await fetch(path, { cache: "no-cache" });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

// Replace your buildPagesForCourse() with this version
async function buildPagesForCourse(c) {
  if (!DATA_BASE) await resolveDataBase();
  const base = DATA_BASE || "/data";

  // 🧭 alias/dir mapping (handle typos)
  const DIR_ALIAS = {
    "js-essentials": "js-ennentials", // your folder name
    "pali-basics": "pali-basics", // your folder name
    "web-foundations": "web-foundations", // your folder name
  };
  const dir = DIR_ALIAS[c.id] || c.id;

  const meta = await tryFetch(`${base}/courses/${dir}/meta.json`);

  // collect quizzes: quiz1.json, quiz2.json...
  const quizFiles = [];
  for (let i = 1; i <= 20; i++) {
    const raw = await tryFetch(`${base}/courses/${dir}/quiz${i}.json`);
    if (!raw) break;
    const q = normalizeQuiz(raw);
    if (q) quizFiles.push(q);
  }
  if (quizFiles.length === 0) {
    const raw = await tryFetch(`${base}/courses/${dir}/quiz.json`);
    const q = normalizeQuiz(raw);
    if (q) quizFiles.push(q);
  }

  const pages = [];

  // meta.modules[*].lessons[*]
  if (meta?.modules?.length) {
    for (const m of meta.modules) {
      for (const l of m.lessons || []) {
        if (l.type === "html" && l.src) {
          const html = await fetch(`${base}/courses/${dir}/${l.src}`, {
            cache: "no-cache",
          })
            .then((r) => r.text())
            .catch(() => "");
          pages.push({ type: "reading", html });
        } else if (l.type === "video" && l.poster) {
          pages.push({
            type: "lesson",
            html: `<h3>${esc(
              l.title || "Video"
            )}</h3><video controls style="width:100%;border-radius:10px" poster="${esc(
              l.poster
            )}"></video>`,
          });
        } else if (l.type === "project") {
          pages.push({
            type: "project",
            html: `<h3>Mini Project</h3><input type="file"><p class="small muted">Upload your work.</p>`,
          });
        } else if (l.type === "quiz" && l.src) {
          const raw = await tryFetch(`${base}/courses/${dir}/${l.src}`);
          const q = normalizeQuiz(raw);
          if (q) pages.push({ type: "quiz", quiz: q });
        }
      }
    }
  }

  // append quizzes discovered by series
  for (const q of quizFiles) pages.push({ type: "quiz", quiz: q });

  if (!pages.length) return SAMPLE_PAGES(c.title);
  return pages;
}

// Replace your openReader() with this version
async function openReader(cid) {
  const c =
    ALL.find((x) => x.id === cid) || getCourses().find((x) => x.id === cid);
  if (!c) return toast("Course not found");

  // 🔽 use course-specific pages if available
  const pages = await buildPagesForCourse(c);
  RD = { cid: c.id, pages, i: 0, credits: c.credits || 3 };

  // show reader
  $("#reader")?.classList.remove("hidden");
  $("#rdMeta").textContent = `Credits: ${RD.credits}`;
  renderPage();

  // ✅ Hide My Learning cards while the reader is open
  const grid = document.getElementById("myCourses");
  if (grid) grid.style.display = "none";

  // ✅ Wire Back button in the reader header (once)
  const backBtn = $("#rdBack");
  if (backBtn && !backBtn._wired) {
    backBtn._wired = true;
    backBtn.addEventListener("click", (e) => {
      e.preventDefault();
      // prefer native back if this view was pushed into history
      if (history.state && history.state.ol === "reader") {
        history.back();
      } else {
        closeReader();
      }
    });
  }

  // ✅ push history state so browser ← works
  // avoid pushing twice for the same course
  if (
    !(
      history.state &&
      history.state.ol === "reader" &&
      history.state.cid === cid
    )
  ) {
    history.pushState({ ol: "reader", cid }, "", `#reader-${cid}`);
  }

  // per-course chat rewire (as before)
  if (window._ccOff) {
    try {
      window._ccOff();
    } catch {}
    window._ccOff = null;
  }
  const off = wireCourseChatRealtime(c.id);
  if (typeof off === "function") window._ccOff = off;
}

// --- Event Delegation on #reader (Next/Prev/Finish/Back) ---
const readerHost = document.getElementById("reader");
if (readerHost && !readerHost._delegated) {
  readerHost._delegated = true;

  readerHost.addEventListener("click", async (e) => {
    const t = e.target;
    if (!t || !(t instanceof HTMLElement)) return;

    // Always keep state in sync
    window.READER_STATE.courseId = window.RD?.cid || null;
    window.READER_STATE.lesson = window.RD?.i ?? 0;

    // ---- Prev ----
    if (t.id === "rdPrev") {
      const { courseId, lesson } = window.READER_STATE;
      if (!courseId) return;
      goToLesson(courseId, Math.max(0, lesson - 1));
      return;
    }

    // ---- Next ----
    if (t.id === "rdNext") {
      const { courseId, lesson } = window.READER_STATE;
      if (!courseId) return;

      // gating: quiz/project guard (same rules as renderPage)
      const p = window.RD?.pages?.[lesson];
      if (
        p?.type === "quiz" &&
        !(
          window.hasPassedQuiz?.(window.RD.cid, lesson) ||
          (window.LAST_QUIZ_SCORE || 0) >= (window.QUIZ_PASS || 0.7)
        )
      ) {
        return toast(
          `Need ≥ ${Math.round((window.QUIZ_PASS || 0.7) * 100)}% to continue`
        );
      }
      if (p?.type === "project" && !window.PROJECT_UPLOADED) {
        return toast("Please upload your project file first");
      }

      // mark lesson progress to Cloud (best/ passed flags are already handled in quiz)
      try {
        await window.markLessonProgress?.(
          courseId,
          lesson,
          true,
          window.LAST_QUIZ_SCORE || 0
        );
      } catch {}

      // move next (if last page, just stay; finishing is via Finish button)
      goToLesson(courseId, lesson + 1);
      window.renderMyLearning?.();
      return;
    }

    // ---- Finish ---- (only on last page; button id = rdFinish)
    if (t.id === "rdFinish") {
      const { courseId, lesson } = window.READER_STATE;
      if (!courseId) return;

      const p = window.RD?.pages?.[lesson];
      if (
        p?.type === "quiz" &&
        !(
          window.hasPassedQuiz?.(window.RD.cid, lesson) ||
          (window.LAST_QUIZ_SCORE || 0) >= (window.QUIZ_PASS || 0.7)
        )
      ) {
        return toast(
          `Need ≥ ${Math.round((window.QUIZ_PASS || 0.7) * 100)}% to finish`
        );
      }
      if (p?.type === "project" && !window.PROJECT_UPLOADED) {
        return toast("Please upload your project file first");
      }

      try {
        await window.markCourseProgress?.(courseId, "review", lesson);
      } catch {}
      // local completion (also issues cert via showCongrats())
      window.markCourseComplete?.(courseId, window.LAST_QUIZ_SCORE || null);
      window.showCongrats?.();
      window.renderMyLearning?.();
      return;
    }

    // ---- Back ----
    if (t.id === "rdBack") {
      e.preventDefault();
      window.closeReader?.();
      return;
    }
  });
}

/* =========================================================
   Part 5/6 — Gradebook, Admin, Import/Export, Announcements, Chat
   ========================================================= */

/* ---------- Gradebook ---------- */
function renderGradebook() {
  const tb = $("#gbTable tbody");
  if (!tb) return;
  const set = getEnrolls();
  const completedMap = new Map(getCompletedRaw().map((x) => [x.id, x]));
  const list = (ALL.length ? ALL : getCourses()).filter((c) => set.has(c.id));

  const rows = list.map((c) => {
    const done = completedMap.get(c.id);
    const score =
      typeof done?.score === "number"
        ? Math.round(done.score * 100) + "%"
        : "—";
    const progress = done ? "100%" : "0%"; // simple & consistent
    return {
      student: getUser()?.email || "you@example.com",
      course: c.title,
      score,
      credits: c.credits || 3,
      progress,
    };
  });

  tb.innerHTML = rows.length
    ? rows
        .map(
          (r) => `
    <tr>
      <td>${esc(r.student)}</td>
      <td>${esc(r.course)}</td>
      <td>${esc(r.score)}</td>
      <td>${esc(r.credits)}</td>
      <td>${esc(r.progress)}</td>
    </tr>`
        )
        .join("")
    : "<tr><td colspan='5' class='muted'>No data</td></tr>";
}
window.renderGradebook = renderGradebook;

/* ---------- Admin (table + drill-down modal) ---------- */
function renderAdminTable() {
  const tb = $("#adminTable tbody");
  if (!tb) return;
  const list = ALL && ALL.length ? ALL : getCourses();

  tb.innerHTML =
    list
      .map(
        (c) => `
    <tr data-id="${c.id}">
      <td><a href="#" data-view="${c.id}">${esc(c.title)}</a></td>
      <td>${esc(c.category || "")}</td>
      <td>${esc(c.level || "")}</td>
      <td>${esc(String(c.rating || 4.6))}</td>
      <td>${esc(String(c.hours || 8))}</td>
      <td>${(c.price || 0) > 0 ? "$" + c.price : "Free"}</td>
      <td><button class="btn small" data-del="${c.id}">Delete</button></td>
    </tr>`
      )
      .join("") || "<tr><td colspan='7' class='muted'>No courses</td></tr>";

  tb.querySelectorAll("[data-del]").forEach(
    (b) =>
      (b.onclick = () => {
        const id = b.getAttribute("data-del");
        const arr = getCourses().filter((x) => x.id !== id);
        setCourses(arr);
        window.ALL = arr;
        renderCatalog();
        renderAdminTable();
        toast("Deleted");
      })
  );

  tb.querySelectorAll("[data-view]").forEach(
    (a) =>
      (a.onclick = (e) => {
        e.preventDefault();
        const id = a.getAttribute("data-view");
        const c = list.find((x) => x.id === id);
        if (!c) return;
        $("#avmTitle").textContent = c.title || "Course";
        $("#avmBody").innerHTML = `
      <div class="small">Category: ${esc(c.category || "")}</div>
      <div class="small">Level: ${esc(c.level || "")}</div>
      <div class="small">Rating: ${esc(String(c.rating || ""))}</div>
      <div class="small">Hours: ${esc(String(c.hours || ""))}</div>
      <p style="margin-top:.5rem">${esc(c.summary || "")}</p>`;
        $("#adminViewModal")?.showModal();

        $("#avmEdit").onclick = () => {
          const f = $("#courseForm");
          $("#courseModal")?.showModal();
          f.title.value = c.title || "";
          f.category.value = c.category || "";
          f.level.value = c.level || "Beginner";
          f.price.value = Number(c.price || 0);
          f.rating.value = Number(c.rating || 4.6);
          f.hours.value = Number(c.hours || 0);
          f.credits.value = Number(c.credits || 0);
          f.img.value = c.image || "";
          f.description.value = c.summary || "";
          f.benefits.value = c.benefits || "";
          $("#adminViewModal")?.close();
        };
        $("#avmDelete").onclick = () => {
          const arr = getCourses().filter((x) => x.id !== id);
          setCourses(arr);
          window.ALL = arr;
          renderCatalog();
          renderAdminTable();
          toast("Deleted");
          $("#adminViewModal")?.close();
        };
      })
  );
  $("#avmClose")?.addEventListener("click", () =>
    $("#adminViewModal")?.close()
  );
}
window.renderAdminTable = renderAdminTable;

/* ---------- Import / Export ---------- */
function wireAdminImportExportOnce() {
  const ex = $("#btn-export");
  const im = $("#btn-import");
  const file = $("#importFile");
  if (!ex || !im || !file) return;

  ex.addEventListener("click", () => {
    const mine = getCourses().filter((c) => c.source === "user");
    const blob = new Blob([JSON.stringify(mine, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "openlearn-my-courses.json";
    a.click();
  });

  im.addEventListener("click", () => file.click());
  file.addEventListener("change", async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    let incoming = [];
    try {
      incoming = JSON.parse(await f.text()) || [];
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
    window.ALL = arr;
    renderCatalog();
    renderAdminTable();
    toast("Imported");
  });
}

/* ---------- Announcements ---------- */
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
        <strong>${esc(a.title)}</strong>
        <span class="small muted">${new Date(a.ts).toLocaleString()}</span>
      </div>
      <div style="margin:.3rem 0 .5rem">${esc(a.body || "")}</div>
      <div class="row" style="justify-content:flex-end; gap:6px">
        <button class="btn small" data-edit="${a.id}">Edit</button>
        <button class="btn small" data-del="${a.id}">Delete</button>
      </div>
    </div>`
      )
      .join("") || `<div class="muted">No announcements yet.</div>`;
  wireAnnouncementEditButtons();
  updateAnnBadge();
}
window.renderAnnouncements = renderAnnouncements;

function wireAnnouncementEditButtons() {
  const box = $("#annList");
  if (!box) return;
  box.querySelectorAll("[data-edit]").forEach(
    (btn) =>
      (btn.onclick = () => {
        const id = btn.getAttribute("data-edit");
        const arr = getAnns();
        const i = arr.findIndex((x) => x.id === id);
        if (i < 0) return;
        $("#pmTitle").value = arr[i].title || "";
        $("#pmBody").value = arr[i].body || "";
        const f = $("#postForm");
        f.dataset.editId = id;
        $("#postModal .modal-title").textContent = "Edit Announcement";
        $("#postModal")?.showModal();
      })
  );
  box.querySelectorAll("[data-del]").forEach(
    (btn) =>
      (btn.onclick = () => {
        const id = btn.getAttribute("data-del");
        const arr = getAnns().filter((x) => x.id !== id);
        setAnns(arr);
        renderAnnouncements();
        toast("Deleted");
      })
  );
}
$("#btn-new-post")?.addEventListener("click", () => {
  const f = $("#postForm");
  f?.reset();
  if (f) f.dataset.editId = "";
  $("#postModal .modal-title").textContent = "New Announcement";
  $("#postModal")?.showModal();
});
$("#closePostModal")?.addEventListener("click", () => $("#postModal")?.close());
$("#cancelPost")?.addEventListener("click", () => $("#postModal")?.close());
$("#postForm")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const t = $("#pmTitle")?.value.trim();
  const b = $("#pmBody")?.value.trim();
  if (!t || !b) return toast("Fill all fields");
  const f = $("#postForm");
  const editId = f?.dataset.editId || "";
  const arr = getAnns();
  if (editId) {
    const i = arr.findIndex((x) => x.id === editId);
    if (i >= 0) {
      arr[i].title = t;
      arr[i].body = b;
      toast("Updated");
    }
  } else {
    arr.push({
      id: "a_" + Math.random().toString(36).slice(2, 9),
      title: t,
      body: b,
      ts: Date.now(),
    });
    toast("Announcement posted");
  }
  setAnns(arr);
  $("#postModal")?.close();
  renderAnnouncements();
});

/* ---------- Chat gating ---------- */
function gateChatUI() {
  const isFb = !!auth?.currentUser && !auth.currentUser.isAnonymous;
  const isLocal = !!getUser();
  const ok = isFb || isLocal;
  ["chatInput", "chatSend", "ccInput", "ccSend"].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.toggleAttribute("disabled", !ok);
    const card = el.closest(".card");
    if (card) card.classList.toggle("gated", !ok);
  });
}

/* ---------- Global Live Chat (RTDB if available; local fallback) ---------- */
function initChatRealtime() {
  const box = $("#chatBox"),
    input = $("#chatInput"),
    send = $("#chatSend");
  if (!box || !send) return;
  const display = getUser()?.email || "guest";

  try {
    if (!auth?.currentUser || auth.currentUser.isAnonymous)
      throw new Error("no-auth");
    const rtdb = getDatabase();
    const roomRef = ref(getDatabase(), "chats/global");

    // after building roomRef
    pruneOldChatsRTDB(roomRef);

    // if you keep an offline fallback list:
    pruneOldChatsLocal("ol_chat_room_global"); // for global

    const TEN_DAYS = 10 * 24 * 60 * 60 * 1000;
    (async () => {
      try {
        const cutoff = Date.now() - TEN_DAYS;
        const oldQ = query(roomRef, orderByChild("ts"), endAt(cutoff));
        const snap = await get(oldQ);
        snap.forEach((child) => remove(child.ref));
      } catch {}
    })();

    onChildAdded(roomRef, (snap) => {
      const m = snap.val();
      if (!m) return;
      box.insertAdjacentHTML(
        "beforeend",
        `<div class="msg"><b>${esc(m.user)}</b>
        <span class="small muted">${new Date(m.ts).toLocaleTimeString()}</span>
        <div>${esc(m.text)}</div></div>`
      );
      box.scrollTop = box.scrollHeight;
    });

    send.onclick = async () => {
      const text = (input?.value || "").trim();
      if (!text) return;
      if (!auth.currentUser || auth.currentUser.isAnonymous) {
        toast("Please login to chat");
        return;
      }
      try {
        await push(roomRef, {
          uid: auth.currentUser.uid,
          user: auth.currentUser.email || "user",
          text,
          ts: Date.now(),
        });
        if (input) input.value = "";
      } catch {
        toast("Chat failed");
      }
    };
    return;
  } catch {}

  // Local-only fallback
  const KEY = "ol_chat_local";
  const load = () => JSON.parse(localStorage.getItem(KEY) || "[]");
  const save = (a) => localStorage.setItem(KEY, JSON.stringify(a));
  const draw = (m) => {
    box.insertAdjacentHTML(
      "beforeend",
      `<div class="msg"><b>${esc(m.user)}</b>
      <span class="small muted">${new Date(m.ts).toLocaleTimeString()}</span>
      <div>${esc(m.text)}</div></div>`
    );
    box.scrollTop = box.scrollHeight;
  };
  let arr = load();
  arr.forEach(draw);
  send.onclick = () => {
    const text = (input?.value || "").trim();
    if (!text) return;
    const m = { user: display, text, ts: Date.now() };
    arr.push(m);
    save(arr);
    draw(m);
    if (input) input.value = "";
  };
}

/* ---------- Per-course chat ---------- */
function wireCourseChatRealtime(courseId) {
  const list = $("#ccList"),
    input = $("#ccInput"),
    send = $("#ccSend"),
    label = $("#chatRoomLabel");
  if (!list || !send) return;
  if (label) label.textContent = "room: " + courseId;
  const display = getUser()?.email || "you";

  try {
    if (!auth?.currentUser || auth.currentUser.isAnonymous)
      throw new Error("no-auth");
    const rtdb = getDatabase();
    const roomRef = ref(getDatabase(), `chats/${courseId}`);

    // after building roomRef
    pruneOldChatsRTDB(roomRef);

    // if you keep an offline fallback list:
    // per course:
    pruneOldChatsLocal("ol_chat_room_" + courseId);

    const TEN_DAYS = 10 * 24 * 60 * 60 * 1000;
    (async () => {
      try {
        const cutoff = Date.now() - TEN_DAYS;
        const oldQ = query(roomRef, orderByChild("ts"), endAt(cutoff));
        const snap = await get(oldQ);
        snap.forEach((child) => remove(child.ref));
      } catch {}
    })();

    onChildAdded(roomRef, (snap) => {
      const m = snap.val();
      if (!m) return;
      list.insertAdjacentHTML(
        "beforeend",
        `<div class="msg"><b>${esc(m.user)}</b>
        <span class="small muted">${new Date(m.ts).toLocaleTimeString()}</span>
        <div>${esc(m.text)}</div></div>`
      );
      list.scrollTop = list.scrollHeight;
    });

    send.onclick = async () => {
      const text = (input?.value || "").trim();
      if (!text) return;
      if (!auth.currentUser || auth.currentUser.isAnonymous) {
        toast("Please login to chat");
        return;
      }
      try {
        await push(roomRef, {
          uid: auth.currentUser.uid,
          user: auth.currentUser.email || "user",
          text,
          ts: Date.now(),
        });
        if (input) input.value = "";
      } catch {
        toast("Chat failed");
      }
    };
    return;
  } catch {}

  // local fallback
  const KEY = "ol_chat_room_" + courseId;
  const load = () => JSON.parse(localStorage.getItem(KEY) || "[]");
  const save = (a) => localStorage.setItem(KEY, JSON.stringify(a));
  const draw = (m) => {
    list.insertAdjacentHTML(
      "beforeend",
      `<div class="msg"><b>${esc(m.user)}</b>
      <span class="small muted">${new Date(m.ts).toLocaleTimeString()}</span>
      <div>${esc(m.text)}</div></div>`
    );
    list.scrollTop = list.scrollHeight;
  };

  const TEN_DAYS = 10 * 24 * 60 * 60 * 1000;

  let arr = load();

  // prune 10 days+
  const cutoff = Date.now() - TEN_DAYS;
  const pruned = arr.filter((m) => (m.ts || 0) >= cutoff);
  if (pruned.length !== arr.length) {
    save(pruned);
    arr = pruned;
  }

  list.innerHTML = "";
  arr.forEach(draw);
  send.onclick = () => {
    const text = (input?.value || "").trim();
    if (!text) return;
    const m = { user: display, text, ts: Date.now() };
    arr.push(m);
    save(arr);
    draw(m);
    if (input) input.value = "";
  };
}

// === Chat TTL (10 days) ===
const TEN_DAYS = 10 * 24 * 60 * 60 * 1000;

async function pruneOldChatsRTDB(roomRef) {
  try {
    const cutoff = Date.now() - TEN_DAYS;
    const snap = await get(roomRef); // no 'endAt' — filter client-side
    snap.forEach((child) => {
      const v = child.val && child.val();
      const ts = v && v.ts ? Number(v.ts) : 0;
      if (ts && ts < cutoff) {
        try {
          remove(child.ref);
        } catch {}
      }
    });
  } catch (e) {
    console.warn("pruneOldChatsRTDB failed:", e?.message || e);
  }
}

function pruneOldChatsLocal(key) {
  try {
    const cutoff = Date.now() - TEN_DAYS;
    const arr = JSON.parse(localStorage.getItem(key) || "[]");
    const pruned = arr.filter((m) => Number(m.ts || 0) >= cutoff);
    if (pruned.length !== arr.length) {
      localStorage.setItem(key, JSON.stringify(pruned));
    }
  } catch {}
}

let IS_AUTHED = false;

const MAIN_CANDIDATES = [
  "#pages",
  "#main",
  "#appMain",
  "main",
  "#content",
  ".main",
];
function findMain() {
  return document.querySelector(MAIN_CANDIDATES.join(","));
}

// (optional) build a lightweight overlay next to main
function ensureAuthOverlay(mainEl) {
  if (!mainEl) return null;
  let ov =
    mainEl.nextElementSibling?.id === "authGuardOverlay"
      ? mainEl.nextElementSibling
      : null;
  if (!ov) {
    ov = document.createElement("div");
    ov.id = "authGuardOverlay";
    ov.innerHTML = `<div class="msg">Please log in to continue</div>`;
    mainEl.insertAdjacentElement("afterend", ov);
  }
  return ov;
}

// Disable interactive elements (except login controls)
const CLICKABLE_SELECTOR = `a, button, [role="button"], .nav-link, .card, .course-card, [data-action]`;
function setClickableDisabled(root, disabled) {
  if (!root) return;
  root.querySelectorAll(CLICKABLE_SELECTOR).forEach((el) => {
    // skip obvious auth buttons if any
    const id = (el.id || "").toLowerCase();
    const ds = el.dataset || {};
    const isLogin =
      id.includes("login") ||
      ds.auth === "login" ||
      ds.requiresAuth === "false";
    if (isLogin) return;

    if (disabled) {
      el.classList.add("disabled");
      el.setAttribute("aria-disabled", "true");
      el.addEventListener("click", blockIfLocked, true);
    } else {
      el.classList.remove("disabled");
      el.removeAttribute("aria-disabled");
      el.removeEventListener("click", blockIfLocked, true);
    }
  });
}

function blockIfLocked(e) {
  if (!IS_AUTHED) {
    e.preventDefault();
    e.stopPropagation();
    if (typeof toast === "function") toast("Please log in to continue");
  }
}

function setAppLocked(locked) {
  const mainEl = findMain();
  if (!mainEl) return;
  if (locked) {
    mainEl.classList.add("locked-main");
  } else {
    mainEl.classList.remove("locked-main");
  }
  ensureAuthOverlay(mainEl); // create once
  setClickableDisabled(mainEl, locked);
}

// Router guard: prevent page switch while locked
const ALLOW_PAGES_WHEN_LOCKED = new Set(["welcome", "login", "about"]); // adjust if needed
const _showPage = window.showPage; // keep reference if defined earlier
window.showPage = function (name, ...rest) {
  if (
    !IS_AUTHED &&
    !ALLOW_PAGES_WHEN_LOCKED.has(String(name || "").toLowerCase())
  ) {
    if (typeof toast === "function") toast("Please log in first");
    name = "welcome"; // fallback to a public-safe page
  }
  return typeof _showPage === "function"
    ? _showPage.call(this, name, ...rest)
    : null;
};

document.addEventListener("DOMContentLoaded", () => {
  try {
    initAuthModal?.();
  } catch {}

  try {
    onAuthStateChanged(auth, (u) => {
      IS_AUTHED = !!u;
      setAppLocked(!IS_AUTHED);

      if (u) {
        // your existing login success wiring
        setUser?.({
          email: u.email || "",
          role: getUser?.()?.role || "student",
        });
        setLogged?.(true, u.email || "");
      } else {
        setUser?.(null);
        setLogged?.(false);
        // Optionally route to a public-safe page
        showPage?.("welcome");
      }
    });
  } catch (e) {
    console.warn("Auth listener error", e);
    // fail-safe: lock if we can’t read auth
    IS_AUTHED = false;
    setAppLocked(true);
  }
});

/* =========================================================
   Part 6/6 — Settings, Boot, Finals Removal Shim
   ========================================================= */

/* ---------- Settings ---------- */
$("#themeSel")?.addEventListener("change", (e) => {
  localStorage.setItem("ol_theme", e.target.value);
  applyPalette(e.target.value);
});
$("#fontSel")?.addEventListener("change", (e) => {
  localStorage.setItem("ol_font", e.target.value);
  applyFont(e.target.value);
});

/* ---------- Boot ---------- */
document.addEventListener("DOMContentLoaded", async () => {
  // Theme / font
  applyPalette(localStorage.getItem("ol_theme") || "slate");
  applyFont(localStorage.getItem("ol_font") || "16");

  // Auth modal + restore login
  initAuthModal();
  const u = getUser();
  setLogged(!!u, u?.email);
  if (u) {
    try {
      await migrateProgressKey();
      await syncProgressBothWays();
    } catch {}
  }

  // Gate chat inputs and keep in sync
  gateChatUI();
  if (typeof onAuthStateChanged === "function" && auth) {
    onAuthStateChanged(auth, async () => {
      gateChatUI();
      try {
        await migrateProgressKey();
        await Promise.all([syncEnrollsBothWays(), syncProgressBothWays()]);
      } catch {}
      // ✅ sync ပြီမှ render — Firefox “Continue only” ပြဿနာကို ဒီနေရာက ဖြေ
      window.renderProfilePanel?.();
      window.renderMyLearning?.();
      window.renderGradebook?.();
    });
  }

  // UI
  initSidebar();
  initSearch();
  initChatRealtime();

  // Data
  await loadCatalog().catch(() => {});
  ALL = getCourses();
  // ⬇️ user ရှိပြီး firestore သုံးစွဲနိုင်ရင် ချက်ချင်း sync
  if (getUser() && !!db) {
    try {
      await Promise.all([syncEnrollsBothWays(), syncProgressBothWays()]);
    } catch {}
  }
  renderCatalog();
  window.renderAdminTable?.();
  window.renderProfilePanel?.();
  window.renderMyLearning?.();
  window.renderGradebook?.();
  window.renderAnnouncements?.();

  // One-time import/export wiring
  wireAdminImportExportOnce();

  // Remove Finals from UI if present (robust no-op if missing)
  stripFinalsUI();

  // defensive: keep auth-required items clickable (CSS gates by JS)
  document.querySelectorAll("[data-requires-auth]").forEach((el) => {
    el.style.pointerEvents = "auto";
  });

  document.querySelectorAll("#certPrint, #certClose").forEach((el) => {
    if (!el.closest("#certModal")) el.remove();
  });

  // Enable browser back to close reader -> My Learning
  // Enable browser back to close reader -> My Learning
  if (!window._olPopstateWired) {
    window._olPopstateWired = true;
    addEventListener("popstate", (e) => {
      const readerEl = $("#reader");
      const readerOpen = readerEl && !readerEl.classList.contains("hidden");
      const st = e.state;

      // 1) Reader ဖွင့်ထားပြီး reader state က မဟုတ်တော့ရင် -> close
      if (readerOpen && (!st || st.ol !== "reader")) {
        closeReader();
        return;
      }

      // 2) Reader မဖွင့်ထားသေးပဲ state က reader ဖြစ်ရင် -> open (တခါတည်း)
      if (!readerOpen && st && st.ol === "reader" && st.cid) {
        // openReader() ထဲမှာ pushState guard ရှိရမယ် (ရွှေ့ထားပေးခဲ့တာ)
        openReader(st.cid);
        return;
      }

      // 3) State က ဘာမှ မဟုတ် (root) & reader မဖွင့် -> My Learning ကို ensure
      if (!st && !readerOpen) {
        showPage("mylearning");
      }
    });
  }
  // ---- Watchdog: if we ever reload while a dialog stayed open/printing, recover
  setTimeout(() => {
    const certOpen = document.getElementById("certModal")?.open;
    if (certOpen || document.body.classList.contains("printing")) {
      hardCloseCert();
    }
  }, 0);

  // Boot block အဆုံးတွင် ထည့်ပါ (သင့်ကုဒ်ထဲ add လုပ်ထားတာကို keep)
  addEventListener("hashchange", () => hardCloseCert());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") hardCloseCert();
  });
  addEventListener("pageshow", () =>
    document.body.classList.remove("printing")
  );
});

// run once on boot
document.addEventListener("DOMContentLoaded", () => {
  // make sure the modal & handlers exist
  try {
    initAuthModal();
  } catch {}

  // reflect Firebase auth state → UI & local profile
  try {
    onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser({ email: u.email || "", role: getUser()?.role || "student" });
        setLogged(true, u.email || "");
      } else {
        setUser(null);
        setLogged(false);
      }
    });
  } catch {}
});

// ==== DEBUG HOOKS (put near the bottom of app.js, after the functions are defined) ====
Object.assign(window, {
  getCompletedRaw, // -> view local completed array
  setCompletedRaw, // -> manually set
  getCompleted, // -> Set of completed IDs
  markCourseComplete, // -> mark a course done (testing)
  syncProgressBothWays, // -> cloud <-> local sync
  migrateProgressKey, // -> merge email/uid progress
  renderMyLearning, // -> re-render cards
  renderProfilePanel, // -> re-render profile/transcript
  renderGradebook, // -> re-render gradebook
});

/* ---------- Finals Removal Shim ---------- */
function stripFinalsUI() {
  document
    .querySelectorAll(
      `
    #btn-top-final,
    #finalModal,
    #page-finals,
    [data-page="finals"],
    a[href="#finals"],
    button[data-page="finals"]
  `
    )
    .forEach((n) => n?.remove());
  const s = document.createElement("style");
  s.textContent = `.navbtn[data-page="finals"]{display:none!important}`;
  document.head.appendChild(s);
}
