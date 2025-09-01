// OpenLearn Pro v2 — app.js
import {
  // ADMIN_KEY, BOOTSTRAP_ADMINS,
  app,
  auth,
  db,
  storage,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  serverTimestamp,
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from "./v1/firebase.js";

const ADMIN_KEY = window.ADMIN_KEY ?? "ADMIN2025";
const BOOTSTRAP_ADMINS = window.BOOTSTRAP_ADMINS ?? ["admin@openlearn.local"];

// ===== Utils =====
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const toast = (msg, ms = 2200) => {
  const t = $("#toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), ms);
};
const escapeHtml = (str = "") =>
  str.replace(
    /[&<>"']/g,
    (m) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[
        m
      ])
  );
const roleBadges = {
  owner: "👑 Owner",
  admin: "🛡️ Admin",
  instructor: "🎓 Instructor",
  ta: "🧩 TA",
  student: "🧑‍🎓 Student",
};

let currentUser = null;
let firstAuthResolved = false;
let lastCoursePage = [],
  lastGbPage = [],
  lastUsrPage = [];

function hasRole(...roles) {
  return currentUser && roles.includes(currentUser.role);
}
function gateUI() {
  $("#btnLogin")?.classList.toggle("hidden", !!currentUser);
  $("#btnSignup")?.classList.toggle("hidden", !!currentUser);
  $("#userMenu")?.classList.toggle("hidden", !currentUser);
  $("#userName").textContent = currentUser
    ? `${currentUser.displayName || currentUser.email} (${
        roleBadges[currentUser.role] || currentUser.role
      })`
    : "";
  $$(".admin-only").forEach((el) =>
    el.classList.toggle(
      "hidden",
      !hasRole("owner", "admin", "instructor", "ta")
    )
  );
}

function applyTheme() {
  const t = localStorage.getItem("ol_theme") || "dark";
  document.documentElement.dataset.theme = t;
}
$("#toggleTheme")?.addEventListener("click", () => {
  const cur = localStorage.getItem("ol_theme") || "dark";
  const next = cur === "dark" ? "light" : "dark";
  localStorage.setItem("ol_theme", next);
  applyTheme();
  toast("Theme: " + next);
});
applyTheme();

// --- v1 Sidebar bindings ---
function bindSidebarNav() {
  // click to switch page
  $$(".side-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      // active state
      $$(".side-item").forEach((x) => x.classList.remove("active"));
      btn.classList.add("active");
      // route
      const page = btn.dataset.page;
      showPage(page);
      // close sidebar on mobile
      $("#sidebar")?.classList.remove("show");
    });
  });

  // hamburger for mobile
  $("#hamburger")?.addEventListener("click", () => {
    $("#sidebar")?.classList.toggle("show");
  });
}
document.addEventListener("DOMContentLoaded", bindSidebarNav);

// override showPage to also sync left menu (if you keep top nav elsewhere)
const _showPageOrig = showPage;
showPage = (id) => {
  _showPageOrig(id);
  // sync left menu active
  $$(".side-item").forEach((x) =>
    x.classList.toggle("active", x.dataset.page === id)
  );
};

// ===== Catalog / Courses =====
function courseCard(c) {
  const img = c.imageUrl || "";
  return `<div class="card" data-open="${c.id}">
    <div class="cover" style="${
      img ? `background-image:url('${img}')` : ""
    }"></div>
    <h4>${escapeHtml(c.title)}</h4>
    <div class="row"><span class="badge">${escapeHtml(
      c.category || ""
    )}</span><span class="badge level">${escapeHtml(c.level || "")}</span></div>
    <p class="muted">${escapeHtml(c.desc || "")}</p>
    <div class="row"><button class="btn primary" data-enroll="${
      c.id
    }">Enroll</button><small class="muted">${c.hours || 0} hrs · ⭐ ${(
    c.rating ?? 0
  ).toFixed(1)}</small></div>
  </div>`;
}

async function renderCatalog(direction = 0) {
  const grid = $("#courseGrid");
  if (!grid) return;
  const qTxt = $("#searchInput").value.trim().toLowerCase();
  const fLevel = $("#filterLevel").value;
  const fCat = $("#filterCategory").value;
  const sort = $("#sortBy").value;

  let orderField = "title",
    orderDir = "asc";
  if (!qTxt) {
    const [k, dir] = sort.split("-");
    if (k === "price") orderField = "price";
    else if (k === "rating") {
      orderField = "rating";
      orderDir = dir === "desc" ? "desc" : "asc";
    } else {
      orderField = "title";
      orderDir = dir === "desc" ? "desc" : "asc";
    }
  }

  try {
    let base = collection(db, "courses");
    let cons = [orderBy(orderField, orderDir), limit(9)];
    if (qTxt)
      cons = [
        where("k", "array-contains", qTxt),
        orderBy("title", "asc"),
        limit(9),
      ];
    if (fLevel) cons.splice(0, 0, where("level", "==", fLevel));
    if (fCat) cons.splice(0, 0, where("category", "==", fCat));

    if (!qTxt) {
      if (direction === 1 && lastCoursePage.length)
        cons.push(startAfter(lastCoursePage[lastCoursePage.length - 1]));
      else if (direction === -1 && lastCoursePage.length > 1) {
        lastCoursePage.pop();
        const prev = lastCoursePage[lastCoursePage.length - 2];
        if (prev) cons.push(startAfter(prev));
      }
    }
    const snap = await getDocs(query(base, ...cons));
    const items = [];
    let last = null;
    snap.forEach((d) => {
      items.push({ id: d.id, ...d.data() });
      last = d;
    });
    if (!qTxt && direction !== -1 && last) lastCoursePage.push(last);

    $("#pgInfo").textContent = `Showing ${items.length} courses`;
    $("#pgPrev").disabled = qTxt || lastCoursePage.length <= 1;
    $("#pgNext").disabled = qTxt || items.length < 9;
    grid.innerHTML =
      items.map(courseCard).join("") ||
      `<p class="muted">No courses found…</p>`;

    $$("#courseGrid [data-enroll]").forEach((b) =>
      b.addEventListener("click", () => enroll(b.dataset.enroll))
    );
    $$("#courseGrid .card").forEach((c) =>
      c.addEventListener("click", (e) => {
        if (e.target.closest("[data-enroll]")) return;
        openCourse(c.dataset.open);
      })
    );

    const cats = Array.from(
      new Set(items.map((c) => c.category).filter(Boolean))
    ).sort();
    const sel = $("#filterCategory");
    const cur = sel.value;
    sel.innerHTML =
      `<option value="">All Categories</option>` +
      cats.map((c) => `<option>${escapeHtml(c)}</option>`).join("");
    sel.value = cur;
  } catch (err) {
    console.error("renderCatalog error:", err);
    toast(err.message || "Catalog error");
    $(
      "#courseGrid"
    ).innerHTML = `<p class="muted">Permission/Config error reading courses.</p>`;
  }
}

