/* =========================================================
   OpenLearn · Clean app.js (ESM)
   - Single role helpers (no duplicates)
   - Global + per-course chat (no re-declared symbols)
   - Finals quiz pool + details meta loader
   ========================================================= */
/* --- (Part 1/5) Imports, tiny helpers, theme, state, auth roles ---*/
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
  remove,

  // Optional PayPal loader (keep, but only used if present in your UI)
  ensurePayPal,
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

/* ---------- theme / font ---------- */
const PALETTES = {
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
function applyPalette(name) {
  const p = PALETTES[name] || PALETTES.slate,
    r = document.documentElement;
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
  Object.entries(map).forEach(([k, v]) => p[k] && r.style.setProperty(v, p[k]));
  r.style.setProperty("--text", p.fg);
  r.style.setProperty("--text-strong", p.fg);
  const rgb = (hex) => {
    const h = hex.replace("#", "");
    return h.length === 3
      ? h.split("").map((c) => parseInt(c + c, 16))
      : [h.slice(0, 2), h.slice(2, 4), h.slice(4, 6)].map((x) =>
          parseInt(x, 16)
        );
  };
  const [rr, gg, bb] = rgb(p.fg || "#111");
  r.style.setProperty("--fg-r", rr);
  r.style.setProperty("--fg-g", gg);
  r.style.setProperty("--fg-b", bb);
  document.body.classList.toggle("light-theme", name === "light");
}
function applyFont(px) {
  document.documentElement.style.setProperty("--fontSize", (px || 16) + "px");
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
let currentUser = null; // transient
const ALL_QUIZZES = {}; // { courseId: [questions...] }

/* --- (Part 2/5) Data loader, details, filters, catalog, sidebar, topbar offset --- */
/* ---------- data base resolver ---------- */
const DATA_BASE_CANDIDATES = ["/data", "./data", "data"];
let DATA_BASE = null;

async function resolveDataBase() {
  const cfg = (window.OPENLEARN_DATA_BASE || "").trim();
  if (cfg) {
    DATA_BASE = cfg;
    console.log("[OL] DATA_BASE from config =", DATA_BASE);
    return;
  }
  for (const base of DATA_BASE_CANDIDATES) {
    try {
      const r = await fetch(`${base}/catalog.json`, { cache: "no-cache" });
      if (r.ok) {
        DATA_BASE = base;
        console.log("[OL] DATA_BASE autodetected =", DATA_BASE);
        return;
      }
    } catch {}
  }
  DATA_BASE = null;
  console.warn("[OL] No external data found — using seed.");
}

/* ---------- fetch helpers ---------- */
async function fetchJSON(path) {
  const r = await fetch(path, { cache: "no-cache" });
  if (!r.ok) return null;
  try {
    return await r.json();
  } catch {
    return null;
  }
}
async function fetchText(path) {
  const r = await fetch(path, { cache: "no-cache" });
  if (!r.ok) throw new Error(path);
  return r.text();
}

/* ---------- course bundle loader (meta + lessons + quizzes) ---------- */
function rewriteRelative(html, baseUrl) {
  return html.replace(
    /(\s(?:src|href)=)(["'])(?!https?:|data:|\/)([^"']+)\2/gi,
    (_, p1, q, p3) => `${p1}${q}${baseUrl}/${p3}${q}`
  );
}

async function loadCourseBundle(courseId) {
  if (!DATA_BASE) await resolveDataBase();
  if (!DATA_BASE) return { meta: null, pages: [], quizzes: null };

  const root = `${DATA_BASE}/courses/${courseId}`;
  const meta = await fetchJSON(`${root}/meta.json`); // may be null

  const pages = [];
  if (meta?.modules?.length) {
    for (const mod of meta.modules) {
      const base = `${root}/${mod.path || ""}`.replace(/\/+$/, "");
      for (const l of mod.lessons || []) {
        try {
          const raw = await fetchText(`${base}/${l.file}`);
          const html = rewriteRelative(raw, root);
          pages.push({
            type: l.type || "reading",
            title: l.title || l.file,
            html,
          });
        } catch (e) {
          console.warn("Lesson load failed", e);
        }
      }
      if (mod.quiz)
        pages.push({
          type: "quiz-marker",
          html: `<h3>${mod.title} — Quiz</h3>`,
        });
    }
  }

  // collect quizzes per module (optional)
  const quizzes = {};
  if (meta?.modules?.length) {
    for (const mod of meta.modules) {
      if (!mod.quiz) continue;
      const q = await fetchJSON(`${root}/${mod.quiz}`);
      if (Array.isArray(q)) quizzes[mod.id] = q;
    }
  }

  // flatten to ALL_QUIZZES[courseId]
  const pool = [];
  Object.values(quizzes).forEach(
    (arr) => Array.isArray(arr) && arr.forEach((it) => pool.push(it))
  );
  if (pool.length) ALL_QUIZZES[courseId] = pool;

  return { meta, pages, quizzes };
}

/* ---------- catalog loader ---------- */
async function loadCatalog() {
  await resolveDataBase();

  let items = [];
  if (DATA_BASE) {
    try {
      const url = `${DATA_BASE}/catalog.json`;
      console.log("[OL] fetching catalog:", url);
      const r = await fetch(url, { cache: "no-cache" });
      if (r.ok) {
        const cat = await r.json();
        items = cat?.items || [];
      }
    } catch (e) {
      console.warn("[OL] catalog fetch error:", e);
    }
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
function getFilterValues() {
  const cat = ($("#filterCategory")?.value || "").trim();
  const lvl = ($("#filterLevel")?.value || "").trim();
  const sort = ($("#sortBy")?.value || "").trim();
  return { cat, lvl, sort };
}
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

  // build categories once
  const sel = $("#filterCategory");
  if (sel && !sel.dataset._wired) {
    const cats = Array.from(new Set(ALL.map((c) => c.category || "")))
      .filter(Boolean)
      .sort();
    sel.innerHTML =
      `<option value="">All Categories</option>` +
      cats.map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join("");
    sel.dataset._wired = "1";
  }

  // filter + sort
  const { cat, lvl, sort } = getFilterValues();
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
      const search = [c.title, c.summary, c.category, c.level].join(" ");
      const priceStr = (c.price || 0) > 0 ? "$" + c.price : "Free";
      const r = Number(c.rating || 4.6);
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
["filterCategory", "filterLevel", "sortBy"].forEach((id) => {
  document
    .getElementById(id)
    ?.addEventListener("change", () => renderCatalog());
});

/* ---------- sidebar + topbar offset (fixed) ---------- */
function initSidebar() {
  const sb = $("#sidebar"),
    burger = $("#btn-burger");
  const isMobile = () => matchMedia("(max-width:1024px)").matches;

  const setBurger = () => {
    if (burger) burger.style.display = isMobile() ? "" : "none";
  };
  setBurger();
  addEventListener("resize", setBurger);

  const setExpandedFlag = (on) =>
    document.body.classList.toggle("sidebar-expanded", !!on);

  sb?.addEventListener("mouseenter", () => {
    if (!isMobile()) setExpandedFlag(true);
  });
  sb?.addEventListener("mouseleave", () => {
    if (!isMobile()) setExpandedFlag(false);
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
    if (isMobile()) {
      sb.classList.remove("show");
      setExpandedFlag(false);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  document.addEventListener("click", (e) => {
    if (!isMobile()) return;
    if (!sb?.classList.contains("show")) return;
    if (!e.target.closest("#sidebar") && e.target !== burger) {
      sb.classList.remove("show");
      setExpandedFlag(false);
    }
  });
}

function updateTopbarOffsetNow() {
  const tb = $("#topbar");
  if (!tb) return;
  const h = Math.ceil(tb.getBoundingClientRect().height);
  document.documentElement.style.setProperty("--topbar-offset", h + "px");
}
let _tboRaf = 0;
function updateTopbarOffset() {
  if (_tboRaf) cancelAnimationFrame(_tboRaf);
  _tboRaf = requestAnimationFrame(updateTopbarOffsetNow);
}
document.addEventListener("DOMContentLoaded", updateTopbarOffsetNow);
addEventListener("resize", updateTopbarOffset);
addEventListener("orientationchange", updateTopbarOffset);
if (window.visualViewport) {
  visualViewport.addEventListener("resize", updateTopbarOffset);
  visualViewport.addEventListener("scroll", updateTopbarOffset);
}
if ("ResizeObserver" in window) {
  const ro = new ResizeObserver(updateTopbarOffset);
  const tb = $("#topbar");
  tb ? ro.observe(tb) : null;
}

/* ---------- router + search ---------- */
function showPage(id) {
  $$(".page").forEach((p) => p.classList.remove("visible"));
  $("#page-" + id)?.classList.add("visible");
  if (id === "mylearning") renderMyLearning();
  if (id === "gradebook") renderGradebook();
  if (id === "admin") renderAdminTable();
  if (id === "dashboard") renderAnnouncements();
}
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

/* --- (Part 3/5) — Auth modal, catalog actions, details, my learning, reader ---*/
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
  document.body.classList.toggle("locked", !on);
  document.body.dataset.role = getRole();
  renderProfilePanel?.();
}
function initAuthModal() {
  ensureAuthModalMarkup();
  const modal = $("#authModal");
  if (!modal) return;

  // define before using
  const showPane = (id) => {
    ["authLogin", "authSignup", "authForgot"].forEach((x) =>
      $("#" + x)?.classList.add("ol-hidden")
    );
    $("#" + id)?.classList.remove("ol-hidden");
    modal.showModal();
  };
  // expose for gates
  window._showLoginPane = () => showPane("authLogin");

  // topbar buttons
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

  // pane links
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

  // login
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
    } catch (err) {
      console.warn(err);
      toast("Login failed");
    }
  });

  // signup
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
    } catch (err) {
      console.warn(err);
      toast("Signup failed");
    }
  });

  // forgot (demo)
  $("#doForgot")?.addEventListener("click", (e) => {
    e.preventDefault();
    const em = $("#forgotEmail")?.value.trim();
    if (!em) return toast("Enter email");
    modal.close();
    toast("Reset link sent (demo)");
  });

  // global auth gate
  document.addEventListener("click", (e) => {
    const gated = e.target.closest("[data-requires-auth]");
    if (gated && !isLogged()) {
      e.preventDefault();
      e.stopPropagation();
      window._showLoginPane?.();
    }
  });
}

/* ---------- catalog actions (enroll, details) ---------- */
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
  // If you use PayPal modal in your HTML, wire it here (kept minimal)
  toast("Demo checkout — marking as enrolled");
  markEnrolled(id);
}

/* ---------- details (catalog + meta merge) ---------- */
async function openDetails(id) {
  const base =
    ALL.find((x) => x.id === id) || getCourses().find((x) => x.id === id);
  if (!base) {
    toast("Course not found");
    return;
  }

  let meta = null;
  try {
    if (!DATA_BASE) await resolveDataBase();
    if (DATA_BASE)
      meta = await fetchJSON(`${DATA_BASE}/courses/${id}/meta.json`);
  } catch (e) {
    console.warn("[OL] details meta fetch failed:", e);
  }

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
    html: `<h3>Quiz 1</h3><p>Q1) Short answer</p><input id="q1" class="input" placeholder="Your answer"><div style="margin-top:8px"><button class="btn" id="qSubmit">Submit</button> <span id="qMsg" class="small muted"></span></div>`,
  },
  {
    type: "final",
    html: `<h3>Final Project</h3><input type="file"><p class="small muted">Complete to earn certificate/transcript (demo).</p>`,
  },
];
let RD = { cid: null, pages: [], i: 0, credits: 0, score: 0 };

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

