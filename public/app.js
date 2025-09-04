// app.js — OpenLearn Lite (HTML ids matched to your latest index.html)

import {
  app, auth, db,
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail,
  collection, addDoc, serverTimestamp, doc, getDoc, getDocs, query, orderBy, where, limit
} from "./firebase.js";

/* ========== tiny utils ========== */
const $ = (s,root=document)=>root.querySelector(s);
const $$ = (s,root=document)=>Array.from(root.querySelectorAll(s));
const esc = (s)=> String(s ?? "").replace(/[&<>\"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
const toast=(m,ms=2200)=>{let t=$("#toast");if(!t){t=document.createElement("div");t.id="toast";t.className="toast";document.body.appendChild(t);}t.textContent=m;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),ms);};
const jget=(k,d)=>{try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(d));}catch{return d;}};
const jset=(k,v)=> localStorage.setItem(k, JSON.stringify(v));

/* ========== Firestore probe → local fallback ========== */
let USE_DB=true;
async function probeDb(){
  try{
    const cfgOk=!/YOUR_PROJECT|YOUR_API_KEY|YOUR_APP_ID/.test(JSON.stringify(app.options));
    if(!cfgOk) throw new Error("cfg-missing");
    await getDocs(query(collection(db,"__ping"), limit(1)));
    USE_DB=true;
  }catch{
    console.info("Firestore disabled → local mode");
    USE_DB=false;
  }
}

/* ========== State stores (local) ========== */
const LS_COURSES="ol_courses";
const LS_ENROLLS="ol_enrolls";
const LS_NOTES="ol_notes";
const LS_BMS="ol_bms";
const LS_ANNS="ol_ann";

const getLocalCourses = ()=> jget(LS_COURSES,[]);
const setLocalCourses = (a)=> jset(LS_COURSES,a||[]);
const getEnrolls = ()=> new Set(jget(LS_ENROLLS,[]));
const setEnrolls = (s)=> jset(LS_ENROLLS, Array.from(s));
const getNotes = ()=> jget(LS_NOTES,{});
const setNotes = (x)=> jset(LS_NOTES,x);
const getBms = ()=> jget(LS_BMS,{});
const setBms = (x)=> jset(LS_BMS,x);
const getAnns = ()=> jget(LS_ANNS,[]);
const setAnns = (x)=> jset(LS_ANNS,x);

/* ========== Theme & Font (Settings page) ========== */
function applyTheme(){
  const theme = localStorage.getItem("ol_theme") || "dark";
  const font = localStorage.getItem("ol_font") || "16px";
  document.documentElement.style.setProperty("--font", font);
  document.documentElement.dataset.theme = theme; // styles.css should map [data-theme]
  $("#fontSel")?.value = font;
  $("#themeSel")?.value = theme;
}
$("#themeSel")?.addEventListener("change", e=>{
  localStorage.setItem("ol_theme", e.target.value);
  applyTheme();
});
$("#fontSel")?.addEventListener("change", e=>{
  localStorage.setItem("ol_font", e.target.value);
  applyTheme();
});

/* ========== Router / Navigation ========== */
function showPage(key){
  $$(".page").forEach(p=>p.classList.remove("active"));
  $(`#page-${key}`)?.classList.add("active");
  // highlight
  $$(".navbtn").forEach(b=> b.classList.toggle("active", b.dataset.page===key));
  // lazy renders
  if(key==="catalog") renderCatalog();
  if(key==="mylearning") renderMyLearning();
  if(key==="gradebook") renderGradebook();
  if(key==="admin") renderAdminTable();
}
function bindSidebar(){
  // icon-only by default; labels show on hover (CSS). Nothing to do in JS for hover.
  $$(".navbtn").forEach(btn=>{
    btn.addEventListener("click", ()=> showPage(btn.dataset.page));
    btn.style.cursor="pointer";
  });
}

/* ========== Auth (Modal & Fullpage) ========== */
let currentUser=null;

function gateTopbar(){
  const logged = !!currentUser;
  $("#btn-login")?.classList.toggle("hidden", logged);
  $("#btn-logout")?.classList.toggle("hidden", !logged);
}

function closeAuth(){
  $("#authModal")?.close?.();
  $("#page-auth")?.classList.remove("active");
}