async function enroll(courseId) {
  if (!currentUser) {
    toast("Login required.");
    return;
  }
  try {
    const coll = collection(db, "enrollments");
    const existing = await getDocs(
      query(
        coll,
        where("userId", "==", currentUser.uid),
        where("courseId", "==", courseId)
      )
    );
    if (!existing.empty) {
      toast("Already enrolled.");
      openCourse(courseId);
      return;
    }
    await addDoc(coll, {
      userId: currentUser.uid,
      courseId,
      enrolledAt: serverTimestamp(),
      progress: {},
    });
    toast("Enrolled!");
    renderMyLearning();
    openCourse(courseId);
  } catch (err) {
    console.error("enroll error:", err);
    toast("Enroll failed");
  }
}

// ===== Course page (lessons, comments, assignments, progress, certificate) =====
let selectedCourseId = null,
  selectedLessonId = null,
  selectedCourseCache = null;

async function openCourse(courseId) {
  selectedCourseId = courseId;
  try {
    const d = await getDoc(doc(db, "courses", courseId));
    if (!d.exists()) {
      toast("Course not found");
      return;
    }
    selectedCourseCache = { id: d.id, ...d.data() };
    const c = selectedCourseCache;
    $("#courseHeader").innerHTML = `
      <div class="cover" style="${
        c.imageUrl ? `background-image:url('${c.imageUrl}')` : ""
      }"></div>
      <div>
        <h2>${escapeHtml(c.title)}</h2>
        <div class="row">
          <span class="badge">${escapeHtml(c.category || "")}</span>
          <span class="badge level">${escapeHtml(c.level || "")}</span>
          <span class="badge">⭐ ${(c.rating ?? 0).toFixed(1)}</span>
          <span class="badge">$${Number(c.price || 0).toFixed(2)}</span>
        </div>
        <p class="muted">${escapeHtml(c.desc || "")}</p>
        <div class="row"><button id="btnEnrollNow" class="btn primary">Enroll</button></div>
      </div>`;
    $("#btnEnrollNow").addEventListener("click", () => enroll(courseId));
    await renderLessonList(courseId);
    await renderComments(courseId);
    await renderAssignments(courseId);
    await refreshProgressBox(courseId);
    showPage("course");
    $("#btnMarkComplete").onclick = () => markLessonComplete();
    $("#btnCertificate").onclick = () => generateCertificate();
  } catch (err) {
    console.error("openCourse error:", err);
    toast("Course error");
  }
}

async function renderLessonList(courseId) {
  const list = $("#lessonList");
  list.innerHTML = "";
  try {
    const snap = await getDocs(
      query(
        collection(db, "courses", courseId, "lessons"),
        orderBy("order", "asc")
      )
    );
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    if (!items.length) {
      list.innerHTML = `<li class="muted">No lessons yet.</li>`;
      $("#lessonContent").innerHTML = "";
      return;
    }
    list.innerHTML = items
      .map(
        (l, i) =>
          `<li data-id="${l.id}">${i + 1}. ${escapeHtml(
            l.title
          )} <small class="muted">(${l.type})</small></li>`
      )
      .join("");
    $$("#lessonList li").forEach((li) =>
      li.addEventListener("click", () => openLesson(courseId, li.dataset.id))
    );
    openLesson(courseId, items[0].id);
  } catch (err) {
    console.error("renderLessonList", err);
    list.innerHTML = `<li class="muted">Permission error.</li>`;
  }
}

async function openLesson(courseId, lessonId) {
  selectedLessonId = lessonId;
  try {
    const d = await getDoc(doc(db, "courses", courseId, "lessons", lessonId));
    if (!d.exists()) return;
    const l = d.data();
    let html = `<h3>${escapeHtml(l.title)}</h3>`;
    if (l.type === "video") {
      if (
        l.videoUrl?.includes("youtube.com") ||
        l.videoUrl?.includes("youtu.be")
      ) {
        const vid = l.videoUrl
          .replace("watch?v=", "embed/")
          .replace("youtu.be/", "youtube.com/embed/");
        html += `<iframe src="${vid}" allowfullscreen></iframe>`;
      } else if (l.videoUrl)
        html += `<video controls src="${l.videoUrl}"></video>`;
      if (l.content) html += `<div>${l.content}</div>`;
    } else {
      html += `<div contenteditable="true" class="card" id="rtArea">${
        l.content || "<p class='muted'>No content.</p>"
      }</div>
      <div class="row"><button id="btnSaveRT" class="btn ghost instructor-only hidden">Save Article</button></div>`;
    }
    $("#lessonContent").innerHTML = html;
    $("#btnSaveRT")?.addEventListener("click", async () => {
      const v = $("#rtArea").innerHTML;
      await updateDoc(doc(db, "courses", courseId, "lessons", lessonId), {
        content: v,
        updatedAt: serverTimestamp(),
      });
      toast("Saved");
    });
  } catch (err) {
    console.error("openLesson", err);
    $("#lessonContent").innerHTML = `<p class="muted">Permission error.</p>`;
  }
}

