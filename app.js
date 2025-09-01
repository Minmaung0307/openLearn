import {
  app,
  auth,
  db,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  collection,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  getDocs,
  query,
  orderBy,
  where,
  limit,
} from "./firebase.js";

/* ---------- helpers ---------- */
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));
const esc = (s) =>
  (s || "").replace(
    /[&<>\"']/g,
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

/* ---------- theme / font ---------- */
const PALETTES = {
  dark: {
    bg: "#0b0f17",
    fg: "#e7ecf3",
    card: "#121826",
    muted: "#9aa6b2",
    border: "#223",
    accent: "#66d9ef",
    btnBg: "#1f2937",
    btnFg: "#e7ecf3",
    btnPrimaryBg: "#2563eb",
    btnPrimaryFg: "#fff",
    inputBg: "#0b1220",
    inputFg: "#e7ecf3",
    hoverBg: "#0e1625",
  },
  light: {
    bg: "#f7fafc",
    fg: "#0b1220",
    card: "#ffffff",
    muted: "#4a5568",
    border: "#dbe2ea",
    accent: "#2563eb",
    btnBg: "#e2e8f0",
    btnFg: "#0b1220",
    btnPrimaryBg: "#0f172a",
    btnPrimaryFg: "#fff",
    inputBg: "#ffffff",
    inputFg: "#0b1220",
    hoverBg: "#eef2f7",
  },
  ocean: {
    bg: "#07131d",
    fg: "#dff3ff",
    card: "#0c2030",
    muted: "#8fb3c6",
    border: "#113347",
    accent: "#4cc9f0",
    btnBg: "#123247",
    btnFg: "#dff3ff",
    btnPrimaryBg: "#4cc9f0",
    btnPrimaryFg: "#08222f",
    inputBg: "#0b2231",
    inputFg: "#dff3ff",
    hoverBg: "#0f2b40",
  },
};
function applyPalette(name) {
  const p = PALETTES[name] || PALETTES.dark,
    r = document.documentElement;
  const map = {
    bg: "--bg",
    fg: "--fg",
    card: "--card",
    muted: "--muted",
    border: "--border",
    accent: "--accent",
    btnBg: "--btnBg",
    btnFg: "--btnFg",
    btnPrimaryBg: "--btnPrimaryBg",
    btnPrimaryFg: "--btnPrimaryFg",
    inputBg: "--inputBg",
    inputFg: "--inputFg",
    hoverBg: "--hoverBg",
  };
  for (const [k, v] of Object.entries(map)) r.style.setProperty(v, p[k]);
}
function applyFont(px) {
  document.documentElement.style.setProperty("--fontSize", px + "px");
}

/* ---------- responsive sidebar (hover expand) ---------- */
function initSidebar() {
  const sb = $("#sidebar");
  const expand = () => {
    sb.classList.add("expanded");
    document.body.classList.add("sidebar-expanded");
  };
  const collapse = () => {
    sb.classList.remove("expanded");
    document.body.classList.remove("sidebar-expanded");
  };
  if (window.matchMedia("(min-width:1025px)").matches) {
    sb.addEventListener("mouseenter", expand);
    sb.addEventListener("mouseleave", collapse);
  }
  $("#hamburger")?.addEventListener("click", () =>
    sb.classList.toggle("expanded")
  );
}

/* ---------- SPA router ---------- */
function showPage(id) {
  $$(".page").forEach((p) => p.classList.remove("visible"));
  $(`#page-${id}`)?.classList.add("visible");
  $$(".side-item").forEach((x) =>
    x.classList.toggle("active", x.dataset.page === id)
  );
  if (id === "mylearning") renderMyLearning();
  if (id === "gradebook") renderGradebook();
  if (id === "admin") renderAdminTable();
}
function bindSidebarNav() {
  $$(".side-item").forEach((btn) =>
    btn.addEventListener("click", () => showPage(btn.dataset.page))
  );
  $$(".side-section").forEach((sec) => {
    sec.addEventListener("click", () => {
      const key = sec.dataset.toggle;
      const grp = $(`.side-group[data-group="${key}"]`);
      grp?.classList.toggle("collapsed");
    });
  });
}

/* ---------- Search ---------- */
function bindSearch() {
  const go = () => {
    const q = $("#topSearch").value.toLowerCase().trim();
    showPage("courses");
    $$("#courseGrid .card.course").forEach((el) => {
      const txt = (el.dataset.search || "").toLowerCase();
      el.style.display = !q || txt.includes(q) ? "" : "none";
    });
  };
  $("#topSearchBtn")?.addEventListener("click", go);
  $("#topSearch")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") go();
  });
}

