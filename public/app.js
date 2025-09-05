// app.js (type="module")

import {
  app, auth, db,
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, sendPasswordResetEmail, updateProfile,
  collection, addDoc, serverTimestamp,
  doc, getDoc, getDocs,
  query, orderBy, where, limit, setDoc, updateDoc, deleteDoc
} from "./firebase.js";

/* ========= tiny helpers ========= */
const $  = (s, root=document)=>root.querySelector(s);
const $$ = (s, root=document)=>Array.from(root.querySelectorAll(s));
const esc = (v)=> String(v ?? "").replace(/[&<>\"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
const toast=(m,ms=2200)=>{ let t=$("#toast"); if(!t){ t=document.createElement("div"); t.id="toast"; t.style.cssText="position:fixed;left:50%;top:20px;transform:translateX(-50%);background:#111827;color:#fff;border:1px solid #1f2a3b;padding:8px 12px;border-radius:10px;z-index:9999;opacity:0;transition:.2s"; document.body.appendChild(t);} t.textContent=m; t.style.opacity=1; setTimeout(()=>t.style.opacity=0,ms); };
const readJSON =(k,d)=>{ try{ return JSON.parse(localStorage.getItem(k)||JSON.stringify(d)); }catch{return d;} };
const writeJSON=(k,v)=> localStorage.setItem(k, JSON.stringify(v));

/* ========= global state ========= */
let CURRENT_USER=null;
let USE_DB=true; // Firestore available?
let ALL=[];      // catalog cache

/* ========= theme / font ========= */
const PALETTES = {
  dark:{bg:"#0b0f17",fg:"#eaf1ff",card:"#111827",muted:"#9fb0c3",border:"#1f2a3b",primary:"#2563eb"},
  rose:{bg:"#1a0d12",fg:"#ffe7ee",card:"#241318",muted:"#d9a7b5",border:"#3a1b27",primary:"#fb7185"},
  amber:{bg:"#0f130b",fg:"#fefce8",card:"#141a0d",muted:"#d9d3a5",border:"#273113",primary:"#f59e0b"},
  slate:{bg:"#0b1020",fg:"#eff6ff",card:"#121a2b",muted:"#9ab",border:"#1e2a3b",primary:"#64748b"},
  emerald:{bg:"#0b1412",fg:"#e7fff7",card:"#0f201b",muted:"#9fd3c3",border:"#163229",primary:"#10b981"},
  purple:{bg:"#0f0a14",fg:"#f5e8ff",card:"#1b1226",muted:"#cdb2ff",border:"#2a1a3a",primary:"#8b5cf6"},
  orange:{bg:"#140f0a",fg:"#fff1e6",card:"#1f140c",muted:"#e2bfa3",border:"#2b1c11",primary:"#f97316"},
  teal:{bg:"#071317",fg:"#e7fffb",card:"#0d2024",muted:"#8ec7c0",border:"#163238",primary:"#14b8a6"},
  indigo:{bg:"#0b0f2a",fg:"#eef2ff",card:"#131a3a",muted:"#a0a8d0",border:"#1b2452",primary:"#6366f1"},
  ocean:{bg:"#07131d",fg:"#dff3ff",card:"#0c2030",muted:"#8fb3c6",border:"#113347",primary:"#4cc9f0"}
};
function applyTheme(name="dark", font="16px"){
  const p=PALETTES[name]||PALETTES.dark, r=document.documentElement;
  r.style.setProperty("--bg",p.bg); r.style.setProperty("--fg",p.fg);
  r.style.setProperty("--card",p.card); r.style.setProperty("--muted",p.muted);
  r.style.setProperty("--border",p.border); r.style.setProperty("--primary",p.primary);
  r.style.setProperty("--font", font);
}

/* ========= DB probe / local fallback ========= */
async function probeDbOnce(){
  try{
    const cfgOk = !/YOUR_PROJECT|YOUR_API_KEY|YOUR_APP_ID/.test(JSON.stringify(app.options));
    if(!cfgOk) throw new Error("cfg-missing");
    await getDocs(query(collection(db,"__ping"), limit(1)));
    USE_DB=true;
  }catch(e){
    console.info("Firestore disabled → local mode:", e?.code||e?.message||e);
    USE_DB=false;
  }
}

/* ========= local stores ========= */
const getLocalCourses = ()=> readJSON("ol_courses", []);
const setLocalCourses = (a)=> writeJSON("ol_courses", a||[]);
const getEnrolls = ()=> new Set(readJSON("ol_enrolls", []));
const setEnrolls = (s)=> writeJSON("ol_enrolls", Array.from(s));
const getNotes = ()=> readJSON("ol_notes", {});         // { [cid]: [{page,text,ts}]}
const setNotes = (x)=> writeJSON("ol_notes", x);
const getBookmarks = ()=> readJSON("ol_bm", {});        // { [cid]: idx }
const setBookmarks = (x)=> writeJSON("ol_bm", x);
const getAnns = ()=> readJSON("ol_anns", []);           // [{id,title,body,ts}]
const setAnns = (x)=> writeJSON("ol_anns", x);

/* ========= auth UI gate ========= */
function gateUI(){
  const logged=!!CURRENT_USER;
  $("#btn-login")?.classList.toggle("hidden", logged);
  $("#btn-logout")?.classList.toggle("hidden", !logged);
  // signed-out → fullscreen auth page
  $("#page-auth")?.classList.toggle("active", !logged);
  // default page when login
  if (logged) showPage("catalog");
}

/* ========= login modal open ========= */
function wireLoginModalOpen(){
  const btn=$("#btn-login"), modal=$("#authModal");
  if(!btn || !modal) return;
  if(typeof modal.showModal !== "function"){
    btn.onclick=()=>location.hash="#/auth";
    return;
  }
  btn.onclick=(e)=>{ e.preventDefault(); modal.showModal(); };
  modal.querySelectorAll(".auth-links a, .btn.small, .dlg-close").forEach(a=>{
    a.addEventListener("click", ()=> modal.close());
  });
}

/* ========= auth forms (both modal & page) ========= */
function bindAuthForms(){
  // modal
  $("#authLogin")?.addEventListener("submit", async (e)=>{
    e.preventDefault();
    const email=$("#loginEmail").value.trim(), pass=$("#loginPass").value;
    try{
      await signInWithEmailAndPassword(auth,email,pass);
      $("#authModal").close();
      toast("Welcome back!");
    }catch(err){ console.error(err); toast(err.code||"Login failed"); }
  });
  $("#authSignup")?.addEventListener("submit", async (e)=>{
    e.preventDefault();
    const email=$("#signupEmail").value.trim(), pass=$("#signupPass").value;
    try{
      await createUserWithEmailAndPassword(auth,email,pass);
      $("#authModal").close(); toast("Account created");
    }catch(err){ console.error(err); toast(err.code||"Signup failed"); }
  });
  $("#authForgot")?.addEventListener("submit", async (e)=>{
    e.preventDefault();
    const email=$("#forgotEmail").value.trim();
    try{ await sendPasswordResetEmail(auth,email); toast("Reset link sent"); }
    catch(err){ console.error(err); toast(err.code||"Reset failed"); }
  });
  $("#linkSignup")?.addEventListener("click",(e)=>{e.preventDefault(); $("#authLogin").classList.add("ol-hidden"); $("#authSignup").classList.remove("ol-hidden"); $("#authForgot").classList.add("ol-hidden");});
  $("#linkForgot")?.addEventListener("click",(e)=>{e.preventDefault(); $("#authLogin").classList.add("ol-hidden"); $("#authSignup").classList.add("ol-hidden"); $("#authForgot").classList.remove("ol-hidden");});
  $("#backToLogin1")?.addEventListener("click",(e)=>{e.preventDefault(); $("#authLogin").classList.remove("ol-hidden"); $("#authSignup").classList.add("ol-hidden"); $("#authForgot").classList.add("ol-hidden");});
  $("#backToLogin2")?.addEventListener("click",(e)=>{e.preventDefault(); $("#authLogin").classList.remove("ol-hidden"); $("#authSignup").classList.add("ol-hidden"); $("#authForgot").classList.add("ol-hidden");});
  // topbar logout
  $("#btn-logout")?.addEventListener("click", async ()=>{
    try{ await signOut(auth); toast("Logged out"); }
    catch(err){ console.error(err); toast(err.code||"Logout failed"); }
  });
}

/* ========= router ========= */
function showPage(id){
  $$(".page").forEach(p=>p.classList.remove("active"));
  $(`#page-${id}`)?.classList.add("active");
  // side active state
  $$("#sidebar .navbtn").forEach(b=> b.classList.toggle("active", b.dataset.page===id));
  // hook per page
  if(id==="catalog") renderCatalog();
  if(id==="mylearning") renderMyLearning();
  if(id==="gradebook") renderGradebook();
  if(id==="admin") renderAdminTable();
  if(id==="stu-dashboard") renderAnnouncements();
}
function bindSidebarNav(){
  $$("#sidebar .navbtn").forEach(b=>{
    b.addEventListener("click", ()=> showPage(b.dataset.page));
  });
}

/* ========= search ========= */
function bindSearch(){
  const doSearch = (raw)=> {
    const q = String(raw ?? $("#topSearch")?.value ?? "").toLowerCase().trim();
    showPage("catalog");
    $$("#catalog-grid .card.course").forEach(card=>{
      const hay=(card.dataset.search||"").toLowerCase();
      card.style.display = !q || hay.includes(q) ? "" : "none";
    });
  };
  $("#topSearch")?.addEventListener("keydown",(e)=>{ if(e.key==="Enter") doSearch(); });
}

/* ========= fetch courses (db → local) ========= */
async function fetchAll(){
  if(!USE_DB) return getLocalCourses();
  try{
    const snap = await getDocs(query(collection(db,"courses"), orderBy("title","asc")));
    const arr = snap.docs.map(d=>({id:d.id, ...d.data()}));
    if (arr.length) return arr;
  }catch(e){
    console.warn("fetch fallback", e); USE_DB=false;
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
    const ref=await addDoc(collection(db,"courses"), payload);
    return {id:ref.id, ...payload};
  }catch(e){
    console.warn("add fallback", e); USE_DB=false;
    const id="loc_"+Math.random().toString(36).slice(2,9);
    const arr=getLocalCourses(); arr.push({id, ...payload}); setLocalCourses(arr);
    return {id, ...payload};
  }
}

/* ========= samples ========= */
async function addSamples(){
  const base=[
    {title:"JavaScript Essentials",category:"Web",level:"Beginner",price:0,credits:3,rating:4.7,hours:10,summary:"Start JavaScript from zero.",image:""},
    {title:"React Fast-Track",category:"Web",level:"Intermediate",price:49,credits:2,rating:4.6,hours:8,summary:"Build modern UIs.",image:""},
    {title:"Advanced React Patterns",category:"Web",level:"Advanced",price:69,credits:2,rating:4.5,hours:9,summary:"Hooks & performance.",image:""},
    {title:"Data Analysis with Python",category:"Data",level:"Intermediate",price:79,credits:3,rating:4.8,hours:14,summary:"Pandas & plots.",image:""},
    {title:"Intro to Machine Learning",category:"Data",level:"Beginner",price:59,credits:3,rating:4.7,hours:12,summary:"Core ML concepts.",image:""},
    {title:"Cloud Fundamentals",category:"Cloud",level:"Beginner",price:29,credits:2,rating:4.6,hours:7,summary:"AWS/GCP basics.",image:""},
    {title:"DevOps CI/CD",category:"Cloud",level:"Intermediate",price:69,credits:3,rating:4.6,hours:11,summary:"Pipelines, Docker, K8s.",image:""},
  ];
  for (const c of base) await safeAddCourse({...c, createdAt: Date.now(), progress:0});
  toast("Sample courses added");
  renderCatalog(); renderAdminTable();
}

/* ========= catalog render ========= */
function courseCardHTML(c){
  const r = Number(c.rating||4.6).toFixed(1);
  const priceStr = (c.price||0)>0 ? "$"+c.price : "Free";
  const enrolled = getEnrolls().has(c.id);
  const search = [c.title,c.summary,c.category,c.level].join(" ");
  return `<div class="card course" data-id="${c.id}" data-search="${esc(search)}">
    <img class="course-cover" src="${esc(c.image||`https://picsum.photos/seed/${c.id}/640/360`)}" alt="">
    <div class="course-body">
      <strong>${esc(c.title)}</strong>
      <div class="small muted">${esc(c.category||"")} • ${esc(c.level||"")} • ★ ${r} • ${priceStr}</div>
      <div class="muted">${esc(c.summary||"")}</div>
      <div class="row" style="justify-content:space-between">
        <span>${c.hours||8} hrs</span>
        <div class="row" style="gap:6px">
          <button class="btn" data-details="${c.id}">Details</button>
          <button class="btn primary" data-enroll="${c.id}">${enrolled ? "Enrolled" : "Enroll"}</button>
        </div>
      </div>
    </div>
  </div>`;
}
async function renderCatalog(){
  const grid=$("#catalog-grid"); if(!grid) return;
  ALL = await fetchAll();
  if(!ALL.length){ grid.innerHTML=`<div class="muted">No courses yet.</div>`; return;}
  grid.innerHTML = ALL.map(courseCardHTML).join("");

  grid.querySelectorAll("[data-enroll]").forEach(b=> b.onclick=()=> handleEnroll(b.getAttribute("data-enroll")));
  grid.querySelectorAll("[data-details]").forEach(b=> b.onclick=()=> openDetails(b.getAttribute("data-details")));
}

/* ========= details modal ========= */
function openDetails(id){
  const c = ALL.find(x=>x.id===id) || getLocalCourses().find(x=>x.id===id); if(!c) return;
  const ul = (c.benefits||"Hands-on projects\nResources\nCertificate").split(/\r?\n/).map(x=>`<li>${esc(x)}</li>`).join("");
  const r = Number(c.rating||4.6).toFixed(1);
  const priceStr = (c.price||0)>0 ? "$"+c.price : "Free";
  $("#detailsBody").innerHTML = `
    <div class="row" style="gap:12px">
      <img src="${esc(c.image||`https://picsum.photos/seed/${c.id}/640/360`)}" alt="" style="width:300px;border-radius:10px">
      <div class="stack">
        <h3 style="margin:.2rem 0">${esc(c.title)}</h3>
        <div class="muted small">${esc(c.category||"")} • ${esc(c.level||"")} • ★ ${r} • ${priceStr} • ${c.hours||8} hrs</div>
        <p>${esc(c.summary||"")}</p>
        <b>Benefits</b>
        <ul>${ul}</ul>
        <div class="row" style="gap:8px;justify-content:flex-end">
          <button class="btn" id="dtlEnroll">Enroll</button>
          <button class="btn" id="dtlClose">Close</button>
        </div>
      </div>
    </div>`;
  $("#detailsModal").showModal();
  $("#dtlClose").onclick=()=> $("#detailsModal").close();
  $("#dtlEnroll").onclick=()=>{ $("#detailsModal").close(); handleEnroll(id); };
}

/* ========= enroll (Free=auto; Paid=PayPal or simulate) ========= */
function markEnrolled(id){
  const s=getEnrolls(); s.add(id); setEnrolls(s);
  toast("Enrolled"); renderCatalog(); renderMyLearning(); showPage("mylearning");
}
function handleEnroll(id){
  const c = ALL.find(x=>x.id===id) || getLocalCourses().find(x=>x.id===id);
  if(!c) return toast("Course not found");
  if ((c.price||0)<=0) return markEnrolled(id); // Free
  // Paid:
  const pm=$("#payModal"); if(!pm || typeof pm.showModal!=="function"){ toast("Checkout not available"); return; }
  $("#payTitle").textContent = `Checkout · ${c.title}`;
  const note=$("#paypalNote");
  note.textContent = (window.PAYPAL_CLIENT_ID ? "" : "PayPal client ID not set in config.js — demo only.");
  const mount = $("#paypal-container"); mount.innerHTML="";
  if (window.paypal) {
    window.paypal.Buttons({
      createOrder: (d,a)=> a.order.create({purchase_units:[{amount:{value:String(c.price)}}]}),
      onApprove: async (d,a)=>{ await a.order.capture(); markEnrolled(c.id); pm.close(); }
    }).render(mount);
  } else {
    // simulate
    const btn=document.createElement("button"); btn.className="btn primary"; btn.textContent="Simulate PayPal Success";
    btn.onclick=()=>{ markEnrolled(c.id); pm.close(); };
    mount.appendChild(btn);
  }
  $("#mmkPaid").onclick=()=>{ markEnrolled(c.id); pm.close(); };
  $("#closePay").onclick=()=> pm.close();
  pm.showModal();
}

/* ========= My Learning (reader) ========= */
function renderMyLearning(){
  const grid=$("#mylearn-grid"); if(!grid) return;
  const en=getEnrolls(); const list=(ALL.length?ALL:getLocalCourses()).filter(c=>en.has(c.id));
  grid.innerHTML = list.map(c=>`<div class="card course" data-id="${c.id}">
    <img class="course-cover" src="${esc(c.image||`https://picsum.photos/seed/${c.id}/640/360`)}" alt="">
    <div class="course-body">
      <strong>${esc(c.title)}</strong>
      <div class="row" style="justify-content:flex-end"><button class="btn" data-open="${c.id}">Continue</button></div>
    </div>
  </div>`).join("") || `<div class="muted">No enrollments yet.</div>`;
  grid.querySelectorAll("[data-open]").forEach(b=> b.onclick=()=> openReader(b.getAttribute("data-open")));
}

// minimal reader demo (static)
const SAMPLE_PAGES=(title)=>[
  {type:"reading", html:`<h3>${esc(title)} — Welcome</h3><p>Intro with image + audio + video placeholders.</p><img src="https://picsum.photos/seed/w1/800/360" style="width:100%;border-radius:10px"><audio controls style="width:100%"></audio>`},
  {type:"quiz", html:`<h3>Quiz</h3><p>Q1) 2 + 2 = ?</p><input id="q1"><button id="qGo" class="btn">Submit</button> <span id="qMsg" class="small muted"></span>`},
  {type:"final", html:`<h3>Final</h3><p>Upload your project:</p><input type="file">`}
];
let RD={cid:null,pages:[],i:0,score:0};
async function openReader(cid){
  const c=ALL.find(x=>x.id===cid)||getLocalCourses().find(x=>x.id===cid);
  if(!c) return;
  RD={cid:cid,pages:SAMPLE_PAGES(c.title),i:(getBookmarks()[cid]??0),score:0};
  const reader=$("#reader"); if(!reader) return;
  reader.dataset.courseId=cid;
  reader.innerHTML=`<div class="row" style="justify-content:space-between;align-items:center;margin-bottom:8px">
    <button class="btn" id="rdBack">← Back</button>
    <div class="small muted" id="rdMeta">Progress: <span id="rdInfo"></span></div>
  </div>
  <div id="rdPage" class="card" style="padding:12px"></div>
  <div class="row" style="margin-top:8px;justify-content:space-between">
    <div class="row" style="gap:6px">
      <button class="btn" id="rdPrev">Prev</button>
      <button class="btn" id="rdNext">Next</button>
    </div>
    <div class="row" style="gap:6px">
      <button class="btn" id="rdNote">Add Note</button>
      <button class="btn" id="rdBm">Bookmark</button>
    </div>
  </div>`;
  renderPage();
  $("#rdBack").onclick=()=>{ reader.innerHTML=""; reader.dataset.courseId=""; showPage("mylearning"); };
  $("#rdPrev").onclick=()=>{ RD.i=Math.max(0,RD.i-1); renderPage(); };
  $("#rdNext").onclick=()=>{ RD.i=Math.min(RD.pages.length-1,RD.i+1); renderPage(); };
  $("#rdBm").onclick=()=>{ const b=getBookmarks(); b[cid]=RD.i; setBookmarks(b); toast("Bookmarked"); };
  $("#rdNote").onclick=()=>{ const t=prompt("Note"); if(!t) return; const ns=getNotes(); ns[cid]=(ns[cid]||[]); ns[cid].push({page:RD.i,text:t,ts:Date.now()}); setNotes(ns); toast("Note added"); };
}
function renderPage(){
  $("#rdPage").innerHTML = RD.pages[RD.i].html;
  $("#rdInfo").textContent = `${RD.i+1}/${RD.pages.length}`;
  const q=$("#qGo"), msg=$("#qMsg");
  if(q) q.onclick=()=>{ const ok = ($("#q1").value.trim()==="4"); msg.textContent = ok?"Correct (+100%)":"Try again"; };
}

/* ========= Gradebook ========= */
function renderGradebook(){
  const box=$("#gradebook"); if(!box) return;
  const en=getEnrolls(); const list=(ALL.length?ALL:getLocalCourses()).filter(c=>en.has(c.id));
  const rows=list.map(c=>({course:c.title,score:(80+Math.floor(Math.random()*20))+"%",credits:c.credits||3,progress:(Math.floor(Math.random()*90)+10)+"%"}));
  box.innerHTML = rows.length ? `
    <table class="ol-table"><thead><tr><th>Course</th><th>Score</th><th>Credits</th><th>Progress</th></tr></thead>
    <tbody>${rows.map(r=>`<tr><td>${esc(r.course)}</td><td>${esc(r.score)}</td><td>${esc(r.credits)}</td><td>${esc(r.progress)}</td></tr>`).join("")}</tbody></table>`
    : `<div class="muted">No data</div>`;
}

/* ========= Admin (New Course + table) ========= */
function bindAdmin(){
  $("#btn-new-course")?.addEventListener("click", ()=> $("#courseModal")?.showModal());
  $("#courseClose")?.addEventListener("click", ()=> $("#courseModal")?.close());
  $("#courseCancel")?.addEventListener("click", ()=> $("#courseModal")?.close());
  $("#courseForm")?.addEventListener("submit", async (e)=>{
    e.preventDefault();
    const f=e.target;
    const payload={
      title:f.title.value.trim(), category:f.category.value.trim(), level:f.level.value,
      price:Number(f.price.value||0), rating:Number(f.rating.value||4.5), hours:Number(f.hours.value||8),
      credits:Number(f.credits.value||3), image:f.img.value.trim(), description:f.description.value.trim(),
      benefits:f.benefits.value, summary:f.description.value.trim(), createdAt:Date.now()
    };
    await safeAddCourse(payload);
    $("#courseModal").close();
    renderCatalog(); renderAdminTable();
    toast("Course saved");
  });
}
function renderAdminTable(){
  const tb=$("#adminCourseTable tbody"); if(!tb) return;
  const list=ALL.length?ALL:getLocalCourses();
  tb.innerHTML = list.map(c=>`<tr data-id="${c.id}">
    <td>${esc(c.id)}</td><td>${esc(c.title)}</td><td>${esc(c.category||"")}</td><td>${esc(c.level||"")}</td>
    <td>${(c.price||0)>0?"$"+c.price:"Free"}</td><td>${esc(c.rating||4.5)}</td><td>${esc(c.hours||8)}</td>
    <td><button class="icon-btn" data-edit="${c.id}">✏️</button> <button class="icon-btn" data-del="${c.id}">🗑️</button></td>
  </tr>`).join("");
  tb.querySelectorAll("[data-del]").forEach(b=> b.onclick=()=>{
    const id=b.getAttribute("data-del"); const arr=getLocalCourses().filter(x=>x.id!==id); setLocalCourses(arr); renderCatalog(); renderAdminTable();
  });
  tb.querySelectorAll("[data-edit]").forEach(b=> b.onclick=()=>{
    const id=b.getAttribute("data-edit");
    const c=getLocalCourses().find(x=>x.id===id) || ALL.find(x=>x.id===id);
    if(!c) return;
    const f=$("#courseForm"); $("#courseModal").showModal();
    f.title.value=c.title||""; f.category.value=c.category||""; f.level.value=c.level||"Beginner";
    f.price.value=c.price||0; f.rating.value=c.rating||4.5; f.hours.value=c.hours||8; f.credits.value=c.credits||3;
    f.img.value=c.image||""; f.description.value=c.summary||c.description||""; f.benefits.value=c.benefits||"";
    f.onsubmit=(e)=>{ e.preventDefault(); const arr=getLocalCourses(); const i=arr.findIndex(x=>x.id===id); if(i>-1){
        arr[i]={...arr[i], title:f.title.value.trim(), category:f.category.value.trim(), level:f.level.value, price:Number(f.price.value||0), rating:Number(f.rating.value||4.5), hours:Number(f.hours.value||8), credits:Number(f.credits.value||3), image:f.img.value.trim(), summary:f.description.value.trim(), benefits:f.benefits.value};
        setLocalCourses(arr); $("#courseModal").close(); renderCatalog(); renderAdminTable(); f.onsubmit=null; toast("Updated");
      } else { toast("Edit local only in lite build"); }
    };
  });
}

/* ========= Announcements (Dashboard) ========= */
function bindAnnouncements(){
  const btn=$("#btn-new-post"), dlg=$("#postModal"), form=$("#postForm");
  if(!btn || !dlg || !form) return;
  $("#closePostModal").onclick=()=> dlg.close();
  $("#cancelPost").onclick=()=> dlg.close();
  btn.onclick=()=>{ $("#pmId").value=""; $("#pmTitle").value=""; $("#pmBody").value=""; $("#postModalTitle").textContent="New Announcement"; dlg.showModal(); };
  form.onsubmit=(e)=>{
    e.preventDefault();
    const id=$("#pmId").value || ("a_"+Math.random().toString(36).slice(2,9));
    const arr=getAnns(); const obj={id, title: $("#pmTitle").value.trim(), body: $("#pmBody").value.trim(), ts:Date.now()};
    const i=arr.findIndex(x=>x.id===id);
    if(i>-1) arr[i]=obj; else arr.push(obj);
    setAnns(arr); dlg.close(); renderAnnouncements();
  };
}
function renderAnnouncements(){
  const panel=$("#stuDashPanel"); if(!panel) return;
  const arr=getAnns().slice().sort((a,b)=>b.ts-a.ts);
  panel.innerHTML = arr.length ? arr.map(a=>`<div class="card" style="margin-bottom:8px" data-id="${a.id}">
    <div class="row" style="justify-content:space-between;align-items:center">
      <strong>${esc(a.title)}</strong>
      <span class="small muted">${new Date(a.ts).toLocaleString()}</span>
    </div>
    <div class="muted">${esc(a.body||"")}</div>
    <div class="row" style="justify-content:flex-end;gap:6px;margin-top:6px">
      <button class="btn small" data-edit="${a.id}">Edit</button>
      <button class="btn small" data-del="${a.id}">Delete</button>
    </div>
  </div>`).join("") : `No announcements yet.`;
  panel.querySelectorAll("[data-del]").forEach(b=> b.onclick=()=>{
    const id=b.getAttribute("data-del"); const arr=getAnns().filter(x=>x.id!==id); setAnns(arr); renderAnnouncements();
  });
  panel.querySelectorAll("[data-edit]").forEach(b=> b.onclick=()=>{
    const id=b.getAttribute("data-edit"); const arr=getAnns(); const a=arr.find(x=>x.id===id); if(!a) return;
    $("#pmId").value=a.id; $("#pmTitle").value=a.title; $("#pmBody").value=a.body||""; $("#postModalTitle").textContent="Edit Announcement"; $("#postModal").showModal();
  });
}

/* ========= Settings (theme/font) ========= */
function bindSettings(){
  const themeSel=$("#themeSel"), fontSel=$("#fontSel");
  if(themeSel){ themeSel.value = localStorage.getItem("ol_theme")||"dark"; themeSel.onchange=(e)=>{ localStorage.setItem("ol_theme", e.target.value); applyTheme(e.target.value, localStorage.getItem("ol_font")||"16px"); }; }
  if(fontSel){ fontSel.value = localStorage.getItem("ol_font")||"16px"; fontSel.onchange=(e)=>{ localStorage.setItem("ol_font", e.target.value); applyTheme(localStorage.getItem("ol_theme")||"dark", e.target.value); }; }
}

/* ========= Link pages (footer) ========= */
function bindFooterLinks(){
  $("#copyYear").textContent = `© OpenLearn ${new Date().getFullYear()}`;
  $("footer")?.addEventListener("click",(e)=>{
    const a=e.target.closest("[data-link]"); if(!a) return;
    e.preventDefault();
    const k=a.getAttribute("data-link"); showPage(k); // we have dedicated sections #page-contact etc.
  });
}

/* ========= Live chat (local fallback) ========= */
function initChat(){
  const box=$("#chatlog"); const input=$("#chatmsg"); const send=$("#sendChat");
  if(!box || !input || !send) return;
  const KEY="ol_chat_local"; const load=()=>JSON.parse(localStorage.getItem(KEY)||"[]"); const save=(a)=>localStorage.setItem(KEY, JSON.stringify(a));
  let arr=load(); const append=(u,t,ts)=>{ box.insertAdjacentHTML("beforeend", `<div class="msg"><b>${esc(u)}</b> <span class="small muted">${new Date(ts).toLocaleTimeString()}</span><div>${esc(t)}</div></div>`); box.scrollTop=box.scrollHeight; };
  arr.forEach(m=>append(m.u,m.t,m.ts));
  send.onclick=()=>{ const t=input.value.trim(); if(!t) return; const m={u: (CURRENT_USER?.email||"guest"), t, ts:Date.now()}; arr.push(m); save(arr); append(m.u,m.t,m.ts); input.value=""; };
}

/* ========= Boot ========= */
document.addEventListener("DOMContentLoaded", async ()=>{
  // theme
  applyTheme(localStorage.getItem("ol_theme")||"dark", localStorage.getItem("ol_font")||"16px");

  // wiring
  wireLoginModalOpen();
  bindAuthForms();
  bindSidebarNav();
  bindSearch();
  bindAdmin();
  bindAnnouncements();
  bindSettings();
  bindFooterLinks();
  initChat();

  // DB probe + initial render
  try{ await probeDbOnce(); }catch{}
  await renderCatalog();
  renderAdminTable();
  gateUI();
});

// auth watcher
onAuthStateChanged(auth, (u)=>{ CURRENT_USER=u||null; gateUI(); });

// topbar “add sample”
$("#btn-add-samples")?.addEventListener("click", ()=> addSamples().catch(console.error));
// “new course” button (catalog page top)
$("#btn-new-course")?.addEventListener("click", ()=> $("#courseModal")?.showModal());