// Progress
async function refreshProgressBox(courseId) {
  if (!currentUser) {
    $("#progressBox").textContent = "-";
    return;
  }
  try {
    const enr = await getDocs(
      query(
        collection(db, "enrollments"),
        where("userId", "==", currentUser.uid),
        where("courseId", "==", courseId)
      )
    );
    let p = {};
    if (!enr.empty) p = enr.docs[0].data().progress || {};
    const done = Object.keys(p).filter((k) => p[k] === true).length;
    const total = (
      await getDocs(query(collection(db, "courses", courseId, "lessons")))
    ).size;
    $("#progressBox").textContent = `${done}/${total} lessons completed`;
  } catch (err) {
    console.error("progress", err);
    $("#progressBox").textContent = "-";
  }
}
async function markLessonComplete() {
  if (!currentUser || !selectedCourseId || !selectedLessonId) return;
  try {
    const enrQ = await getDocs(
      query(
        collection(db, "enrollments"),
        where("userId", "==", currentUser.uid),
        where("courseId", "==", selectedCourseId)
      )
    );
    let id = null,
      data = null;
    if (!enrQ.empty) {
      id = enrQ.docs[0].id;
      data = enrQ.docs[0].data();
    } else {
      const ref = await addDoc(collection(db, "enrollments"), {
        userId: currentUser.uid,
        courseId: selectedCourseId,
        enrolledAt: serverTimestamp(),
        progress: {},
      });
      id = ref.id;
      data = { progress: {} };
    }
    data.progress = data.progress || {};
    data.progress[selectedLessonId] = true;
    await updateDoc(doc(db, "enrollments", id), {
      progress: data.progress,
      updatedAt: serverTimestamp(),
    });
    toast("Marked complete");
    refreshProgressBox(selectedCourseId);
  } catch (err) {
    console.error("markLessonComplete", err);
    toast("Failed");
  }
}

// Comments / Discussion
async function renderComments(courseId) {
  const box = $("#comments");
  if (!box) return;
  try {
    const snap = await getDocs(
      query(
        collection(db, "courses", courseId, "comments"),
        orderBy("at", "desc"),
        limit(20)
      )
    );
    box.innerHTML =
      snap.docs
        .map((d) => {
          const c = d.data();
          return `<div class="card"><b>${escapeHtml(
            c.author || "Anon"
          )}</b> <span class="muted">${
            c.at?.toDate?.().toLocaleString?.() || ""
          }</span><div>${escapeHtml(c.text || "")}</div></div>`;
        })
        .join("") || `<div class="muted">No comments.</div>`;
  } catch (err) {
    console.error("renderComments", err);
    box.innerHTML = `<div class="muted">Permission error.</div>`;
  }
}
$("#formComment")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUser || !selectedCourseId) {
    toast("Login to comment");
    return;
  }
  try {
    const txt = $("#commentText").value.trim();
    if (!txt) return;
    await addDoc(collection(db, "courses", selectedCourseId, "comments"), {
      author: currentUser.displayName || currentUser.email,
      text: txt,
      at: serverTimestamp(),
      uid: currentUser.uid,
    });
    $("#commentText").value = "";
    renderComments(selectedCourseId);
  } catch (err) {
    console.error("comment", err);
    toast("Comment failed");
  }
});

// Assignments
function inputBindUpload(inputEl, folder, onDone) {
  inputEl.addEventListener("change", () => {
    const f = inputEl.files[0];
    if (!f) return;
    const r = ref(storage, `${folder}/${Date.now()}_${f.name}`);
    const task = uploadBytesResumable(r, f);
    task.on(
      "state_changed",
      (s) => {
        const pct = Math.round((s.bytesTransferred / s.totalBytes) * 100);
        toast(`Uploading… ${pct}%`);
      },
      (err) => {
        console.error("upload", err);
        toast("Upload error");
      },
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        onDone(url);
      }
    );
  });
}
async function renderAssignments(courseId) {
  const wrap = $("#assList");
  if (!wrap) return;
  try {
    const snap = await getDocs(
      query(
        collection(db, "courses", courseId, "assignments"),
        orderBy("due", "asc")
      )
    );
    wrap.innerHTML =
      snap.docs
        .map((d) => {
          const a = d.data();
          return `<div class="card">
        <b>${escapeHtml(a.title)}</b> <span class="muted">due ${
            a.due?.toDate?.().toLocaleDateString?.() || ""
          }</span>
        <div>${escapeHtml(a.desc || "")}</div>
        <div class="muted">Max: ${a.max || 0} pts</div>
      </div>`;
        })
        .join("") || `<div class="muted">No assignments.</div>`;
  } catch (err) {
    console.error("renderAssignments", err);
    wrap.innerHTML = `<div class="muted">Permission error.</div>`;
  }
}
$("#formSubmitAss")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUser || !selectedCourseId) {
    toast("Login first");
    return;
  }
  const inp = $("#assFile");
  if (!inp.files?.length) {
    toast("Select a file");
    return;
  }
  inputBindUpload(inp, "assignment-submits", async (url) => {
    try {
      await addDoc(collection(db, "courses", selectedCourseId, "submissions"), {
        uid: currentUser.uid,
        url,
        at: serverTimestamp(),
      });
      toast("Submitted");
      inp.value = "";
    } catch (err) {
      console.error("submit", err);
      toast("Submit failed");
    }
  });
  const evt = new Event("change");
  inp.dispatchEvent(evt);
});

// Certificate
async function generateCertificate() {
  if (!currentUser || !selectedCourseCache) {
    toast("Open a course");
    return;
  }
  try {
    const el = document.createElement("canvas");
    el.width = 1200;
    el.height = 800;
    const ctx = el.getContext("2d");
    ctx.fillStyle = "#0b0f17";
    ctx.fillRect(0, 0, 1200, 800);
    ctx.strokeStyle = "#66d9ef";
    ctx.lineWidth = 6;
    ctx.strokeRect(20, 20, 1160, 760);
    ctx.fillStyle = "#e7ecf3";
    ctx.font = "bold 48px system-ui";
    ctx.fillText("Certificate of Completion", 290, 180);
    ctx.font = "28px system-ui";
    ctx.fillText("This certifies that", 500, 260);
    ctx.font = "bold 40px system-ui";
    ctx.fillText(currentUser.displayName || currentUser.email, 260, 330);
    ctx.font = "28px system-ui";
    ctx.fillText("has successfully completed the course", 420, 390);
    ctx.font = "bold 34px system-ui";
    ctx.fillText(selectedCourseCache.title, 220, 450);
    const dt = new Date().toLocaleDateString();
    ctx.font = "24px system-ui";
    ctx.fillText("Date: " + dt, 220, 520);
    const url = el.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `Certificate - ${selectedCourseCache.title}.png`;
    a.click();
  } catch (err) {
    console.error("cert", err);
    toast("Certificate error");
  }
}

