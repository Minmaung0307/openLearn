import {
  auth,
  db,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  doc,
  getDoc,
  setDoc,
} from "/firebase.js";
const $ = (s, r = document) => r.querySelector(s),
  $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
function esc(s) {
  return (s || "")
    .toString()
    .replace(
      /[&<>"]/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])
    );
}
function showPage(id) {
  $$(".page").forEach((p) => p.classList.remove("active"));
  $("#page-" + id)?.classList.add("active");
  localStorage.setItem("ol:last", id);
}
$$("#sidebar .navbtn").forEach((b) =>
  b.addEventListener("click", () => showPage(b.dataset.page))
);
showPage(localStorage.getItem("ol:last") || "catalog");
// auth
$("#btn-login").onclick = async () => {
  const email = prompt("Email");
  const pass = prompt("Password");
  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch (e) {
    alert("Login failed");
    console.warn(e);
  }
};
$("#btn-logout").onclick = () => signOut(auth);
onAuthStateChanged(auth, async (u)=>{
  document.getElementById('btn-login').style.display = u ? 'none' : 'inline-flex';
  document.getElementById('btn-logout').style.display = u ? 'inline-flex' : 'none';
  // users/{uid} auto-provision (role: 'student' default)
  if (u) {
    const uref = doc(db,'users',u.uid);
    const snap = await getDoc(uref);
    if (!snap.exists()) await setDoc(uref,{role:'student',email:u.email||'',createdAt:Date.now()});
  }
});
// onAuthStateChanged(auth, async (u) => {
//   if (u) {
//     $("#btn-login").style.display = "none";
//     $("#btn-logout").style.display = "inline-block";
//     try {
//       const uref = doc(db, "users", u.uid);
//       const s = await getDoc(uref);
//       if (!s.exists())
//         await setDoc(uref, {
//           role: "student",
//           email: u.email || "",
//           createdAt: Date.now(),
//         });
//     } catch {}
//   } else {
//     $("#btn-login").style.display = "inline-block";
//     $("#btn-logout").style.display = "none";
//   }
// });
// samples
const samples = [
  {
    id: "web101",
    title: "HTML & CSS Basics",
    category: "Web",
    level: "Beginner",
    rating: 4.6,
    price: 0,
    hours: 6,
    description: "Learn the building blocks of the web.",
  },
  {
    id: "js201",
    title: "Modern JavaScript",
    category: "Web",
    level: "Intermediate",
    rating: 4.5,
    price: 29,
    hours: 12,
    description: "ES6, modules, async, and more.",
  },
  {
    id: "py101",
    title: "Python for Everyone",
    category: "Data",
    level: "Beginner",
    rating: 4.7,
    price: 0,
    hours: 10,
    description: "Python fundamentals with practice.",
  },
  {
    id: "sql200",
    title: "SQL Essentials",
    category: "Data",
    level: "Intermediate",
    rating: 4.4,
    price: 19,
    hours: 8,
    description: "Queries, joins, and optimization.",
  },
  {
    id: "ml300",
    title: "Intro to Machine Learning",
    category: "AI",
    level: "Intermediate",
    rating: 4.5,
    price: 39,
    hours: 14,
    description: "ML concepts and scikit-learn.",
  },
  {
    id: "ux101",
    title: "UX Design Fundamentals",
    category: "Design",
    level: "Beginner",
    rating: 4.3,
    price: 0,
    hours: 7,
    description: "Research to wireframes.",
  },
  {
    id: "pm101",
    title: "Project Management",
    category: "Business",
    level: "Beginner",
    rating: 4.2,
    price: 9,
    hours: 6,
    description: "Plan, execute, deliver.",
  },
];
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const read = (k, d = []) => {
  try {
    return JSON.parse(localStorage.getItem(k) || JSON.stringify(d));
  } catch {
    return d;
  }
};
function renderCatalog() {
  const list = read("ol:courses", samples);
  save("ol:courses", list);
  $("#catalog-grid").innerHTML = list
    .map(
      (c) => `<article class="card" data-id="${esc(c.id)}">
    <div class="row"><div class="h4">${esc(
      c.title
    )}</div><div class="grow"></div><div>★ ${esc(c.rating || "")}</div></div>
    <div class="row"><div class="muted">${esc(c.category)} · ${esc(
        c.level
      )}</div><div class="grow"></div><div>${
        c.price ? "$" + c.price : "Free"
      } · ${esc(c.hours)}h</div></div>
    <p>${esc(c.description || "")}</p>
    <div class="row"><button class="btn" data-enroll="${esc(
      c.id
    )}">Enroll</button><button class="btn primary" data-open="${esc(
        c.id
      )}">Open</button></div>
  </article>`
    )
    .join("");
  $$("#catalog-grid [data-enroll]").forEach(
    (b) => (b.onclick = () => enroll(b.dataset.enroll))
  );
  $$("#catalog-grid [data-open]").forEach(
    (b) => (b.onclick = () => openReader(b.dataset.open))
  );
}
function enroll(cid) {
  const list = read("ol:enrollments", []);
  const courses = read("ol:courses", []);
  const c = courses.find((x) => x.id === cid);
  if (!c) return;
  if (!list.find((e) => e.courseId === cid)) {
    list.push({
      courseId: cid,
      courseTitle: c.title,
      progress: 0,
      score: 0,
      price: c.price || 0,
    });
    save("ol:enrollments", list);
  }
  renderMyLearning();
  alert("Enrolled ✓");
}
function openReader(cid) {
  const r = $("#reader");
  r.dataset.courseId = cid;
  showPage("mylearning");
  r.style.display = "";
}
function renderMyLearning() {
  const enr = read("ol:enrollments", []);
  const courses = read("ol:courses", []);
  $("#mylearn-grid").innerHTML =
    enr
      .map((e) => {
        const c = courses.find((x) => x.id === e.courseId) || {};
        return `<article class="card">
    <div class="row"><div class="h4">${esc(
      c.title || e.courseId
    )}</div><div class="grow"></div><div>${Math.round(
          e.progress || 0
        )}%</div></div>
    <div class="row"><div class="muted">${esc(
      c.category || ""
    )}</div><div class="grow"></div><div>${
          c.price ? "$" + c.price : "Free"
        }</div></div>
    <div class="row"><button class="btn primary" data-continue="${esc(
      e.courseId
    )}">Continue</button></div>
  </article>`;
      })
      .join("") || '<div class="muted">No enrollments yet.</div>';
  $$("#mylearn-grid [data-continue]").forEach(
    (b) => (b.onclick = () => openReader(b.dataset.continue))
  );
}
document.addEventListener("DOMContentLoaded", () => {
  renderCatalog();
  renderMyLearning();
  $$("#footer [data-legal]").forEach((a) =>
    a.addEventListener("click", (e) => {
      e.preventDefault();
      import("/addons/step13-legal-pages.js").then(() =>
        window.__ol_showLegal(a.getAttribute("data-legal"))
      );
    })
  );
});
