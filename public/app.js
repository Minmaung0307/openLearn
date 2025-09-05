// public/app.js
import {
  app, auth, db,
  onAuthStateChanged,
  collection, addDoc, doc, getDoc, getDocs, query, orderBy, limit
} from "./firebase.js";

const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
const esc = (s)=> String(s ?? "").replace(/[&<>\"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
const toast=(m,ms=2000)=>{ let t=$("#toast"); if(!t){t=document.createElement("div");t.id="toast";t.style.cssText="position:fixed;bottom:14px;left:50%;transform:translateX(-50%);background:#111827;color:#eaf1ff;border:1px solid #1f2a3b;border-radius:10px;padding:8px 12px;z-index:9999"; document.body.appendChild(t);} t.textContent=m; t.style.opacity="1"; setTimeout(()=>t.style.opacity="0", ms); };

const CFG = window.OPENLEARN_CFG || {};
const ADMINS = new Set((CFG.admins||[]).map(x=>x.toLowerCase()));

function isAdminEmail(email){ return !!email && ADMINS.has(email.toLowerCase()); }

/* ===================== PayPal inject ===================== */
(function injectPayPal() {
  const id = (CFG.paypalClientId || "").trim();
  if (!id) { console.info("PayPal clientId not set → MMK demo only"); return; }
  const s = document.createElement("script");
  s.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(id)}&currency=USD`;
  s.async = true;
  s.onload = ()=> (window.paypalSDK = window.paypal);
  document.head.appendChild(s);
})();

/* ===================== Local storage ===================== */
const readJSON=(k,d)=>{ try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(d));}catch{ return d; } };
const writeJSON=(k,v)=> localStorage.setItem(k, JSON.stringify(v));
const LS_COURSES = "ol_local_courses";
const LS_ENR     = "ol_enrolls";
const LS_ANNS    = "ol_anns";
const getLocalCourses = ()=> readJSON(LS_COURSES, []);
const setLocalCourses = (a)=> writeJSON(LS_COURSES, a||[]);
const getEnrolls = ()=> new Set(readJSON(LS_ENR, []));
const setEnrolls = (s)=> writeJSON(LS_ENR, Array.from(s));
const getAnns    = ()=> readJSON(LS_ANNS, []);
const setAnns    = (a)=> writeJSON(LS_ANNS, a||[]);

/* ===================== Router ===================== */
function showPage(id) {
  $$(".page").forEach(p=>p.classList.remove("active"));
  $(`#page-${id}`)?.classList.add("active");
  if (id==="catalog")   renderCatalog();
  if (id==="mylearning")renderMyLearning();
  if (id==="gradebook") renderGradebook();
  if (id==="stu-dashboard") renderAnnouncements();
  if (id==="admin")     renderAdminTable();
}
function bindSidebarNav() {
  $$("#sidebar .navbtn").forEach(btn=>{
    btn.onclick = ()=> showPage(btn.dataset.page);
  });
}

/* ===================== Catalog ===================== */
let ALL = [];
async function fetchAll() {
  try {
    const snap = await getDocs(query(collection(db,"courses"), orderBy("title","asc")));
    const arr = snap.docs.map(d=>({id:d.id, ...d.data()}));
    if (arr.length) return arr;
  } catch(e){ console.info("Firestore fetch failed, use local", e); }
  return getLocalCourses();
}

async function renderCatalog() {
  const grid = $("#catalog-grid"); if(!grid) return;
  ALL = await fetchAll();
  if (!ALL.length) {
    grid.innerHTML = `<div class="muted">No courses yet — use “Add sample data”.</div>`;
    return;
  }
  grid.innerHTML = ALL.map(c=>{
    const r = Number(c.rating || 4.6);
    const price = (c.price||0) > 0 ? `$${c.price}` : "Free";
    const enrolled = getEnrolls().has(c.id);
    return `<div class="card course" data-id="${c.id}">
      <img class="course-cover" src="${esc(c.img || c.image || `https://picsum.photos/seed/${c.id}/640/360`)}" alt="">
      <div class="course-body">
        <strong>${esc(c.title)}</strong>
        <div class="small muted">${esc(c.category||"")} • ${esc(c.level||"")} • ★ ${r.toFixed(1)} • ${price}</div>
        <div class="muted">${esc(c.description || c.summary || "")}</div>
        <div class="row" style="justify-content:flex-end;gap:8px">
          <button class="btn" data-details="${c.id}">Details</button>
          <button class="btn primary" data-enroll="${c.id}">${enrolled?"Enrolled":"Enroll"}</button>
        </div>
      </div>
    </div>`;
  }).join("");

  grid.querySelectorAll("[data-enroll]").forEach(b=>{
    b.onclick = ()=> handleEnroll(b.getAttribute("data-enroll"));
  });
  grid.querySelectorAll("[data-details]").forEach(b=>{
    b.onclick = ()=> openDetails(b.getAttribute("data-details"));
  });
}

/* Details modal (80% width + scroll) */
function openDetails(id){
  const c = ALL.find(x=>x.id===id) || getLocalCourses().find(x=>x.id===id);
  if (!c) return;
  const body = $("#detailsBody");
  body.innerHTML = `
    <div class="stack">
      <img class="course-cover" src="${esc(c.img || c.image || `https://picsum.photos/seed/${c.id}/640/360`)}" alt="">
      <h3>${esc(c.title)}</h3>
      <div class="small muted">${esc(c.category||"")} • ${esc(c.level||"")} • ★ ${(Number(c.rating||4.5)).toFixed(1)} • ${(c.price||0)>0?`$${c.price}`:"Free"} • ${c.hours||8} hrs • ${c.credits||3} credits</div>
      <p>${esc(c.description || c.summary || "—")}</p>
      ${Array.isArray(c.benefits) && c.benefits.length ? `<ul>${c.benefits.map(b=>`<li>${esc(b)}</li>`).join("")}</ul>`:""}
      <div class="row" style="justify-content:flex-end;gap:8px">
        <button class="btn" id="dEnroll">Enroll</button>
      </div>
    </div>
  `;
  $("#dEnroll").onclick = ()=> handleEnroll(id);
  $("#detailsModal").showModal();
}
$("#closeDetails")?.addEventListener("click", ()=> $("#detailsModal").close());

/* Enroll: Free→auto, Paid→PayPal/MMK */
function markEnrolled(id){
  const s=getEnrolls(); s.add(id); setEnrolls(s);
  toast("Enrolled");
  $("#detailsModal").close();
  renderCatalog(); renderMyLearning();
  showPage("mylearning");
}
function handleEnroll(id){
  const c = ALL.find(x=>x.id===id) || getLocalCourses().find(x=>x.id===id);
  if (!c) return toast("Course not found");
  if ((c.price||0) <= 0) return markEnrolled(id);

  // Open pay modal
  const payBody = $("#payBody");
  $("#payTitle").textContent = `Checkout — ${c.title}`;
  // PayPal panel
  const container = $("#paypal-container");
  container.innerHTML = "";
  const hasPP = !!(window.paypalSDK && window.paypalSDK.Buttons);
  $("#paypalNote").textContent = hasPP ? "" : "PayPal not configured (demo).";
  if (hasPP){
    window.paypalSDK.Buttons({
      createOrder: (d, a) => a.order.create({
        purchase_units: [{ amount: { value: String(c.price||0) } }]
      }),
      onApprove: async (d, a) => { await a.order.capture(); markEnrolled(id); },
      onCancel: ()=> toast("Payment cancelled"),
      onError: (err)=>{ console.error(err); toast("Payment error"); }
    }).render(container);
  }
  // MMK demo
  $("#mmkPaid").onclick = ()=> { toast("MMK demo: paid"); markEnrolled(id); };
  $("#payModal").showModal();
}
$("#closePay")?.addEventListener("click", ()=> $("#payModal").close());

/* ===================== My Learning ===================== */
function renderMyLearning(){
  const grid = $("#mylearn-grid"); if(!grid) return;
  const set = getEnrolls();
  const list = (ALL.length?ALL:getLocalCourses()).filter(c=> set.has(c.id));
  grid.innerHTML = list.map(c=>`
    <div class="card course" data-id="${c.id}">
      <img class="course-cover" src="${esc(c.img || c.image || `https://picsum.photos/seed/${c.id}/640/360`)}" alt="">
      <div class="course-body">
        <strong>${esc(c.title)}</strong>
        <div class="row" style="justify-content:flex-end">
          <button class="btn" data-open="${c.id}">Continue</button>
        </div>
      </div>
    </div>
  `).join("") || `<div class="muted">No enrollments yet.</div>`;
  grid.querySelectorAll("[data-open]").forEach(b=>{
    b.onclick = ()=> openReader(b.getAttribute("data-open"));
  });
}

/* Reader (simple demo pages) */
const SAMPLE_PAGES=(title)=>[
  {type:"lesson", html:`<h3>${esc(title)} — Welcome</h3><p>Intro video:</p><video controls style="width:100%;border-radius:10px"><source src="" type="video/mp4"></video>`},
  {type:"reading",html:`<h3>Chapter 1</h3><img style="width:100%;border-radius:10px" src="https://picsum.photos/seed/p1/800/360" alt=""><p>Reading sample…</p>`},
  {type:"quiz",   html:`<h3>Quick Quiz</h3><p>2+2 = ?</p><input id="q1" class="field" placeholder="Your answer"><div style="margin-top:8px"><button class="btn" id="qSubmit">Submit</button> <span id="qMsg" class="small muted"></span></div>`},
  {type:"final",  html:`<h3>Final</h3><p>Upload your work:</p><input type="file" /><p class="small muted">When you finish last page → fireworks + certificate (demo).</p>`}
];
let RD = { cid:null, pages:[], i:0 };
function openReader(cid){
  const c = ALL.find(x=>x.id===cid) || getLocalCourses().find(x=>x.id===cid);
  if(!c) return;
  RD = { cid, pages: SAMPLE_PAGES(c.title), i:0 };
  $("#reader").dataset.courseId = cid;
  renderPage();
  $("#reader").scrollIntoView({behavior:"smooth"});
}
function renderPage(){
  const box=$("#reader"); if(!box) return;
  const p = RD.pages[RD.i]; if(!p) return;
  box.innerHTML = `
    <div class="row backrow">
      <button class="btn" id="rdBack">← Back</button>
      <div class="grow"></div>
      <button class="btn" id="rdPrev">Prev</button>
      <div class="chip">${RD.i+1} / ${RD.pages.length}</div>
      <button class="btn" id="rdNext">Next</button>
    </div>
    <div class="progress" style="height:6px;background:var(--border);border-radius:999px;overflow:hidden;margin:8px 0">
      <div id="rdProgress" style="height:6px;background:var(--accent,#66d9ef);width:${Math.round((RD.i+1)/RD.pages.length*100)}%"></div>
    </div>
    <div id="rdPage" class="card" style="padding:12px">${p.html}</div>
  `;
  $("#rdBack").onclick = ()=> showPage("mylearning");
  $("#rdPrev").onclick = ()=>{ RD.i=Math.max(0,RD.i-1); renderPage(); };
  $("#rdNext").onclick = ()=>{
    if (RD.i < RD.pages.length-1) { RD.i++; renderPage(); }
    else { celebrate(); toast("Completed! (demo)"); }
  };

  const btn=$("#qSubmit"); const msg=$("#qMsg");
  if(btn){ btn.onclick=()=>{ msg.textContent="Submitted ✔️ +5"; }; }
}
function celebrate(){
  // tiny confetti
  const d=document.createElement("div");
  d.style.cssText="position:fixed;inset:0;pointer-events:none;animation:fade .8s ease forwards";
  d.innerHTML = `<div style="position:absolute;inset:0;display:grid;place-items:center;font-size:28px">🎉 Congratulations!</div>`;
  document.body.appendChild(d);
  setTimeout(()=> d.remove(), 900);
}

/* ===================== Gradebook (demo) ===================== */
function renderGradebook(){
  const box=$("#gradebook"); if(!box) return;
  const set=getEnrolls();
  const list=(ALL.length?ALL:getLocalCourses()).filter(c=> set.has(c.id));
  const rows=list.map(c=>({ course:c.title, score:(80+Math.floor(Math.random()*20))+"%", credits:c.credits||3, progress:(Math.floor(Math.random()*90)+10)+"%" }));
  box.innerHTML = rows.length
    ? `<table class="ol-table"><thead><tr><th>Course</th><th>Score</th><th>Credits</th><th>Progress</th></tr></thead><tbody>${
        rows.map(r=>`<tr><td>${esc(r.course)}</td><td>${esc(r.score)}</td><td>${esc(r.credits)}</td><td>${esc(r.progress)}</td></tr>`).join("")
      }</tbody></table>`
    : `<div class="muted">No data</div>`;
}

/* ===================== Admin: table + “New Course” modal ===================== */
function renderAdminTable(){
  const tb = $("#adminCourseTable tbody"); if(!tb) return;
  const list = ALL.length?ALL:getLocalCourses();
  tb.innerHTML = list.map(c=>`
    <tr data-id="${c.id}">
      <td>${esc(c.id)}</td>
      <td>${esc(c.title)}</td>
      <td>${esc(c.category||"")}</td>
      <td>${esc(c.level||"")}</td>
      <td>${(c.price||0)>0?`$${c.price}`:"Free"}</td>
      <td>${esc(String(c.rating||4.5))}</td>
      <td>${esc(String(c.hours||8))}</td>
      <td><button class="icon-btn" data-edit="${c.id}">✏️</button> <button class="icon-btn" data-del="${c.id}">🗑️</button></td>
    </tr>
  `).join("") || `<tr><td colspan="8" class="muted">No courses</td></tr>`;

  tb.querySelectorAll("[data-del]").forEach(b=>{
    b.onclick = ()=>{
      const id = b.getAttribute("data-del");
      const arr = getLocalCourses().filter(x=> x.id!==id);
      setLocalCourses(arr);
      renderCatalog(); renderAdminTable();
    };
  });
  tb.querySelectorAll("[data-edit]").forEach(b=>{
    b.onclick = ()=>{
      const id = b.getAttribute("data-edit");
      const c = (ALL.length?ALL:getLocalCourses()).find(x=>x.id===id);
      if(!c) return;
      // reuse New Course modal as editor
      $("#courseModalTitle").textContent = "Edit Course";
      const f=$("#courseForm");
      f.title.value     = c.title||"";
      f.category.value  = c.category||"";
      f.level.value     = c.level||"Beginner";
      f.price.value     = c.price||0;
      f.rating.value    = c.rating||4.5;
      f.hours.value     = c.hours||8;
      f.credits.value   = c.credits||3;
      f.img.value       = c.img || c.image || "";
      f.description.value = c.description || c.summary || "";
      f.benefits.value  = Array.isArray(c.benefits)? c.benefits.join("\n") : "";
      f.id.value        = c.id;
      $("#courseModal").showModal();
    };
  });
}
$("#btn-new-course")?.addEventListener("click", ()=>{
  $("#courseModalTitle").textContent = "New Course";
  $("#courseForm").reset();
  $("#courseModal").showModal();
});
$("#courseClose")?.addEventListener("click", ()=> $("#courseModal").close());
$("#courseForm")?.addEventListener("submit", async (e)=>{
  e.preventDefault();
  const f = e.target;
  const payload = {
    title: f.title.value.trim(),
    category: f.category.value.trim(),
    level: f.level.value,
    price: Number(f.price.value||0),
    rating: Number(f.rating.value||4.5),
    hours: Number(f.hours.value||8),
    credits: Number(f.credits.value||3),
    img: f.img.value.trim(),
    description: f.description.value.trim(),
    benefits: f.benefits.value.trim() ? f.benefits.value.split("\n").map(s=>s.trim()).filter(Boolean) : []
  };
  const id = (f.id.value||"").trim();
  if (id){
    // local edit
    const arr = getLocalCourses();
    const i = arr.findIndex(x=>x.id===id);
    if (i>-1) { arr[i] = {...arr[i], ...payload}; setLocalCourses(arr); }
  } else {
    // create (local for demo)
    const arr = getLocalCourses();
    const nid = "loc_"+Math.random().toString(36).slice(2,9);
    arr.push({ id:nid, ...payload, createdAt: Date.now() });
    setLocalCourses(arr);
  }
  $("#courseModal").close();
  renderCatalog(); renderAdminTable();
});

/* ===================== Announcements (Admin only) ===================== */
function isAdminNow(){
  const u = auth.currentUser;
  return !!(u && isAdminEmail(u.email));
}
function renderAnnouncements(){
  const wrap = $("#stuDashPanel"); if(!wrap) return;
  const list = getAnns().slice().reverse();
  wrap.innerHTML = list.length
    ? list.map(a=>`
        <div class="card" data-id="${a.id}" style="margin:6px 0;padding:10px">
          <div class="row" style="justify-content:space-between">
            <strong>${esc(a.title)}</strong>
            <span class="small muted">${new Date(a.ts).toLocaleString()}</span>
          </div>
          ${isAdminNow() ? `<div class="row" style="justify-content:flex-end;gap:6px;margin-top:6px">
             <button class="btn small" data-edit="${a.id}">Edit</button>
             <button class="btn small" data-del="${a.id}">Delete</button>
          </div>`:""}
        </div>
      `).join("")
    : `<div class="muted">No announcements yet.</div>`;

  if (isAdminNow()){
    $("#announceToolbar")?.classList.remove("ol-hidden");
    $("#btn-new-post")?.onclick = ()=>{
      $("#postModalTitle").textContent = "New Announcement";
      $("#pmTitle").value = "";
      $("#pmBody").value  = "";
      $("#pmId").value    = "";
      $("#postModal").showModal();
    };
  } else {
    $("#announceToolbar")?.classList.add("ol-hidden");
  }

  wrap.querySelectorAll("[data-del]")?.forEach(b=>{
    b.onclick = ()=>{
      const id=b.getAttribute("data-del");
      const arr=getAnns().filter(x=>x.id!==id);
      setAnns(arr); renderAnnouncements();
    };
  });
  wrap.querySelectorAll("[data-edit]")?.forEach(b=>{
    b.onclick = ()=>{
      const id=b.getAttribute("data-edit");
      const a=getAnns().find(x=>x.id===id); if(!a) return;
      $("#postModalTitle").textContent = "Edit Announcement";
      $("#pmTitle").value = a.title||"";
      $("#pmBody").value  = a.body || "";
      $("#pmId").value    = a.id;
      $("#postModal").showModal();
    };
  });
}
$("#closePostModal")?.addEventListener("click", ()=> $("#postModal").close());
$("#cancelPost")?.addEventListener("click", ()=> $("#postModal").close());
$("#postForm")?.addEventListener("submit",(e)=>{
  e.preventDefault();
  if (!isAdminNow()) return toast("Admin only");
  const id = $("#pmId").value.trim();
  const t  = $("#pmTitle").value.trim();
  const b  = $("#pmBody").value.trim();
  if (!t) return;
  const arr = getAnns();
  if (id){
    const i = arr.findIndex(x=>x.id===id); if (i>-1){ arr[i]={...arr[i], title:t, body:b}; }
  } else {
    arr.push({ id:"a_"+Math.random().toString(36).slice(2,9), title:t, body:b, ts:Date.now() });
  }
  setAnns(arr);
  $("#postModal").close();
  renderAnnouncements();
});

/* ===================== EmailJS (Contact page button id=cSend) ===================== */
function bindEmailJS(){
  const ek = (CFG.emailjs||{}).publicKey;
  if (!ek) return; // optional
  if (!window.emailjs) {
    const s=document.createElement("script");
    s.src="https://cdn.jsdelivr.net/npm/emailjs-com@3/dist/email.min.js";
    s.onload=()=> window.emailjs.init(ek);
    document.head.appendChild(s);
  } else {
    window.emailjs.init(ek);
  }
  $("#cSend")?.addEventListener("click", async ()=>{
    const name=$("#cName").value.trim();
    const email=$("#cEmail").value.trim();
    const msg=$("#cMsg").value.trim();
    if (!name || !email || !msg) return toast("Fill all fields");
    try{
      await window.emailjs.send(
        CFG.emailjs.serviceId,
        CFG.emailjs.templateId,
        { from_name:name, reply_to:email, message:msg }
      );
      $("#cStatus").textContent="Sent ✔️";
      $("#cName").value=$("#cEmail").value=$("#cMsg").value="";
    }catch(err){ console.error(err); toast("Send failed"); }
  });
}

/* ===================== Boot ===================== */
function addSamplesNow(){
  const base=[ // 7+ courses
    {title:"JavaScript Essentials",category:"Web",level:"Beginner",price:0, credits:3, rating:4.7, hours:10, summary:"Start JS from zero."},
    {title:"React Fast-Track",category:"Web",level:"Intermediate",price:49,credits:2, rating:4.6, hours:8,  summary:"Build modern UIs."},
    {title:"Advanced React Patterns",category:"Web",level:"Advanced",price:69,credits:2, rating:4.5, hours:9,  summary:"Hooks & performance."},
    {title:"Data Analysis with Python",category:"Data",level:"Intermediate",price:79,credits:3,rating:4.8,hours:14,summary:"Pandas & plots."},
    {title:"Intro to Machine Learning",category:"Data",level:"Beginner",price:59,credits:3,rating:4.7,hours:12,summary:"Supervised/unsupervised."},
    {title:"Cloud Fundamentals",category:"Cloud",level:"Beginner",price:29,credits:2,rating:4.6,hours:7, summary:"AWS/GCP basics."},
    {title:"DevOps CI/CD",category:"Cloud",level:"Intermediate",price:69,credits:3,rating:4.6,hours:11,summary:"Pipelines · Docker · K8s"}
  ];
  const arr=getLocalCourses();
  const nowAdd = base.filter(b=> !arr.some(x=>x.title===b.title)).map(b=>({ id:"loc_"+Math.random().toString(36).slice(2,9), ...b, createdAt:Date.now() }));
  if (nowAdd.length) setLocalCourses([...arr, ...nowAdd]);
  renderCatalog(); renderAdminTable();
}

document.addEventListener("DOMContentLoaded", ()=>{
  bindSidebarNav();
  bindEmailJS();

  // Top buttons
  $("#btn-add-samples")?.addEventListener("click", addSamplesNow);

  // Start at Catalog after login
  onAuthStateChanged(auth, (u)=>{
    if (u) { $("#page-auth")?.classList.remove("active"); showPage("catalog"); }
    else   { $("#page-auth")?.classList.add("active"); }
    renderAnnouncements(); // toggles admin toolbar visibility
  });

  // initial renders
  renderCatalog(); renderMyLearning(); renderAdminTable(); renderGradebook(); renderAnnouncements();

  // Footer year
  const y = new Date().getFullYear();
  $("#copyYear") && ($("#copyYear").textContent = `© OpenLearn ${y}`);
});