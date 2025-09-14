/* =========================================================
   OpenLearn · app.js (Final)
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

/* ----- safe no-op stubs to avoid "is not defined" in Firefox boot races ----- */
[
  "renderProfilePanel",
  "renderMyLearning",
  "renderGradebook",
  "renderAdminTable",
  "renderAnnouncements",
].forEach((fn) => {
  if (!(fn in window)) window[fn] = () => {};
});

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
};
function applyPalette(name = "slate") {
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
const getUser = () => JSON.parse(localStorage.getItem("ol_user") || "null");
const setUser = (u) => localStorage.setItem("ol_user", JSON.stringify(u));

/* ---------- roles ---------- */
const isLogged = () => !!getUser();
const getRole = () => getUser()?.role || "student";
const isAdminLike = () =>
  ["owner", "admin", "instructor", "ta"].includes(getRole());

/* ---------- globals ---------- */
let ALL = [];
let currentUser = null;

/* ---------- Firestore enroll sync ---------- */
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
async function saveEnrollsCloud(set) {
  if (!db) {
    renderCatalog();
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
    console.warn("saveEnrollsCloud failed:", e?.message || e);
  }
}
async function syncEnrollsBothWays() {
  if (!db) {
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
    console.warn("syncEnrollsBothWays failed:", e?.message || e);
  }
  renderCatalog();
  window.renderMyLearning?.();
}

/* ---------- Data: catalog resolve/load ---------- */
const DATA_BASE_CANDIDATES = ["/data", "./data", "/public/data", "data"];
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

/* ---------- Catalog render ---------- */
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

  // categories
  const sel = $("#filterCategory");
  if (sel) {
    const cats = [...new Set(ALL.map((c) => c.category || ""))]
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
["filterCategory", "filterLevel", "sortBy"].forEach((id) =>
  document.getElementById(id)?.addEventListener("change", renderCatalog)
);

/* ---------- Enroll / Details / Pay ---------- */
function markEnrolled(id) {
  const s = getEnrolls();
  s.add(id);
  setEnrolls(s);
  saveEnrollsCloud(s);
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
  openPay(c);
}
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
  const dlg = $("#payModal");
  if (dlg && typeof dlg.close === "function") dlg.close();
  const container = $("#paypal-container");
  if (container) container.innerHTML = "";
}
async function openPay(course) {
  const dlg = $("#payModal");
  if (!dlg) return;
  dlg.showModal();
  const closeBtn = $("#closePay");
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
  const mmkBtn = $("#mmkPaid");
  if (mmkBtn && !mmkBtn._wired) {
    mmkBtn._wired = true;
    mmkBtn.addEventListener("click", () => {
      toast("Payment recorded (MMK)");
      markEnrolled(course.id);
      closePayModal();
    });
  }
}
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
  const dlg = $("#detailsModal");
  if (!dlg) return;
  const inner = $("#detailsInner");
  const c = { ...base, ...(meta || {}) };
  inner.innerHTML = `
    <div class="stack">
      <img class="course-cover" src="${esc(
        c.image || `https://picsum.photos/seed/${c.id}/640/360`
      )}" alt="">
      <div><b>${esc(c.title)}</b></div>
      <div class="muted">${esc(c.category || "")} • ${esc(
    c.level || ""
  )} • ★ ${Number(c.rating || 4.6).toFixed(1)}</div>
      <div>${esc(c.summary || c.description || "")}</div>
      <div class="row" style="justify-content:flex-end; gap:8px;">
        <button class="btn" id="detailsEnroll" data-id="${c.id}">Enroll</button>
      </div>
    </div>`;
  $("#detailsEnroll")?.addEventListener("click", () => handleEnroll(c.id));
  $("#btn-details-close")?.addEventListener("click", () => dlg.close());
  $("#btn-details-cancel")?.addEventListener("click", () => dlg.close());
  dlg.showModal();
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
        <button class="btn small" data-edit="${
          a.id
        }" data-requires-auth>Edit</button>
        <button class="btn small" data-del="${
          a.id
        }" data-requires-auth>Delete</button>
      </div>
    </div>`
      )
      .join("") || `<div class="muted">No announcements yet.</div>`;
  wireAnnouncementEditButtons();
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
  if (!t || !b) {
    toast("Fill all fields");
    return;
  }
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