// ===== Admin area =====
async function loadCoursesForAdminTable() {
  try {
    const snap = await getDocs(
      query(collection(db, "courses"), orderBy("title", "asc"), limit(50))
    );
    const rows = snap.docs
      .map((d) => {
        const c = d.data();
        const img = c.imageUrl
          ? `<img src="${c.imageUrl}" alt="" style="width:64px;height:40px;border-radius:6px;object-fit:cover">`
          : `<div style="width:64px;height:40px;border:1px solid rgba(255,255,255,.08);border-radius:6px;"></div>`;
        return `<tr>
        <td>${img}</td>
        <td>${escapeHtml(c.title || "")}</td>
        <td>${escapeHtml(c.category || "")}</td>
        <td>${escapeHtml(c.level || "")}</td>
        <td>$${Number(c.price || 0).toFixed(2)}</td>
        <td>${Number(c.rating || 0).toFixed(1)}</td>
        <td><button class="btn" data-edit="${
          d.id
        }">Edit</button> <button class="btn danger" data-del="${
          d.id
        }">Delete</button></td>
      </tr>`;
      })
      .join("");
    $("#courseTable tbody").innerHTML =
      rows || `<tr><td colspan="7" class="muted">No courses.</td></tr>`;
    $$("#courseTable [data-edit]").forEach((b) =>
      b.addEventListener("click", () => openCourseDialog(b.dataset.edit))
    );
    $$("#courseTable [data-del]").forEach((b) =>
      b.addEventListener("click", async () => {
        if (!confirm("Delete course?")) return;
        await deleteDoc(doc(db, "courses", b.dataset.del));
        loadCoursesForAdminTable();
        renderCatalog();
      })
    );
  } catch (err) {
    console.error("loadCoursesForAdminTable", err);
    $(
      "#courseTable tbody"
    ).innerHTML = `<tr><td colspan="7" class="muted">Permission error.</td></tr>`;
  }
}
function bindImageUpload(inputEl, folder, onDone) {
  inputEl.addEventListener("change", () => {
    const f = inputEl.files[0];
    if (!f) return;
    const r = ref(storage, `${folder}/${Date.now()}_${f.name}`);
    const task = uploadBytesResumable(r, f);
    task.on(
      "state_changed",
      (s) => {
        const pct = Math.round((s.bytesTransferred / s.totalBytes) * 100);
        toast(`Uploading… ${pct}%`);
      },
      (err) => {
        console.error("upload", err);
        toast("Upload error");
      },
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        onDone(url);
      }
    );
  });
}
async function openCourseDialog(id = null) {
  $("#courseDlgTitle").textContent = id ? "Edit Course" : "New Course";
  $("#cId").value = id || "";
  $("#formCourse").reset();
  $("#cImage").value = "";
  if (id) {
    try {
      const d = await getDoc(doc(db, "courses", id));
      const c = d.data() || {};
      $("#cTitle").value = c.title || "";
      $("#cCategory").value = c.category || "";
      $("#cLevel").value = c.level || "Beginner";
      $("#cPrice").value = c.price || 0;
      $("#cRating").value = c.rating || 0;
      $("#cHours").value = c.hours || 1;
      $("#cDesc").value = c.desc || "";
    } catch (err) {
      console.error("openCourseDialog load", err);
    }
  }
  bindImageUpload(
    $("#cImage"),
    "course-images",
    (url) => ($("#cImage").dataset.url = url)
  );
  $("#formCourse").onsubmit = async (e) => {
    e.preventDefault();
    const id = $("#cId").value;
    try {
      const item = {
        title: $("#cTitle").value.trim(),
        category: $("#cCategory").value.trim(),
        level: $("#cLevel").value,
        price: Number($("#cPrice").value),
        rating: Number($("#cRating").value),
        hours: Number($("#cHours").value),
        desc: $("#cDesc").value.trim(),
        imageUrl:
          $("#cImage").dataset.url ||
          (id
            ? (await getDoc(doc(db, "courses", id))).data()?.imageUrl || ""
            : ""),
        k: buildKeywords($("#cTitle").value),
      };
      if (id)
        await updateDoc(doc(db, "courses", id), {
          ...item,
          updatedAt: serverTimestamp(),
        });
      else
        await addDoc(collection(db, "courses"), {
          ...item,
          createdAt: serverTimestamp(),
          createdBy: currentUser?.uid || null,
        });
      $("#dlgCourse").close();
      loadCoursesForAdminTable();
      renderCatalog();
      toast("Course saved.");
    } catch (err) {
      console.error("save course", err);
      toast("Save failed");
    }
  };
  $("#dlgCourse").showModal();
}
function buildKeywords(title = "") {
  const t = title.toLowerCase();
  const ks = new Set();
  for (let i = 0; i < t.length; i++)
    for (let j = i + 1; j <= t.length; j++) ks.add(t.slice(i, j));
  t.split(/\s+/).forEach((w) => ks.add(w));
  return Array.from(ks)
    .filter((x) => x.length >= 2 && x.length <= 20)
    .slice(0, 200);
}
async function loadCoursesInto(selectEl) {
  try {
    const snap = await getDocs(
      query(collection(db, "courses"), orderBy("title", "asc"))
    );
    selectEl.innerHTML = snap.docs
      .map(
        (d) => `<option value="${d.id}">${escapeHtml(d.data().title)}</option>`
      )
      .join("");
  } catch (err) {
    console.error("loadCoursesInto", err);
    selectEl.innerHTML = "";
  }
}
async function refreshLessonsTable() {
  const courseId = $("#lsCourseSelect").value;
  if (!courseId) {
    $("#lessonTable tbody").innerHTML = "";
    return;
  }
  try {
    const snap = await getDocs(
      query(
        collection(db, "courses", courseId, "lessons"),
        orderBy("order", "asc")
      )
    );
    const rows = snap.docs
      .map((d) => {
        const l = d.data();
        return `<tr>
        <td>${l.order || 0}</td>
        <td>${escapeHtml(l.title || "")}</td>
        <td>${escapeHtml(l.type || "")}</td>
        <td>${Number(l.duration || 0)} mins</td>
        <td>${l.published ? "Yes" : "No"}</td>
        <td><button class="btn" data-ledit="${
          d.id
        }">Edit</button> <button class="btn danger" data-ldel="${
          d.id
        }">Delete</button></td>
      </tr>`;
      })
      .join("");
    $("#lessonTable tbody").innerHTML =
      rows || `<tr><td colspan="6" class="muted">No lessons.</td></tr>`;
    $$("#lessonTable [data-ledit]").forEach((b) =>
      b.addEventListener("click", () =>
        openLessonDialog(courseId, b.dataset.ledit)
      )
    );
    $$("#lessonTable [data-ldel]").forEach((b) =>
      b.addEventListener("click", async () => {
        if (!confirm("Delete lesson?")) return;
        await deleteDoc(
          doc(db, "courses", courseId, "lessons", b.dataset.ldel)
        );
        refreshLessonsTable();
        if (selectedCourseId === courseId) renderLessonList(courseId);
      })
    );
  } catch (err) {
    console.error("refreshLessonsTable", err);
    $(
      "#lessonTable tbody"
    ).innerHTML = `<tr><td colspan="6" class="muted">Permission error.</td></tr>`;
  }
}
function inputBindVideoUpload() {
  const el = $("#lVideo");
  if (!el) return;
  el.addEventListener("change", () => {
    const f = el.files[0];
    if (!f) return;
    const r = ref(storage, `lesson-videos/${Date.now()}_${f.name}`);
    const task = uploadBytesResumable(r, f);
    task.on(
      "state_changed",
      (s) =>
        toast(
          `Uploading… ${Math.round((s.bytesTransferred / s.totalBytes) * 100)}%`
        ),
      (err) => {
        console.error("video upload", err);
        toast("Upload error");
      },
      async () => {
        $("#lVideoURL").value = await getDownloadURL(task.snapshot.ref);
        toast("Video ready");
      }
    );
  });
}
async function openLessonDialog(courseId, lessonId = null) {
  $("#lessonDlgTitle").textContent = lessonId ? "Edit Lesson" : "New Lesson";
  $("#lId").value = lessonId || "";
  $("#lCourseId").value = courseId;
  $("#formLesson").reset();
  $("#lVideo").value = "";
  $("#lVideoURL").value = "";
  if (lessonId) {
    try {
      const d = await getDoc(doc(db, "courses", courseId, "lessons", lessonId));
      const l = d.data() || {};
      $("#lTitle").value = l.title || "";
      $("#lType").value = l.type || "video";
      $("#lOrder").value = l.order || 1;
      $("#lDuration").value = l.duration || 10;
      $("#lContent").value = l.content || "";
      $("#lPublished").checked = !!l.published;
      $("#lVideoURL").value = l.videoUrl || "";
    } catch (err) {
      console.error("openLessonDialog load", err);
    }
  }
  inputBindVideoUpload();
  $("#formLesson").onsubmit = async (e) => {
    e.preventDefault();
    const id = $("#lId").value;
    try {
      const item = {
        title: $("#lTitle").value.trim(),
        type: $("#lType").value,
        order: Number($("#lOrder").value || 1),
        duration: Number($("#lDuration").value || 0),
        content: $("#lContent").value.trim(),
        videoUrl: $("#lVideoURL").value.trim(),
        published: $("#lPublished").checked,
      };
      if (id)
        await updateDoc(doc(db, "courses", courseId, "lessons", id), {
          ...item,
          updatedAt: serverTimestamp(),
        });
      else
        await addDoc(collection(db, "courses", courseId, "lessons"), {
          ...item,
          createdAt: serverTimestamp(),
        });
      $("#dlgLesson").close();
      refreshLessonsTable();
      if (selectedCourseId === courseId) renderLessonList(courseId);
      toast("Lesson saved.");
    } catch (err) {
      console.error("save lesson", err);
      toast("Save failed");
    }
  };
  $("#dlgLesson").showModal();
}
async function refreshQuizTable() {
  const courseId = $("#qzCourseSelect").value;
  if (!courseId) {
    $("#quizTable tbody").innerHTML = "";
    return;
  }
  try {
    const snap = await getDocs(
      query(collection(db, "courses", courseId, "quizzes"))
    );
    const rows = snap.docs
      .map((d) => {
        const q = d.data();
        return `<tr>
        <td>${escapeHtml(q.title || "")}</td>
        <td>${q.questions?.length || 0}</td>
        <td>${q.totalPoints || 0}</td>
        <td><button class="btn" data-qedit="${
          d.id
        }">Edit</button> <button class="btn danger" data-qdel="${
          d.id
        }">Delete</button></td>
      </tr>`;
      })
      .join("");
    $("#quizTable tbody").innerHTML =
      rows || `<tr><td colspan="4" class="muted">No quizzes.</td></tr>`;
    $$("#quizTable [data-qedit]").forEach((b) =>
      b.addEventListener("click", () =>
        openQuizDialog(courseId, b.dataset.qedit)
      )
    );
    $$("#quizTable [data-qdel]").forEach((b) =>
      b.addEventListener("click", async () => {
        if (!confirm("Delete quiz?")) return;
        await deleteDoc(
          doc(db, "courses", courseId, "quizzes", b.dataset.qdel)
        );
        refreshQuizTable();
      })
    );
  } catch (err) {
    console.error("refreshQuizTable", err);
    $(
      "#quizTable tbody"
    ).innerHTML = `<tr><td colspan="4" class="muted">Permission error.</td></tr>`;
  }
}
function quizQuestionEditor(
  i,
  q = { text: "", options: ["", "", "", ""], answerIndex: 0, points: 1 }
) {
  return `<fieldset class="qfield card">
    <legend>Question ${i + 1}</legend>
    <input type="text" data-q="text" placeholder="Question text" value="${escapeHtml(
      q.text
    )}">
    ${q.options
      .map(
        (op, idx) => `
      <div class="row">
        <label class="checkbox"><input type="radio" name="ans${i}" ${
          q.answerIndex === idx ? "checked" : ""
        } data-q="answerIndex" data-idx="${idx}"> Correct</label>
        <input type="text" data-q="opt" data-idx="${idx}" placeholder="Option ${
          idx + 1
        }" value="${escapeHtml(op)}">
      </div>
    `
      )
      .join("")}
    <input type="number" data-q="points" min="1" step="1" value="${
      q.points || 1
    }" placeholder="Points">
  </fieldset>`;
}
function collectQuizEditor() {
  const fields = $$("#qQuestions .qfield");
  const questions = fields.map((f) => {
    const text = $("input[data-q='text']", f).value.trim();
    const opts = $$("input[data-q='opt']", f).map((x) => x.value.trim());
    const ans =
      $$("input[data-q='answerIndex']", f).find((x) => x.checked)?.dataset
        .idx || 0;
    const pts = Number($("input[data-q='points']", f).value || 1);
    return { text, options: opts, answerIndex: Number(ans), points: pts };
  });
  const totalPoints = questions.reduce((a, b) => a + (b.points || 1), 0);
  return { questions, totalPoints };
}
async function openQuizDialog(courseId, quizId = null) {
  $("#quizDlgTitle").textContent = quizId ? "Edit Quiz" : "New Quiz";
  $("#qId").value = quizId || "";
  $("#qCourseId").value = courseId;
  $("#qTitle").value = "";
  $("#qQuestions").innerHTML = "";
  if (quizId) {
    try {
      const d = await getDoc(doc(db, "courses", courseId, "quizzes", quizId));
      const q = d.data() || {};
      $("#qTitle").value = q.title || "";
      const qs = q.questions || [];
      $("#qQuestions").innerHTML = qs
        .map((qq, i) => quizQuestionEditor(i, qq))
        .join("");
    } catch (err) {
      console.error("openQuizDialog load", err);
    }
  } else {
    $("#qQuestions").innerHTML = quizQuestionEditor(0);
  }
  $("#btnAddQ").onclick = () => {
    const count = $$("#qQuestions .qfield").length;
    $("#qQuestions").insertAdjacentHTML("beforeend", quizQuestionEditor(count));
  };
  $("#formQuiz").onsubmit = async (e) => {
    e.preventDefault();
    try {
      const { questions, totalPoints } = collectQuizEditor();
      const item = { title: $("#qTitle").value.trim(), questions, totalPoints };
      const id = $("#qId").value;
      if (id)
        await updateDoc(doc(db, "courses", courseId, "quizzes", id), {
          ...item,
          updatedAt: serverTimestamp(),
        });
      else
        await addDoc(collection(db, "courses", courseId, "quizzes"), {
          ...item,
          createdAt: serverTimestamp(),
        });
      $("#dlgQuiz").close();
      refreshQuizTable();
      toast("Quiz saved.");
    } catch (err) {
      console.error("save quiz", err);
      toast("Save failed");
    }
  };
  $("#dlgQuiz").showModal();
}

