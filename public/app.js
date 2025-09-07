/* =========================================================
   OpenLearn · Modern Lite (Local-first demo)
   ========================================================= */
import {
  db, // from firebase.js
  collection, addDoc, serverTimestamp,
  query, orderBy, limit, onSnapshot,
  ensurePayPal
} from "./firebase.js";

/* ---------- Realtime Chat (per-course room) ---------- */
// Requires firebase.js exports: getDatabase, ref, push, onChildAdded
import { getDatabase, ref, push, onChildAdded } from "./firebase.js";

const RTDB = () => {
  try { return getDatabase(); } catch { return null; }
};

let chatDetach = null;       // to unbind listener
let chatRoomCid = null;      // current courseId
let IN_FINAL_MODE = false;   // disable chat while taking final

// simple client-side slow-mode (2s)
let lastSend = 0;

function mountChatRoom(courseId, userEmail) {
  if (!RTDB()) { $("#chatHint").textContent = "Chat offline (RTDB not available)"; return; }

  chatRoomCid = courseId;
  $("#chatRoomLabel").textContent = `room: ${courseId}`;
  $("#chatList").innerHTML = "";
  $("#chatHint").textContent = "Be respectful. Messages visible to all enrolled students in this course.";

  const db = RTDB();
  const roomRef = ref(db, `chats/${courseId}`);

  // detach old
  if (chatDetach) { chatDetach(); chatDetach = null; }

  // live stream
  chatDetach = onChildAdded(roomRef, (snap) => {
    const m = snap.val();
    const el = document.createElement("div");
    el.className = "msg";
    el.innerHTML = `<b>${esc(m.user)}</b> <span class="small muted">${new Date(m.ts).toLocaleTimeString()}</span><div>${esc(m.text)}</div>`;
    $("#chatList").appendChild(el);
    $("#chatList").scrollTop = $("#chatList").scrollHeight;
  });

  // send
  $("#chatSend").onclick = async () => {
    const now = Date.now();
    if (IN_FINAL_MODE) return toast("Chat disabled during Final");
    if (now - lastSend < 2000) return toast("Slow down…");
    const input = $("#chatInput");
    const text = (input.value || "").trim();
    if (!text) return;
    lastSend = now;

    try {
      await push(roomRef, {
        uid: (getUser()?.uid || ""),
        user: userEmail || (getUser()?.email || "student"),
        text,
        ts: now
      });
      input.value = "";
    } catch (e) {
      console.error(e);
      toast("Failed to send");
    }
  };
}

function unmountChatRoom() {
  if (chatDetach) { chatDetach(); chatDetach = null; }
  $("#chatList") && ($("#chatList").innerHTML = "");
  $("#chatRoomLabel") && ($("#chatRoomLabel").textContent = "room: —");
}

/* Hook into your existing reader */
const _openReader = openReader; // keep reference if you already defined it
openReader = async function (cid) {
  // call original
  await _openReader.call(this, cid);

  // when reader opens → join course room
  const email = getUser()?.email || currentUser?.email || "student";
  mountChatRoom(cid, email);
};

/* When leaving reader (back button), call unmount */
const _renderPageBack = document.getElementById("rdBack")?.onclick;
document.getElementById("rdBack") && (document.getElementById("rdBack").onclick = () => {
  unmountChatRoom();
  _renderPageBack?.();
});

/* Disable chat during Final (your existing final start/finish hooks) */
const _startFinal = startFinal;
startFinal = function () {
  IN_FINAL_MODE = true;     // lock
  $("#courseChat")?.classList.add("hidden");
  return _startFinal.call(this);
};

// After final closes (in your submit/cancel handlers), flip it back:
function endFinalMode() {
  IN_FINAL_MODE = false;
  $("#courseChat")?.classList.remove("hidden");
}
// Example: call endFinalMode() right before/after you close #finalModal
// in both submit success and cancel paths.

