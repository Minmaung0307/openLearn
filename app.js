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

/* ===== helpers ===== */
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
const readJSON = (k, d) => {
  try {
    return JSON.parse(localStorage.getItem(k) || JSON.stringify(d));
  } catch {
    return d;
  }
};
const writeJSON = (k, v) => localStorage.setItem(k, JSON.stringify(v));

/* ===== theme / font ===== */
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
  forest: {
    bg: "#0b140f",
    fg: "#eaf7eb",
    card: "#102017",
    muted: "#9fbcaa",
    border: "#163223",
    accent: "#34d399",
    btnBg: "#173425",
    btnFg: "#eaf7eb",
    btnPrimaryBg: "#34d399",
    btnPrimaryFg: "#082015",
    inputBg: "#0d2317",
    inputFg: "#eaf7eb",
    hoverBg: "#123222",
  },
  grape: {
    bg: "#0f0a14",
    fg: "#efe7ff",
    card: "#1a1224",
    muted: "#bda7d9",
    border: "#2a1a3a",
    accent: "#a78bfa",
    btnBg: "#241634",
    btnFg: "#efe7ff",
    btnPrimaryBg: "#a78bfa",
    btnPrimaryFg: "#140b1f",
    inputBg: "#1a1224",
    inputFg: "#efe7ff",
    hoverBg: "#221732",
  },
  solarized: {
    bg: "#002b36",
    fg: "#eee8d5",
    card: "#073642",
    muted: "#93a1a1",
    border: "#0b3944",
    accent: "#b58900",
    btnBg: "#0e3c4b",
    btnFg: "#eee8d5",
    btnPrimaryBg: "#b58900",
    btnPrimaryFg: "#002b36",
    inputBg: "#073642",
    inputFg: "#eee8d5",
    hoverBg: "#0c3440",
  },
  rose: {
    bg: "#1a0d12",
    fg: "#ffe7ee",
    card: "#241318",
    muted: "#d9a7b5",
    border: "#3a1b27",
    accent: "#fb7185",
    btnBg: "#2a1720",
    btnFg: "#ffe7ee",
    btnPrimaryBg: "#fb7185",
    btnPrimaryFg: "#240b12",
    inputBg: "#221018",
    inputFg: "#ffe7ee",
    hoverBg: "#2c1620",
  },
  bumblebee: {
    bg: "#0f130b",
    fg: "#fefce8",
    card: "#151b0e",
    muted: "#e7e3b5",
    border: "#263112",
    accent: "#facc15",
    btnBg: "#1a250f",
    btnFg: "#fefce8",
    btnPrimaryBg: "#facc15",
    btnPrimaryFg: "#231b02",
    inputBg: "#151b0e",
    inputFg: "#fefce8",
    hoverBg: "#1b2510",
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
  $("#fontPreview") && ($("#fontPreview").textContent = px + " px");
}

/* ===== sidebar (hover→expand→labels) ===== */
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

/* ===== router ===== */
function showPage(id) {
  $$(".page").forEach((p) => p.classList.remove("visible"));
  $(`#page-${id}`)?.classList.add("visible");
  $$(".side-item").forEach((x) =>
    x.classList.toggle("active", x.dataset.page === id)
  );
  if (id === "mylearning") renderMyLearning();
  if (id === "gradebook") renderGradebook();
  if (id === "admin") renderAdminTable();
  if (id === "analytics") renderAnalytics();
  if (id === "dashboard") renderAnnouncements();
}
function bindSidebarNav() {
  $$(".side-item").forEach((btn) =>
    btn.addEventListener("click", () => showPage(btn.dataset.page))
  );
}

/* ===== Search ===== */
function bindSearch() {
  const doSearch = (q) => {
    // FIX: don't mix ?? with || without parentheses
    const raw = q ?? $("#topSearch")?.value ?? "";
    const term = String(raw).toLowerCase().trim();

    showPage("courses");
    document.querySelectorAll("#courseGrid .card.course").forEach((card) => {
      const text = (card.dataset.search || "").toLowerCase();
      card.style.display = !term || text.includes(term) ? "" : "none";
    });
  };

  $("#topSearchBtn")?.addEventListener("click", () => doSearch());
  $("#topSearch")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") doSearch();
  });

  $("#mobileSearchBtn")?.addEventListener("click", () =>
    $("#mobileSearchPanel").classList.remove("hidden")
  );
  $("#mSearchClose")?.addEventListener("click", () =>
    $("#mobileSearchPanel").classList.add("hidden")
  );
  $("#mSearchGo")?.addEventListener("click", () => {
    const mv = $("#mSearchInput")?.value ?? "";
    doSearch(mv);
    $("#mobileSearchPanel").classList.add("hidden");
  });
}

