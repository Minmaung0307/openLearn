import {
  app, auth, db,
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail,
  collection, addDoc, getDocs, query, orderBy, limit
} from "./firebase.js";

/* =============== helpers ================= */
const $  = (s,root=document)=>root.querySelector(s);
const $$ = (s,root=document)=>Array.from(root.querySelectorAll(s));
const esc=(s)=>String(s??"").replace(/[&<>\"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
const toast=(m,ms=2000)=>{let t=$("#toast"); if(!t){t=document.createElement("div");t.id="toast";document.body.appendChild(t);} t.textContent=m; t.classList.add("show"); setTimeout(()=>t.classList.remove("show"),ms);};
const readJSON=(k,d)=>{ try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(d));}catch{ return d; } };
const writeJSON=(k,v)=> localStorage.setItem(k, JSON.stringify(v));

/* =============== theme / font ================= */
const PALETTES={
  dark:{bg:"#0b0f17",fg:"#e7ecf3",card:"#121826",muted:"#9aa6b2",border:"#223",accent:"#66d9ef",btnBg:"#1f2937",btnFg:"#e7ecf3",btnPrimaryBg:"#2563eb",btnPrimaryFg:"#fff",inputBg:"#0b1220",inputFg:"#e7ecf3",hoverBg:"#0e1625"},
  ocean:{bg:"#07131d",fg:"#dff3ff",card:"#0c2030",muted:"#8fb3c6",border:"#113347",accent:"#4cc9f0",btnBg:"#123247",btnFg:"#dff3ff",btnPrimaryBg:"#4cc9f0",btnPrimaryFg:"#08222f",inputBg:"#0b2231",inputFg:"#dff3ff",hoverBg:"#0f2b40"},
  rose:{bg:"#1a0d12",fg:"#ffe7ee",card:"#241318",muted:"#d9a7b5",border:"#3a1b27",accent:"#fb7185",btnBg:"#2a1720",btnFg:"#ffe7ee",btnPrimaryBg:"#fb7185",btnPrimaryFg:"#240b12",inputBg:"#221018",inputFg:"#ffe7ee",hoverBg:"#2c1620"},
  light:{bg:"#f7fafc",fg:"#0b1220",card:"#fff",muted:"#4a5568",border:"#dbe2ea",accent:"#2563eb",btnBg:"#e2e8f0",btnFg:"#0b1220",btnPrimaryBg:"#0f172a",btnPrimaryFg:"#fff",inputBg:"#fff",inputFg:"#0b1220",hoverBg:"#eef2f7"}
};
function applyPalette(name){
  const p=PALETTES[name]||PALETTES.dark, r=document.documentElement, map={
    bg:"--bg", fg:"--fg", card:"--card", muted:"--muted", border:"--border",
    accent:"--accent", btnBg:"--btnBg", btnFg:"--btnFg",
    btnPrimaryBg:"--btnPrimaryBg", btnPrimaryFg:"--btnPrimaryFg",
    inputBg:"--inputBg", inputFg:"--inputFg", hoverBg:"--hoverBg"
  };
  for(const [k,v] of Object.entries(map)) r.style.setProperty(v,p[k]);
}
function applyFont(px){ document.documentElement.style.setProperty("--fontSize", px+"px"); }

/* =============== sidebar (icon fixed, label slide-in) =============== */
function initSidebar(){
  const sb=$("#sidebar"); if(!sb) return;
  const expand=()=> sb.classList.add("expanded");
  const collapse=()=> sb.classList.remove("expanded");
  if (window.matchMedia("(min-width:1025px)").matches){
    sb.addEventListener("mouseenter", expand);
    sb.addEventListener("mouseleave", collapse);
  }
  const isMobile=()=> window.matchMedia("(max-width:1024px)").matches;
  $("#btn-burger")?.addEventListener("click", ()=>{
    if(isMobile()) sb.classList.toggle("show"); else sb.classList.toggle("expanded");
  });
  document.addEventListener("click",(e)=>{
    if(!isMobile() || !sb.classList.contains("show")) return;
    const inside=e.target.closest("#sidebar")||e.target.closest("#btn-burger");
    if(!inside) sb.classList.remove("show");
  });
}
function bindSidebarNav(){
  $$("#sidebar .navbtn").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id=btn.dataset.page; if(!id) return;
      showPage(id);
    });
  });
}