// Assignments (admin)
async function loadAssignmentsTable() {
  const cid = $("#asCourseSelect").value;
  if (!cid) {
    $("#assTable tbody").innerHTML = "";
    return;
  }
  try {
    const snap = await getDocs(
      query(
        collection(db, "courses", cid, "assignments"),
        orderBy("due", "asc")
      )
    );
    const rows = snap.docs
      .map((d) => {
        const a = d.data();
        return `<tr>
        <td>${escapeHtml(a.title || "")}</td>
        <td>${a.due?.toDate?.().toLocaleDateString?.() || ""}</td>
        <td>${a.max || 0}</td>
        <td><button class="btn" data-aedit="${
          d.id
        }">Edit</button> <button class="btn danger" data-adel="${
          d.id
        }">Delete</button></td>
      </tr>`;
      })
      .join("");
    $("#assTable tbody").innerHTML =
      rows || `<tr><td colspan="4" class="muted">No assignments.</td></tr>`;
    $$("#assTable [data-aedit]").forEach((b) =>
      b.addEventListener("click", () => openAssDialog(cid, b.dataset.aedit))
    );
    $$("#assTable [data-adel]").forEach((b) =>
      b.addEventListener("click", async () => {
        if (!confirm("Delete assignment?")) return;
        await deleteDoc(doc(db, "courses", cid, "assignments", b.dataset.adel));
        loadAssignmentsTable();
      })
    );
  } catch (err) {
    console.error("loadAssignmentsTable", err);
    $(
      "#assTable tbody"
    ).innerHTML = `<tr><td colspan="4" class="muted">Permission error.</td></tr>`;
  }
}
async function openAssDialog(courseId, assId = null) {
  $("#assDlgTitle").textContent = assId ? "Edit Assignment" : "New Assignment";
  $("#aId").value = assId || "";
  $("#aCourseId").value = courseId;
  $("#formAss").reset();
  if (assId) {
    try {
      const d = await getDoc(
        doc(db, "courses", courseId, "assignments", assId)
      );
      const a = d.data() || {};
      $("#aTitle").value = a.title || "";
      $("#aDue").value = a.due?.toDate?.().toISOString?.().slice(0, 10) || "";
      $("#aMax").value = a.max || 100;
      $("#aDesc").value = a.desc || "";
    } catch (err) {
      console.error("openAssDialog load", err);
    }
  }
  $("#formAss").onsubmit = async (e) => {
    e.preventDefault();
    try {
      const item = {
        title: $("#aTitle").value.trim(),
        due: new Date($("#aDue").value),
        max: Number($("#aMax").value || 100),
        desc: $("#aDesc").value.trim(),
      };
      const id = $("#aId").value;
      if (id)
        await updateDoc(doc(db, "courses", courseId, "assignments", id), {
          ...item,
          updatedAt: serverTimestamp(),
        });
      else
        await addDoc(collection(db, "courses", courseId, "assignments"), {
          ...item,
          createdAt: serverTimestamp(),
        });
      $("#dlgAss").close();
      loadAssignmentsTable();
      toast("Assignment saved.");
    } catch (err) {
      console.error("save assignment", err);
      toast("Save failed");
    }
  };
  $("#dlgAss").showModal();
}