/* ===== DB probe / local fallback ===== */
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

/* ===== local storage ===== */
const getLocalCourses = () => readJSON("ol_local_courses", []);
const setLocalCourses = (a) => writeJSON("ol_local_courses", a || []);
const getEnrolls = () => new Set(readJSON("ol_enrolls", []));
const setEnrolls = (s) => writeJSON("ol_enrolls", Array.from(s));
const getNotes = () => readJSON("ol_notes", {}); // { [courseId]: [ {page, text, ts} ] }
const setNotes = (x) => writeJSON("ol_notes", x);
const getBookmarks = () => readJSON("ol_bms", {}); // { [courseId]: page }
const setBookmarks = (x) => writeJSON("ol_bms", x);
const getAnns = () => readJSON("ol_anns", []); // [{id,title,ts}]
const setAnns = (x) => writeJSON("ol_anns", x);

/* ===== data access ===== */
async function fetchAll() {
  if (!USE_DB) return getLocalCourses();
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
  return getLocalCourses();
}
async function safeAddCourse(payload) {
  if (!USE_DB) {
    const id = "loc_" + Math.random().toString(36).slice(2, 9);
    const arr = getLocalCourses();
    arr.push({ id, ...payload });
    setLocalCourses(arr);
    return { id, ...payload };
  }
  try {
    const ref = await addDoc(collection(db, "courses"), payload);
    return { id: ref.id, ...payload };
  } catch (e) {
    console.warn("add fallback", e);
    USE_DB = false;
    const id = "loc_" + Math.random().toString(36).slice(2, 9);
    const arr = getLocalCourses();
    arr.push({ id, ...payload });
    setLocalCourses(arr);
    return { id, ...payload };
  }
}

/* ===== samples ===== */
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
    await safeAddCourse({ ...c, createdAt: Date.now(), progress: 0 });
  }
  toast("Sample courses added");
  renderCatalog();
  renderAdminTable();
  renderAnalytics();
}

/* ===== catalog (Cards: no Open; Enroll only; free→auto, paid→PayPal) ===== */
let ALL = [];
async function renderCatalog() {
  const grid = $("#courseGrid");
  if (!grid) return;
  ALL = await fetchAll();
  if (ALL.length === 0) {
    grid.innerHTML = `<div class="muted">No courses yet.</div>`;
    return;
  }
  const cats = new Set();
  grid.innerHTML = ALL.map((c) => {
    cats.add(c.category || "");
    const search = [c.title, c.summary, c.category, c.level].join(" ");
    const r = Number(c.rating || 4.6);
    const priceStr = (c.price || 0) > 0 ? "$" + c.price : "Free";
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
        <div class="row" style="justify-content:space-between">
          <span>${c.hours || 8} hrs</span>
          <button class="btn primary" data-enroll="${c.id}">${
      enrolled ? "Enrolled" : "Enroll"
    }</button>
        </div>
      </div>
    </div>`;
  }).join("");

  // filters (full width)
  $("#filterCategory").innerHTML =
    `<option value="">All Categories</option>` +
    Array.from(cats)
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
  $("#filterCategory").onchange = applyFilters;
  $("#filterLevel").onchange = applyFilters;
  $("#sortBy").onchange = applyFilters;

  // actions
  grid
    .querySelectorAll("[data-enroll]")
    .forEach((b) =>
      b.addEventListener("click", () =>
        handleEnroll(b.getAttribute("data-enroll"))
      )
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
    ALL.find((x) => x.id === id) || getLocalCourses().find((x) => x.id === id);
  if (!c) return toast("Course not found");
  if ((c.price || 0) <= 0) return markEnrolled(id); // free → auto-enroll
  // paid → PayPal buttons
  const paypal = window.paypalSDK;
  const box = document.createElement("div");
  box.style.margin = "10px 0";
  bConfirm(`Pay ${c.title} (${(c.price || 0).toFixed(2)} USD)?`, (ok) => {
    if (!ok) return;
    if (paypal && paypal.Buttons) {
      box.innerHTML = "";
      document
        .querySelector(`#courseGrid .card.course[data-id="${id}"] .course-body`)
        .appendChild(box);
      paypal
        .Buttons({
          createOrder: (d, a) =>
            a.order.create({
              purchase_units: [{ amount: { value: String(c.price || 0) } }],
            }),
          onApprove: async (d, a) => {
            await a.order.capture();
            markEnrolled(id);
            box.remove();
          },
          onCancel: () => {
            toast("Payment cancelled");
            box.remove();
          },
          onError: (err) => {
            console.error(err);
            toast("Payment error");
            box.remove();
          },
        })
        .render(box);
    } else {
      // Dev simulate
      toast("Simulated payment success");
      markEnrolled(id);
    }
  });
}
function bConfirm(message, cb) {
  const ok = confirm(message);
  cb && cb(ok);
}

