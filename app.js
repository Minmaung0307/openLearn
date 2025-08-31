// OpenLearn Pro — app.js (type=module)
import {
  ADMIN_KEY, app, auth, db, storage,
  onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendPasswordResetEmail, updateProfile,
  doc, getDoc, setDoc, updateDoc, addDoc, deleteDoc, collection, query, where, orderBy, limit, startAfter, getDocs, serverTimestamp,
  ref, uploadBytesResumable, getDownloadURL
} from "./firebase.js";

// ---------- Helpers ----------
const $ = (sel, root=document)=>root.querySelector(sel);
const $$ = (sel, root=document)=>Array.from(root.querySelectorAll(sel));
const toast = (msg, ms=2200)=>{ const t=$("#toast"); t.textContent=msg; t.classList.add("show"); setTimeout(()=>t.classList.remove("show"), ms); };
const escapeHtml = (str="") => str.replace(/[&<>"']/g, m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]));
const roleBadges = { owner:"👑 Owner", admin:"🛡️ Admin", instructor:"🎓 Instructor", ta:"🧩 TA", student:"🧑‍🎓 Student" };

// ---------- State ----------
let currentUser = null;              // { uid, displayName, email, role }
let lastCoursePage = [];             // Firestore cursors for catalog pagination
let lastGbPage = [];                 // cursors for gradebook
let lastUsrPage = [];                // cursors for users admin
let selectedCourseId = null;         // for course detail
let selectedCourseCache = null;      // cached course doc
let selectedLessonId = null;

// ---------- Role Utilities ----------
function hasRole(...roles) { return currentUser && roles.includes(currentUser.role); }
function gateUI() {
  // auth buttons
  $("#btnLogin")?.classList.toggle("hidden", !!currentUser);
  $("#btnSignup")?.classList.toggle("hidden", !!currentUser);
  $("#userMenu")?.classList.toggle("hidden", !currentUser);
  $("#userName").textContent = currentUser ? `${currentUser.displayName || currentUser.email} (${roleBadges[currentUser.role]||currentUser.role})` : "";
  // gates
  $$(".admin-only").forEach(el=>el.classList.toggle("hidden", !hasRole("owner","admin")));
  $$(".instructor-only").forEach(el=>el.classList.toggle("hidden", !hasRole("owner","admin","instructor","ta")));
}

// ---------- Auth ----------
async function ensureProfile(user, maybeAdminKey="") {
  const pRef = doc(db, "users", user.uid);
  const snap = await getDoc(pRef);
  if (!snap.exists()) {
    const role = maybeAdminKey === ADMIN_KEY ? "admin" : "student";
    await setDoc(pRef, { name: user.displayName || "", email: user.email, role, active:true, createdAt: serverTimestamp() });
    return role;
  } else {
    const data = snap.data();
    return data.role || "student";
  }
}

function applyTheme() {
  const t = localStorage.getItem("ol_theme") || "dark";
  document.documentElement.dataset.theme = t;
}
function toggleTheme() {
  const cur = localStorage.getItem("ol_theme") || "dark";
  const next = cur==="dark"?"light":"dark";
  localStorage.setItem("ol_theme", next);
  applyTheme();
  toast("Theme: "+next);
}

// ---------- Rendering: Catalog ----------
function courseCard(c) {
  const img = c.imageUrl || "";
  return `<div class="card" data-open="${c.id}">
    <div class="cover" style="${img?`background-image:url('${img}')`:""}"></div>
    <div class="pad">
      <h4>${escapeHtml(c.title)}</h4>
      <div class="row">
        <span class="badge">${escapeHtml(c.category||"")}</span>
        <span class="badge level">${escapeHtml(c.level||"")}</span>
        <span class="badge">⭐ ${(c.rating??0).toFixed(1)}</span>
        <span class="badge">$${Number(c.price||0).toFixed(2)}</span>
      </div>
      <p class="muted">${escapeHtml(c.desc||"")}</p>
      <div class="row">
        <button class="btn primary" data-enroll="${c.id}">Enroll</button>
        <small class="muted">${c.hours||0} hrs</small>
      </div>
    </div>
  </div>`;
}

async function renderCatalog(direction=0) {
  const grid = $("#courseGrid");
  const qTxt = $("#searchInput").value.trim().toLowerCase();
  const fLevel = $("#filterLevel").value;
  const fCat = $("#filterCategory").value;
  const sort = $("#sortBy").value;

  const [k,dir] = sort.split("-");
  let orderField = k==="title" ? "title" : (k==="price"?"price":"rating");
  let orderDir = dir==="desc" ? "desc" : "asc";

  // Build Firestore query
  let q = collection(db, "courses");
  let constraints = [];
  if (qTxt) constraints.push(where("k", "array-contains", qTxt)); // k = keywords array
  if (fLevel) constraints.push(where("level", "==", fLevel));
  if (fCat) constraints.push(where("category", "==", fCat));
  constraints.push(orderBy(orderField, orderDir));
  constraints.push(limit(9));

  // Pagination cursors
  let cursorArr = lastCoursePage;
  if (direction === 1 && cursorArr.length) { // next
    const last = cursorArr[cursorArr.length-1];
    constraints.push(startAfter(last));
  } else if (direction === -1 && cursorArr.length>1) { // prev
    cursorArr.pop(); // go back one
    const prev = cursorArr.length>1 ? cursorArr[cursorArr.length-2] : null;
    if (prev) constraints.push(startAfter(prev));
    else {}; // first page
  } else if (direction === -1 && cursorArr.length<=1) {
    // Already first; do nothing extra
  }

  const qBuilt = query(q, ...constraints);
  const snap = await getDocs(qBuilt);
  const items = [];
  let lastVisible = null;
  snap.forEach(docu=>{
    const d = docu.data();
    items.push({ id: docu.id, ...d });
    lastVisible = docu;
  });

  if (direction !== -1) {
    if (lastVisible) cursorArr.push(lastVisible);
  }
  $("#pgInfo").textContent = `Showing ${items.length} courses`;
  $("#pgPrev").disabled = cursorArr.length<=1;
  $("#pgNext").disabled = items.length<9;

  grid.innerHTML = items.map(courseCard).join("") || `<p class="muted">No courses found…</p>`;

  // Bind buttons
  $$("#courseGrid [data-enroll]").forEach(b=> b.addEventListener("click", ()=> enroll(b.dataset.enroll)));
  $$("#courseGrid .card").forEach(c=> c.addEventListener("click", (e)=>{
    if (e.target.closest("[data-enroll]")) return;
    openCourse(c.dataset.open);
  }));

  // Fill category filter quickly from loaded items (for UX)
  const cats = Array.from(new Set(items.map(c=>c.category).filter(Boolean))).sort();
  const sel = $("#filterCategory");
  const cur = sel.value;
  sel.innerHTML = `<option value="">All Categories</option>` + cats.map(c=>`<option>${escapeHtml(c)}</option>`).join("");
  sel.value = cur;
}

// ---------- Enrollment / My Learning ----------
async function enroll(courseId) {
  if (!currentUser) { toast("Login required."); return; }
  const coll = collection(db, "enrollments");
  const existing = await getDocs(query(coll, where("userId","==",currentUser.uid), where("courseId","==",courseId)));
  if (!existing.empty) { toast("Already enrolled."); return; }
  await addDoc(coll, { userId: currentUser.uid, courseId, enrolledAt: serverTimestamp(), progress:{} });
  toast("Enrolled!");
  renderMyLearning();
}

async function renderMyLearning() {
  const wrap = $("#myCourses"); const empty = $("#emptyMy");
  if (!currentUser) { wrap.innerHTML = `<p class="muted">Login လုပ်ပါ…</p>`; empty.classList.add("hidden"); return; }
  const enrSnap = await getDocs(query(collection(db,"enrollments"), where("userId","==",currentUser.uid)));
  const ids = enrSnap.docs.map(d=>d.data().courseId);
  if (!ids.length) { wrap.innerHTML=""; empty.classList.remove("hidden"); return; }
  empty.classList.add("hidden");
  // fetch courses
  const items = [];
  for (const id of ids) {
    const d = await getDoc(doc(db,"courses",id));
    if (d.exists()) items.push({id, ...d.data()});
  }
  wrap.innerHTML = items.map(courseCard).join("");
  $$("#myCourses .card").forEach(c=> c.addEventListener("click", ()=> openCourse(c.dataset.open)));
}

// ---------- Course details & lessons ----------
async function openCourse(courseId) {
  selectedCourseId = courseId;
  const d = await getDoc(doc(db,"courses",courseId));
  if (!d.exists()) { toast("Course not found"); return; }
  selectedCourseCache = { id: d.id, ...d.data() };

  // header
  const c = selectedCourseCache;
  $("#courseHeader").innerHTML = `
    <div class="cover" style="${c.imageUrl?`background-image:url('${c.imageUrl}')`:""}"></div>
    <div>
      <h2>${escapeHtml(c.title)}</h2>
      <div class="row">
        <span class="badge">${escapeHtml(c.category||"")}</span>
        <span class="badge level">${escapeHtml(c.level||"")}</span>
        <span class="badge">⭐ ${(c.rating??0).toFixed(1)}</span>
        <span class="badge">$${Number(c.price||0).toFixed(2)}</span>
      </div>
      <p class="muted">${escapeHtml(c.desc||"")}</p>
      <div class="row">
        <button id="btnEnrollNow" class="btn primary">Enroll</button>
        <button id="btnTakeQuiz" class="btn ghost instructor-only hidden">Preview Quiz</button>
      </div>
    </div>
  `;
  $("#btnEnrollNow").addEventListener("click", ()=> enroll(courseId));
  $("#btnTakeQuiz").addEventListener("click", ()=> openTakeQuizDialogForCourse(courseId));
  // syllabus
  await renderLessonList(courseId);
  // switch page
  showPage("course");
  $("#navCourse").classList.remove("hidden");
  gateUI();
}

async function renderLessonList(courseId) {
  const list = $("#lessonList"); list.innerHTML = "";
  const snap = await getDocs(query(collection(db, "courses", courseId, "lessons"), orderBy("order","asc")));
  const items = snap.docs.map(d=>({ id:d.id, ...d.data() }));
  if (!items.length) { list.innerHTML = `<li class="muted">No lessons yet.</li>`; $("#lessonContent").innerHTML=""; return; }
  list.innerHTML = items.map((l,i)=>`<li data-id="${l.id}">${i+1}. ${escapeHtml(l.title)} <small class="muted">(${l.type})</small></li>`).join("");
  $$("#lessonList li").forEach(li=> li.addEventListener("click", ()=> openLesson(courseId, li.dataset.id)));
  // open first
  openLesson(courseId, items[0].id);
}

async function openLesson(courseId, lessonId) {
  selectedLessonId = lessonId;
  const d = await getDoc(doc(db, "courses", courseId, "lessons", lessonId));
  if (!d.exists()) return;
  const l = d.data();
  let html = `<h3>${escapeHtml(l.title)}</h3>`;
  if (l.type==="video") {
    if (l.videoUrl?.includes("youtube.com") || l.videoUrl?.includes("youtu.be")) {
      // YouTube embed
      const vid = l.videoUrl.replace("watch?v=","embed/").replace("youtu.be/","youtube.com/embed/");
      html += `<iframe src="${vid}" allowfullscreen></iframe>`;
    } else if (l.videoUrl) {
      html += `<video controls src="${l.videoUrl}"></video>`;
    } else {
      html += `<p class="muted">No video attached.</p>`;
    }
    if (l.content) html += `<div>${l.content}</div>`;
  } else {
    html += `<div>${l.content || "<p class='muted'>No content.</p>"}</div>`;
  }
  // Load related quizzes for the course
  const qzSnap = await getDocs(query(collection(db,"courses",courseId,"quizzes")));
  if (!qzSnap.empty) {
    html += `<div class="row" style="margin-top:10px"><button id="btnStartQuiz" class="btn primary">Start Quiz</button></div>`;
  }
  $("#lessonContent").innerHTML = html;
  $("#btnStartQuiz")?.addEventListener("click", ()=> openTakeQuizDialogForCourse(courseId));
}

// ---------- Quiz: build, take, grade ----------
function quizQuestionEditor(i, q={ text:"", options:["","","",""], answerIndex:0, points:1 }) {
  return `<fieldset class="qfield">
    <legend>Question ${i+1}</legend>
    <input type="text" data-q="text" placeholder="Question text" value="${escapeHtml(q.text)}">
    ${q.options.map((op,idx)=>`
      <div class="row">
        <label class="checkbox"><input type="radio" name="ans${i}" ${q.answerIndex===idx?"checked":""} data-q="answerIndex" data-idx="${idx}"> Correct</label>
        <input type="text" data-q="opt" data-idx="${idx}" placeholder="Option ${idx+1}" value="${escapeHtml(op)}">
      </div>
    `).join("")}
    <input type="number" data-q="points" min="1" step="1" value="${q.points||1}" placeholder="Points">
  </fieldset>`;
}

function collectQuizEditor() {
  const fields = $$("#qQuestions .qfield");
  const questions = fields.map(f=>{
    const text = $("input[data-q='text']", f).value.trim();
    const opts = $$("input[data-q='opt']", f).map(x=>x.value.trim());
    const ans = $$("input[data-q='answerIndex']", f).find(x=>x.checked)?.dataset.idx || 0;
    const pts = Number($("input[data-q='points']", f).value || 1);
    return { text, options: opts, answerIndex: Number(ans), points: pts };
  });
  const totalPoints = questions.reduce((a,b)=>a+(b.points||1),0);
  return { questions, totalPoints };
}

async function openTakeQuizDialogForCourse(courseId) {
  // pick the first quiz for now
  const qzs = await getDocs(query(collection(db,"courses",courseId,"quizzes"), limit(1)));
  if (qzs.empty) { toast("No quiz for this course."); return; }
  const qz = { id: qzs.docs[0].id, ...qzs.docs[0].data() };
  $("#tqTitle").textContent = qz.title;
  $("#tqQuizId").value = qz.id;
  $("#tqCourseId").value = courseId;
  const body = $("#tqBody");
  body.innerHTML = qz.questions.map((q,i)=>`
    <div class="q">
      <h4>${i+1}. ${escapeHtml(q.text)}</h4>
      ${q.options.map((op,idx)=>`
        <label class="checkbox"><input type="radio" name="q${i}" value="${idx}" required> ${escapeHtml(op)}</label>`).join("")}
    </div>
  `).join("");
  $("#formTakeQuiz").onsubmit = async (e)=>{
    e.preventDefault();
    if (!currentUser) { toast("Login required."); return; }
    let score = 0;
    qz.questions.forEach((q,i)=>{
      const val = Number(new FormData(e.target).get("q"+i));
      if (val === Number(q.answerIndex)) score += (q.points||1);
    });
    await addDoc(collection(db,"attempts"), {
      userId: currentUser.uid, courseId, quizId: qz.id, score, total: qz.totalPoints, at: serverTimestamp()
    });
    toast(`Score: ${score} / ${qz.totalPoints}`);
    $("#dlgTakeQuiz").close();
  };
  $("#dlgTakeQuiz").showModal();
}

// ---------- Admin: Courses ----------
function bindImageUpload(inputEl, folder, onDone) {
  inputEl.addEventListener("change", ()=>{
    const f = inputEl.files[0];
    if (!f) return;
    const r = ref(storage, `${folder}/${Date.now()}_${f.name}`);
    const task = uploadBytesResumable(r, f);
    task.on("state_changed", s=>{
      const pct = Math.round(s.bytesTransferred / s.totalBytes * 100);
      toast(`Uploading… ${pct}%`);
    }, err=> toast("Upload error"), async ()=>{
      const url = await getDownloadURL(task.snapshot.ref);
      onDone(url);
    });
  });
}

async function loadCoursesForAdminTable() {
  const snap = await getDocs(query(collection(db,"courses"), orderBy("title","asc"), limit(50)));
  const rows = snap.docs.map(d=>{
    const c = d.data();
    const img = c.imageUrl ? `<img src="${c.imageUrl}" alt="">` : `<div style="width:64px;height:40px;border:1px solid rgba(255,255,255,.08);border-radius:6px;"></div>`;
    return `<tr>
      <td>${img}</td>
      <td>${escapeHtml(c.title||"")}</td>
      <td>${escapeHtml(c.category||"")}</td>
      <td>${escapeHtml(c.level||"")}</td>
      <td>$${Number(c.price||0).toFixed(2)}</td>
      <td>${Number(c.rating||0).toFixed(1)}</td>
      <td>
        <button class="btn" data-edit="${d.id}">Edit</button>
        <button class="btn danger" data-del="${d.id}">Delete</button>
      </td>
    </tr>`;
  }).join("");
  $("#courseTable tbody").innerHTML = rows || `<tr><td colspan="7" class="muted">No courses.</td></tr>`;

  $$("#courseTable [data-edit]").forEach(b=> b.addEventListener("click", ()=> openCourseDialog(b.dataset.edit)));
  $$("#courseTable [data-del]").forEach(b=> b.addEventListener("click", async ()=>{
    if (!confirm("Delete course?")) return;
    await deleteDoc(doc(db,"courses", b.dataset.del));
    loadCoursesForAdminTable();
    renderCatalog();
  }));
}

async function openCourseDialog(id=null) {
  $("#courseDlgTitle").textContent = id? "Edit Course": "New Course";
  $("#cId").value = id || "";
  $("#formCourse").reset();
  $("#cImage").value = "";
  if (id) {
    const d = await getDoc(doc(db,"courses",id));
    const c = d.data();
    $("#cTitle").value = c.title || "";
    $("#cCategory").value = c.category || "";
    $("#cLevel").value = c.level || "Beginner";
    $("#cPrice").value = c.price || 0;
    $("#cRating").value = c.rating || 0;
    $("#cHours").value = c.hours || 1;
    $("#cDesc").value = c.desc || "";
  }
  // bind upload
  bindImageUpload($("#cImage"), "course-images", url=> $("#cImage").dataset.url = url);
  $("#formCourse").onsubmit = async (e)=>{
    e.preventDefault();
    const item = {
      title: $("#cTitle").value.trim(),
      category: $("#cCategory").value.trim(),
      level: $("#cLevel").value,
      price: Number($("#cPrice").value),
      rating: Number($("#cRating").value),
      hours: Number($("#cHours").value),
      desc: $("#cDesc").value.trim(),
      imageUrl: $("#cImage").dataset.url || (id? (await getDoc(doc(db,"courses",id))).data().imageUrl || "" : ""),
      k: buildKeywords($("#cTitle").value) // for search
    };
    if (id) await updateDoc(doc(db,"courses",id), { ...item, updatedAt: serverTimestamp() });
    else await addDoc(collection(db,"courses"), { ...item, createdAt: serverTimestamp(), createdBy: currentUser?.uid||null });
    $("#dlgCourse").close();
    loadCoursesForAdminTable(); renderCatalog();
    toast("Course saved.");
  };
  $("#dlgCourse").showModal();
}

function buildKeywords(title="") {
  const t = title.toLowerCase();
  const ks = new Set();
  for (let i=0; i<t.length; i++) for (let j=i+1; j<=t.length; j++) ks.add(t.slice(i,j));
  // keep simple: also push words
  t.split(/\s+/).forEach(w=> ks.add(w));
  return Array.from(ks).filter(x=>x.length>=2 && x.length<=20).slice(0,200);
}

// ---------- Admin: Lessons ----------
async function loadCoursesInto(selectEl) {
  const snap = await getDocs(query(collection(db,"courses"), orderBy("title","asc")));
  selectEl.innerHTML = snap.docs.map(d=>`<option value="${d.id}">${escapeHtml(d.data().title)}</option>`).join("");
}

async function refreshLessonsTable() {
  const courseId = $("#lsCourseSelect").value;
  if (!courseId) { $("#lessonTable tbody").innerHTML = ""; return; }
  const snap = await getDocs(query(collection(db,"courses",courseId,"lessons"), orderBy("order","asc")));
  const rows = snap.docs.map(d=>{
    const l = d.data();
    return `<tr>
      <td>${l.order||0}</td>
      <td>${escapeHtml(l.title||"")}</td>
      <td>${escapeHtml(l.type||"")}</td>
      <td>${Number(l.duration||0)} mins</td>
      <td>${l.published? "Yes":"No"}</td>
      <td>
        <button class="btn" data-ledit="${d.id}">Edit</button>
        <button class="btn danger" data-ldel="${d.id}">Delete</button>
      </td>
    </tr>`;
  }).join("");
  $("#lessonTable tbody").innerHTML = rows || `<tr><td colspan="6" class="muted">No lessons.</td></tr>`;

  $$("#lessonTable [data-ledit]").forEach(b=> b.addEventListener("click", ()=> openLessonDialog(courseId, b.dataset.ledit)));
  $$("#lessonTable [data-ldel]").forEach(b=> b.addEventListener("click", async ()=>{
    if (!confirm("Delete lesson?")) return;
    await deleteDoc(doc(db,"courses",courseId,"lessons", b.dataset.ldel));
    refreshLessonsTable();
    if (selectedCourseId===courseId) renderLessonList(courseId);
  }));
}

async function openLessonDialog(courseId, lessonId=null) {
  $("#lessonDlgTitle").textContent = lessonId? "Edit Lesson": "New Lesson";
  $("#lId").value = lessonId || "";
  $("#lCourseId").value = courseId;
  $("#formLesson").reset(); $("#lVideo").value=""; $("#lVideoURL").value="";
  if (lessonId) {
    const d = await getDoc(doc(db,"courses",courseId,"lessons",lessonId));
    const l = d.data();
    $("#lTitle").value = l.title || "";
    $("#lType").value = l.type || "video";
    $("#lOrder").value = l.order || 1;
    $("#lDuration").value = l.duration || 10;
    $("#lContent").value = l.content || "";
    $("#lPublished").checked = !!l.published;
    $("#lVideoURL").value = l.videoUrl || "";
  }
  bindImageUpload($("#lVideo"), "lesson-videos", url => $("#lVideoURL").value = url);
  $("#formLesson").onsubmit = async (e)=>{
    e.preventDefault();
    const item = {
      title: $("#lTitle").value.trim(),
      type: $("#lType").value,
      order: Number($("#lOrder").value||1),
      duration: Number($("#lDuration").value||0),
      content: $("#lContent").value.trim(),
      videoUrl: $("#lVideoURL").value.trim(),
      published: $("#lPublished").checked
    };
    const id = $("#lId").value;
    if (id) await updateDoc(doc(db,"courses",courseId,"lessons",id), { ...item, updatedAt: serverTimestamp() });
    else await addDoc(collection(db,"courses",courseId,"lessons"), { ...item, createdAt: serverTimestamp() });
    $("#dlgLesson").close();
    refreshLessonsTable();
    if (selectedCourseId===courseId) renderLessonList(courseId);
    toast("Lesson saved.");
  };
  $("#dlgLesson").showModal();
}

// ---------- Admin: Quizzes ----------
async function refreshQuizTable() {
  const courseId = $("#qzCourseSelect").value;
  if (!courseId) { $("#quizTable tbody").innerHTML=""; return; }
  const snap = await getDocs(query(collection(db,"courses",courseId,"quizzes")));
  const rows = snap.docs.map(d=>{
    const q = d.data();
    return `<tr>
      <td>${escapeHtml(q.title||"")}</td>
      <td>${q.questions?.length||0}</td>
      <td>${q.totalPoints||0}</td>
      <td>
        <button class="btn" data-qedit="${d.id}">Edit</button>
        <button class="btn danger" data-qdel="${d.id}">Delete</button>
      </td>
    </tr>`;
  }).join("");
  $("#quizTable tbody").innerHTML = rows || `<tr><td colspan="4" class="muted">No quizzes.</td></tr>`;

  $$("#quizTable [data-qedit]").forEach(b=> b.addEventListener("click", ()=> openQuizDialog(courseId, b.dataset.qedit)));
  $$("#quizTable [data-qdel]").forEach(b=> b.addEventListener("click", async ()=>{
    if (!confirm("Delete quiz?")) return;
    await deleteDoc(doc(db,"courses",courseId,"quizzes", b.dataset.qdel));
    refreshQuizTable();
  }));
}

async function openQuizDialog(courseId, quizId=null) {
  $("#quizDlgTitle").textContent = quizId? "Edit Quiz":"New Quiz";
  $("#qId").value = quizId || "";
  $("#qCourseId").value = courseId;
  $("#qTitle").value = "";
  $("#qQuestions").innerHTML = "";
  if (quizId) {
    const d = await getDoc(doc(db,"courses",courseId,"quizzes",quizId));
    const q = d.data();
    $("#qTitle").value = q.title || "";
    const qs = q.questions || [];
    $("#qQuestions").innerHTML = qs.map((qq,i)=> quizQuestionEditor(i, qq)).join("");
  } else {
    $("#qQuestions").innerHTML = quizQuestionEditor(0);
  }
  $("#btnAddQ").onclick = ()=> {
    const count = $$("#qQuestions .qfield").length;
    $("#qQuestions").insertAdjacentHTML("beforeend", quizQuestionEditor(count));
  };
  $("#formQuiz").onsubmit = async (e)=>{
    e.preventDefault();
    const { questions, totalPoints } = collectQuizEditor();
    const item = { title: $("#qTitle").value.trim(), questions, totalPoints };
    const id = $("#qId").value;
    if (id) await updateDoc(doc(db,"courses",courseId,"quizzes",id), { ...item, updatedAt: serverTimestamp() });
    else await addDoc(collection(db,"courses",courseId,"quizzes"), { ...item, createdAt: serverTimestamp() });
    $("#dlgQuiz").close();
    refreshQuizTable();
    toast("Quiz saved.");
  };
  $("#dlgQuiz").showModal();
}

// ---------- Gradebook ----------
async function loadCoursesIntoSelects() {
  await loadCoursesInto($("#lsCourseSelect"));
  await loadCoursesInto($("#qzCourseSelect"));
  await loadCoursesInto($("#gbCourseSelect"));
}
async function renderGradebook(direction=0) {
  const courseId = $("#gbCourseSelect").value;
  if (!courseId) { $("#gradeTable tbody").innerHTML = ""; return; }
  let constraints = [ where("courseId","==",courseId), orderBy("at","desc"), limit(15) ];
  let cursorArr = lastGbPage;
  if (direction===1 && cursorArr.length) constraints.push(startAfter(cursorArr[cursorArr.length-1]));
  else if (direction===-1 && cursorArr.length>1) { cursorArr.pop(); const prev = cursorArr[cursorArr.length-2]; if (prev) constraints.push(startAfter(prev)); }
  const snap = await getDocs(query(collection(db,"attempts"), ...constraints));
  let last=null;
  const rows = [];
  for (const d of snap.docs) {
    const a = d.data(); last = d;
    // fetch user
    const u = await getDoc(doc(db,"users", a.userId));
    const name = u.exists() ? (u.data().name || u.data().email || a.userId) : a.userId;
    // fetch quiz title
    const qz = await getDoc(doc(db,"courses", a.courseId, "quizzes", a.quizId));
    const qtitle = qz.exists()? qz.data().title : a.quizId;
    rows.push(`<tr><td>${escapeHtml(name)}</td><td>${escapeHtml(qtitle)}</td><td>${a.score}</td><td>${a.total}</td><td>${a.at?.toDate?.().toLocaleString?.()||""}</td></tr>`);
  }
  $("#gradeTable tbody").innerHTML = rows.join("") || `<tr><td colspan="5" class="muted">No attempts.</td></tr>`;
  if (direction!==-1 && last) cursorArr.push(last);
  $("#gbPrev").disabled = cursorArr.length<=1;
  $("#gbNext").disabled = snap.size<15;
  $("#gbInfo").textContent = `Showing ${snap.size} attempts`;
}

// ---------- Admin: Users ----------
async function renderUsers(direction=0) {
  let constraints = [ orderBy("email","asc"), limit(20) ];
  let cursorArr = lastUsrPage;
  if (direction===1 && cursorArr.length) constraints.push(startAfter(cursorArr[cursorArr.length-1]));
  else if (direction===-1 && cursorArr.length>1) { cursorArr.pop(); const prev = cursorArr[cursorArr.length-2]; if (prev) constraints.push(startAfter(prev)); }
  const snap = await getDocs(query(collection(db,"users"), ...constraints));
  let last=null;
  const rows = snap.docs.map(d=>{
    last = d;
    const u = d.data();
    return `<tr>
      <td>${escapeHtml(u.name||"")}</td>
      <td>${escapeHtml(u.email||"")}</td>
      <td>
        <select data-role="${d.id}">
          ${["owner","admin","instructor","ta","student"].map(r=>`<option value="${r}" ${u.role===r?"selected":""}>${r}</option>`).join("")}
        </select>
      </td>
      <td>${u.active? "Yes":"No"}</td>
      <td>
        <button class="btn" data-deact="${d.id}">${u.active?"Deactivate":"Activate"}</button>
      </td>
    </tr>`;
  }).join("");
  $("#userTable tbody").innerHTML = rows || `<tr><td colspan="5" class="muted">No users.</td></tr>`;
  if (direction!==-1 && last) cursorArr.push(last);
  $("#usrPrev").disabled = cursorArr.length<=1;
  $("#usrNext").disabled = snap.size<20;
  $("#usrInfo").textContent = `Showing ${snap.size} users`;

  // bind role change
  $$("#userTable [data-role]").forEach(sel=> sel.addEventListener("change", async (e)=>{
    const uid = e.target.getAttribute("data-role");
    const role = e.target.value;
    if (!confirm(`Change role to ${role}?`)) return;
    await updateDoc(doc(db,"users", uid), { role });
    toast("Role updated.");
  }));
  // bind activate toggle
  $$("#userTable [data-deact]").forEach(b=> b.addEventListener("click", async ()=>{
    const uid = b.dataset.deact;
    const u = await getDoc(doc(db,"users", uid));
    const active = !(u.data().active);
    await updateDoc(doc(db,"users", uid), { active });
    renderUsers();
  }));
}

// ---------- Page Nav ----------
function showPage(id) {
  $$(".page").forEach(p=>p.classList.remove("visible"));
  $("#page-"+id).classList.add("visible");
  $$(".navlink").forEach(a=>a.classList.toggle("active", a.dataset.page===id));
  if (id==="mylearning") renderMyLearning();
  if (id==="gradebook") renderGradebook();
  if (id==="admin") loadAdminDefault();
}
function initNav() {
  $$(".navlink").forEach(btn => btn.addEventListener("click", () => showPage(btn.dataset.page)));
  // tabs
  $$(".tab").forEach(t=> t.addEventListener("click", ()=>{
    $$(".tab").forEach(x=>x.classList.remove("active"));
    t.classList.add("active");
    $$(".tabpane").forEach(x=>x.classList.remove("visible"));
    $("#tab-"+t.dataset.tab).classList.add("visible");
  }));
}

// ---------- Auth UI ----------
function initAuthUI() {
  $("#btnDark").addEventListener("click", toggleTheme);
  $("#toggleTheme").addEventListener("click", toggleTheme);

  $("#btnLogin").addEventListener("click", ()=> $("#dlgLogin").showModal());
  $("#btnSignup").addEventListener("click", ()=> $("#dlgSignup").showModal());
  $("#btnLogout").addEventListener("click", async ()=>{ await signOut(auth); });

  $("#lnkForgot").addEventListener("click", (e)=>{ e.preventDefault(); $("#dlgLogin").close(); $("#dlgForgot").showModal(); });
  $("#lnkToSignup").addEventListener("click", (e)=>{ e.preventDefault(); $("#dlgLogin").close(); $("#dlgSignup").showModal(); });
  $("#lnkToLogin").addEventListener("click", (e)=>{ e.preventDefault(); $("#dlgSignup").close(); $("#dlgLogin").showModal(); });

  $("#formLogin").addEventListener("submit", async (e)=>{
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, $("#loginEmail").value, $("#loginPassword").value);
      $("#dlgLogin").close();
    } catch(err){ toast(err.message || "Login failed"); }
  });

  $("#formSignup").addEventListener("submit", async (e)=>{
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
      const role = await ensureProfile(cred.user, key);
      toast("Account created.");
      $("#dlgSignup").close();
    } catch(err){ toast(err.message || "Sign up failed"); }
  });

  $("#formForgot").addEventListener("submit", async (e)=>{
    e.preventDefault();
    try { await sendPasswordResetEmail(auth, $("#fpEmail").value.trim()); toast("Reset email sent."); $("#dlgForgot").close(); $("#dlgLogin").showModal(); }
    catch(err){ toast(err.message || "Failed to send email"); }
  });

  $("#btnSendReset").addEventListener("click", async ()=>{
    if (!currentUser) return toast("Login first");
    try { await sendPasswordResetEmail(auth, currentUser.email); toast("Reset email sent."); }
    catch(err){ toast(err.message || "Failed to send"); }
  });

  onAuthStateChanged(auth, async (user)=>{
    if (user) {
      // fetch role
      const prof = await getDoc(doc(db,"users", user.uid));
      const role = prof.exists()? (prof.data().role || "student") : await ensureProfile(user);
      currentUser = { uid: user.uid, email: user.email, displayName: user.displayName, role };
    } else currentUser = null;
    gateUI();
    renderMyLearning();
  });
}