// Users / Analytics
async function renderUsers(direction = 0) {
  try {
    let cons = [orderBy("email", "asc"), limit(20)];
    if (direction === 1 && lastUsrPage.length)
      cons.push(startAfter(lastUsrPage[lastUsrPage.length - 1]));
    else if (direction === -1 && lastUsrPage.length > 1) {
      lastUsrPage.pop();
      const prev = lastUsrPage[lastUsrPage.length - 2];
      if (prev) cons.push(startAfter(prev));
    }
    const snap = await getDocs(query(collection(db, "users"), ...cons));
    let last = null;
    const rows = snap.docs
      .map((d) => {
        last = d;
        const u = d.data();
        return `<tr>
        <td>${escapeHtml(u.name || "")}</td>
        <td>${escapeHtml(u.email || "")}</td>
        <td>
          <select data-role="${d.id}">
            ${["owner", "admin", "instructor", "ta", "student"]
              .map(
                (r) =>
                  `<option value="${r}" ${
                    u.role === r ? "selected" : ""
                  }>${r}</option>`
              )
              .join("")}
          </select>
        </td>
        <td>${u.active ? "Yes" : "No"}</td>
        <td><button class="btn" data-deact="${d.id}">${
          u.active ? "Deactivate" : "Activate"
        }</button></td>
      </tr>`;
      })
      .join("");
    $("#userTable tbody").innerHTML =
      rows || `<tr><td colspan="5" class="muted">No users.</td></tr>`;
    if (direction !== -1 && last) lastUsrPage.push(last);
    $("#usrPrev").disabled = lastUsrPage.length <= 1;
    $("#usrNext").disabled = snap.size < 20;
    $("#usrInfo").textContent = `Showing ${snap.size} users`;

    $$("#userTable [data-role]").forEach((sel) =>
      sel.addEventListener("change", async (e) => {
        const uid = e.target.getAttribute("data-role");
        const role = e.target.value;
        if (!confirm(`Change role to ${role}?`)) return;
        await updateDoc(doc(db, "users", uid), { role });
        toast("Role updated.");
      })
    );
    $$("#userTable [data-deact]").forEach((b) =>
      b.addEventListener("click", async () => {
        const uid = b.dataset.deact;
        const u = await getDoc(doc(db, "users", uid));
        const active = !u.data().active;
        await updateDoc(doc(db, "users", uid), { active });
        renderUsers();
      })
    );
  } catch (err) {
    console.error("renderUsers", err);
    $(
      "#userTable tbody"
    ).innerHTML = `<tr><td colspan="5" class="muted">Permission error.</td></tr>`;
  }
}
async function renderAnalytics() {
  try {
    const users = (await getDocs(query(collection(db, "users"), limit(1000))))
      .size;
    const courses = (
      await getDocs(query(collection(db, "courses"), limit(1000)))
    ).size;
    const enrolls = (
      await getDocs(query(collection(db, "enrollments"), limit(1000)))
    ).size;
    $(
      "#anTotals"
    ).textContent = `Users: ${users} · Courses: ${courses} · Enrollments: ${enrolls}`;

    const recent = await getDocs(
      query(collection(db, "users"), orderBy("createdAt", "desc"), limit(10))
    );
    $("#anSignups").innerHTML = recent.docs
      .map((d) => {
        const u = d.data();
        return `<div>${escapeHtml(u.email || "")} <span class="muted">${
          u.createdAt?.toDate?.().toLocaleString?.() || ""
        }</span></div>`;
      })
      .join("");
  } catch (err) {
    console.error("analytics", err);
    $("#anTotals").textContent = "-";
    $("#anSignups").textContent = "-";
  }
}