/* ===== My Learning + Reader (pagination, media, assignments, quiz, notes, bookmark, progress, scores, credits) ===== */
function renderMyLearning() {
  const grid = $("#myCourses");
  if (!grid) return;
  const set = getEnrolls();
  const list = (ALL.length ? ALL : getLocalCourses()).filter((c) =>
    set.has(c.id)
  );
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
        }">Open</button></div>
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
    html: `
      <h3>${esc(title)} — Welcome</h3>
      <p>လိဂ်ထည့်ခြင်း: ဒီသင်ခန်းစာမှာ overview ကို ကြည့်ဖို့ video နဲ့ together.</p>
      <video controls style="width:100%;border-radius:10px" poster="https://picsum.photos/seed/v1/800/320">
        <source src="" type="video/mp4">
      </video>
    `,
  },
  {
    type: "reading",
    html: `
      <h3>Chapter 1 — Concepts</h3>
      <p>စပ်စုဖော်ပြချက်…</p>
      <img style="width:100%;border-radius:10px" src="https://picsum.photos/seed/p1/800/360" alt="figure">
      <ul>
        <li>Key point A</li><li>Key point B</li><li>Key point C</li>
      </ul>
      <audio controls style="width:100%"></audio>
    `,
  },
  {
    type: "exercise",
    html: `
      <h3>Practice — Quick Tasks</h3>
      <ol>
        <li>Code snippet ကို ပြင်ပြီး console မှာ result ကြည့်ပါ</li>
        <li>Screenshot အဖြစ် တင်ပို့ပါ</li>
      </ol>
      <input type="file" />
    `,
  },
  {
    type: "quiz",
    html: `
      <h3>Quiz 1</h3>
      <p>Q1) Short answer…</p>
      <input id="q1" placeholder="Your answer" style="width:100%">
      <p>Q2) True/False</p>
      <label><input name="q2" type="radio" value="T"> True</label>
      <label><input name="q2" type="radio" value="F"> False</label>
      <div style="margin-top:8px"><button class="btn" id="qSubmit">Submit</button> <span id="qMsg" class="small muted"></span></div>
    `,
  },
  {
    type: "media",
    html: `
      <h3>Supplement — Audio/Video</h3>
      <p>နားထောင်ပြီး မှတ်စုယူပါ</p>
      <audio controls style="width:100%"></audio>
      <video controls style="width:100%;border-radius:10px" poster="https://picsum.photos/seed/v2/800/320"></video>
    `,
  },
  {
    type: "final",
    html: `
      <h3>Final Project</h3>
      <p>အပိုင်းတစ်ခုပေါင်းစပ်ပြီး mini project တင်သွင်းပါ</p>
      <input type="file" />
      <p class="small muted">Finish နိင်လျှင် certificate/transcript ကို Admin မှာနေရာသတ်မှတ်ထားသော နမူနာ စာရွက်တင်ပေးထားပါတယ်။ နိုင်ငံတော်လိုအပ်ချက်အလိုက် Production မှာပင် ထုတ်နိုင်မယ့် UI ထပ်တိုးပေးပါမယ်။</p>
    `,
  },
];