// merged: loads real lessons if available (meta.json), else sample pages
async function openReader(cid) {
  const c =
    ALL.find((x) => x.id === cid) || getCourses().find((x) => x.id === cid);
  if (!c) return toast("Course not found");

  let bundle = null;
  try {
    bundle = await loadCourseBundle(c.id);
  } catch (e) {
    console.warn("loadCourseBundle failed", e);
  }

  const pages = bundle?.pages?.length ? bundle.pages : SAMPLE_PAGES(c.title);
  const credits = c.credits || bundle?.meta?.credits || 3;

  RD = {
    cid: c.id,
    pages,
    i: 0,
    credits,
    score: 0,
    quizzes: bundle?.quizzes || null,
  };

  $("#myCourses") && ($("#myCourses").innerHTML = "");
  $("#reader")?.classList.remove("hidden");
  $("#rdMeta") && ($("#rdMeta").textContent = `Credits: ${RD.credits}`);

  renderPage();

  const btnBack = $("#rdBack"),
    btnPrev = $("#rdPrev"),
    btnNext = $("#rdNext"),
    btnBm = $("#rdBookmark"),
    btnNote = $("#rdNote");
  if (btnBack)
    btnBack.onclick = () => {
      $("#reader")?.classList.add("hidden");
      renderMyLearning();
    };
  if (btnPrev)
    btnPrev.onclick = () => {
      RD.i = Math.max(0, RD.i - 1);
      renderPage();
    };
  if (btnNext)
    btnNext.onclick = () => {
      RD.i = Math.min(RD.pages.length - 1, RD.i + 1);
      renderPage();
    };
  if (btnBm) btnBm.onclick = () => toast("Bookmarked (demo)");
  if (btnNote)
    btnNote.onclick = () => {
      const t = prompt("Note");
      if (!t) return;
      toast("Note saved");
    };

  // per-course chat
  if (window._ccOff) {
    try {
      window._ccOff();
    } catch {}
    window._ccOff = null;
  }
  if (typeof wireCourseChatRealtime === "function") {
    const off = wireCourseChatRealtime(c.id);
    if (typeof off === "function") window._ccOff = off;
  }
}