/* ---------- Search ---------- */
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
  $("#topSearchIcon")?.addEventListener("click", apply);
}

/* ---------- Sidebar ---------- */
function initSidebar() {
  const sb = $("#sidebar"),
    burger = $("#btn-burger");
  const mqNarrow = matchMedia("(max-width:1024px)");
  const isMobile = () => mqNarrow.matches;

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
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  document.addEventListener("click", (e) => {
    if (!isMobile()) return;
    if (!sb?.classList.contains("show")) return;
    if (!e.target.closest("#sidebar") && e.target !== burger)
      sb.classList.remove("show");
  });
}

/* ---------- Topbar buttons ---------- */
function initTopbar() {
  $("#btn-top-ann")?.addEventListener("click", () => showPage("dashboard"));
  $("#btn-top-chat")?.addEventListener("click", gotoLiveChat);
  $("#btn-side-chat")?.addEventListener("click", gotoLiveChat);
}

/* ---------- Auth Modal ---------- */
function ensureAuthModal() {
  if ($("#authModal")) return;
  document.body.insertAdjacentHTML(
    "beforeend",
    `
    <dialog id="authModal" class="ol-modal auth-modern">
      <div class="auth-brand">🎓 OpenLearn</div>
      <form id="authLogin" class="authpane" method="dialog">
        <label>Email</label><input id="loginEmail" class="input" type="email" placeholder="you@example.com" required/>
        <label>Password</label><input id="loginPass" class="input" type="password" placeholder="••••••••" required/>
        <button class="btn primary wide" id="doLogin" type="submit">Login</button>
        <div class="auth-links"><a href="#" id="linkSignup">Sign up</a><span>·</span><a href="#" id="linkForgot">Forgot password?</a></div>
      </form>
      <form id="authSignup" class="authpane ol-hidden" method="dialog">
        <div class="h4" style="margin-bottom:6px">Create Account</div>
        <label>Email</label><input id="signupEmail" class="input" type="email" placeholder="you@example.com" required/>
        <label>Password</label><input id="signupPass" class="input" type="password" placeholder="Choose a password" required/>
        <button class="btn primary wide" id="doSignup" type="submit">Create account</button>
        <div class="auth-links"><a href="#" id="backToLogin1">Back to login</a></div>
      </form>
      <form id="authForgot" class="authpane ol-hidden" method="dialog">
        <div class="h4" style="margin-bottom:6px">Reset Password</div>
        <label>Email</label><input id="forgotEmail" class="input" type="email" placeholder="you@example.com" required/>
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
  try {
    window.renderProfilePanel?.();
  } catch {}
}
function initAuthModal() {
  ensureAuthModal();
  const modal = $("#authModal");
  const showPane = (id) => {
    ["authLogin", "authSignup", "authForgot"].forEach((x) =>
      $("#" + x)?.classList.add("ol-hidden")
    );
    $("#" + id)?.classList.remove("ol-hidden");
    modal.showModal();
  };
  window._showLoginPane = () => showPane("authLogin");

  $("#btn-login")?.addEventListener("click", (e) => {
    e.preventDefault();
    showPane("authLogin");
  });
  $("#btn-logout")?.addEventListener("click", async (e) => {
    e.preventDefault();
    try {
      await signOut(auth);
    } catch {}
    setUser(null);
    setLogged(false);
    gateChatUI();
    toast("Logged out");
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
      toast("Welcome!");
      await syncEnrollsBothWays();
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
      await syncEnrollsBothWays();
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

  // gate clicks
  document.addEventListener("click", (e) => {
    const gated = e.target.closest("[data-requires-auth]");
    if (gated && !isLogged()) {
      e.preventDefault();
      e.stopPropagation();
      window._showLoginPane?.();
    }
  });
}

/* ---------- Chat (global) ---------- */
const CHAT_KEY = "ol_chat_local";
let _chatWired = false;

function getLocalChats() {
  try {
    return JSON.parse(localStorage.getItem(CHAT_KEY) || "[]");
  } catch {
    return [];
  }
}
function setLocalChats(arr) {
  localStorage.setItem(CHAT_KEY, JSON.stringify(arr || []));
}

// Unread badge based on local mirror
function updateChatBadge() {
  const pill = document.getElementById("btn-top-chat");
  if (!pill) return;
  let badge =
    document.getElementById("chatCount") || pill.querySelector(".badge");
  const lastSeen = +(localStorage.getItem("ol_chats_lastSeen") || 0);

  let arr = [];
  try {
    arr = JSON.parse(localStorage.getItem("ol_chat_local") || "[]");
  } catch {}
  const unread = arr.filter((m) => +m.ts > lastSeen).length;

  if (!badge) {
    badge = document.createElement("span");
    badge.id = "chatCount";
    badge.className = "badge";
    badge.style.cssText = `
      display:inline-flex; align-items:center; justify-content:center;
      min-width:18px; height:18px; padding:0 5px; margin-left:6px;
      border-radius:999px; font-size:12px; background:#ef4444; color:#fff; line-height:1;
    `;
    pill.appendChild(badge);
  }
  badge.textContent = unread > 0 ? String(unread) : "";
  badge.style.display = unread > 0 ? "inline-flex" : "none";
}

// Route helper
function gotoLiveChat() {
  showPage("livechat");
  // mark read now that user visited
  localStorage.setItem("ol_chats_lastSeen", Date.now().toString());
  updateChatBadge();
}

// Wire buttons (topbar + sidebar) once DOM ready
document.addEventListener("DOMContentLoaded", () => {
  document
    .getElementById("btn-top-chat")
    ?.addEventListener("click", gotoLiveChat);
  document
    .getElementById("btn-side-chat")
    ?.addEventListener("click", gotoLiveChat);

  // storage events from other tabs
  window.addEventListener("storage", (e) => {
    if (e.key === "ol_chat_local" || e.key === "ol_chats_lastSeen")
      updateChatBadge();
  });

  // boot badge
  updateChatBadge();
});

function prepareLiveChatPage() {
  if (!_chatWired) initChatRealtime();
  setTimeout(() => {
    $("#chatInput")?.focus();
    const box = $("#chatBox");
    if (box) box.scrollTop = box.scrollHeight;
  }, 0);
}
function watchChatBoxBadge() {
  const box = $("#chatBox");
  if (!box) return;
  const mo = new MutationObserver(updateChatBadge);
  mo.observe(box, { childList: true });
  updateChatBadge();
}
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
  // Prevent duplicate bindings when navigating to livechat many times
  if (window._chatInitDone) {
    // still refresh the badge & focus/scroll if DOM exists
    try {
      updateChatBadge();
    } catch {}
    const box = document.getElementById("chatBox");
    if (box) box.scrollTop = box.scrollHeight;
    return;
  }

  const box = $("#chatBox"),
    input = $("#chatInput"),
    send = $("#chatSend");
  if (!box || !send) return; // page not visible yet
  const display = getUser()?.email || "guest";

  // helper: local mirror store (used for unread badge)
  const CHAT_KEY = "ol_chat_local";
  const getLocal = () => {
    try {
      return JSON.parse(localStorage.getItem(CHAT_KEY) || "[]");
    } catch {
      return [];
    }
  };
  const setLocal = (a) =>
    localStorage.setItem(CHAT_KEY, JSON.stringify(a || []));
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

  // Try RTDB first
  let rtdbUnsub = null;
  try {
    if (!auth?.currentUser || auth.currentUser.isAnonymous)
      throw new Error("no-auth");
    const rtdb = getDatabase();
    const roomRef = ref(rtdb, "chats/global");

    rtdbUnsub = onChildAdded(roomRef, (snap) => {
      const m = snap.val();
      if (!m) return;
      draw(m);

      // mirror to local to power unread badge
      const arr = getLocal();
      const sig = `${m.ts}|${m.user}|${m.text}`;
      const exists = arr.some((x) => `${x.ts}|${x.user}|${x.text}` === sig);
      if (!exists) {
        arr.push({ user: m.user, text: m.text, ts: m.ts });
        setLocal(arr);
      }
      updateChatBadge();
    });

    send.onclick = async () => {
      const text = (input?.value || "").trim();
      if (!text) return;
      if (!auth.currentUser || auth.currentUser.isAnonymous) {
        toast("Please login to chat");
        return;
      }
      const msg = {
        uid: auth.currentUser.uid,
        user: auth.currentUser.email || "user",
        text,
        ts: Date.now(),
      };
      try {
        await push(roomRef, msg);
        // local mirror for instant badge in this tab
        const arr = getLocal();
        arr.push({ user: msg.user, text: msg.text, ts: msg.ts });
        setLocal(arr);
        updateChatBadge();
        if (input) input.value = "";
      } catch {
        toast("Chat failed");
      }
    };
  } catch {
    // Local-only fallback
    const arr = getLocal();
    arr.forEach(draw);
    send.onclick = () => {
      const text = (input?.value || "").trim();
      if (!text) return;
      const m = { user: display, text, ts: Date.now() };
      const a = getLocal();
      a.push(m);
      setLocal(a);
      draw(m);
      updateChatBadge();
      if (input) input.value = "";
    };
  }

  // Observe #chatBox once for badge-by-DOM option
  try {
    watchChatBoxBadge?.();
  } catch {}

  window._chatInitDone = true;
}

/* ---------- Router (single source of truth) ---------- */
function showPage(id, push = true) {
  $$(".page").forEach((p) => p.classList.remove("visible"));
  $("#page-" + id)?.classList.add("visible");

  $$("#sidebar .navbtn").forEach((b) =>
    b.classList.toggle("active", b.dataset.page === id)
  );

  if (id === "mylearning") window.renderMyLearning?.();
  if (id === "gradebook") window.renderGradebook?.();
  if (id === "admin") window.renderAdminTable?.();
  if (id === "dashboard") window.renderAnnouncements?.();
  if (id === "livechat") {
    // bind once (guarded inside initChatRealtime)
    setTimeout(() => {
      initChatRealtime();
      gateChatUI();
      document.getElementById("chatInput")?.focus();
      const box = document.getElementById("chatBox");
      if (box) box.scrollTop = box.scrollHeight;
    }, 0);
  }

  if (push) history.pushState({ page: id }, "", "#" + id);
}
addEventListener("popstate", (e) => {
  const p = e.state?.page || location.hash.replace("#", "") || "catalog";
  showPage(p, false);
});

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btn-top-ann")?.addEventListener("click", () => {
    showPage("dashboard"); // <-- open dashboard page
    window.renderAnnouncements?.();
  });
});

/* ---------- Boot ---------- */
document.addEventListener("DOMContentLoaded", async () => {
  // Theme
  applyPalette(localStorage.getItem("ol_theme") || "slate");
  applyFont(+localStorage.getItem("ol_font") || 16);

  // UI
  initSidebar();
  initTopbar();
  initSearch();

  // Auth modal
  initAuthModal();

  // Initial page
  showPage(location.hash.replace("#", "") || "catalog", false);

  // Data
  await loadCatalog();
  await syncEnrollsBothWays();

  // Gate chat inputs initially
  gateChatUI();

  // Firebase auth state → keep gating in sync
  if (typeof onAuthStateChanged === "function" && auth) {
    onAuthStateChanged(auth, async (u) => {
      setLogged(!!u, u?.email);
      gateChatUI();
      await syncEnrollsBothWays();
      window.renderProfilePanel?.();
      window.renderMyLearning?.();
      window.renderGradebook?.();
    });
  }

  // New Course modal wiring
  const newCourseBtn = $("#btn-new-course");
  const courseModal = $("#courseModal");
  const closeBtn = $("#btn-course-close");
  const cancelBtn = $("#btn-course-cancel");
  const saveBtn = $("#btn-course-save");

  newCourseBtn?.addEventListener("click", () => courseModal?.showModal());
  closeBtn?.addEventListener("click", () => courseModal?.close());
  cancelBtn?.addEventListener("click", () => courseModal?.close());
  saveBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    const t = $("#cTitle")?.value.trim();
    if (!t) return toast("Please enter a title");
    const c = {
      id: t.toLowerCase().replace(/\s+/g, "-"),
      title: t,
      category: $("#cCat")?.value || "",
      level: $("#cLvl")?.value || "",
      price: +($("#cPrice")?.value || 0),
      summary: $("#cSummary")?.value || "",
    };
    const all = getCourses();
    if (!all.some((x) => x.id === c.id)) all.push(c);
    setCourses(all);
    ALL = all;
    renderCatalog();
    toast("Saved");
    courseModal?.close();
  });
});

/* ---------- Export debug helpers (optional) ---------- */
Object.assign(window, {
  renderAnnouncements,
  renderCatalog,
  showPage,
  initChatRealtime,
  gotoLiveChat,
  updateChatBadge,
});