let RD = { cid: null, pages: [], i: 0, credits: 0, score: 0 };
function openReader(cid) {
  const c =
    ALL.find((x) => x.id === cid) ||
    getLocalCourses().find((x) => x.id === cid);
  if (!c) return;
  RD = {
    cid,
    pages: SAMPLE_PAGES(c.title),
    i: getBookmarks()[cid] || 0,
    credits: c.credits || 3,
    score: Math.floor(80 + Math.random() * 20),
  };
  $("#reader").classList.remove("hidden");
  $("#rdMeta").textContent = `Score: ${RD.score}% • Credits: ${RD.credits}`;
  renderPage();
  $("#rdBack").onclick = () => {
    $("#reader").classList.add("hidden");
  };
  $("#rdPrev").onclick = () => {
    RD.i = Math.max(0, RD.i - 1);
    renderPage();
  };
  $("#rdNext").onclick = () => {
    RD.i = Math.min(RD.pages.length - 1, RD.i + 1);
    renderPage();
  };
  $("#rdBookmark").onclick = () => {
    const bms = getBookmarks();
    bms[cid] = RD.i;
    setBookmarks(bms);
    toast("Bookmarked");
  };
  $("#rdNote").onclick = () => {
    const t = prompt("Write a note");
    if (!t) return;
    const ns = getNotes();
    ns[cid] = ns[cid] || [];
    ns[cid].push({ page: RD.i, text: t, ts: Date.now() });
    setNotes(ns);
    toast("Note added");
  };
}
function renderPage() {
  const p = RD.pages[RD.i];
  $("#rdTitle").textContent = `${RD.i + 1}. ${p.type.toUpperCase()}`;
  $("#rdPage").innerHTML = p.html;
  $("#rdPageInfo").textContent = `${RD.i + 1} / ${RD.pages.length}`;
  const pct = Math.round(((RD.i + 1) / RD.pages.length) * 100);
  $("#rdProgress").style.width = pct + "%";
}

/* ===== Gradebook (Score + Credits added) ===== */
function renderGradebook() {
  const tbody = $("#gbTable tbody");
  if (!tbody) return;
  const set = getEnrolls();
  const list = (ALL.length ? ALL : getLocalCourses()).filter((c) =>
    set.has(c.id)
  );
  const rows = list.map((c) => ({
    student: "you@example.com",
    course: c.title,
    score: 80 + Math.floor(Math.random() * 20) + "%",
    credits: c.credits || 3,
    progress: Math.floor(Math.random() * 90) + 10 + "%",
  }));
  tbody.innerHTML =
    rows
      .map(
        (r) =>
          `<tr><td>${esc(r.student)}</td><td>${esc(r.course)}</td><td>${esc(
            r.score
          )}</td><td>${esc(r.credits)}</td><td>${esc(r.progress)}</td></tr>`
      )
      .join("") || "<tr><td colspan='5' class='muted'>No data</td></tr>";
}