/* =============== router =============== */
function showPage(id){
  $$(".page").forEach(p=>p.classList.remove("active","visible"));
  $(`#page-${id}`)?.classList.add("active","visible");
  $$("#sidebar .navbtn").forEach(x=> x.classList.toggle("active", x.dataset.page===id));
  if(id==="mylearning") renderMyLearning();
  if(id==="gradebook") renderGradebook();
  if(id==="admin") renderAdminTable();
  if(id==="stu-dashboard") renderAnnouncements();
}
function showAuthScreen(){
  if ($("#page-auth")) { $$(".page").forEach(p=>p.classList.remove("active","visible")); $("#page-auth").classList.add("active","visible"); }
  $("#authModal")?.showModal(); // also open modal for convenience
}

/* =============== search =============== */
function bindSearch(){
  const doSearch=(q)=>{
    const term=String(q ?? $("#topSearch")?.value ?? "").toLowerCase().trim();
    location.hash="#/catalog"; showPage("catalog");
    $$("#catalog-grid .card.course").forEach(card=>{
      const text=(card.dataset.search||"").toLowerCase();
      card.style.display = !term || text.includes(term) ? "" : "none";
    });
  };
  $("#topSearch")?.addEventListener("keydown",(e)=>{ if(e.key==="Enter") doSearch(); });
}

/* =============== Firestore probe / local fallback =============== */
let USE_DB=true;
async function probeDbOnce(){
  try{
    const cfgOk=!/YOUR_PROJECT|YOUR_API_KEY|YOUR_APP_ID/.test(JSON.stringify(app.options));
    if(!cfgOk) throw new Error("cfg-missing");
    await getDocs(query(collection(db,"__ping"), limit(1)));
    USE_DB=true;
  }catch(e){ console.info("Firestore disabled → local mode"); USE_DB=false; }
}

/* =============== local data helpers =============== */
const getLocalCourses = ()=> readJSON("ol_local_courses", []);
const setLocalCourses = (a)=> writeJSON("ol_local_courses", a||[]);
const getEnrolls = ()=> new Set(readJSON("ol_enrolls", []));
const setEnrolls = (s)=> writeJSON("ol_enrolls", Array.from(s));
const getNotes = ()=> readJSON("ol_notes", {});
const setNotes = (x)=> writeJSON("ol_notes", x);
const getBookmarks = ()=> readJSON("ol_bms", {});
const setBookmarks = (x)=> writeJSON("ol_bms", x);
const getAnns = ()=> readJSON("ol_anns", []);
const setAnns = (x)=> writeJSON("ol_anns", x);

/* =============== data access =============== */
async function fetchAll(){
  if(!USE_DB) return getLocalCourses();
  try{
    const snap=await getDocs(query(collection(db,"courses"), orderBy("title","asc")));
    const arr=snap.docs.map(d=>({id:d.id, ...d.data()}));
    if (arr.length) return arr;
  }catch(e){ console.warn("fetch fallback", e); USE_DB=false; }
  return getLocalCourses();
}
async function safeAddCourse(payload){
  if(!USE_DB){
    const id="loc_"+Math.random().toString(36).slice(2,9);
    const arr=getLocalCourses(); arr.push({id, ...payload}); setLocalCourses(arr);
    return {id, ...payload};
  }
  try{
    const ref=await addDoc(collection(db,"courses"), payload);
    return {id:ref.id, ...payload};
  }catch(e){
    console.warn("add fallback", e); USE_DB=false;
    const id="loc_"+Math.random().toString(36).slice(2,9);
    const arr=getLocalCourses(); arr.push({id, ...payload}); setLocalCourses(arr);
    return {id, ...payload};
  }
}