// ===== Auth =====
async function ensureProfile(user, maybeAdminKey = "") {
  const pRef = doc(db, "users", user.uid);
  const snap = await getDoc(pRef);
  const email = (user.email || "").toLowerCase();
  const isBootstrapAdmin = (BOOTSTRAP_ADMINS || []).includes(email);
  const role =
    maybeAdminKey === ADMIN_KEY || isBootstrapAdmin ? "admin" : "student";

  if (!snap.exists()) {
    await setDoc(pRef, {
      name: user.displayName || "",
      email: user.email,
      role,
      active: true,
      createdAt: serverTimestamp(),
    });
    return role;
  } else {
    const data = snap.data();
    if (isBootstrapAdmin && data.role !== "admin") {
      await updateDoc(pRef, { role: "admin" });
      return "admin";
    }
    return data.role || role;
  }
}
$("#btnLogin")?.addEventListener("click", () => $("#dlgLogin").showModal());
$("#btnSignup")?.addEventListener("click", () => $("#dlgSignup").showModal());
$("#btnLogout")?.addEventListener("click", async () => {
  await signOut(auth);
});
$("#lnkForgot")?.addEventListener("click", (e) => {
  e.preventDefault();
  $("#dlgLogin").close();
  $("#dlgForgot").showModal();
});
$("#lnkToSignup")?.addEventListener("click", (e) => {
  e.preventDefault();
  $("#dlgLogin").close();
  $("#dlgSignup").showModal();
});
$("#lnkToLogin")?.addEventListener("click", (e) => {
  e.preventDefault();
  $("#dlgSignup").close();
  $("#dlgLogin").showModal();
});

$("#formLogin")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    await signInWithEmailAndPassword(
      auth,
      $("#loginEmail").value,
      $("#loginPassword").value
    );
    $("#dlgLogin").close();
  } catch (err) {
    console.error("login", err);
    toast(err.code ? `${err.code}: ${err.message}` : "Login failed");
  }
});
$("#formSignup")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = $("#suName").value.trim();
  const email = $("#suEmail").value.trim();
  const pw = $("#suPassword").value;
  const cf = $("#suConfirm").value;
  const key = $("#suAdminKey").value.trim();
  if (pw !== cf) return toast("Passwords don't match");
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pw);
    await updateProfile(cred.user, { displayName: name });
    await ensureProfile(cred.user, key);
    toast("Account created.");
    $("#dlgSignup").close();
  } catch (err) {
    console.error("signup", err);
    toast(err.code ? `${err.code}: ${err.message}` : "Sign up failed");
  }
});
$("#formForgot")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    await sendPasswordResetEmail(auth, $("#fpEmail").value.trim());
    toast("Reset email sent.");
    $("#dlgForgot").close();
    $("#dlgLogin").showModal();
  } catch (err) {
    console.error("forgot", err);
    toast(err.code ? `${err.code}: ${err.message}` : "Failed to send email");
  }
});
onAuthStateChanged(auth, async (user) => {
  try {
    if (user) {
      const prof = await getDoc(doc(db, "users", user.uid));
      const role = prof.exists()
        ? prof.data().role || "student"
        : await ensureProfile(user);
      currentUser = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        role,
      };
    } else currentUser = null;
    gateUI();
    firstAuthResolved = true;
    renderCatalog();
    if (currentUser) renderMyLearning();
  } catch (err) {
    console.error("auth listener", err);
    firstAuthResolved = true;
  }
});