/* ===== Admin modal + table ===== */
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
      image: $("#cImage").value.trim(),
      price: Number($("#cPrice").value || 0),
      credits: Number($("#cCredits").value || 3),
      summary: $("#cSummary").value.trim(),
      createdAt: Date.now(),
    };
    await safeAddCourse(payload);
    $("#dlgCourse").close();
    renderCatalog();
    renderAdminTable();
    renderAnalytics();
    toast("Course created");
  });
}
function renderAdminTable() {
  const tb = $("#adminTable tbody");
  if (!tb) return;
  const list = ALL.length ? ALL : getLocalCourses();
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
        const arr = getLocalCourses().filter((x) => x.id !== id);
        setLocalCourses(arr);
        renderCatalog();
        renderAdminTable();
      })
  );
  tb.querySelectorAll("[data-edit]").forEach(
    (b) =>
      (b.onclick = () => {
        const id = b.getAttribute("data-edit");
        const c =
          getLocalCourses().find((x) => x.id === id) ||
          ALL.find((x) => x.id === id);
        if (!c) return;
        $("#cTitle").value = c.title || "";
        $("#cCategory").value = c.category || "";
        $("#cLevel").value = c.level || "Beginner";
        $("#cRating").value = c.rating || 4.6;
        $("#cHours").value = c.hours || 8;
        $("#cImage").value = c.image || "";
        $("#cPrice").value = c.price || 0;
        $("#cCredits").value = c.credits || 3;
        $("#cSummary").value = c.summary || "";
        $("#dlgCourse").showModal();
        $("#formCourse").onsubmit = (e) => {
          e.preventDefault();
          const arr = getLocalCourses();
          const i = arr.findIndex((x) => x.id === id);
          if (i > -1) {
            arr[i] = {
              ...arr[i],
              title: $("#cTitle").value.trim(),
              category: $("#cCategory").value.trim(),
              level: $("#cLevel").value,
              rating: Number($("#cRating").value || 4.6),
              hours: Number($("#cHours").value || 8),
              image: $("#cImage").value.trim(),
              price: Number($("#cPrice").value || 0),
              credits: Number($("#cCredits").value || 3),
              summary: $("#cSummary").value.trim(),
            };
            setLocalCourses(arr);
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

/* ===== Analytics (demo KPIs) ===== */
function renderAnalytics() {
  const active = getEnrolls().size;
  const enroll = getEnrolls().size;
  const avgRating = (() => {
    const list = ALL.length ? ALL : getLocalCourses();
    if (!list.length) return "—";
    const s = list.reduce((a, c) => a + Number(c.rating || 0), 0);
    return (s / list.length).toFixed(1);
  })();
  const revenue = (() => {
    const list = ALL.length ? ALL : getLocalCourses();
    const s = [...getEnrolls()]
      .map((id) => list.find((c) => c.id === id))
      .filter(Boolean)
      .reduce((a, c) => a + Number(c.price || 0), 0);
    return "$" + s.toFixed(2);
  })();
  $("#anActive").textContent = active || "0";
  $("#anEnroll").textContent = enroll || "0";
  $("#anRating").textContent = avgRating;
  $("#anRevenue").textContent = revenue;
}

/* ===== Student Dashboard (CRUD announcements) ===== */
function renderAnnouncements() {
  const box = $("#annList");
  if (!box) return;
  const list = getAnns().slice().reverse();
  box.innerHTML =
    list
      .map(
        (a) => `<div class="card" data-id="${a.id}">
    <div class="row between"><strong>${esc(
      a.title
    )}</strong><span class="small muted">${new Date(
          a.ts
        ).toLocaleString()}</span></div>
    <div class="row" style="justify-content:flex-end"><button class="btn small" data-edit="${
      a.id
    }">Edit</button> <button class="btn small" data-del="${
          a.id
        }">Delete</button></div>
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
      })
  );
  box.querySelectorAll("[data-edit]").forEach(
    (b) =>
      (b.onclick = () => {
        const id = b.getAttribute("data-edit");
        const arr = getAnns();
        const i = arr.findIndex((x) => x.id === id);
        if (i < 0) return;
        const t = prompt("Edit", arr[i].title);
        if (!t) return;
        arr[i].title = t;
        setAnns(arr);
        renderAnnouncements();
      })
  );
}
$("#btnAnnPost")?.addEventListener("click", () => {
  const t = $("#annTitle").value.trim();
  if (!t) return;
  const arr = getAnns();
  arr.push({
    id: "a_" + Math.random().toString(36).slice(2, 9),
    title: t,
    ts: Date.now(),
  });
  setAnns(arr);
  $("#annTitle").value = "";
  renderAnnouncements();
});

/* ===== Footer static content ===== */
const STATIC = {
  contact: `<p><strong>Contact us</strong></p><p>Email: support@openlearn.local</p><p>Phone: +1 (555) 010-0101</p>`,
  guide: `<p><strong>User Guide</strong></p><ul><li>Enroll a free course directly.</li><li>Paid courses require PayPal.</li><li>Read lessons in My Learning with notes & bookmarks.</li></ul>`,
  privacy: `<p><strong>Privacy</strong></p><p>We store minimal data in your browser (localStorage) for this demo. No tracking.</p>`,
  policy: `<p><strong>Policy</strong></p><p>Demo site only; data may reset. Use at your own discretion.</p>`,
};
document.addEventListener("click", (e) => {
  const a = e.target.closest("[data-open-static]");
  if (!a) return;
  e.preventDefault();
  const k = a.getAttribute("data-open-static");
  $("#stTitle").textContent = k.toUpperCase();
  $("#stBody").innerHTML = STATIC[k] || "—";
  $("#dlgStatic").showModal();
});
$$(".dlg-close").forEach((b) =>
  b.addEventListener("click", () => b.closest("dialog").close())
);

/* ===== Auth state (topbar login/logout) ===== */
let currentUser = null;
function gateUI() {
  const logged = !!currentUser;
  $("#btnLogin")?.classList.toggle("hidden", logged);
  $("#btnSignup")?.classList.toggle("hidden", logged);
  $("#userMenu")?.classList.toggle("hidden", !logged);
  $("#pfEmail") &&
    ($("#pfEmail").textContent = logged ? currentUser.email || "—" : "—");
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

/* ===== Boot ===== */
document.addEventListener("DOMContentLoaded", async () => {
  // theme init
  const t = localStorage.getItem("ol_theme") || "dark",
    f = localStorage.getItem("ol_font") || "14";
  applyPalette(t);
  applyFont(f);
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
    renderAdminTable();
    renderAnalytics();
  } catch (e) {
    console.warn(e);
  }
  $("#btnAddSample")?.addEventListener("click", addSamples);

  // default route
  showPage("courses");
});