/* =============== samples / analytics no-op =============== */
function renderAnalytics(){ /* keep as no-op to avoid ReferenceError */ }
async function addSamples(){
  const base=[
    {title:"JavaScript Essentials", category:"Web",  level:"Beginner",     price:0,  credits:3, rating:4.7, hours:10, summary:"Start JavaScript from zero.", image:""},
    {title:"React Fast-Track",     category:"Web",  level:"Intermediate", price:49, credits:2, rating:4.6, hours:8,  summary:"Build modern UIs.",           image:""},
    {title:"Advanced React",       category:"Web",  level:"Advanced",     price:69, credits:2, rating:4.5, hours:9,  summary:"Hooks & performance.",       image:""},
    {title:"Data Analysis Python", category:"Data", level:"Intermediate", price:79, credits:3, rating:4.8, hours:14, summary:"Pandas & plots.",            image:""},
    {title:"Intro to ML",          category:"Data", level:"Beginner",     price:59, credits:3, rating:4.7, hours:12, summary:"Supervised, unsupervised.",  image:""},
    {title:"Cloud Fundamentals",   category:"Cloud",level:"Beginner",     price:29, credits:2, rating:4.6, hours:7,  summary:"AWS/GCP basics.",            image:""},
    {title:"DevOps CI/CD",         category:"Cloud",level:"Intermediate", price:69, credits:3, rating:4.6, hours:11, summary:"Pipelines, Docker, K8s.",    image:""},
  ];
  for(const c of base) await safeAddCourse({ ...c, createdAt:Date.now(), progress:0 });
  toast("Sample courses added");
  renderCatalog(); renderAdminTable(); renderAnalytics();
}