function openLoginModal(){
  $("#authModal")?.showModal?.();
  // default to Login pane
  $("#authLogin")?.classList.remove("ol-hidden");
  $("#authSignup")?.classList.add("ol-hidden");
  $("#authForgot")?.classList.add("ol-hidden");
}

function wireAuthModal(){
  // header Login
  $("#btn-login")?.addEventListener("click", openLoginModal);
  // switchers
  $("#linkSignup")?.addEventListener("click",e=>{
    e.preventDefault();
    $("#authLogin")?.classList.add("ol-hidden");
    $("#authSignup")?.classList.remove("ol-hidden");
  });
  $("#linkForgot")?.addEventListener("click",e=>{
    e.preventDefault();
    $("#authLogin")?.classList.add("ol-hidden");
    $("#authForgot")?.classList.remove("ol-hidden");
  });
  $("#backToLogin1")?.addEventListener("click",e=>{
    e.preventDefault();
    $("#authSignup")?.classList.add("ol-hidden");
    $("#authLogin")?.classList.remove("ol-hidden");
  });
  $("#backToLogin2")?.addEventListener("click",e=>{
    e.preventDefault();
    $("#authForgot")?.classList.add("ol-hidden");
    $("#authLogin")?.classList.remove("ol-hidden");
  });

  // submit handlers
  $("#authLogin")?.addEventListener("submit", async (e)=>{
    e.preventDefault();
    const email=$("#loginEmail")?.value?.trim();
    const pass=$("#loginPass")?.value;
    if(!email||!pass) return;
    try{
      await signInWithEmailAndPassword(auth, email, pass);
      toast("Welcome back");
      closeAuth();
      showPage("catalog"); // home after login
    }catch(err){ console.error(err); toast(err.code||"Login failed"); }
  });

  $("#authSignup")?.addEventListener("submit", async (e)=>{
    e.preventDefault();
    const email=$("#signupEmail")?.value?.trim();
    const pass=$("#signupPass")?.value;
    if(!email||!pass) return;
    try{
      await createUserWithEmailAndPassword(auth, email, pass);
      toast("Account created");
      closeAuth();
      showPage("catalog");
    }catch(err){ console.error(err); toast(err.code||"Signup failed"); }
  });

  $("#authForgot")?.addEventListener("submit", async (e)=>{
    e.preventDefault();
    const email=$("#forgotEmail")?.value?.trim();
    if(!email) return;
    try{
      await sendPasswordResetEmail(auth, email);
      toast("Reset link sent");
      $("#authForgot")?.classList.add("ol-hidden");
      $("#authLogin")?.classList.remove("ol-hidden");
    }catch(err){ console.error(err); toast(err.code||"Failed to send"); }
  });

  // logout
  $("#btn-logout")?.addEventListener("click", async ()=>{
    try{ await signOut(auth); toast("Signed out"); showPage("catalog"); }catch(err){ console.error(err); toast("Logout failed"); }
  });
}

onAuthStateChanged(auth, (u)=>{
  currentUser = u||null;
  gateTopbar();
  // if signed-out and page-auth exists, show fullpage auth; else keep catalog as home
  if(!currentUser && $("#page-auth")){
    // Use modal-first UX; fullpage is fallback → keep hidden unless you want it
    // $("#page-auth").classList.add("active");
  }else{
    $("#page-auth")?.classList.remove("active");
  }
});

/* ========== Catalog ========== */
let ALL=[];

async function fetchCourses(){
  if(!USE_DB) return getLocalCourses();
  try{
    const snap = await getDocs(query(collection(db,"courses"), orderBy("title","asc")));
    const arr = snap.docs.map(d=>({id:d.id, ...d.data()}));
    if(arr.length) return arr;
  }catch(e){
    console.warn("fetchCourses fallback", e);
    USE_DB=false;
  }
  return getLocalCourses();
}

async function safeAddCourse(payload){
  if(!USE_DB){
    const id="loc_"+Math.random().toString(36).slice(2,9);
    const arr=getLocalCourses(); arr.push({id, ...payload}); setLocalCourses(arr);
    return {id, ...payload};
  }
  try{
    const ref = await addDoc(collection(db,"courses"), {...payload, createdAt: serverTimestamp()});
    return {id:ref.id, ...payload};
  }catch(e){
    console.warn("add course → local", e); USE_DB=false;
    const id="loc_"+Math.random().toString(36).slice(2,9);
    const arr=getLocalCourses(); arr.push({id, ...payload}); setLocalCourses(arr);
    return {id, ...payload};
  }
}

