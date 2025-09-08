/* =========================================================
   OpenLearn · Clean app.js (ESM)
   - Single role helpers (no duplicates)
   - No local ensurePayPal (imported from firebase.js)
   - Global + per-course chat (no re-declared symbols)
   - Safe DOM wiring with optional chaining
   ========================================================= */

import {
  // Firebase base (from your firebase.js ESM wrapper)
  db,
  auth,
  onAuthStateChanged,
  signInAnonymously,

  // RTDB for chat
  getDatabase,
  ref,
  push,
  onChildAdded,
  remove,

  // Optional PayPal loader (do NOT re-declare here)
  ensurePayPal,
} from "./firebase.js";

/* ---------- tiny DOM helpers ---------- */
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>\"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", "&gt;": ">", '"': "&quot;", "'": "&#39;" }[
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
    card: "#ffffff",
    muted: "#5b6b7c",
    border: "#e7eaf0",
    btnBg: "#eef2f7",
    btnFg: "#0e1320",
    btnPrimaryBg: "#2563eb",
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
};
function applyPalette(name) {
  const p = PALETTES[name] || PALETTES.slate,
    r = document.documentElement,
    map = {
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
  // Light theme extras for good contrast
  const body = document.body;
  if (name === "light") body.classList.add("light-theme");
  else body.classList.remove("light-theme");
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
// const getUser = () => _read("ol_user", null);
// const setUser = (u) => _write("ol_user", u);
const getUser  = () => JSON.parse(localStorage.getItem("ol_user") || "null");
const setUser  = (u) => localStorage.setItem("ol_user", JSON.stringify(u));

let ALL = []; // in-memory snapshot
let currentUser = null; // transient

/* ---------- role helpers (single source of truth) ---------- */
const isLogged = () => !!getUser();
const getRole = () => getUser()?.role || "student";
function isAdminLike() {
  const role = getRole();
  return (
    role === "owner" ||
    role === "admin" ||
    role === "instructor" ||
    role === "ta"
  );
}

/* ---------- router ---------- */
function showPage(id) {
  $$(".page").forEach((p) => p.classList.remove("visible"));
  $("#page-" + id)?.classList.add("visible");
  if (id === "mylearning") renderMyLearning();
  if (id === "gradebook") renderGradebook();
  if (id === "admin") renderAdminTable();
  if (id === "dashboard") renderAnnouncements();
}

/* ---------- auth modal (local demo gating UI) ---------- */
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
        <a href="#" id="linkSignup">Sign up</a><span>·</span><a href="#" id="linkForgot">Forgot password?</a>
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
function setLogged(on, email) {
  currentUser = on ? { email: email || "you@example.com" } : null;
  const btnLogin = document.getElementById("btn-login");
  const btnLogout = document.getElementById("btn-logout");
  if (btnLogin) btnLogin.style.display = on ? "none" : "";
  if (btnLogout) btnLogout.style.display = on ? "" : "none";
  document.body.classList.toggle("locked", !on);
  document.body.dataset.role = getRole();
  showPage("catalog");
  renderProfilePanel?.();
}
function initAuthModal() {
  ensureAuthModalMarkup();
  const modal = document.getElementById("authModal");
  if (!modal) return;

  const showPane = (id) => {
    ["authLogin", "authSignup", "authForgot"].forEach((x) =>
      document.getElementById(x)?.classList.add("ol-hidden")
    );
    document.getElementById(id)?.classList.remove("ol-hidden");
    modal.showModal();
  };
  window._showLoginPane = () => showPane("authLogin");

  // Topbar buttons
  document.addEventListener("click", (e) => {
    const loginBtn = e.target.closest("#btn-login");
    const logoutBtn = e.target.closest("#btn-logout");
    if (loginBtn) {
      e.preventDefault();
      showPane("authLogin");
    }
    if (logoutBtn) {
      e.preventDefault();
      setUser(null);
      setLogged(false);
      toast("Logged out");
    }
  });

  // Switch panes
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

  // Actions (local demo auth)
  $("#doLogin")?.addEventListener("click", (e) => {
    e.preventDefault();
    const em = $("#loginEmail")?.value.trim(),
      pw = $("#loginPass")?.value;
    if (!em || !pw) return toast("Fill email/password");
    setUser({ email: em, role: "student" });
    setLogged(true, em);
    modal.close();
    toast("Welcome back");
  });
  $("#doSignup")?.addEventListener("click", (e) => {
    e.preventDefault();
    const em = $("#signupEmail")?.value.trim(),
      pw = $("#signupPass")?.value;
    if (!em || !pw) return toast("Fill email/password");
    setUser({ email: em, role: "student" });
    setLogged(true, em);
    modal.close();
    toast("Account created");
  });
  $("#doForgot")?.addEventListener("click", (e) => {
    e.preventDefault();
    const em = $("#forgotEmail")?.value.trim();
    if (!em) return toast("Enter email");
    modal.close();
    toast("Reset link sent (demo)");
  });

  // Global click gate for elements that require auth
  document.addEventListener("click", (e) => {
    const gated = e.target.closest("[data-requires-auth]");
    if (gated && !isLogged()) {
      e.preventDefault();
      e.stopPropagation();
      window._showLoginPane?.();
    }
  });
}

/* ---------- sidebar (hover drawer / burger mobile) ---------- */
function initSidebar() {
  const sb = $("#sidebar"),
    burger = $("#btn-burger");
  const isMobile = () => matchMedia("(max-width:1024px)").matches;
  const setBurger = () => {
    if (burger) burger.style.display = isMobile() ? "" : "none";
  };
  setBurger();
  addEventListener("resize", setBurger);

  burger?.addEventListener("click", (e) => {
    e.stopPropagation();
    sb?.classList.toggle("show");
  });
  sb?.addEventListener("click", (e) => {
    const b = e.target.closest(".navbtn");
    if (!b) return;
    showPage(b.dataset.page);
    if (isMobile()) sb.classList.remove("show");
  });
  document.addEventListener("click", (e) => {
    if (!isMobile()) return;
    if (!sb?.classList.contains("show")) return;
    if (!e.target.closest("#sidebar") && e.target !== burger)
      sb.classList.remove("show");
  });
}

/* ---------- top search ---------- */
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

/* ---------- data (local seed) ---------- */
async function loadCatalog() {
  // in this clean build we keep a local seed; you can merge external JSON if you want
  let items = [
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
  const local = getCourses();
  const merged = [
    ...items,
    ...local.filter((l) => !items.some((ci) => ci.id === l.id)),
  ];
  setCourses(merged);
  ALL = merged;
  renderCatalog?.();
}

/* ---------- catalog / details / enroll ---------- */
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

  // actions
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

// === New Course Modal wiring ===
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btn-new-course")?.addEventListener("click", () => {
    document.getElementById("courseModal")?.showModal();
  });
  document.getElementById("courseClose")?.addEventListener("click", () => {
    document.getElementById("courseModal")?.close();
  });
  document.getElementById("courseCancel")?.addEventListener("click", () => {
    document.getElementById("courseModal")?.close();
  });
  document.getElementById("courseForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const payload = {
      id: (f.get("title") || "").toString().trim().toLowerCase().replace(/\s+/g, "-") 
          || ("c_" + Math.random().toString(36).slice(2, 9)),
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
      source: "user"
    };
    const arr = getCourses();
    arr.push(payload);
    setCourses(arr);
    document.getElementById("courseModal")?.close();

    // Refresh UI
    window.ALL = arr;
    renderCatalog?.();
    renderAdminTable?.();
    toast("Course created");
  });
});

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
  if ((c.price || 0) <= 0) return markEnrolled(id); // free
  const dlg = $("#payModal");
  $("#payTitle") && ($("#payTitle").textContent = "Checkout · " + c.title);
  const container = $("#paypal-container");
  if (container) container.innerHTML = "";
  const note = $("#paypalNote");
  if (note)
    note.textContent = window.paypal
      ? ""
      : "PayPal SDK not loaded — using simulator";
  if (window.paypal?.Buttons && container) {
    window.paypal
      .Buttons({
        createOrder: (d, a) =>
          a.order.create({
            purchase_units: [{ amount: { value: String(c.price || 0) } }],
          }),
        onApprove: async (d, a) => {
          await a.order.capture();
          markEnrolled(id);
          dlg?.close();
        },
        onCancel: () => toast("Payment cancelled"),
        onError: (err) => {
          console.error(err);
          toast("Payment error");
        },
      })
      .render(container);
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
  $("#mmkPaid")?.addEventListener("click", () => {
    markEnrolled(id);
    dlg?.close();
  });
  $("#closePay")?.addEventListener("click", () => dlg?.close());
  dlg?.showModal();
}
function openDetails(id) {
  const c =
    ALL.find((x) => x.id === id) || getCourses().find((x) => x.id === id);
  if (!c) return;
  const body = $("#detailsBody");
  const b = c.benefits ? String(c.benefits).split(/\n+/).filter(Boolean) : [];
  if (body) {
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
        handleEnroll(e.target.getAttribute("data-details-enroll"));
        dlg?.close();
      });
  }
}
$("#closeDetails")?.addEventListener("click", () =>
  $("#detailsModal")?.close()
);

