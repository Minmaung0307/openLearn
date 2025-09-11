/* =========================================================
   OpenLearn · app.js (Clean, Finals removed)
   Part 1/5 — Imports, helpers, theme, state, roles
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

/* ---------- responsive theme / font ---------- */
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

/* =========================================================
   Part 2/5 — Data loaders, catalog, sidebar/topbar, search
   ========================================================= */

/* ---------- data base resolver ---------- */
const DATA_BASE_CANDIDATES = ["/data", "./data", "data"];
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
  DATA_BASE = null; // use seed
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
      const url = `${DATA_BASE}/catalog.json`;
      const r = await fetch(url, { cache: "no-cache" });
      if (r.ok) {
        const cat = await r.json();
        items = cat?.items || [];
      }
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

  // Build categories safely every time to avoid race
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

  grid.querySelectorAll("[data-enroll]").forEach(
    (b) => (b.onclick = () => handleEnroll(b.getAttribute("data-enroll")))
  );
  grid.querySelectorAll("[data-details]").forEach(
    (b) => (b.onclick = () => openDetails(b.getAttribute("data-details")))
  );
}

// default filter dropdown before data arrives
document.addEventListener("DOMContentLoaded", () => {
  const catSel = $("#filterCategory");
  if (catSel && !catSel.options.length) {
    catSel.innerHTML = `<option value="">All Categories</option>`;
  }
});
["filterCategory", "filterLevel", "sortBy"].forEach((id) =>
  document.getElementById(id)?.addEventListener("change", renderCatalog)
);

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

/* =========================================================
   Part 3/5 — Auth, catalog actions, details, profile, reader
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

  // NEW: flip body flags so CSS can react
  document.body.classList.toggle("logged", !!on);
  document.body.classList.toggle("anon", !on);
  
  renderProfilePanel?.();
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

  // open login when a gated control is hit
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
  toast("Demo checkout — marking as enrolled");
  markEnrolled(id);
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
  body.querySelector("[data-details-close]")?.addEventListener("click", () =>
    dlg?.close()
  );
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

/* ---------- Profile panel (safe no-op if element missing) ---------- */
function renderProfilePanel() {
  const box = $("#profilePanel");
  if (!box) return;
  const p = getProfile();
  const name = p.displayName || getUser()?.email || "Guest";
  const avatar = p.photoURL || "https://i.pravatar.cc/80?u=openlearn";
  const skills = (p.skills || "").toString();

  box.innerHTML = `
    <div class="row" style="gap:12px;align-items:flex-start">
      <img src="${esc(avatar)}" alt="" style="width:72px;height:72px;border-radius:50%">
      <div class="grow">
        <div class="h4" style="margin:.1rem 0">${esc(name)}</div>
        ${
          p.bio
            ? `<div class="muted" style="margin:.25rem 0">${esc(p.bio)}</div>`
            : ""
        }
        ${skills ? `<div class="small muted">Skills: ${esc(skills)}</div>` : ""}
        ${p.links ? `<div class="small muted">Links: ${esc(p.links)}</div>` : ""}
        ${
          p.social
            ? `<div class="small muted">Social: ${esc(p.social)}</div>`
            : ""
        }
      </div>
    </div>`;
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
    html: `<h3>Quiz 1</h3><p>Q1) Short answer</p><input id="q1" class="input" placeholder="Your answer"><div style="margin-top:8px"><button class="btn" id="qSubmit">Submit</button> <span id="qMsg" class="small muted"></span></div>`,
  },
  {
    type: "project",
    html: `<h3>Mini Project</h3><input type="file"><p class="small muted">Upload your work (demo).</p>`,
  },
];
let RD = { cid: null, pages: [], i: 0, credits: 0 };

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
  grid.querySelectorAll("[data-read]").forEach(
    (b) => (b.onclick = () => openReader(b.getAttribute("data-read")))
  );
}
async function openReader(cid) {
  const c =
    ALL.find((x) => x.id === cid) || getCourses().find((x) => x.id === cid);
  if (!c) return toast("Course not found");

  // (simple) demo pages
  const pages = SAMPLE_PAGES(c.title);
  const credits = c.credits || 3;

  RD = { cid: c.id, pages, i: 0, credits };

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
  const off = wireCourseChatRealtime(c.id);
  if (typeof off === "function") window._ccOff = off;
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
  if (btn) btn.onclick = () => (msg ? (msg.textContent = "Submitted ✔️") : 0);
}

/* =========================================================
   Part 4/5 — Gradebook, Admin, Announcements, Import/Export, Chat
   ========================================================= */

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
      </tr>`
      )
      .join("") || "<tr><td colspan='7' class='muted'>No courses</td></tr>";

  // Delete
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

  // View / edit
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
$("#btn-new-post")?.addEventListener("click", () => {
  const f = $("#postForm");
  f?.reset();
  if (f) f.dataset.editId = "";
  $("#postModal .modal-title").textContent = "New Announcement";
  $("#postModal")?.showModal();
});
$("#closePostModal")?.addEventListener("click", () =>
  $("#postModal")?.close()
);
$("#cancelPost")?.addEventListener("click", () =>
  $("#postModal")?.close()
);
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
    const roomRef = ref(rtdb, "chats/global");

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

/* =========================================================
   Part 5/5 — Settings, Boot, Finals Removal Shim
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

  // Gate chat inputs and keep in sync
  gateChatUI();
  if (typeof onAuthStateChanged === "function" && auth) {
    onAuthStateChanged(auth, () => gateChatUI());
  }

  // UI
  initSidebar();
  initSearch();
  initChatRealtime();

  // Data
  await loadCatalog().catch(() => {});
  ALL = getCourses();
  renderCatalog();
  renderAdminTable();
  renderProfilePanel?.();
  renderAnnouncements();

  // One-time import/export wiring
  wireAdminImportExportOnce();

  // Remove Finals from UI if present (robust no-op if missing)
  stripFinalsUI();

  // keep auth-required items clickable (defensive)
document.querySelectorAll("[data-requires-auth]").forEach(el => {
  el.style.pointerEvents = "auto";
});
});

/* ---------- Finals Removal Shim ---------- */
function stripFinalsUI() {
  // Top pill
  $("#btn-top-final")?.remove();
  // Sidebar nav item
  $$(`#sidebar .navbtn[data-page="finals"]`).forEach((b) => b.remove());
  // Finals page/section + modal
  $("#page-finals")?.remove();
  $("#finalModal")?.remove();
  // Any stray click handlers (defensive)
  document.querySelectorAll('[data-page="finals"]').forEach((n) => n.remove());
}