/* =============== catalog (details + enroll) =============== */
let ALL=[];
async function renderCatalog(){
  const grid=$("#catalog-grid"); if(!grid) return;
  ALL=await fetchAll();
  if(!ALL.length){ grid.innerHTML=`<div class="muted">No courses yet.</div>`; return; }
  grid.innerHTML = ALL.map(c=>{
    const search=[c.title,c.summary,c.category,c.level].join(" ");
    const r=Number(c.rating||4.6);
    const priceStr=(c.price||0)>0?("$"+c.price):"Free";
    const enrolled=getEnrolls().has(c.id);
    return `<div class="card course" data-id="${c.id}" data-search="${esc(search)}">
      <img class="course-cover" src="${esc(c.image||`https://picsum.photos/seed/${c.id}/640/360`)}" alt="">
      <div class="course-body">
        <strong>${esc(c.title)}</strong>
        <div class="small muted">${esc(c.category||"")} • ${esc(c.level||"")} • ★ ${r.toFixed(1)} • ${priceStr}</div>
        <div class="muted">${esc(c.summary||"")}</div>
        <div class="row" style="justify-content:space-between">
          <button class="btn" data-details="${c.id}">Details</button>
          <button class="btn primary" data-enroll="${c.id}">${enrolled?"Enrolled":"Enroll"}</button>
        </div>
      </div>
    </div>`;
  }).join("");
}
function markEnrolled(id){
  const s=getEnrolls(); s.add(id); setEnrolls(s);
  toast("Enrolled"); renderCatalog(); renderMyLearning(); showPage("mylearning");
}
function handleEnroll(id){
  const c=ALL.find(x=>x.id===id)||getLocalCourses().find(x=>x.id===id);
  if(!c) return toast("Course not found");
  if((c.price||0)<=0) return markEnrolled(id);

  const host=document.querySelector(`.card.course[data-id="${id}"] .course-body`);
  const box=document.createElement("div"); box.style.margin="10px 0"; host.appendChild(box);
  if(window.paypal && window.paypal.Buttons){
    window.paypal.Buttons({
      createOrder:(d,a)=>a.order.create({purchase_units:[{amount:{value:String(c.price||0)}}]}),
      onApprove:async(d,a)=>{ await a.order.capture(); box.remove(); markEnrolled(id); },
      onCancel:()=>{ box.remove(); toast("Payment cancelled"); },
      onError:(err)=>{ console.error(err); box.remove(); toast("Payment error"); }
    }).render(box);
  }else{ toast("Simulated payment success"); markEnrolled(id); box.remove(); }
}

/* =============== My Learning + Reader (simple) =============== */
function renderMyLearning(){
  const grid=$("#mylearn-grid"); if(!grid) return;
  const set=getEnrolls();
  const list=(ALL.length?ALL:getLocalCourses()).filter(c=> set.has(c.id));
  grid.innerHTML = list.map(c=>{
    const r=Number(c.rating||4.6);
    return `<div class="card course" data-id="${c.id}">
      <img class="course-cover" src="${esc(c.image||`https://picsum.photos/seed/${c.id}/640/360`)}" alt="">
      <div class="course-body">
        <strong>${esc(c.title)}</strong>
        <div class="small muted">${esc(c.category||"")} • ${esc(c.level||"")} • ★ ${r.toFixed(1)} • ${(c.price||0)>0?("$"+c.price):"Free"}</div>
        <div class="muted">${esc(c.summary||"")}</div>
        <div class="row" style="justify-content:flex-end"><button class="btn" data-continue="${c.id}">Continue</button></div>
      </div>
    </div>`;
  }).join("") || `<div class="muted">No enrollments yet. Enroll from Courses.</div>`;
}

const SAMPLE_PAGES=(title)=>[
  {type:"lesson", html:`<h3>${esc(title)} — Welcome</h3>
    <p>Intro video:</p>
    <video controls style="width:100%;border-radius:10px" poster="https://picsum.photos/seed/v1/800/320"><source src="" type="video/mp4"></video>`},
  {type:"reading", html:`<h3>Chapter 1</h3>
    <img style="width:100%;border-radius:10px" src="https://picsum.photos/seed/p1/800/360" alt="">
    <audio controls style="width:100%"></audio>`},
  {type:"quiz", html:`<h3>Quick Quiz</h3>
    <p>Q1) Short answer</p><input id="q1" placeholder="Your answer" style="width:100%">
    <div style="margin-top:8px"><button class="btn" id="qSubmit">Submit</button> <span id="qMsg" class="small muted"></span></div>`},
  {type:"final", html:`<h3>Final Project</h3><input type="file"><p class="small muted">Complete to earn certificate/transcript (demo).</p>`}
];
let RD={cid:null, pages:[], i:0, credits:0, score:0};

async function openReader(cid){
  const c=ALL.find(x=>x.id===cid)||getLocalCourses().find(x=>x.id===cid);
  if(!c) return;
  RD={cid:c.id, pages:SAMPLE_PAGES(c.title), i:(getBookmarks()[c.id]??0), credits:c.credits||3, score:0};
  const r=$("#reader"); if(r) r.dataset.courseId=cid;
  r?.classList.remove("hidden");
  renderPage();
}
function renderPage(){
  const r=$("#reader"); if(!r) return;
  const p=RD.pages[RD.i]; if(!p) return;
  r.innerHTML = `
    <div class="row" style="justify-content:space-between;align-items:center;margin-bottom:8px">
      <button class="btn" id="rdBack">← Back</button>
      <div id="rdMeta" class="small muted">Score: ${RD.score}% • Credits: ${RD.credits}</div>
    </div>
    <div id="rdPage" class="card" style="padding:10px">${p.html}</div>
    <div class="row" style="margin-top:8px;justify-content:space-between">
      <div class="small muted"><span id="rdPageInfo">${RD.i+1} / ${RD.pages.length}</span></div>
      <div class="row">
        <button class="btn" id="rdBookmark">Bookmark</button>
        <button class="btn" id="rdNote">Note</button>
        <button class="btn" id="rdPrev">Prev</button>
        <button class="btn" id="rdNext">Next</button>
      </div>
    </div>
    <div class="row" style="margin-top:6px">
      <div style="flex:1;height:6px;background:#223;border-radius:999px;overflow:hidden">
        <div id="rdProgress" style="height:100%;width:${Math.round((RD.i+1)/RD.pages.length*100)}%;background:#2563eb"></div>
      </div>
    </div>`;
  $("#rdBack").onclick = ()=> { $("#reader").classList.add("hidden"); showPage("mylearning"); };
  $("#rdPrev").onclick = ()=> { RD.i=Math.max(0,RD.i-1); renderPage(); };
  $("#rdNext").onclick = ()=> { RD.i=Math.min(RD.pages.length-1,RD.i+1); renderPage(); };
  $("#rdBookmark").onclick = ()=> { const b=getBookmarks(); b[RD.cid]=RD.i; setBookmarks(b); toast("Bookmarked"); };
  $("#rdNote").onclick = ()=> { const t=prompt("Note"); if(!t) return; const ns=getNotes(); ns[RD.cid]=(ns[RD.cid]||[]); ns[RD.cid].push({page:RD.i,text:t,ts:Date.now()}); setNotes(ns); toast("Note added"); };
  const btn=$("#qSubmit"), msg=$("#qMsg");
  if(btn){ btn.onclick=()=>{ msg.textContent="Submitted ✔️ (+5)"; RD.score=Math.min(100,RD.score+5); $("#rdMeta").textContent=`Score: ${RD.score}% • Credits: ${RD.credits}`; }; }
}

/* =============== Gradebook =============== */
function renderGradebook(){
  const box=$("#gradebook"); if(!box) return;
  const set=getEnrolls();
  const list=(ALL.length?ALL:getLocalCourses()).filter(c=> set.has(c.id));
  const rows=list.map(c=>({course:c.title, score:(80+Math.floor(Math.random()*20))+"%", credits:c.credits||3, progress:(Math.floor(Math.random()*90)+10)+"%"}));
  box.innerHTML = `
    <table class="ol-table" id="gbTable">
      <thead><tr><th>Course</th><th>Score</th><th>Credits</th><th>Progress</th></tr></thead>
      <tbody>
        ${rows.map(r=>`<tr><td>${esc(r.course)}</td><td>${esc(r.score)}</td><td>${esc(r.credits)}</td><td>${esc(r.progress)}</td></tr>`).join("") || "<tr><td colspan='4' class='muted'>No data</td></tr>"}
      </tbody>
    </table>`;
}

/* =============== Admin table =============== */
function renderAdminTable(){
  const tb=$("#adminCourseTable tbody"); if(!tb) return;
  const list=ALL.length?ALL:getLocalCourses();
  tb.innerHTML = list.map(c=>`
    <tr data-id="${c.id}">
      <td>${esc(c.id)}</td><td>${esc(c.title)}</td><td>${esc(c.category||"")}</td>
      <td>${esc(c.level||"")}</td><td>${(c.price||0)>0?("$"+c.price):"Free"}</td>
      <td>${esc(String(c.rating||4.6))}</td><td>${esc(String(c.hours||8))}</td>
      <td><button class="btn small" data-edit="${c.id}">Edit</button>
          <button class="btn small" data-del="${c.id}">Delete</button></td>
    </tr>`).join("") || `<tr><td colspan="8" class="muted">No courses</td></tr>`;
}

/* =============== Announcements (local) =============== */
function renderAnnouncements(){
  const box=$("#stuDashPanel"); if(!box) return;
  const arr=getAnns().slice().reverse();
  box.innerHTML = arr.length ? arr.map(a=>`
    <div class="card" style="padding:10px;margin-bottom:8px">
      <div class="row" style="justify-content:space-between;align-items:center">
        <strong>${esc(a.title)}</strong>
        <span class="small muted">${new Date(a.ts).toLocaleString()}</span>
      </div>
      <div class="row" style="justify-content:flex-end;margin-top:6px">
        <button class="btn small" data-ann-edit="${a.id}">Edit</button>
        <button class="btn small" data-ann-del="${a.id}">Delete</button>
      </div>
    </div>`).join("") : `No announcements yet.`;
}
document.addEventListener("click",(e)=>{
  if(e.target.closest("#btn-new-post")){ $("#postModal")?.showModal(); }
  if(e.target?.id==="closePostModal") $("#postModal")?.close();
  if(e.target.closest("#savePost")){
    e.preventDefault();
    const t=$("#pmTitle")?.value.trim(); const body=$("#pmBody")?.value.trim();
    if(!t) return alert("Title required");
    const arr=getAnns(); arr.push({id:"a_"+Math.random().toString(36).slice(2,9), title:t, body, ts:Date.now()});
    setAnns(arr); $("#postForm")?.reset(); $("#postModal")?.close(); renderAnnouncements();
  }
  const del=e.target.closest("[data-ann-del]");
  if(del){ const id=del.getAttribute("data-ann-del"); const arr=getAnns().filter(x=>x.id!==id); setAnns(arr); renderAnnouncements(); }
  const edt=e.target.closest("[data-ann-edit]");
  if(edt){ const id=edt.getAttribute("data-ann-edit"); const arr=getAnns(); const i=arr.findIndex(x=>x.id===id);
    if(i>-1){ const t=prompt("Edit title", arr[i].title); if(t){ arr[i].title=t; setAnns(arr); renderAnnouncements(); } }
  }
});

/* =============== Static pages loader (JSON) =============== */
async function loadJSON(path){ const res=await fetch(path,{cache:"no-cache"}); if(!res.ok) throw new Error(`Failed ${path}: ${res.status}`); return res.json(); }
document.addEventListener("click",(e)=>{
  const a=e.target.closest("[data-link]"); if(!a) return;
  e.preventDefault();
  const k=a.getAttribute("data-link");
  loadJSON(`/data/pages/${k}.json`).then(p=>{
    $("#stTitle").textContent=p.title||k;
    $("#stBody").innerHTML=p.html||"<p>No content</p>";
    $("#dlgStatic")?.showModal();
  }).catch(()=> toast("Page missing"));
});

/* =============== Auth (robust) =============== */
let currentUser=null;
function gateUI(){
  const logged=!!currentUser;
  const loginBtn=$("#btn-login"), logoutBtn=$("#btn-logout");
  if(loginBtn)  loginBtn.style.display  = logged ? "none" : "";
  if(logoutBtn) logoutBtn.style.display = logged ? "" : "none";
}
onAuthStateChanged(auth, (u)=>{ currentUser=u||null; gateUI(); if(!u){ /* on sign-out show login page */ showAuthScreen(); } });

function openLogin(e){ e?.preventDefault?.(); $("#authModal")?.showModal(); }
$("#btn-login")?.addEventListener("click", openLogin);
/* delegation fallback (in case button is re-rendered later) */
document.addEventListener("click",(e)=>{ if(e.target?.id==="btn-login") openLogin(e); });

document.addEventListener("click", async (e)=>{
  if(e.target?.id==="btn-logout"){
    e.preventDefault();
    try{ await signOut(auth); }catch(err){ console.error(err); toast("Logout failed"); }
  }
});

(function bindLoginModal(){
  const dlg=$("#authModal");
  const fLogin=$("#authLogin"), fSignup=$("#authSignup"), fForgot=$("#authForgot");
  const show=(pane)=>{ fLogin?.classList.add("ol-hidden"); fSignup?.classList.add("ol-hidden"); fForgot?.classList.add("ol-hidden"); pane?.classList.remove("ol-hidden"); };
  $("#linkSignup")?.addEventListener("click", e=>{ e.preventDefault(); show(fSignup); });
  $("#linkForgot")?.addEventListener("click", e=>{ e.preventDefault(); show(fForgot); });
  $("#backToLogin1")?.addEventListener("click", e=>{ e.preventDefault(); show(fLogin); });
  $("#backToLogin2")?.addEventListener("click", e=>{ e.preventDefault(); show(fLogin); });

  fLogin?.addEventListener("submit", async (e)=>{
    e.preventDefault();
    const email=$("#loginEmail")?.value.trim(); const pass=$("#loginPass")?.value;
    try{ await signInWithEmailAndPassword(auth,email,pass); dlg?.close(); showPage("catalog"); }
    catch(err){ alert(err.message||"Login failed"); }
  });
  fSignup?.addEventListener("submit", async (e)=>{
    e.preventDefault();
    const email=$("#signupEmail")?.value.trim(); const pass=$("#signupPass")?.value;
    try{ await createUserWithEmailAndPassword(auth,email,pass); dlg?.close(); showPage("catalog"); }
    catch(err){ alert(err.message||"Sign up failed"); }
  });
  fForgot?.addEventListener("submit", async (e)=>{
    e.preventDefault();
    const email=$("#forgotEmail")?.value.trim();
    try{ await sendPasswordResetEmail(auth,email); alert("Reset link sent"); show(fLogin); }
    catch(err){ alert(err.message||"Failed to send"); }
  });
})();

/* =============== Global delegates: Details & Continue & controls =============== */
document.addEventListener("click",(e)=>{
  // Details
  const dbtn=e.target.closest("[data-details]");
  if(dbtn){
    const id=dbtn.getAttribute("data-details");
    const c=(ALL||[]).find(x=>x.id===id)||getLocalCourses().find(x=>x.id===id);
    if(!c) return;
    const b=$("#detailsBody");
    const priceStr=(c.price||0)>0?("$"+c.price):"Free";
    const rating=Number(c.rating||4.5).toFixed(1);
    const img=c.image||`https://picsum.photos/seed/${c.id}/960/540`;
    const benefits=(c.benefits||[]).map(x=>`<li>${esc(x)}</li>`).join("")||"<li>Self-paced</li><li>Certificate</li>";
    b.innerHTML=`
      <div class="stack">
        <img src="${esc(img)}" alt="" style="width:100%;border-radius:10px">
        <div class="row" style="justify-content:space-between">
          <div>
            <h3 style="margin:0">${esc(c.title)}</h3>
            <div class="small muted">${esc(c.category||"")} • ${esc(c.level||"")} • ★ ${rating} • ${priceStr}</div>
          </div>
          <div class="chip">${esc(c.hours||8)} hrs</div>
        </div>
        <p>${esc(c.summary||c.description||"")}</p>
        <div><b>Benefits</b><ul>${benefits}</ul></div>
      </div>`;
    $("#detailsModal")?.showModal();
  }

  // Continue
  const cbtn=e.target.closest("[data-continue],[data-read]");
  if(cbtn){
    const id=cbtn.getAttribute("data-continue")||cbtn.getAttribute("data-read");
    if(!id) return;
    openReader(id);
    showPage("mylearning");
    $("#reader")?.classList.remove("hidden");
  }
});