/* ---------- helpers ---------- */
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));
// const esc = (s)=> String(s??"").replace(/[&<>\"']/g, c=>({"&":"&amp;","<":"&lt;","&gt;":">","\"":"&quot;","'":"&#39;"}[c]));
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[c])
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

/* ---------- theme / font ---------- */
const PALETTES = {
  dark: {
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
}
function applyFont(px) {
  document.documentElement.style.setProperty("--fontSize", (px || 16) + "px");
}

/* ---------- state ---------- */
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
const getUser = () => read("ol_user", null);
const setUser = (u) => write("ol_user", u);
let ALL = [];

/* ---------- router ---------- */
function showPage(id) {
  $$(".page").forEach((p) => p.classList.remove("visible"));
  $("#page-" + id)?.classList.add("visible");
  if (id === "mylearning") renderMyLearning();
  if (id === "gradebook") renderGradebook();
  if (id === "admin") renderAdminTable();
  if (id === "dashboard") renderAnnouncements();
}

/* ---------- auth (local) ---------- */
let currentUser = null;
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
  window.currentUser = on ? { email: email || "you@example.com" } : null;
  const btnLogin = document.getElementById("btn-login");
  const btnLogout = document.getElementById("btn-logout");
  if (btnLogin) btnLogin.style.display = on ? "none" : "";
  if (btnLogout) btnLogout.style.display = on ? "" : "none";
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

  $("#doLogin")?.addEventListener("click", (e) => {
    e.preventDefault();
    const em = $("#loginEmail")?.value.trim(),
      pw = $("#loginPass")?.value;
    if (!em || !pw) return toast("Fill email/password");
    setUser({ email: em });
    setLogged(true, em);
    modal.close();
    toast("Welcome back");
  });
  $("#doSignup")?.addEventListener("click", (e) => {
    e.preventDefault();
    const em = $("#signupEmail")?.value.trim(),
      pw = $("#signupPass")?.value;
    if (!em || !pw) return toast("Fill email/password");
    setUser({ email: em });
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
}

/* ===== Topbar scroll reveal (hide on down, show on up) ===== */
function initTopbarReveal() {
  const tb = document.querySelector(".topbar");
  if (!tb) return;
  let lastY = window.scrollY,
    ticking = false;
  const onScroll = () => {
    const y = window.scrollY;
    if (y > lastY + 6) tb.classList.add("hide"); // scroll down
    else if (y < lastY - 6) tb.classList.remove("hide"); // scroll up
    lastY = y;
    ticking = false;
  };
  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        window.requestAnimationFrame(onScroll);
        ticking = true;
      }
    },
    { passive: true }
  );
}