/* ---------- My Learning / Reader (demo pages) ---------- */
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
async function openReader(cid) {
  const c =
    ALL.find((x) => x.id === cid) || getCourses().find((x) => x.id === cid);
  if (!c) return;
  RD = {
    cid: c.id,
    pages: SAMPLE_PAGES(c.title),
    i: 0,
    credits: c.credits || 3,
    score: 0,
  };
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
  $("#rdBookmark")?.addEventListener("click", () => toast("Bookmarked (demo)"));
  $("#rdNote")?.addEventListener("click", () => {
    const t = prompt("Note");
    if (!t) return;
    toast("Note saved");
  });
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

/* ---------- Gradebook ---------- */
function renderGradebook() {
  const tb = $("#gbTable tbody");
  if (!tb) return;
  const set = getEnrolls();
  const list = (ALL.length ? ALL : getCourses()).filter((c) => set.has(c.id));
  const rows = list.map((c) => ({
    student: currentUser?.email || "you@example.com",
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

/* ---------- Admin (table only; creation handled elsewhere) ---------- */
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
        ALL = arr;
        renderCatalog();
        renderAdminTable();
      })
  );
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
        const id = b.getAttribute("data-edit");
        const arr = getAnns();
        const i = arr.findIndex(x => x.id === id);
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
$("#btn-new-post")?.addEventListener("click", () =>
  $("#postModal")?.showModal()
);
$("#closePostModal")?.addEventListener("click", () => $("#postModal")?.close());
$("#cancelPost")?.addEventListener("click", () => $("#postModal")?.close());
$("#postForm")?.addEventListener("submit", (e) => {
  e.preventDefault();
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

/* ---------- Profile ---------- */
function renderProfilePanel() {
  const p = getProfile();
  const panel = $("#profilePanel");
  if (!panel) return;
  panel.innerHTML = `
    <div class="row" style="gap:12px">
      <img src="${esc(
        p.photoURL || "https://picsum.photos/seed/avatar/120/120"
      )}" style="width:86px;height:86px;border-radius:12px;object-fit:cover" alt="">
      <div class="grow">
        <div style="font-weight:700">${esc(p.displayName || "—")}</div>
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

/* ---------- Live Chat (global + per-course) ---------- */
async function ensureAuthForChat() {
  // You may allow anonymous chat if no logged-in user (optional)
  if (auth.currentUser) return;
  try {
    await signInAnonymously(auth);
  } catch (e) {
    console.warn("Anonymous auth failed", e);
  }
}

// GLOBAL room
function initChatRealtime() {
  const box = $("#chatBox"),
    input = $("#chatInput"),
    send = $("#chatSend");
  if (!box || !send) return;

  const display = getUser()?.email || "guest";
  try {
    const rtdb = getDatabase?.(db.app);
    if (rtdb) {
      const roomRef = ref(rtdb, "chats/global");

      onChildAdded(roomRef, (snap) => {
        const m = snap.val();
        if (!m) return;
        box.insertAdjacentHTML(
          "beforeend",
          `<div class="msg"><b>${esc(
            m.user
          )}</b> <span class="small muted">${new Date(
            m.ts
          ).toLocaleTimeString()}</span><div>${esc(m.text)}</div></div>`
        );
        box.scrollTop = box.scrollHeight;
      });

      send.addEventListener("click", async () => {
        const text = input?.value.trim();
        if (!text) return;
        try {
          await ensureAuthForChat();
          const uid = auth.currentUser?.uid || "nouid";
          await push(roomRef, { uid, user: display, text, ts: Date.now() });
          if (input) input.value = "";
        } catch (e) {
          console.warn(e);
          toast("Chat failed");
        }
      });

      return; // RTDB branch done
    }
  } catch {}

  // Fallback (localStorage)
  const KEY = "ol_chat_local";
  const load = () => JSON.parse(localStorage.getItem(KEY) || "[]");
  const save = (a) => localStorage.setItem(KEY, JSON.stringify(a));
  const draw = (m) => {
    box.insertAdjacentHTML(
      "beforeend",
      `<div class="msg"><b>${esc(
        m.user
      )}</b> <span class="small muted">${new Date(
        m.ts
      ).toLocaleTimeString()}</span><div>${esc(m.text)}</div></div>`
    );
    box.scrollTop = box.scrollHeight;
  };
  let arr = load();
  arr.forEach(draw);
  send.addEventListener("click", () => {
    const text = input?.value.trim();
    if (!text) return;
    const m = { user: display, text, ts: Date.now() };
    arr.push(m);
    save(arr);
    draw(m);
    if (input) input.value = "";
  });
}

// PER-COURSE room (call this when you open a reader: wireCourseChatRealtime(courseId))
function wireCourseChatRealtime(courseId) {
  const list = $("#ccList"),
    input = $("#ccInput"),
    send = $("#ccSend"),
    label = $("#chatRoomLabel");
  if (!list || !send) return;
  if (label) label.textContent = "room: " + courseId;

  const display = getUser()?.email || "you";
  try {
    const rtdb = getDatabase?.(db.app);
    if (rtdb) {
      const roomRef = ref(rtdb, `chats/${courseId}`);

      onChildAdded(roomRef, (snap) => {
        const m = snap.val();
        if (!m) return;
        list.insertAdjacentHTML(
          "beforeend",
          `<div class="msg"><b>${esc(
            m.user
          )}</b> <span class="small muted">${new Date(
            m.ts
          ).toLocaleTimeString()}</span><div>${esc(m.text)}</div></div>`
        );
        list.scrollTop = list.scrollHeight;
      });

      send.addEventListener("click", async () => {
        const text = (input?.value || "").trim();
        if (!text) return;
        try {
          await ensureAuthForChat();
          const uid = auth.currentUser?.uid || "nouid";
          await push(roomRef, { uid, user: display, text, ts: Date.now() });
          input && (input.value = "");
        } catch (e) {
          console.warn(e);
          toast("Chat failed");
        }
      });

      // Optional: admin delete (click a message to remove if you add keys & rules)
      return;
    }
  } catch {}

  // Fallback per-course (local)
  const KEY = "ol_chat_room_" + courseId;
  const load = () => JSON.parse(localStorage.getItem(KEY) || "[]");
  const save = (a) => localStorage.setItem(KEY, JSON.stringify(a));
  const draw = (m) => {
    list.insertAdjacentHTML(
      "beforeend",
      `<div class="msg"><b>${esc(
        m.user
      )}</b> <span class="small muted">${new Date(
        m.ts
      ).toLocaleTimeString()}</span><div>${esc(m.text)}</div></div>`
    );
    list.scrollTop = list.scrollHeight;
  };
  let arr = load();
  list.innerHTML = "";
  arr.forEach(draw);
  send.addEventListener("click", () => {
    const text = (input?.value || "").trim();
    if (!text) return;
    const m = { user: display, text, ts: Date.now() };
    arr.push(m);
    save(arr);
    draw(m);
    if (input) input.value = "";
  });
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

/* ---------- Topbar pills ---------- */
$("#btn-top-ann")?.addEventListener("click", () => showPage("dashboard"));
$("#btn-top-final")?.addEventListener("click", () => showPage("finals"));

/* ---------- Boot ---------- */
document.addEventListener("DOMContentLoaded", async () => {
  // theme/font (instant)
  applyPalette(localStorage.getItem("ol_theme") || "slate");
  applyFont(localStorage.getItem("ol_font") || "16");

  // Auth modal + restore login state
  initAuthModal();
  const u = getUser();
  setLogged(!!u, u?.email);

  // UI features
  initSidebar();
  initSearch();
  initChatRealtime(); // global chat ready (safe no-op if DOM absent)

  // Data
  await loadCatalog().catch((e) => console.warn("Catalog load failed", e));
  ALL = getCourses();
  renderCatalog();
  renderAdminTable();
  renderProfilePanel();

  // Hints
  $("#btn-top-ann") && ($("#btn-top-ann").title = "Open Announcements");
  $("#btn-top-final") && ($("#btn-top-final").title = "Open Final Exam");
});