// ===== My Learning =====
async function renderMyLearning() {
  const wrap = $("#myCourses");
  const empty = $("#emptyMy");
  if (!currentUser) {
    wrap.innerHTML = `<p class="muted">Login to see courses…</p>`;
    empty.classList.add("hidden");
    return;
  }
  try {
    const enrSnap = await getDocs(
      query(
        collection(db, "enrollments"),
        where("userId", "==", currentUser.uid)
      )
    );
    const ids = enrSnap.docs.map((d) => d.data().courseId);
    if (!ids.length) {
      wrap.innerHTML = "";
      empty.classList.remove("hidden");
      return;
    }
    empty.classList.add("hidden");
    const items = [];
    for (const id of ids) {
      const d = await getDoc(doc(db, "courses", id));
      if (d.exists()) items.push({ id, ...d.data() });
    }
    wrap.innerHTML = items.map(courseCard).join("");
    $$("#myCourses .card").forEach((c) =>
      c.addEventListener("click", () => openCourse(c.dataset.open))
    );
  } catch (err) {
    console.error("mylearning", err);
    toast("My Learning error");
  }
}

// ===== Admin tabs & boot =====
function showPage(id) {
  $$(".page").forEach((p) => p.classList.remove("visible"));
  $("#page-" + id).classList.add("visible");
  $$(".navlink").forEach((a) =>
    a.classList.toggle("active", a.dataset.page === id)
  );
  if (id === "admin") loadAdminDefault();
  if (id === "analytics") renderAnalytics();
}
$$(".navlink").forEach((btn) =>
  btn.addEventListener("click", () => showPage(btn.dataset.page))
);

function initAdminTabs() {
  $$(".tab").forEach((t) =>
    t.addEventListener("click", () => {
      $$(".tab").forEach((x) => x.classList.remove("active"));
      t.classList.add("active");
      $$(".tabpane").forEach((x) => x.classList.remove("visible"));
      $("#tab-" + t.dataset.tab).classList.add("visible");
    })
  );
  $("#btnNewCourse").addEventListener("click", () => openCourseDialog());
  $("#btnSeed").addEventListener("click", seedDemo);

  $("#lsCourseSelect").addEventListener("change", refreshLessonsTable);
  $("#btnNewLesson").addEventListener("click", () => {
    const id = $("#lsCourseSelect").value;
    if (!id) return toast("Select a course");
    openLessonDialog(id);
  });

  $("#qzCourseSelect").addEventListener("change", refreshQuizTable);
  $("#btnNewQuiz").addEventListener("click", () => {
    const id = $("#qzCourseSelect").value;
    if (!id) return toast("Select a course");
    openQuizDialog(id);
  });

  $("#asCourseSelect").addEventListener("change", loadAssignmentsTable);
  $("#btnNewAss").addEventListener("click", () => {
    const id = $("#asCourseSelect").value;
    if (!id) return toast("Select a course");
    openAssDialog(id);
  });

  $("#usrNext").addEventListener("click", () => renderUsers(1));
  $("#usrPrev").addEventListener("click", () => renderUsers(-1));
}
async function loadAdminDefault() {
  if (!hasRole("owner", "admin", "instructor", "ta")) return;
  await loadCoursesForAdminTable();
  await loadCoursesInto($("#lsCourseSelect"));
  await loadCoursesInto($("#qzCourseSelect"));
  await loadCoursesInto($("#gbCourseSelect"));
  await loadCoursesInto($("#asCourseSelect"));
  await refreshLessonsTable();
  await refreshQuizTable();
  await renderUsers();
}
function initCatalogControls() {
  $("#searchInput").addEventListener("input", () => {
    lastCoursePage = [];
    renderCatalog(0);
  });
  $("#filterLevel").addEventListener("change", () => {
    lastCoursePage = [];
    renderCatalog(0);
  });
  $("#filterCategory").addEventListener("change", () => {
    lastCoursePage = [];
    renderCatalog(0);
  });
  $("#sortBy").addEventListener("change", () => {
    lastCoursePage = [];
    renderCatalog(0);
  });
  $("#pgNext").addEventListener("click", () => renderCatalog(1));
  $("#pgPrev").addEventListener("click", () => renderCatalog(-1));
}
async function seedDemo() {
  if (!hasRole("owner", "admin")) return toast("Admin only");
  try {
    const cSnap = await getDocs(query(collection(db, "courses"), limit(1)));
    if (cSnap.empty) {
      const courses = [
        {
          title: "JavaScript Fundamentals",
          category: "Programming",
          level: "Beginner",
          price: 0,
          rating: 4.7,
          hours: 12,
          desc: "Language of the web.",
        },
        {
          title: "Python for Data Science",
          category: "Data",
          level: "Beginner",
          price: 19.99,
          rating: 4.8,
          hours: 18,
          desc: "Numpy/Pandas/Matplotlib basics.",
        },
        {
          title: "React Front-End Development",
          category: "Programming",
          level: "Intermediate",
          price: 24.99,
          rating: 4.6,
          hours: 22,
          desc: "Components and hooks.",
        },
      ];
      for (const c of courses) {
        await addDoc(collection(db, "courses"), {
          ...c,
          imageUrl: "",
          k: buildKeywords(c.title),
          createdAt: serverTimestamp(),
        });
      }
    }
    toast("Demo courses ensured.");
    await loadCoursesForAdminTable();
    await loadCoursesInto($("#lsCourseSelect"));
    await loadCoursesInto($("#qzCourseSelect"));
    await loadCoursesInto($("#asCourseSelect"));
    await renderCatalog();
  } catch (err) {
    console.error("seedDemo", err);
    toast("Seeding failed");
  }
}
function boot() {
  initCatalogControls();
  initAdminTabs();
  renderCatalog();
}
document.addEventListener("DOMContentLoaded", boot);