// ---------- Admin default load ----------
async function loadAdminDefault() {
  if (!hasRole("owner","admin","instructor","ta")) return;
  await loadCoursesForAdminTable();
  await loadCoursesIntoSelects();
  await refreshLessonsTable();
  await refreshQuizTable();
  await renderUsers();
}

// ---------- Settings / Seeds ----------
async function seedDemo() {
  if (!hasRole("owner","admin")) return toast("Admin only");
  // create a few courses if empty
  const cSnap = await getDocs(query(collection(db,"courses"), limit(1)));
  if (cSnap.empty) {
    const courses = [
      { title:"JavaScript Fundamentals", category:"Programming", level:"Beginner", price:0, rating:4.7, hours:12, desc:"Language of the web." },
      { title:"Python for Data Science", category:"Data", level:"Beginner", price:19.99, rating:4.8, hours:18, desc:"Numpy/Pandas/Matplotlib basics." },
      { title:"React Front-End Development", category:"Programming", level:"Intermediate", price:24.99, rating:4.6, hours:22, desc:"Components and hooks." },
    ];
    for (const c of courses) {
      await addDoc(collection(db,"courses"), { ...c, imageUrl:"", k: buildKeywords(c.title), createdAt: serverTimestamp() });
    }
  }
  toast("Demo courses ensured.");
  await loadCoursesForAdminTable(); await loadCoursesIntoSelects(); await renderCatalog();
}