/* ---------- DB probe / local fallback ---------- */
let USE_DB = true;
async function probeDbOnce() {
  try {
    const cfgOk = !/YOUR_PROJECT|YOUR_API_KEY|YOUR_APP_ID/.test(
      JSON.stringify(app.options)
    );
    if (!cfgOk) throw new Error("cfg-missing");
    await getDocs(query(collection(db, "__ping"), limit(1)));
    USE_DB = true;
  } catch (e) {
    console.warn("Firestore disabled → local mode:", e?.code || e);
    USE_DB = false;
  }
}

/* ---------- local storage ---------- */
const readJSON = (k, d) => {
  try {
    return JSON.parse(localStorage.getItem(k) || JSON.stringify(d));
  } catch {
    return d;
  }
};
const writeJSON = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const getLocal = () => readJSON("ol_courses", []);
const setLocal = (a) => writeJSON("ol_courses", a || []);
const getEnrolls = () => new Set(readJSON("ol_enrolls", []));
const setEnrolls = (s) => writeJSON("ol_enrolls", Array.from(s));

async function fetchAll() {
  if (!USE_DB) return getLocal();
  try {
    const snap = await getDocs(
      query(collection(db, "courses"), orderBy("title", "asc"))
    );
    const arr = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    if (arr.length) return arr;
  } catch (e) {
    console.warn("fetch fallback", e);
    USE_DB = false;
  }
  return getLocal();
}
async function safeAdd(payload) {
  if (!USE_DB) {
    const id = "loc_" + Math.random().toString(36).slice(2, 9);
    const arr = getLocal();
    arr.push({ id, ...payload });
    setLocal(arr);
    return { id, ...payload };
  }
  try {
    const ref = await addDoc(collection(db, "courses"), payload);
    return { id: ref.id, ...payload };
  } catch (e) {
    console.warn("add fallback", e);
    USE_DB = false;
    const id = "loc_" + Math.random().toString(36).slice(2, 9);
    const arr = getLocal();
    arr.push({ id, ...payload });
    setLocal(arr);
    return { id, ...payload };
  }
}

/* ---------- samples ---------- */
async function addSamples() {
  const base = [
    {
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
      title: "Advanced React Patterns",
      category: "Web",
      level: "Advanced",
      price: 69,
      credits: 2,
      rating: 4.5,
      hours: 9,
      summary: "Hooks, contexts, performance.",
      image: "",
    },
    {
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
    {
      title: "Intro to Machine Learning",
      category: "Data",
      level: "Beginner",
      price: 59,
      credits: 3,
      rating: 4.7,
      hours: 12,
      summary: "Supervised, unsupervised.",
      image: "",
    },
    {
      title: "Cloud Fundamentals",
      category: "Cloud",
      level: "Beginner",
      price: 29,
      credits: 2,
      rating: 4.6,
      hours: 7,
      summary: "AWS/GCP basics.",
      image: "",
    },
    {
      title: "DevOps CI/CD",
      category: "Cloud",
      level: "Intermediate",
      price: 69,
      credits: 3,
      rating: 4.6,
      hours: 11,
      summary: "Pipelines, Docker, K8s.",
      image: "",
    },
  ];
  for (const c of base) {
    await safeAdd({ ...c, createdAt: Date.now(), progress: 0 });
  }
  toast("Sample courses added");
  renderCatalog();
  renderAdminTable();
}

/* ---------- catalog ---------- */
let allCourses = [];
async function renderCatalog() {
  const grid = $("#courseGrid");
  if (!grid) return;
  allCourses = await fetchAll();
  if (allCourses.length === 0) {
    grid.innerHTML = `<div class="muted">No courses yet.</div>`;
    return;
  }
  const cats = new Set();
  const lvls = new Set();
  grid.innerHTML = allCourses
    .map((c) => {
      cats.add(c.category || "");
      lvls.add(c.level || "");
      const priceStr = (c.price || 0) > 0 ? "$" + c.price : "Free";
      const r = Number(c.rating || 4.6);
      const enrolled = getEnrolls().has(c.id);
      return `<div class="card course" data-id="${c.id}" data-search="${esc(
        [c.title, c.summary, c.category, c.level].join(" ")
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
        <div class="row" style="justify-content:space-between">
          <span>${c.hours || 8} hrs</span>
          ${
            enrolled
              ? `<button class="btn" data-open="${c.id}">Open</button>`
              : `<button class="btn" disabled title="Enroll first">Open</button>`
          }
          <button class="btn primary" data-enroll="${c.id}">${
        enrolled ? "Enrolled" : "Enroll"
      }</button>
        </div>
      </div>
    </div>`;
    })
    .join("");

  // filters
  $("#filterCategory").innerHTML =
    `<option value="">All Categories</option>` +
    Array.from(cats)
      .filter(Boolean)
      .map((x) => `<option>${esc(x)}</option>`)
      .join("");
  $("#filterLevel").innerHTML =
    `<option value="">All Levels</option>` +
    Array.from(lvls)
      .filter(Boolean)
      .map((x) => `<option>${esc(x)}</option>`)
      .join("");
  const applyFilters = () => {
    const cat = $("#filterCategory").value,
      lv = $("#filterLevel").value,
      sort = $("#sortBy").value;
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
        if (sort === "title-asc") return ta.localeCompare(tb);
        if (sort === "title-desc") return tb.localeCompare(ta);
        return 0;
      })
      .forEach((el) => grid.appendChild(el));
  };
  $("#filterCategory").onchange = applyFilters;
  $("#filterLevel").onchange = applyFilters;
  $("#sortBy").onchange = applyFilters;

  // actions
  grid
    .querySelectorAll("[data-enroll]")
    .forEach((b) =>
      b.addEventListener("click", () => enroll(b.getAttribute("data-enroll")))
    );
  grid
    .querySelectorAll("[data-open]")
    .forEach((b) =>
      b.addEventListener("click", () =>
        openFromLearning(b.getAttribute("data-open"))
      )
    );
}