async function renderCatalog(){
  const grid=$("#catalog-grid"); if(!grid) return;
  ALL = await fetchCourses();
  if(!ALL.length){ grid.innerHTML = `<div class="muted">No courses yet.</div>`; return; }

  const cats=new Set();
  grid.innerHTML = ALL.map(c=>{
    const price = Number(c.price||0);
    const rating = Number(c.rating||4.6).toFixed(1);
    const enrolled = getEnrolls().has(c.id);
    cats.add(c.category||"");
    return `
    <div class="card course" data-id="${esc(c.id)}">
      <img class="course-cover" alt="" src="${esc(c.img || c.image || `https://picsum.photos/seed/${c.id}/640/360`)}">
      <div class="course-body">
        <strong>${esc(c.title||"Untitled")}</strong>
        <div class="small muted">${esc(c.category||"")} • ${esc(c.level||"")} • ★ ${rating} • ${price>0?`$${price}`:"Free"}</div>
        <div class="muted">${esc(c.description||c.summary||"")}</div>
        <div class="row" style="justify-content:space-between">
          <span>${esc(String(c.hours||8))} hrs</span>
          <div class="row" style="gap:6px">
            <button class="btn" data-details="${esc(c.id)}">Details</button>
            <button class="btn primary" data-enroll="${esc(c.id)}">${enrolled?"Enrolled":"Enroll"}</button>
          </div>
        </div>
      </div>
    </div>`;
  }).join("");

  // actions
  grid.querySelectorAll("[data-enroll]").forEach(b=>{
    b.addEventListener("click", ()=> handleEnroll(b.getAttribute("data-enroll")));
  });
  grid.querySelectorAll("[data-details]").forEach(b=>{
    b.addEventListener("click", ()=> openDetails(b.getAttribute("data-details")));
  });
}

function openDetails(id){
  const c = ALL.find(x=>x.id===id) || getLocalCourses().find(x=>x.id===id);
  if(!c) return;
  const ben = (c.benefits || [])
    .map(x=>`<li>${esc(x)}</li>`).join("") || `<li>Certificate of completion</li>`;
  $("#detailsBody").innerHTML = `
    <div class="stack">
      <img style="width:100%;border-radius:12px" alt="" src="${esc(c.img||c.image||`https://picsum.photos/seed/${c.id}/900/420`)}">
      <h3>${esc(c.title)}</h3>
      <div class="small muted">${esc(c.category||"")} • ${esc(c.level||"")} • ★ ${Number(c.rating||4.6).toFixed(1)}</div>
      <p>${esc(c.description||c.summary||"")}</p>
      <h4>What you’ll learn</h4>
      <ul>${ben}</ul>
      <div class="row" style="justify-content:flex-end">
        <button class="btn primary" data-enroll="${esc(c.id)}">${(c.price||0)>0?`Enroll ($${c.price})`:"Enroll (Free)"}</button>
      </div>
    </div>`;
  $("#detailsModal")?.showModal?.();
  // re-bind enroll inside modal
  $("#detailsBody [data-enroll]")?.addEventListener("click", (e)=>{
    const cid = e.currentTarget.getAttribute("data-enroll");
    handleEnroll(cid);
    $("#detailsModal").close();
  });
}
$("#closeDetails")?.addEventListener("click", ()=> $("#detailsModal")?.close?.());

function markEnrolled(id){
  const s=getEnrolls(); s.add(id); setEnrolls(s);
  toast("Enrolled");
  renderCatalog(); renderMyLearning(); showPage("mylearning");
}
function handleEnroll(id){
  const c = ALL.find(x=>x.id===id) || getLocalCourses().find(x=>x.id===id);
  if(!c) return;
  if(Number(c.price||0)<=0){ markEnrolled(id); return; }
  // Paid → open payModal (PayPal/MMK)
  $("#payTitle").textContent = `Checkout · ${c.title}`;
  $("#paypalNote").textContent = (window.PAYPAL_CLIENT_ID?"":"PayPal not configured — demo capture.");
  $("#mmkPaid").onclick = ()=>{ markEnrolled(c.id); $("#payModal").close(); };
  // mount PayPal buttons if SDK present
  const mount = ()=>{
    const box=$("#paypal-container"); if(!box) return;
    box.innerHTML="";
    const sdk = window.paypal; // injected in HTML
    if(sdk && sdk.Buttons){
      sdk.Buttons({
        createOrder: (d,a)=>a.order.create({purchase_units:[{amount:{value:String(c.price||0)}}]}),
        onApprove: async (d,a)=>{ await a.order.capture(); markEnrolled(c.id); $("#payModal").close(); }
      }).render(box);
    }else{
      box.innerHTML=`<div class="muted">PayPal SDK not loaded — using demo flow.</div>`;
    }
  };
  $("#payModal")?.showModal?.();
  setTimeout(mount, 50);
}
$("#closePay")?.addEventListener("click", ()=> $("#payModal")?.close?.());

/* Sample data */
async function addSamples(){
  const base = [
    {title:"JavaScript Essentials",category:"Web",level:"Beginner",price:0,credits:3,rating:4.7,hours:10,summary:"Start JS from zero."},
    {title:"React Fast-Track",category:"Web",level:"Intermediate",price:49,credits:2,rating:4.6,hours:8,summary:"Build modern UIs."},
    {title:"Advanced React Patterns",category:"Web",level:"Advanced",price:69,credits:2,rating:4.5,hours:9,summary:"Hooks & performance."},
    {title:"Data Analysis with Python",category:"Data",level:"Intermediate",price:79,credits:3,rating:4.8,hours:14,summary:"Pandas & plots."},
    {title:"Intro to Machine Learning",category:"Data",level:"Beginner",price:59,credits:3,rating:4.7,hours:12,summary:"Supervised/unsupervised."},
    {title:"Cloud Fundamentals",category:"Cloud",level:"Beginner",price:29,credits:2,rating:4.6,hours:7,summary:"AWS/GCP basics."},
    {title:"DevOps CI/CD",category:"Cloud",level:"Intermediate",price:69,credits:3,rating:4.6,hours:11,summary:"Pipelines,Docker,K8s."},
  ];
  for(const c of base){
    await safeAddCourse({...c, createdAt: Date.now(), img: ""});
  }
  toast("Sample courses added");
  renderCatalog(); renderAdminTable();
}
$("#btn-add-samples")?.addEventListener("click", ()=> addSamples().catch(console.error));

/* New Course modal (70% width already in CSS via ol-modal/card) */
$("#btn-new-course")?.addEventListener("click", ()=> $("#courseModal")?.showModal?.());
$("#courseCancel")?.addEventListener("click", ()=> $("#courseModal")?.close?.());
$("#courseClose")?.addEventListener("click", ()=> $("#courseModal")?.close?.());
$("#courseForm")?.addEventListener("submit", async (e)=>{
  e.preventDefault();
  const f = e.currentTarget;
  const payload = {
    title: f.title.value.trim(),
    category: f.category.value.trim(),
    level: f.level.value,
    price: Number(f.price.value||0),
    rating: Number(f.rating.value||4.6),
    hours: Number(f.hours.value||8),
    credits: Number(f.credits.value||3),
    description: f.description.value.trim(),
    img: f.img.value.trim(),
    benefits: (f.benefits.value||"").split("\n").map(x=>x.trim()).filter(Boolean),
    createdAt: Date.now(),
  };
  await safeAddCourse(payload);
  $("#courseModal").close();
  renderCatalog(); renderAdminTable();
  toast("Course saved");
});

/* ========== My Learning + Reader (same page) ========== */
function renderMyLearning(){
  const grid=$("#mylearn-grid"); if(!grid) return;
  const ids=getEnrolls(); const list=(ALL.length?ALL:getLocalCourses()).filter(c=> ids.has(c.id));
  grid.innerHTML = list.map(c=>{
    const r=Number(c.rating||4.6).toFixed(1);
    return `<div class="card course" data-id="${esc(c.id)}">
      <img class="course-cover" alt="" src="${esc(c.img||c.image||`https://picsum.photos/seed/${c.id}/640/360`)}">
      <div class="course-body">
        <strong>${esc(c.title)}</strong>
        <div class="small muted">${esc(c.category||"")} • ${esc(c.level||"")} • ★ ${r} • ${(c.price||0)>0?`$${c.price}`:"Free"}</div>
        <div class="muted">${esc(c.description||c.summary||"")}</div>
        <div class="row" style="justify-content:flex-end"><button class="btn" data-open="${esc(c.id)}">Continue</button></div>
      </div>
    </div>`;
  }).join("") || `<div class="muted">No enrollments yet.</div>`;
  grid.querySelectorAll("[data-open]").forEach(b=>{
    b.addEventListener("click", ()=> openReader(b.getAttribute("data-open")));
  });
}

const DEMO_PAGES=(title)=>[
  {type:"lesson", html:`<h3>${esc(title)} — Welcome</h3><video controls style="width:100%;border-radius:10px"><source src=""></video>`},
  {type:"reading", html:`<h3>Chapter 1</h3><img src="https://picsum.photos/seed/${Math.random().toString(36).slice(2)}/800/360" style="width:100%;border-radius:10px"><audio controls style="width:100%"></audio>`},
  {type:"exercise", html:`<h3>Practice</h3><input type="file">`},
  {type:"quiz", html:`<h3>Quick Quiz</h3><p>Q) Short answer</p><input style="width:100%"> <button class="btn" id="qSubmit">Submit</button><span id="qMsg" class="small muted"></span>`},
  {type:"final", html:`<h3>Final</h3><p>Upload your project to finish.</p><input type="file">`}
];

let RD={cid:null, pages:[], i:0};
async function openReader(cid){
  const c = ALL.find(x=>x.id===cid) || getLocalCourses().find(x=>x.id===cid);
  if(!c) return;
  RD={cid:cid, pages: DEMO_PAGES(c.title), i: (getBms()[cid]||0)};
  const r=$("#reader"); if(!r) return;
  r.dataset.courseId = cid;
  r.innerHTML = `
    <div class="row" style="justify-content:space-between;align-items:center;margin-bottom:8px">
      <div class="row">
        <button class="btn" id="rdBack">← Back</button>
        <b id="rdTitle" style="margin-left:8px"></b>
      </div>
      <div class="row">
        <button class="btn" id="rdNote">Note</button>
        <button class="btn" id="rdBookmark">Bookmark</button>
      </div>
    </div>
    <div class="card" id="rdPage" style="padding:12px"></div>
    <div class="row" style="margin-top:8px;justify-content:space-between;align-items:center">
      <div style="flex:1;height:6px;border-radius:999px;background:#233">
        <div id="rdProgress" style="height:6px;width:0;background:var(--primary,#2563eb);border-radius:999px"></div>
      </div>
      <span id="rdPageInfo" class="small muted" style="margin-left:8px"></span>
      <div class="row">
        <button class="btn" id="rdPrev">Prev</button>
        <button class="btn" id="rdNext">Next</button>
      </div>
    </div>`;
  r.classList.remove("hidden");
  renderPage();

  $("#rdBack").onclick=()=>{ r.classList.add("hidden"); showPage("mylearning"); };
  $("#rdPrev").onclick=()=>{ RD.i=Math.max(0,RD.i-1); renderPage(); };
  $("#rdNext").onclick=()=>{ RD.i=Math.min(RD.pages.length-1,RD.i+1); renderPage(); };
  $("#rdBookmark").onclick=()=>{ const b=getBms(); b[cid]=RD.i; setBms(b); toast("Bookmarked"); };
  $("#rdNote").onclick=()=>{ const t=prompt("Note"); if(!t) return; const ns=getNotes(); (ns[cid]=ns[cid]||[]).push({i:RD.i, t, ts:Date.now()}); setNotes(ns); toast("Saved note"); };
}

function renderPage(){
  const p=RD.pages[RD.i];
  $("#rdTitle").textContent = `${RD.i+1}. ${p.type.toUpperCase()}`;
  $("#rdPage").innerHTML = p.html;
  $("#rdPageInfo").textContent = `${RD.i+1}/${RD.pages.length}`;
  $("#rdProgress").style.width = Math.round((RD.i+1)/RD.pages.length*100)+"%";
  const btn=$("#qSubmit"), msg=$("#qMsg");
  if(btn){ btn.onclick=()=>{ msg.textContent="Submitted ✔️ (demo)"; }; }
}

/* ========== Gradebook (demo) ========== */
function renderGradebook(){
  const box=$("#gradebook"); if(!box) return;
  const ids=getEnrolls(); const list=(ALL.length?ALL:getLocalCourses()).filter(c=> ids.has(c.id));
  if(!list.length){ box.innerHTML=`<div class="muted">No data</div>`; return; }
  const rows = list.map(c=>({
    course:c.title, score:(80+Math.floor(Math.random()*20))+"%", credits:c.credits||3, progress:(10+Math.floor(Math.random()*90))+"%"
  }));
  box.innerHTML = `
    <table class="ol-table"><thead><tr>
      <th>Course</th><th>Score</th><th>Credits</th><th>Progress</th>
    </tr></thead><tbody>
      ${rows.map(r=>`<tr><td>${esc(r.course)}</td><td>${esc(r.score)}</td><td>${esc(r.credits)}</td><td>${esc(r.progress)}</td></tr>`).join("")}
    </tbody></table>`;
}

/* ========== Admin (table) ========== */
function renderAdminTable(){
  const tb=$("#adminCourseTable tbody"); if(!tb) return;
  const list = ALL.length?ALL:getLocalCourses();
  tb.innerHTML = list.map(c=>`
    <tr data-id="${esc(c.id)}">
      <td>${esc(c.id)}</td>
      <td>${esc(c.title)}</td>
      <td>${esc(c.category||"")}</td>
      <td>${esc(c.level||"")}</td>
      <td>${(c.price||0)>0?`$${c.price}`:"Free"}</td>
      <td>${Number(c.rating||4.6).toFixed(1)}</td>
      <td>${esc(String(c.hours||8))}</td>
      <td>
        <button class="icon-btn" data-edit="${esc(c.id)}">✏️</button>
        <button class="icon-btn" data-del="${esc(c.id)}">🗑️</button>
      </td>
    </tr>
  `).join("") || `<tr><td colspan="8" class="muted">No courses</td></tr>`;

  tb.querySelectorAll("[data-del]").forEach(b=>{
    b.addEventListener("click", ()=>{
      const id=b.getAttribute("data-del");
      const arr=getLocalCourses().filter(x=>x.id!==id);
      setLocalCourses(arr);
      renderCatalog(); renderAdminTable();
    });
  });
  tb.querySelectorAll("[data-edit]").forEach(b=>{
    b.addEventListener("click", ()=>{
      const id=b.getAttribute("data-edit");
      const c=(getLocalCourses().find(x=>x.id===id) || ALL.find(x=>x.id===id));
      if(!c) return;
      $("#courseModal")?.showModal?.();
      const f=$("#courseForm");
      f.title.value=c.title||"";
      f.category.value=c.category||"";
      f.level.value=c.level||"Beginner";
      f.price.value=c.price||0;
      f.rating.value=c.rating||4.6;
      f.hours.value=c.hours||8;
      f.credits.value=c.credits||3;
      f.img.value=c.img||c.image||"";
      f.description.value=c.description||c.summary||"";
      f.benefits.value=(c.benefits||[]).join("\n");
      f.onsubmit=(e)=>{
        e.preventDefault();
        const arr=getLocalCourses();
        const i=arr.findIndex(x=>x.id===id);
        if(i>-1){
          arr[i] = {
            ...arr[i],
            title:f.title.value.trim(),
            category:f.category.value.trim(),
            level:f.level.value,
            price:Number(f.price.value||0),
            rating:Number(f.rating.value||4.6),
            hours:Number(f.hours.value||8),
            credits:Number(f.credits.value||3),
            img:f.img.value.trim(),
            description:f.description.value.trim(),
            benefits:(f.benefits.value||"").split("\n").map(x=>x.trim()).filter(Boolean)
          };
          setLocalCourses(arr);
          $("#courseModal").close();
          renderCatalog(); renderAdminTable();
          f.onsubmit=null;
        }else{
          toast("Only local edit supported in lite build");
        }
      };
    });
  });
}

/* ========== Global search (top) ========== */
function bindSearch(){
  const doSearch=(term)=>{
    showPage("catalog");
    const t=(term ?? $("#topSearch")?.value ?? "").toLowerCase().trim();
    $$("#catalog-grid .card.course").forEach(card=>{
      const txt = card.textContent.toLowerCase();
      card.style.display = (!t || txt.includes(t)) ? "" : "none";
    });
  };
  $("#topSearch")?.addEventListener("keydown", e=>{ if(e.key==="Enter") doSearch(); });
}

/* ========== Boot ========== */
document.addEventListener("DOMContentLoaded", async ()=>{
  applyTheme();
  bindSidebar();
  bindSearch();
  wireAuthModal();
  await probeDb();
  await renderCatalog();      // home
  renderMyLearning();
  renderGradebook();
  renderAdminTable();

  // default page = catalog
  showPage("catalog");
});