/* =============== Settings / New Course / Samples =============== */
function bindSettings(){
  $("#themeSel")?.addEventListener("change",(e)=>{ const v=e.target.value; localStorage.setItem("ol_theme", v); applyPalette(v); });
  $("#fontSel")?.addEventListener("change",(e)=>{ const v=e.target.value; const px=parseInt(v,10)||16; localStorage.setItem("ol_font", String(px)); applyFont(px); });
}
function bindNewCourse(){
  $("#btn-new-course")?.addEventListener("click", ()=> $("#courseModal")?.showModal());
  $("#courseForm")?.addEventListener("submit", async (e)=>{
    e.preventDefault();
    const f=e.currentTarget;
    const payload={
      title:f.title.value.trim(), category:f.category.value.trim(), level:f.level.value,
      price:Number(f.price.value||0), rating:Number(f.rating.value||4.6),
      hours:Number(f.hours.value||8), credits:Number(f.credits.value||3),
      image:f.img.value.trim(), summary:f.description.value.trim(),
      benefits:(f.benefits.value||"").split(/\r?\n/).map(s=>s.trim()).filter(Boolean),
      createdAt:Date.now()
    };
    await safeAddCourse(payload);
    $("#courseModal")?.close();
    renderCatalog(); renderAdminTable(); toast("Course created");
  });
}
function bindSamples(){ $("#btn-add-samples")?.addEventListener("click", ()=> addSamples()); }

/* =============== Boot =============== */
document.addEventListener("DOMContentLoaded", async ()=>{
  const t=localStorage.getItem("ol_theme")||"dark";
  const f=Number(localStorage.getItem("ol_font")||"16");
  applyPalette(t); applyFont(f);

  initSidebar(); bindSidebarNav(); bindSearch();
  bindSettings(); bindNewCourse(); bindSamples();

  try{ await probeDbOnce(); }catch{}
  await renderCatalog();
  renderAdminTable(); renderAnnouncements();
  if (!location.hash) showPage("catalog");
});