/* ---------- enroll (PayPal demo fallback) ---------- */
function enroll(id) {
  const set = getEnrolls();
  if (set.has(id)) {
    toast("Already enrolled");
    renderCatalog();
    renderMyLearning();
    return;
  }
  // PayPal SDK not enforced here; simulate purchase for demo
  set.add(id);
  setEnrolls(set);
  toast("Enrolled");
  renderCatalog();
  renderMyLearning();
  showPage("mylearning");
}

/* ---------- My Learning ---------- */
function renderMyLearning() {
  const grid = $("#myCourses");
  if (!grid) return;
  const set = getEnrolls();
  const list = allCourses.length ? allCourses : getLocal();
  const mine = list.filter((c) => set.has(c.id));
  grid.innerHTML =
    mine
      .map((c) => {
        const r = Number(c.rating || 4.6);
        return `<div class="card course">
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
        <div class="badge">${c.hours || 8} hrs</div>
        <div class="row" style="justify-content:flex-end"><button class="btn" data-read="${
          c.id
        }">Open</button></div>
      </div>
    </div>`;
      })
      .join("") ||
    `<div class="muted">No enrollments yet. Enroll from Courses.</div>`;
  grid
    .querySelectorAll("[data-read]")
    .forEach(
      (b) => (b.onclick = () => openFromLearning(b.getAttribute("data-read")))
    );
}
function openFromLearning(id) {
  const c =
    allCourses.find((x) => x.id === id) || getLocal().find((x) => x.id === id);
  if (!c) return toast("Course not found");
  alert(
    `Reading: ${c.title}\n\nChapters\n- Welcome\n- Chapter 1 (video, img)\n- Quiz 1\n- Notes\n- Finals\n\n(For full reader UI, see extended build.)`
  );
}

/* ---------- Gradebook (sample) ---------- */
function renderGradebook() {
  const tbody = $("#gbTable tbody");
  if (!tbody) return;
  const set = getEnrolls();
  const list = (allCourses.length ? allCourses : getLocal()).filter((c) =>
    set.has(c.id)
  );
  const rows = list.map((c) => ({
    student: "you@example.com",
    course: c.title,
    progress: Math.floor(Math.random() * 90) + 10 + "%",
  }));
  tbody.innerHTML =
    rows
      .map(
        (r) =>
          `<tr><td>${esc(r.student)}</td><td>${esc(r.course)}</td><td>${esc(
            r.progress
          )}</td></tr>`
      )
      .join("") || "<tr><td colspan='3' class='muted'>No data</td></tr>";
}