function renderPage() {
  const p = RD.pages[RD.i];
  if (!p) return;
  $("#rdTitle") &&
    ($("#rdTitle").textContent = `${RD.i + 1}. ${String(
      p.type || "PAGE"
    ).toUpperCase()}`);
  $("#rdPage") && ($("#rdPage").innerHTML = p.html);
  $("#rdPageInfo") &&
    ($("#rdPageInfo").textContent = `${RD.i + 1} / ${RD.pages.length}`);
  $("#rdProgress") &&
    ($("#rdProgress").style.width =
      Math.round(((RD.i + 1) / RD.pages.length) * 100) + "%");
  const btn = $("#qSubmit"),
    msg = $("#qMsg");
  if (btn)
    btn.onclick = () => {
      if (msg) msg.textContent = "Submitted ✔️ (+5%)";
    };
}

/* --- (Part 4/5) — Gradebook, Admin, Announcements, Finals helpers --- */
/* --- (Part 4/5) — Gradebook, Admin, Announcements, Finals helpers --- */

/* ---------- Gradebook ---------- */
function renderGradebook() {
  const tb = $("#gbTable tbody");
  if (!tb) return;
  const set = getEnrolls();
  const list = (ALL.length ? ALL : getCourses()).filter((c) => set.has(c.id));
  const rows = list.map((c) => ({
    student: getUser()?.email || "you@example.com",
    course: c.title,
    score: 80 + Math.floor(Math.random() * 20) + "%",
    credits: c.credits || 3,
    progress: 10 + Math.floor(Math.random() * 90) + "%",
  }));
  tb.innerHTML =
    rows
      .map(
        (r) =>
          `<tr>
      <td>${esc(r.student)}</td>
      <td>${esc(r.course)}</td>
      <td>${esc(r.score)}</td>
      <td>${esc(r.credits)}</td>
      <td>${esc(r.progress)}</td>
    </tr>`
      )
      .join("") || "<tr><td colspan='5' class='muted'>No data</td></tr>";
}

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
    </tr>
  `
      )
      .join("") || "<tr><td colspan='7' class='muted'>No courses</td></tr>";

  // Row delete
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

  // Drill-down view
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
      <p style="margin-top:.5rem">${esc(c.summary || "")}</p>
    `;

        const dlg = $("#adminViewModal");
        dlg?.showModal();

        // Edit → reuse New Course modal
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
          dlg?.close();
        };

        // Delete from modal
        $("#avmDelete").onclick = () => {
          const arr = getCourses().filter((x) => x.id !== id);
          setCourses(arr);
          window.ALL = arr;
          renderCatalog();
          renderAdminTable();
          toast("Deleted");
          dlg?.close();
        };
      })
  );

  $("#avmClose")?.addEventListener("click", () =>
    $("#adminViewModal")?.close()
  );
}