/* ===== Keep burger left of logo (mobile), and ensure main clears topbar ===== */
function initTopbarLayout() {
  // move burger to be before logo (if not already)
  const row = document.querySelector(".topbar-row");
  const burger = document.getElementById("btn-burger");
  const logo =
    document.getElementById("logo") || document.querySelector(".logo");
  if (row && burger && logo) {
    if (burger.nextElementSibling !== logo) {
      row.insertBefore(burger, logo); // burger | logo | search | pills | auth
    }
  }
  // recalc content offset (in case topbar height differs by theme)
  const main = document.getElementById("main");
  const setPad = () => {
    const h =
      document.querySelector(".topbar")?.getBoundingClientRect().height || 64;
    if (main) main.style.paddingTop = `calc(${Math.round(h)}px + 18px)`;
  };
  setPad();
  addEventListener("resize", setPad);
  const h =
    document.querySelector(".topbar")?.getBoundingClientRect().height || 64;
  if (main) main.style.paddingTop = `calc(${Math.round(h)}px + 16px)`;
  window.addEventListener("resize", () => {
    const h2 =
      document.querySelector(".topbar")?.getBoundingClientRect().height || 64;
    if (main) main.style.paddingTop = `calc(${Math.round(h2)}px + 16px)`;
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

/* ---------- search ---------- */
function initSearch() {
  const wrap = document.getElementById("topSearchWrap");
  const toggle = document.getElementById("topSearchToggle");
  const input = document.getElementById("topSearch");

  const apply = () => {
    const q = (input?.value || "").toLowerCase().trim();
    showPage("catalog");
    document.querySelectorAll("#courseGrid .card.course").forEach((card) => {
      const t = (card.dataset.search || "").toLowerCase();
      card.style.display = !q || t.includes(q) ? "" : "none";
    });
  };

  // live filter
  input?.addEventListener("input", apply);
  input?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") apply();
    if (e.key === "Escape") document.body.classList.remove("search-open");
  });

  // mobile: open/close search
  toggle?.addEventListener("click", (e) => {
    e.preventDefault();
    document.body.classList.toggle("search-open");
    if (document.body.classList.contains("search-open"))
      setTimeout(() => input?.focus(), 0);
  });
  // click outside closes
  document.addEventListener("click", (e) => {
    if (!document.body.classList.contains("search-open")) return;
    if (e.target.closest("#topSearchWrap") || e.target.id === "topSearch")
      return;
    document.body.classList.remove("search-open");
  });
}
// function initSearch(){
//   const input=$("#topSearch");
//   const apply=()=>{
//     const q=(input?.value||"").toLowerCase().trim();
//     showPage("catalog");
//     $("#courseGrid")?.querySelectorAll(".card.course").forEach(card=>{
//       const t=(card.dataset.search||"").toLowerCase();
//       card.style.display = !q || t.includes(q) ? "" : "none";
//     });
//   };
//   input?.addEventListener("keydown", e=>{ if(e.key==="Enter") apply(); });
// }

/* ---------- data loaders (supports /data or /public/data) ---------- */
const DATA_BASE_CANDIDATES = ["data", "./data", "./public/data", "/data"];
let DATA_BASE = null;
// async function resolveDataBase() {
//   for (const base of DATA_BASE_CANDIDATES) {
//     try { const r=await fetch(`${base}/catalog.json`,{cache:'no-cache'}); if(r.ok){ DATA_BASE=base; return; } } catch{}
//   }
//   DATA_BASE='/data';
// }
async function resolveDataBase() {
  const cfgBase = (window.OPENLEARN_DATA_BASE || "").trim();
  if (cfgBase) {
    DATA_BASE = cfgBase; // you opted in → we’ll try to fetch from here
  } else {
    DATA_BASE = null; // no external data → use local seed only
  }
}
async function loadJSON(path) {
  const r = await fetch(path, { cache: "no-cache" });
  if (!r.ok) {
    if (r.status === 404) return null;
    throw new Error(`${r.status} ${path}`);
  }
  return r.json();
}
async function loadText(path) {
  const r = await fetch(path, { cache: "no-cache" });
  if (!r.ok) {
    if (r.status === 404) return "";
    throw new Error(`${r.status} ${path}`);
  }
  return r.text();
}
// async function loadCatalog(){
//   if (!DATA_BASE) await resolveDataBase();
//   const cat = await loadJSON(`${DATA_BASE}/catalog.json`); // {items:[...]}
//   const local = getCourses();
//   const merged = [...(cat?.items||[]), ...local.filter(l => !(cat?.items||[]).some(ci=>ci.id===l.id))];
//   setCourses(merged); ALL=merged; renderCatalog?.();
// }
async function loadCatalog() {
  await resolveDataBase();

  let items = [];
  if (DATA_BASE) {
    try {
      const r = await fetch(`${DATA_BASE}/catalog.json`, { cache: "no-cache" });
      if (r.ok) {
        const cat = await r.json();
        items = cat?.items || [];
      }
    } catch {
      // ignore fetch errors; we'll fall back to seed
    }
  }

  if (!items.length) {
    // Local seed: keeps the app fully usable with zero external files
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

  // Merge with any locally created courses (dedupe by id)
  const local = getCourses();
  const user = local.filter((c) => c.source === "user");
  const seed = (items || []).filter((c) => !user.some((u) => u.id === c.id)); // don’t duplicate user IDs
  const merged = [...seed, ...user]; // user wins
  setCourses(merged);
  ALL = merged;
  renderCatalog?.();
  // const merged = [...items, ...local.filter(l => !items.some(ci => ci.id === l.id))];

  setCourses(merged);
  ALL = merged;
  renderCatalog?.();
}

// app.js
// async function ensurePayPal() {
//   if (window.paypal) return;
//   await new Promise((resolve, reject) => {
//     const s = document.createElement("script");
//     const id = (window.OPENLEARN_CFG?.paypalClientId || "").trim();
//     s.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(
//       id
//     )}&currency=USD&components=buttons`;
//     s.async = true;
//     s.onload = resolve;
//     s.onerror = reject;
//     document.head.appendChild(s);
//   });
// }

// use right before rendering buttons
async function startCheckout(course) {
  const containerSel = "#paypal-container";
  const container = document.querySelector(containerSel);
  if (!container) return;

  try {
    await ensurePayPal();

    if (window.paypal?.Buttons) {
      document.getElementById("paypalNote")?.replaceChildren(); // clear note
      window.paypal
        .Buttons({
          createOrder: (data, actions) =>
            actions.order.create({
              purchase_units: [
                { amount: { value: String(course.price || 0) } },
              ],
            }),
          onApprove: async (data, actions) => {
            await actions.order.capture();
            markEnrolled(course.id);
            $("#payModal")?.close();
          },
          onCancel: () => toast("Payment cancelled"),
          onError: (err) => {
            console.error(err);
            toast("Payment error");
          },
        })
        .render(containerSel);
    } else {
      throw new Error("PayPal Buttons unavailable");
    }
  } catch (e) {
    console.warn("PayPal SDK not available, using simulator", e);
    const sim = document.createElement("button");
    sim.className = "btn primary";
    sim.textContent = "Simulate PayPal Success";
    sim.onclick = () => {
      markEnrolled(course.id);
      $("#payModal")?.close();
    };
    container.replaceChildren(sim);
    const note = document.getElementById("paypalNote");
    if (note) note.textContent = "PayPal SDK not loaded — using simulator";
  }
}

/* ---------- samples ---------- */
async function addSamples() {
  const base = [
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
      image: "",
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
      image: "",
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
      image: "",
    },
  ];
  const now = getCourses();

  // ထပ်ထပ် copy ထည့်လို့ရအောင်
  // setCourses([...now, ...base]);
  // ALL = getCourses();
  // toast("Sample course added");
  // renderCatalog(); renderAdminTable();

  // တစ်ခါပဲ ထည့်လို့ရအောင်
  const add = base.filter((b) => !now.some((n) => n.id === b.id));
  if (add.length) {
    setCourses([...now, ...add]);
    ALL = getCourses();
    toast(`Sample courses added (${add.length})`);
    renderCatalog();
    renderAdminTable();
  }
}
$("#btn-add-samples")?.addEventListener("click", addSamples);

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

  // filters
  $("#filterCategory")?.replaceChildren(
    ...[
      new Option("All Categories", ""),
      ...[...cats].filter(Boolean).map((x) => new Option(x, x)),
    ]
  );
  const applyFilters = () => {
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
  $("#filterCategory")?.addEventListener("change", applyFilters);
  $("#filterLevel")?.addEventListener("change", applyFilters);
  $("#sortBy")?.addEventListener("change", applyFilters);

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
function markEnrolled(id) {
  const s = getEnrolls();
  s.add(id);
  setEnrolls(s);
  toast("Enrolled");
  renderCatalog();
  renderMyLearning();
  showPage("mylearning");
}

import { getDatabase, ref, set } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// OR: export re-use from your firebase.js if you already exported `set`

async function mirrorEnrollmentToRTDB(courseId) {
  try {
    const uid = getUser()?.uid || (getUser()?.email || "").replace(/[^a-z0-9]/gi, "_");
    if (!uid) return;
    const db = RTDB(); if (!db) return;
    await set(ref(db, `enrollments/${uid}/${courseId}`), true);
  } catch {}
}

// Inside your existing markEnrolled(id):
async function markEnrolled(id) {
  const s = getEnrolls(); s.add(id); setEnrolls(s);
  await mirrorEnrollmentToRTDB(id);
  toast("Enrolled"); renderCatalog(); renderMyLearning(); showPage("mylearning");
}

// function handleEnroll(id){
//   const c=ALL.find(x=>x.id===id)||getCourses().find(x=>x.id===id); if(!c) return toast("Course not found");
//   if((c.price||0)<=0) return markEnrolled(id); // free
//   const dlg=$("#payModal"); $("#payTitle") && ($("#payTitle").textContent="Checkout · "+c.title);
//   const container=$("#paypal-container"); if(container) container.innerHTML="";
//   const note=$("#paypalNote"); const pp=window.paypal;
//   if(note) note.textContent = pp? "":"PayPal SDK not loaded — using simulator";
//   if(pp?.Buttons && container){
//     pp.Buttons({
//       createOrder:(d,a)=> a.order.create({purchase_units:[{amount:{value:String(c.price||0)}}]}),
//       onApprove:async(d,a)=>{ await a.order.capture(); markEnrolled(id); dlg?.close(); },
//       onCancel:()=> toast("Payment cancelled"),
//       onError: (err)=>{ console.error(err); toast("Payment error"); }
//     }).render(container);
//   }else if(container){
//     const sim=document.createElement("button");
//     sim.className="btn primary"; sim.textContent="Simulate PayPal Success";
//     sim.onclick=()=>{ markEnrolled(id); dlg?.close(); };
//     container.appendChild(sim);
//   }
//   $("#mmkPaid")?.addEventListener("click", ()=>{ markEnrolled(id); dlg?.close(); });
//   $("#closePay")?.addEventListener("click", ()=> dlg?.close());
//   dlg?.showModal();}

function handleEnroll(id) {
  const c =
    ALL.find((x) => x.id === id) || getCourses().find((x) => x.id === id);
  if (!c) return toast("Course not found");
  if ((c.price || 0) <= 0) return markEnrolled(id); // free → auto-enroll

  // Open your pay modal
  const dlg = $("#payModal");
  $("#payTitle") && ($("#payTitle").textContent = "Checkout · " + c.title);
  const container = $("#paypal-container");
  if (container) container.innerHTML = "";
  $("#paypalNote") && ($("#paypalNote").textContent = "Loading…");
  $("#mmkPaid")?.addEventListener("click", () => {
    markEnrolled(id);
    dlg?.close();
  });
  $("#closePay")?.addEventListener("click", () => dlg?.close());
  dlg?.showModal();

  // Now use the lazy loader
  startCheckout(c);
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

/* ---------- My Learning / Reader ---------- */
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
async function openReader(cid) {
  const c =
    ALL.find((x) => x.id === cid) || getCourses().find((x) => x.id === cid);
  if (!c) return;
  try {
    const { meta, pages, quiz } = await loadCourseBundle(c.id);
    RD = {
      cid: c.id,
      pages: pages.length ? pages : SAMPLE_PAGES(c.title),
      i: 0,
      credits: c.credits || meta?.credits || 3,
      score: 0,
      quiz,
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
  $("#myCourses").innerHTML = ""; // hide cards → full reader
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

/* ---------- Admin ---------- */
$("#btn-new-course")?.addEventListener("click", () =>
  $("#courseModal")?.showModal()
);
$("#courseClose")?.addEventListener("click", () => $("#courseModal")?.close());
$("#courseCancel")?.addEventListener("click", () => $("#courseModal")?.close());
$("#courseForm")?.addEventListener("submit", (e) => {
  e.preventDefault();
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
  tb.querySelectorAll("[data-edit]").forEach((b) => {
    b.onclick = () => {
      const id = b.getAttribute("data-edit");
      const arr = getCourses();
      const i = arr.findIndex((x) => x.id === id);
      if (i < 0) return;
      const c = arr[i];
      const dlg = document.getElementById("courseModal");
      const f = document.getElementById("courseForm");
      // prefill
      f.querySelector("[name=title]").value = c.title || "";
      f.querySelector("[name=category]").value = c.category || "";
      f.querySelector("[name=level]").value = c.level || "Beginner";
      f.querySelector("[name=price]").value = c.price || 0;
      f.querySelector("[name=rating]").value = c.rating || 4.6;
      f.querySelector("[name=hours]").value = c.hours || 8;
      f.querySelector("[name=credits]").value = c.credits || 3;
      f.querySelector("[name=img]").value = c.image || "";
      f.querySelector("[name=description]").value = c.summary || "";
      f.querySelector("[name=benefits]").value = c.benefits || "";
      dlg.showModal();

      // one-off submit override
      const orig = f.onsubmit;
      f.onsubmit = (e) => {
        e.preventDefault();
        const fd = new FormData(f);
        c.title = fd.get("title")?.toString() || c.title;
        c.category = fd.get("category")?.toString() || c.category;
        c.level = fd.get("level")?.toString() || c.level;
        c.price = Number(fd.get("price") || c.price || 0);
        c.rating = Number(fd.get("rating") || c.rating || 4.6);
        c.hours = Number(fd.get("hours") || c.hours || 8);
        c.credits = Number(fd.get("credits") || c.credits || 3);
        c.image = fd.get("img")?.toString() || c.image || "";
        c.summary = (fd.get("description") || "").toString();
        c.benefits = (fd.get("benefits") || "").toString();
        c.source = c.source || "user";
        arr[i] = c;
        setCourses(arr);
        ALL = arr;
        dlg.close();
        renderCatalog();
        renderAdminTable();
        toast("Course updated");
        f.onsubmit = orig;
      };
    };
  });
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

/* ---------- Final Exam ---------- */
$("#btn-top-final")?.addEventListener("click", () => showPage("finals"));
$("#btn-start-final")?.addEventListener("click", startFinal);
$("#closeFinal")?.addEventListener("click", () => $("#finalModal")?.close());

function gatherAllQuestions() {
  const demo = [
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
    { t: "short", q: "What does DOM stand for?", a: "document object model" },
    { t: "short", q: "In React, state updater hook is?", a: "useState" },
  ];
  return demo;
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
  const pool = gatherAllQuestions();
  const qs = pickRandom(pool, 12);
  const form = $("#finalForm");
  if (!form) return;
  form.innerHTML = "";
  qs.forEach((it, idx) => {
    const id = "qf_" + idx;
    if (it.t === "tf") {
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
  const submit = document.createElement("div");
  submit.className = "row";
  submit.style.justifyContent = "flex-end";
  submit.style.gap = "8px";
  submit.innerHTML = `<button class="btn" id="cancelFinal" type="button">Cancel</button>
                      <button class="btn primary" id="submitFinal" type="button">Submit</button>`;
  form.appendChild(submit);

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
      toast(`Passed ${pct}% ✔ — Downloading certificate & transcript…`);
      downloadCertificate(currentUser?.email || "Student", pct);
      downloadTranscript(
        currentUser?.email || "Student",
        pct,
        qs.length,
        score
      );
    } else {
      toast(`Failed ${pct}% — try again`);
    }
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

/* ---------- realtime chat ---------- */
function initChatRealtime() {
  const box  = document.getElementById("chatBox");
  const input= document.getElementById("chatInput");
  const send = document.getElementById("chatSend");
  if (!box || !input || !send) return;

  // listen newest 100 msgs (timestamp asc)
  const q = query(
    collection(db, "rooms", "global", "messages"),
    orderBy("ts", "asc"),
    limit(100)
  );
  onSnapshot(q, (snap) => {
    box.innerHTML = "";
    snap.forEach(doc => {
      const m = doc.data();
      const who = m.user || "student";
      const t   = m.ts?.toDate ? m.ts.toDate().toLocaleTimeString() : "";
      box.insertAdjacentHTML("beforeend",
        `<div class="msg"><b>${who}</b> <span class="small muted">${t}</span><div>${m.text||""}</div></div>`
      );
    });
    box.scrollTop = box.scrollHeight;
  });

  send.addEventListener("click", async () => {
    const text = (input.value||"").trim(); if(!text) return;
    const who  = (getUser()?.email) || "student";
    await addDoc(collection(db, "rooms", "global", "messages"), {
      user: who, text, ts: serverTimestamp()
    });
    input.value = "";
  });
}

/* ---------- Chat (local demo) ---------- */
// function initChat() {
//   const KEY = "ol_chat_local";
//   const load = () => JSON.parse(localStorage.getItem(KEY) || "[]");
//   const save = (a) => localStorage.setItem(KEY, JSON.stringify(a));
//   const box = $("#chatBox"),
//     input = $("#chatInput"),
//     send = $("#chatSend");
//   const draw = (m) => {
//     box?.insertAdjacentHTML(
//       "beforeend",
//       `<div class="msg"><b>${esc(
//         m.user
//       )}</b> <span class="small muted">${new Date(
//         m.ts
//       ).toLocaleTimeString()}</span><div>${esc(m.text)}</div></div>`
//     );
//     if (box) box.scrollTop = box.scrollHeight;
//   };
//   let arr = load();
//   arr.forEach(draw);
//   send?.addEventListener("click", () => {
//     const text = input?.value.trim();
//     if (!text) return;
//     const m = { user: currentUser?.email || "guest", text, ts: Date.now() };
//     arr.push(m);
//     save(arr);
//     draw(m);
//     if (input) input.value = "";
//   });
// }

/* ---------- boot ---------- */
document.addEventListener("DOMContentLoaded", async ()=>{
  applyPalette(localStorage.getItem("ol_theme") || "slate");
  applyFont(localStorage.getItem("ol_font") || "16");

  initAuthModal();
  initSidebar();
  initSearch();
  initChat();

  // Call these only if they exist
  window.initTopbarLayout?.();
  window.initTopbarReveal?.();

  const u = getUser();
  setLogged(!!u, u?.email);

  try { await loadCatalog(); } 
  catch (e) { console.warn("Catalog load failed", e); }

  ALL = getCourses();
  renderCatalog();
  renderAdminTable();
  renderProfilePanel();

  if (document.getElementById("btn-top-ann")) {
    document.getElementById("btn-top-ann").title = "Open Announcements";
  }
  if (document.getElementById("btn-top-final")) {
    document.getElementById("btn-top-final").title = "Open Final Exam";
  }

  // one-time admin import/export wiring (outside renderAdminTable)
  document.getElementById("btn-export")?.addEventListener("click", ()=>{
    const user = getCourses().filter(c => c.source === "user");
    const blob = new Blob([JSON.stringify(user, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "openlearn-my-courses.json";
    a.click();
  });

  document.getElementById("btn-import")?.addEventListener("click", ()=>{
    document.getElementById("importFile")?.click();
  });

  document.getElementById("importFile")?.addEventListener("change", async (e)=>{
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();

    let incoming = [];
    try { incoming = JSON.parse(text) || []; }
    catch { return toast("Invalid JSON"); }

    const arr = getCourses();
    incoming.forEach(c=>{
      c.source = "user";
      const i = arr.findIndex(x => x.id === c.id);
      if (i >= 0) arr[i] = c; else arr.push(c);
    });

    setCourses(arr);
    ALL = arr;
    renderCatalog();
    renderAdminTable();
    toast("Imported");
  });
});