// ---------- Event Bindings ----------
function initBindings() {
  // Catalog
  $("#searchInput").addEventListener("input", ()=>{ lastCoursePage=[]; renderCatalog(0); });
  $("#filterLevel").addEventListener("change", ()=>{ lastCoursePage=[]; renderCatalog(0); });
  $("#filterCategory").addEventListener("change", ()=>{ lastCoursePage=[]; renderCatalog(0); });
  $("#sortBy").addEventListener("change", ()=>{ lastCoursePage=[]; renderCatalog(0); });
  $("#pgNext").addEventListener("click", ()=> renderCatalog(1));
  $("#pgPrev").addEventListener("click", ()=> renderCatalog(-1));

  // Admin
  $("#btnNewCourse").addEventListener("click", ()=> openCourseDialog());
  $("#btnSeed").addEventListener("click", seedDemo);

  $("#lsCourseSelect").addEventListener("change", refreshLessonsTable);
  $("#btnNewLesson").addEventListener("click", ()=>{
    const id = $("#lsCourseSelect").value;
    if (!id) return toast("Select a course");
    openLessonDialog(id);
  });

  $("#qzCourseSelect").addEventListener("change", refreshQuizTable);
  $("#btnNewQuiz").addEventListener("click", ()=>{
    const id = $("#qzCourseSelect").value;
    if (!id) return toast("Select a course");
    openQuizDialog(id);
  });

  // Gradebook
  $("#gbCourseSelect").addEventListener("change", ()=>{ lastGbPage=[]; renderGradebook(0); });
  $("#gbNext").addEventListener("click", ()=> renderGradebook(1));
  $("#gbPrev").addEventListener("click", ()=> renderGradebook(-1));

  // Users
  $("#usrNext").addEventListener("click", ()=> renderUsers(1));
  $("#usrPrev").addEventListener("click", ()=> renderUsers(-1));
}

// ---------- Boot ----------
function boot() {
  applyTheme();
  initNav();
  initAuthUI();
  initBindings();
  renderCatalog();
}

document.addEventListener("DOMContentLoaded", boot);