/* ---------- Import / Export (one-time wiring) ---------- */
function wireAdminImportExportOnce() {
  const ex = $("#btn-export");
  const im = $("#btn-import");
  const file = $("#importFile");
  if (!ex || !im || !file) return;

  ex.addEventListener("click", () => {
    // export only user-created (source:"user") to keep seed clean
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
    </div>
  `
      )
      .join("") || `<div class="muted">No announcements yet.</div>`;
  wireAnnouncementEditButtons();
}
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
// compose / edit modal actions
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

/* ---------- Finals: pool + UI + downloads ---------- */
function _pickRandom(arr, n) {
  const a = arr.slice();
  const out = [];
  while (a.length && out.length < n) {
    out.push(a.splice(Math.floor(Math.random() * a.length), 1)[0]);
  }
  return out;
}
function gatherAllQuestionsForFinal() {
  const enrolled = Array.from(getEnrolls());
  const collected = [];
  // prefer enrolled courses
  enrolled.forEach((cid) => {
    const arr = ALL_QUIZZES[cid];
    if (Array.isArray(arr) && arr.length) collected.push(...arr);
  });
  // if nothing, try any loaded
  if (!collected.length) {
    for (const cid in ALL_QUIZZES) {
      const arr = ALL_QUIZZES[cid];
      if (Array.isArray(arr) && arr.length) collected.push(...arr);
    }
  }
  // small fallback so button never does nothing
  if (!collected.length) {
    collected.push(
      { t: "tf", q: "CSS is used for styling web pages.", a: "t" },
      { t: "short", q: "HTTP status 404 means what?", a: "not found" },
      { t: "short", q: "DOM stands for?", a: "document object model" },
      { t: "short", q: "Array method to add at end?", a: "push" },
      { t: "tf", q: "React is a backend framework.", a: "f" },
      { t: "short", q: "SQL keyword for unique rows?", a: "distinct" },
      { t: "tf", q: "JSON stands for JavaScript Object Notation.", a: "t" }
    );
  }
  return collected;
}
function downloadCertificate(name, pct) {
  // simple canvas certificate
  const c = document.createElement("canvas");
  c.width = 1200;
  c.height = 800;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = "#222";
  ctx.lineWidth = 6;
  ctx.strokeRect(20, 20, c.width - 40, c.height - 40);
  ctx.font = "48px serif";
  ctx.fillStyle = "#111";
  ctx.fillText("Certificate of Completion", 280, 180);
  ctx.font = "36px system-ui, -apple-system, Segoe UI";
  ctx.fillText(`Awarded to: ${name}`, 280, 300);
  ctx.fillText(`Final Exam Score: ${pct}%`, 280, 360);
  ctx.fillText(`Date: ${new Date().toLocaleDateString()}`, 280, 420);
  const a = document.createElement("a");
  a.href = c.toDataURL("image/png");
  a.download = "OpenLearn-Certificate.png";
  a.click();
}
function downloadTranscript(name, pct, total, correct) {
  const lines = [
    "OpenLearn Transcript",
    `Name,${name}`,
    `Final Exam Score,${pct}%`,
    `Correct,${correct}`,
    `Total,${total}`,
    `Date,${new Date().toISOString()}`,
  ].join("\n");
  const blob = new Blob([lines], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "OpenLearn-Transcript.csv";
  a.click();
}
function startFinal() {
  const pool = gatherAllQuestionsForFinal();
  if (!pool.length) {
    toast("No quizzes found in your enrolled courses");
    return;
  }
  const qs = _pickRandom(pool, 12);

  const form = $("#finalForm");
  if (!form) return;
  form.innerHTML = "";
  qs.forEach((it, idx) => {
    const id = "qf_" + idx;
    if (Array.isArray(it.a) && typeof it.correct === "number") {
      // MCQ schema: {q, a:[], correct}
      form.insertAdjacentHTML(
        "beforeend",
        `
        <div class="card">
          <div><b>${idx + 1}.</b> ${esc(it.q)}</div>
          ${it.a
            .map(
              (op, i) =>
                `<label><input type="radio" name="${id}" value="${i}"> ${esc(
                  op
                )}</label>`
            )
            .join("<br>")}
        </div>`
      );
    } else if (it.t === "tf") {
      form.insertAdjacentHTML(
        "beforeend",
        `
        <div class="card">
          <div><b>${idx + 1}.</b> ${esc(it.q)}</div>
          <label><input type="radio" name="${id}" value="t"> True</label>
          <label><input type="radio" name="${id}" value="f"> False</label>
        </div>`
      );
    } else {
      // short
      form.insertAdjacentHTML(
        "beforeend",
        `
        <div class="card">
          <div><b>${idx + 1}.</b> ${esc(it.q)}</div>
          <input class="input" name="${id}" placeholder="Your answer">
        </div>`
      );
    }
  });
  form.insertAdjacentHTML(
    "beforeend",
    `
    <div class="row" style="justify-content:flex-end; gap:8px">
      <button class="btn" id="cancelFinal" type="button">Cancel</button>
      <button class="btn primary" id="submitFinal" type="button">Submit</button>
    </div>`
  );

  $("#cancelFinal")?.addEventListener("click", () => $("#finalModal")?.close());
  $("#submitFinal")?.addEventListener("click", () => {
    let score = 0;
    qs.forEach((it, idx) => {
      const id = "qf_" + idx;
      const val = (
        form.querySelector(`[name="${id}"]:checked`)?.value ||
        form.querySelector(`[name="${id}"]`)?.value ||
        ""
      )
        .toString()
        .trim()
        .toLowerCase();

      if (Array.isArray(it.a) && typeof it.correct === "number") {
        if (String(val) === String(it.correct)) score++;
      } else if (it.t === "tf") {
        if (val && val === String(it.a).toLowerCase()) score++;
      } else {
        const ans = String(it.a || "").toLowerCase();
        if (ans && (val === ans || val.includes(ans))) score++;
      }
    });
    const pct = Math.round((score / qs.length) * 100);
    if (pct >= 70) {
      toast(`Passed ${pct}% ✔ — Downloading certificate & transcript…`);
      downloadCertificate(getUser()?.email || "Student", pct);
      downloadTranscript(getUser()?.email || "Student", pct, qs.length, score);
    } else {
      toast(`Failed ${pct}% — try again`);
    }
    $("#finalModal")?.close();
  });

  $("#finalModal")?.showModal();
}
// wire the button (id must exist in your HTML)
$("#btn-start-final")?.addEventListener("click", (e) => {
  e.preventDefault();
  startFinal();
});

/* --- (Part 5/5) — Chat (global & per-course), Settings, Boot --- */
/* --- (Part 5/5) — Chat (global & per-course), Settings, Boot --- */

/* ---------- Chat gating (enable/disable inputs) ---------- */
function gateChatUI() {
  // Firebase non-anonymous OR local mirror user
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

/* ---------- Chat guard: login required (no anonymous) ---------- */
async function ensureAuthForChat() {
  if (auth?.currentUser && !auth.currentUser.isAnonymous)
    return auth.currentUser;
  const err = new Error("login-required");
  err.code = "login-required";
  throw err;
}

/* ---------- Global Live Chat ---------- */
function initChatRealtime() {
  const box = $("#chatBox"),
    input = $("#chatInput"),
    send = $("#chatSend");
  if (!box || !send) return;

  const display = getUser()?.email || "guest";

  try {
    // require login for RTDB
    if (!auth?.currentUser || auth.currentUser.isAnonymous)
      throw new Error("no-auth");

    const rtdb = getDatabase(); // default app
    const roomRef = ref(rtdb, "chats/global"); // global room

    onChildAdded(roomRef, (snap) => {
      const m = snap.val();
      if (!m) return;
      box.insertAdjacentHTML(
        "beforeend",
        `<div class="msg"><b>${esc(m.user)}</b>
          <span class="small muted">${new Date(
            m.ts
          ).toLocaleTimeString()}</span>
          <div>${esc(m.text)}</div>
        </div>`
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
      } catch (e) {
        console.warn(e);
        toast("Chat failed");
      }
    };
    return;
  } catch (e) {
    // fall through to local fallback
  }

  // Local-only fallback (works offline / without auth)
  const KEY = "ol_chat_local";
  const load = () => JSON.parse(localStorage.getItem(KEY) || "[]");
  const save = (a) => localStorage.setItem(KEY, JSON.stringify(a));
  const draw = (m) => {
    box.insertAdjacentHTML(
      "beforeend",
      `<div class="msg"><b>${esc(m.user)}</b>
         <span class="small muted">${new Date(m.ts).toLocaleTimeString()}</span>
         <div>${esc(m.text)}</div>
       </div>`
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
    const roomRef = ref(rtdb, `chats/${courseId}`);

    onChildAdded(roomRef, (snap) => {
      const m = snap.val();
      if (!m) return;
      list.insertAdjacentHTML(
        "beforeend",
        `<div class="msg"><b>${esc(m.user)}</b>
           <span class="small muted">${new Date(
             m.ts
           ).toLocaleTimeString()}</span>
           <div>${esc(m.text)}</div>
         </div>`
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
      } catch (e) {
        console.warn(e);
        toast("Chat failed");
      }
    };
    return;
  } catch (e) {
    // fallback to local
  }

  const KEY = "ol_chat_room_" + courseId;
  const load = () => JSON.parse(localStorage.getItem(KEY) || "[]");
  const save = (a) => localStorage.setItem(KEY, JSON.stringify(a));
  const draw = (m) => {
    list.insertAdjacentHTML(
      "beforeend",
      `<div class="msg"><b>${esc(m.user)}</b>
         <span class="small muted">${new Date(m.ts).toLocaleTimeString()}</span>
         <div>${esc(m.text)}</div>
       </div>`
    );
    list.scrollTop = list.scrollHeight;
  };
  let arr = load();
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

/* ---------- Settings ---------- */
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
$("#btn-start-final")?.addEventListener("click", (e) => {
  e.preventDefault();
  startFinal();
});

/* ---------- Boot ---------- */
document.addEventListener("DOMContentLoaded", async () => {
  // Theme / font
  applyPalette(localStorage.getItem("ol_theme") || "slate");
  applyFont(localStorage.getItem("ol_font") || "16");

  // Auth modal + restore login state
  initAuthModal();
  const u = getUser();
  setLogged(!!u, u?.email);

  // Gate chat inputs immediately + keep in sync with Firebase auth
  gateChatUI();
  if (typeof onAuthStateChanged === "function" && auth) {
    onAuthStateChanged(auth, () => gateChatUI());
  }

  // UI
  initSidebar();
  initSearch();
  initChatRealtime();

  // Data
  await loadCatalog().catch((e) => console.warn("Catalog load failed", e));
  ALL = getCourses();
  renderCatalog();
  renderAdminTable();
  renderProfilePanel();
  renderAnnouncements();

  // One-time import/export wiring
  wireAdminImportExportOnce();
});