/* ---------- Admin: modal + table ---------- */
function bindAdmin() {
  $("#btnNewCourse")?.addEventListener("click", () =>
    $("#dlgCourse").showModal()
  );
  $$(".dlg-close").forEach((b) =>
    b.addEventListener("click", () => b.closest("dialog").close())
  );
  $("#formCourse")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      title: $("#cTitle").value.trim(),
      category: $("#cCategory").value.trim(),
      level: $("#cLevel").value,
      rating: Number($("#cRating").value || 4.6),
      hours: Number($("#cHours").value || 8),
      price: Number($("#cPrice").value || 0),
      image: $("#cImg").value.trim(),
      credits: 3,
      summary: $("#cSummary").value.trim(),
      createdAt: Date.now(),
    };
    await safeAdd(payload);
    $("#dlgCourse").close();
    renderCatalog();
    renderAdminTable();
    toast("Course created");
  });
}
function renderAdminTable() {
  const tb = $("#adminTable tbody");
  if (!tb) return;
  const list = allCourses.length ? allCourses : getLocal();
  tb.innerHTML =
    list
      .map(
        (c) => `<tr data-id="${c.id}">
    <td>${esc(c.title)}</td><td>${esc(c.category || "")}</td><td>${esc(
          c.level || ""
        )}</td>
    <td>${esc(String(c.rating || 4.6))}</td><td>${esc(
          String(c.hours || 8)
        )}</td><td>${(c.price || 0) > 0 ? "$" + c.price : "Free"}</td>
    <td><button class="btn small" data-edit="${
      c.id
    }">Edit</button> <button class="btn small" data-del="${
          c.id
        }">Delete</button></td>
  </tr>`
      )
      .join("") || "<tr><td colspan='7' class='muted'>No courses</td></tr>";
  tb.querySelectorAll("[data-del]").forEach(
    (b) =>
      (b.onclick = () => {
        const id = b.getAttribute("data-del");
        const arr = getLocal().filter((x) => x.id !== id);
        setLocal(arr);
        renderCatalog();
        renderAdminTable();
      })
  );
  tb.querySelectorAll("[data-edit]").forEach(
    (b) =>
      (b.onclick = () => {
        const id = b.getAttribute("data-edit");
        const c =
          getLocal().find((x) => x.id === id) ||
          allCourses.find((x) => x.id === id);
        if (!c) return;
        $("#cTitle").value = c.title || "";
        $("#cCategory").value = c.category || "";
        $("#cLevel").value = c.level || "Beginner";
        $("#cRating").value = c.rating || 4.6;
        $("#cHours").value = c.hours || 8;
        $("#cPrice").value = c.price || 0;
        $("#cImg").value = c.image || "";
        $("#cSummary").value = c.summary || "";
        $("#dlgCourse").showModal();
        $("#formCourse").onsubmit = (e) => {
          e.preventDefault();
          const arr = getLocal();
          const i = arr.findIndex((x) => x.id === id);
          if (i > -1) {
            arr[i] = {
              ...arr[i],
              title: $("#cTitle").value.trim(),
              category: $("#cCategory").value.trim(),
              level: $("#cLevel").value,
              rating: Number($("#cRating").value || 4.6),
              hours: Number($("#cHours").value || 8),
              price: Number($("#cPrice").value || 0),
              image: $("#cImg").value.trim(),
              summary: $("#cSummary").value.trim(),
            };
            setLocal(arr);
            $("#dlgCourse").close();
            renderCatalog();
            renderAdminTable();
            $("#formCourse").onsubmit = null;
          } else {
            toast("Only local edit supported in lite build");
          }
        };
      })
  );
}

/* ---------- Auth state (topbar login/logout) ---------- */
let currentUser = null;
function gateUI() {
  const logged = !!currentUser;
  $("#btnLogin")?.classList.toggle("hidden", logged);
  $("#btnSignup")?.classList.toggle("hidden", logged);
  $("#userMenu")?.classList.toggle("hidden", !logged);
  $("#userName") &&
    ($("#userName").textContent = logged
      ? currentUser.displayName || currentUser.email
      : "");
}
onAuthStateChanged(auth, (u) => {
  currentUser = u || null;
  gateUI();
});
document.addEventListener("click", async (e) => {
  if (e.target && e.target.id === "btnLogoutTop") {
    try {
      await signOut(auth);
      location.href = "./login.html";
    } catch (err) {
      console.error(err);
      toast(err.code || "Logout failed");
    }
  }
});

/* ---------- Boot ---------- */
document.addEventListener("DOMContentLoaded", async () => {
  // theme init
  applyPalette(localStorage.getItem("ol_theme") || "dark");
  applyFont(localStorage.getItem("ol_font") || "14");
  $("#themeSelect")?.addEventListener("change", (e) => {
    const v = e.target.value;
    localStorage.setItem("ol_theme", v);
    applyPalette(v);
  });
  $("#fontSelect")?.addEventListener("change", (e) => {
    const v = e.target.value;
    localStorage.setItem("ol_font", v);
    applyFont(v);
  });

  initSidebar();
  bindSidebarNav();
  bindSearch();
  bindAdmin();
  try {
    await probeDbOnce();
    await renderCatalog();
  } catch (e) {
    console.warn(e);
  }
  $("#btnAddSample")?.addEventListener("click", addSamples);
  showPage("courses");
});
