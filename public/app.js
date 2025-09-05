// (core app: router, auth modal, catalog/enroll/pay, reader, gradebook, admin table, announcements, contact/EmailJS, settings, chat fallback)
import {
  auth, db,
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendPasswordResetEmail, signOut,
  collection, addDoc, getDocs, query, orderBy, doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp
} from "./firebase.js";

const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const esc=(s)=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
const toast=(m)=>{ let t=$("#toast"); if(!t){t=document.createElement("div");t.id="toast";t.style.cssText="position:fixed;bottom:14px;left:50%;transform:translateX(-50%);background:#0c2030;color:#dff3ff;border:1px solid #113347;border-radius:10px;padding:8px 12px;z-index:9999";document.body.appendChild(t);} t.textContent=m; t.style.opacity=1; setTimeout(()=>t.style.opacity=0,2000); };

const LS={get:k=>JSON.parse(localStorage.getItem(k)||"null"), set:(k,v)=>localStorage.setItem(k,JSON.stringify(v))};
const NOW_YEAR=new Date().getFullYear(); $("#copyYear").textContent=`© OpenLearn ${NOW_YEAR}`;

let CURRENT=null, ALL=[]; // user & courses

/* ===== Router ===== */
function showPage(id){
  $$(".page").forEach(p=>p.classList.remove("active","visible"));
  $(`#page-${id}`)?.classList.add("active","visible");
  $$("#sidebar .navbtn").forEach(b=>b.classList.toggle("active", b.dataset.page===id));
  if(id==="catalog") renderCatalog();
  if(id==="mylearning") renderMyLearning();
  if(id==="gradebook") renderGradebook();
  if(id==="admin") renderAdminTable();
  if(id==="dashboard") { renderAnnouncements(); renderCalendar(); }
}
$$("#sidebar .navbtn").forEach(b=>b.onclick=()=>showPage(b.dataset.page));

/* ===== Auth Modal (center) ===== */
const dlg=$("#authModal");
function openLogin(){ dlg.showModal(); sel("login"); }
function sel(mode){
  $("#authLogin").classList.toggle("ol-hidden", mode!=="login");
  $("#authSignup").classList.toggle("ol-hidden", mode!=="signup");
  $("#authForgot").classList.toggle("ol-hidden", mode!=="forgot");
}
$("#btn-login").onclick=openLogin;
$("#btn-logout").onclick=async()=>{ try{ await signOut(auth); toast("Logged out"); showPage("catalog"); toggleAuth(false);}catch(e){ console.error(e); } };
$("#linkSignup").onclick=(e)=>{e.preventDefault();sel("signup");};
$("#linkForgot").onclick=(e)=>{e.preventDefault();sel("forgot");};
$("#backToLogin1").onclick=(e)=>{e.preventDefault();sel("login");};
$("#backToLogin2").onclick=(e)=>{e.preventDefault();sel("login");};

$("#authLogin").onsubmit=async(e)=>{
  e.preventDefault();
  const em=$("#loginEmail").value.trim(), pw=$("#loginPass").value.trim();
  try{ await signInWithEmailAndPassword(auth, em, pw); dlg.close(); toast("Welcome back"); showPage("catalog"); }
  catch(err){ console.error(err); toast(err.code||"Login failed"); }
};
$("#authSignup").onsubmit=async(e)=>{
  e.preventDefault();
  const em=$("#signupEmail").value.trim(), pw=$("#signupPass").value.trim();
  try{ await createUserWithEmailAndPassword(auth, em, pw); dlg.close(); toast("Account created"); showPage("catalog"); }
  catch(err){ console.error(err); toast(err.code||"Signup failed"); }
};
$("#authForgot").onsubmit=async(e)=>{
  e.preventDefault();
  const em=$("#forgotEmail").value.trim();
  try{ await sendPasswordResetEmail(auth, em); toast("Reset link sent"); sel("login"); }
  catch(err){ console.error(err); toast(err.code||"Failed"); }
};

function toggleAuth(logged){
  $("#btn-login").style.display = logged?"none":"";
  $("#btn-logout").style.display = logged?"":"none";
}

/* ===== Theme / Font ===== */
const PALETTES={
  dark:{bg:"#0b0f17",fg:"#e7ecf3",card:"#121826",muted:"#9aa6b2",border:"#223",accent:"#66d9ef",btnBg:"#1f2937",btnPri:"#2563eb",btnPriFg:"#fff"},
  ocean:{bg:"#07131d",fg:"#dff3ff",card:"#0c2030",muted:"#8fb3c6",border:"#113347",accent:"#4cc9f0",btnBg:"#123247",btnPri:"#4cc9f0",btnPriFg:"#08222f"},
  rose:{bg:"#1a0d12",fg:"#ffe7ee",card:"#241318",muted:"#d9a7b5",border:"#3a1b27",accent:"#fb7185",btnBg:"#2a1720",btnPri:"#fb7185",btnPriFg:"#240b12"},
  emerald:{bg:"#06130e",fg:"#eafff3",card:"#0c2419",muted:"#9ad0b9",border:"#113426",accent:"#10b981",btnBg:"#153a2a",btnPri:"#10b981",btnPriFg:"#062116"},
  indigo:{bg:"#0e1024",fg:"#eaeaff",card:"#171a3a",muted:"#b4b7e5",border:"#232658",accent:"#6366f1",btnBg:"#1f235f",btnPri:"#6366f1",btnPriFg:"#0e1024"}
};
function applyTheme(key="ocean"){ const p=PALETTES[key]||PALETTES.ocean; const r=document.documentElement.style;
  r.setProperty("--bg",p.bg); r.setProperty("--fg",p.fg); r.setProperty("--card",p.card); r.setProperty("--muted",p.muted);
  r.setProperty("--border",p.border); r.setProperty("--accent",p.accent); r.setProperty("--btnBg",p.btnBg);
  r.setProperty("--btnPri",p.btnPri); r.setProperty("--btnPriFg",p.btnPriFg);
}
function applyFont(px="18px"){ document.documentElement.style.setProperty("--font", px); }
$("#themeSel")?.addEventListener("change",(e)=>{ LS.set("ol_theme", e.target.value); applyTheme(e.target.value); });
$("#fontSel")?.addEventListener("change",(e)=>{ LS.set("ol_font", e.target.value); applyFont(e.target.value); });

// --- Header buttons wiring (place once, after DOM ready)
function initTopbar() {
  // Search
  const doSearch = () => {
    const q = (document.getElementById("topSearch")?.value || "").trim();
    // your app search handler here:
    const ev = new CustomEvent("ol:search", { detail: { q }});
    window.dispatchEvent(ev);
  };
  document.getElementById("topSearchBtn")?.addEventListener("click", doSearch);
  document.getElementById("topSearch")?.addEventListener("keydown", (e)=>{ if(e.key==="Enter") doSearch(); });

  // Announcements & Final
  document.getElementById("btn-top-ann")?.addEventListener("click", ()=> {
    location.hash = "#/dashboard";        // or call your showPage("stu-dashboard")
    // showPage && showPage("stu-dashboard");
  });
  document.getElementById("btn-top-final")?.addEventListener("click", ()=> {
    location.hash = "#/mylearning";       // or showPage("mylearning");
  });

  // Login/Logout toggle — relies on your auth state
  const showAuthButtons = (loggedIn) => {
    const li = document.getElementById("btn-login");
    const lo = document.getElementById("btn-logout");
    if (!li || !lo) return;
    li.style.display = loggedIn ? "none" : "";
    lo.style.display = loggedIn ? "" : "none";
  };
  // Hook to Firebase auth
  import("/firebase.js").then(({ auth, onAuthStateChanged, signOut })=>{
    onAuthStateChanged(auth, (u)=>{
      showAuthButtons(!!u);
    });
    document.getElementById("btn-login")?.addEventListener("click", ()=>{
      // open your login modal (id may differ in your app)
      document.getElementById("authModal")?.showModal?.();
    });
    document.getElementById("btn-logout")?.addEventListener("click", async ()=>{
      try { await signOut(auth); } catch(e){ console.error(e); }
    });
  }).catch(console.error);
}

// Run after DOM content loaded
document.readyState === "loading"
  ? document.addEventListener("DOMContentLoaded", initTopbar)
  : initTopbar();

/* ===== Sample data (FireStore→fallback Local) ===== */
function localCourses(){ return LS.get("ol_courses")||[]; }
function setLocalCourses(a){ LS.set("ol_courses", a); }
function enrolls(){ return new Set(LS.get("ol_enrolls")||[]); }
function setEnrolls(s){ LS.set("ol_enrolls", Array.from(s)); }
function anns(){ return LS.get("ol_anns")||[]; }
function setAnns(a){ LS.set("ol_anns", a); }
function bookmarks(){ return LS.get("ol_bm")||{}; } function setBookmarks(m){ LS.set("ol_bm", m); }
function notes(){ return LS.get("ol_notes")||{}; }  function setNotes(n){ LS.set("ol_notes", n); }

async function fetchCourses(){
  try{
    const qs = await getDocs(query(collection(db,"courses"), orderBy("title",'asc')));
    const arr = qs.docs.map(d=>({id:d.id, ...d.data()}));
    if(arr.length) return arr;
  }catch(e){ /* local fallback */ }
  return localCourses();
}

async function addSamples(){
  const base=[
    {title:"JavaScript Essentials",category:"Web",level:"Beginner",price:0,credits:3,rating:4.7,hours:10,summary:"Start JavaScript from zero."},
    {title:"React Fast-Track",category:"Web",level:"Intermediate",price:49,credits:2,rating:4.6,hours:8,summary:"Build modern UIs."},
    {title:"Advanced React Patterns",category:"Web",level:"Advanced",price:69,credits:2,rating:4.5,hours:9,summary:"Hooks, contexts, performance."},
    {title:"Data Analysis with Python",category:"Data",level:"Intermediate",price:79,credits:3,rating:4.8,hours:14,summary:"Pandas & plots."},
    {title:"Intro to Machine Learning",category:"Data",level:"Beginner",price:59,credits:3,rating:4.7,hours:12,summary:"Supervised, unsupervised."},
    {title:"Cloud Fundamentals",category:"Cloud",level:"Beginner",price:29,credits:2,rating:4.6,hours:7,summary:"AWS/GCP basics."},
    {title:"DevOps CI/CD",category:"Cloud",level:"Intermediate",price:69,credits:3,rating:4.6,hours:11,summary:"Pipelines, Docker, K8s."},
  ];
  // try Firestore
  try{
    for(const c of base){ await addDoc(collection(db,"courses"), { ...c, createdAt: serverTimestamp() }); }
  }catch(_){
    const arr=localCourses(); for(const c of base){ arr.push({ id:"loc_"+Math.random().toString(36).slice(2,9), ...c }); } setLocalCourses(arr);
  }
  toast("Sample courses added"); await renderCatalog(); renderAdminTable();
}

/* ===== Catalog ===== */
async function renderCatalog(){
  ALL = await fetchCourses();
  const grid=$("#catalog-grid"); if(!grid) return;
  if(!ALL.length){ grid.innerHTML=`<div class="muted">No courses.</div>`; return; }

  const cats=new Set();
  grid.innerHTML = ALL.map(c=>{
    cats.add(c.category||"");
    const r=Number(c.rating||4.6).toFixed(1);
    const price=(c.price||0)>0? "$"+c.price : "Free";
    const enrolled=enrolls().has(c.id);
    const img = c.image || `https://picsum.photos/seed/${c.id}/640/360`;
    return `<div class="card course" data-id="${esc(c.id)}">
      <img class="course-cover" src="${esc(img)}" alt="">
      <div class="course-body">
        <strong>${esc(c.title)}</strong>
        <div class="small muted">${esc(c.category||"")} • ${esc(c.level||"")} • ★ ${r} • ${price}</div>
        <div class="muted">${esc(c.summary||"")}</div>
        <div class="row between">
          <button class="btn" data-details="${esc(c.id)}">Details</button>
          <button class="btn primary" data-enroll="${esc(c.id)}">${enrolled?"Enrolled":"Enroll"}</button>
        </div>
      </div>
    </div>`;
  }).join("");

  $("#filterCategory").innerHTML = `<option value="">All Categories</option>` + Array.from(cats).filter(Boolean).map(x=>`<option>${esc(x)}</option>`).join("");
  const applyFilters=()=>{
    const cat=$("#filterCategory").value, lv=$("#filterLevel").value, sort=$("#sortBy").value;
    const cards=[...grid.querySelectorAll(".course")];
    cards.forEach(el=>{
      const meta=el.querySelector(".small.muted").textContent;
      el.style.display = (!cat||meta.includes(cat)) && (!lv||meta.includes(lv)) ? "" : "none";
    });
    const vis=cards.filter(el=>el.style.display!=="none");
    vis.sort((a,b)=>{
      const ta=a.querySelector("strong").textContent.toLowerCase();
      const tb=b.querySelector("strong").textContent.toLowerCase();
      const pa=a.querySelector(".small.muted").textContent;
      const pb=b.querySelector(".small.muted").textContent;
      const priceA=pa.includes("$")?parseFloat(pa.split("$")[1]):0;
      const priceB=pb.includes("$")?parseFloat(pb.split("$")[1]):0;
      if(sort==="title-asc") return ta.localeCompare(tb);
      if(sort==="title-desc") return tb.localeCompare(ta);
      if(sort==="price-asc") return priceA-priceB;
      if(sort==="price-desc") return priceB-priceA;
      return 0;
    }).forEach(el=>grid.appendChild(el));
  };
  $("#filterCategory").onchange=applyFilters; $("#filterLevel").onchange=applyFilters; $("#sortBy").onchange=applyFilters;

  grid.querySelectorAll("[data-details]").forEach(b=>b.onclick=()=>showDetails(b.dataset.details));
  grid.querySelectorAll("[data-enroll]").forEach(b=>b.onclick=()=>handleEnroll(b.dataset.enroll));
}

/* Details modal (80% view) */
function showDetails(id){
  const c=ALL.find(x=>x.id===id) || localCourses().find(x=>x.id===id);
  if(!c) return;
  const body=document.createElement("dialog"); body.className="card ol-modal"; body.style.width="80%"; body.style.maxWidth="1100px"; body.style.maxHeight="80vh";
  body.innerHTML=`<div class="row between"><b>${esc(c.title)}</b><button class="btn small" id="dClose">Close</button></div>
  <div class="stack" style="overflow:auto;max-height:70vh">
    <img class="course-cover" src="${esc(c.image||`https://picsum.photos/seed/${c.id}/640/360`)}" alt="">
    <div class="muted">${esc(c.summary||"")}</div>
    <ul class="stack">
      ${(c.benefits||["Hands-on projects","Downloadable resources","Certificate of completion"]).map(b=>`<li>✅ ${esc(b)}</li>`).join("")}
    </ul>
  </div>
  <div class="row right"><button class="btn primary" id="dEnroll">Enroll</button></div>`;
  document.body.appendChild(body); body.showModal();
  body.querySelector("#dClose").onclick=()=>{ body.close(); body.remove(); };
  body.querySelector("#dEnroll").onclick=()=>{ handleEnroll(c.id); body.close(); body.remove(); };
}

/* Enroll: Free → auto, Paid → PayPal/MMK */
function markEnrolled(id){ const s=enrolls(); s.add(id); setEnrolls(s); toast("Enrolled"); showPage("mylearning"); renderMyLearning(); renderCatalog(); }
function handleEnroll(id){
  const c=ALL.find(x=>x.id===id) || localCourses().find(x=>x.id===id); if(!c) return;
  if((c.price||0)<=0) return markEnrolled(id);
  // PayPal (if SDK injected); else demo MMK
  const box=document.createElement("dialog"); box.className="card ol-modal"; box.innerHTML=`
    <div class="row between"><b>Checkout</b><button class="btn small" id="pClose">Close</button></div>
    <div class="grid" style="grid-template-columns:1fr 1fr; gap:12px">
      <div class="card"><h3>PayPal (USD)</h3><div id="pp"></div><div class="muted" id="ppNote"></div></div>
      <div class="card"><h3>MMK Wallet</h3><p class="muted">Scan mock QR and click “I Paid”.</p>
        <img class="course-cover" src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=MMK-DEMO" alt="">
        <button class="btn primary" id="mmkPaid">I Paid (MMK)</button>
      </div>
    </div>`;
  document.body.appendChild(box); box.showModal();
  box.querySelector("#pClose").onclick=()=>{ box.close(); box.remove(); };
  box.querySelector("#mmkPaid").onclick=()=>{ markEnrolled(id); box.close(); box.remove(); };

  const sdk=window.paypal;
  if(!sdk){ box.querySelector("#ppNote").textContent="PayPal not configured. Using demo."; return; }
  sdk.Buttons({
    createOrder: (d,a)=>a.order.create({ purchase_units:[{ amount:{ value:String(c.price||0) } }] }),
    onApprove: async(d,a)=>{ await a.order.capture(); markEnrolled(id); box.close(); box.remove(); },
    onCancel: ()=>toast("Payment cancelled"),
    onError: (e)=>{ console.error(e); toast("Payment error"); }
  }).render(box.querySelector("#pp"));
}

/* My Learning (reader) */
const SAMPLE_PAGES=(title)=>[
  {type:"lesson", html:`<h3>${esc(title)} — Welcome</h3><video controls style="width:100%;border-radius:10px"><source src="" type="video/mp4"></video>`},
  {type:"reading", html:`<h3>Chapter 1</h3><p>Reading + image</p><img class="course-cover" src="https://picsum.photos/seed/p1/800/360">`},
  {type:"exercise", html:`<h3>Practice</h3><input type="file">`},
  {type:"quiz", html:`<h3>Quiz</h3><p>Q1) Short</p><input id="q1" class="stack"> <button class="btn" id="qSubmit">Submit</button> <span id="qMsg" class="muted"></span>`},
  {type:"final", html:`<h3>Final</h3><p>Upload final to earn certificate.</p><input type="file">`}
];
let RD={cid:null, pages:[], i:0};
function renderMyLearning(){
  const grid=$("#mylearn-grid"); const set=enrolls(); const list=(ALL.length?ALL:localCourses()).filter(c=>set.has(c.id));
  grid.innerHTML = list.map(c=>`<div class="card course"><img class="course-cover" src="${esc(c.image||`https://picsum.photos/seed/${c.id}/640/360`)}"><div class="row between"><b>${esc(c.title)}</b><button class="btn" data-open="${esc(c.id)}">Continue</button></div></div>`).join("") || `<div class="muted">No enrollments yet.</div>`;
  grid.querySelectorAll("[data-open]").forEach(b=>b.onclick=()=>openReader(b.dataset.open));
}
function openReader(id){
  const c=ALL.find(x=>x.id===id) || localCourses().find(x=>x.id===id); if(!c) return;
  RD={cid:id, pages:SAMPLE_PAGES(c.title), i:(bookmarks()[id]??0)};
  $("#reader").classList.remove("hidden");
  renderPage();
  $("#rdBack").onclick=()=>{ $("#reader").classList.add("hidden"); showPage("mylearning"); };
  $("#rdPrev").onclick=()=>{ RD.i=Math.max(0,RD.i-1); renderPage(); };
  $("#rdNext").onclick=()=>{ RD.i=Math.min(RD.pages.length-1,RD.i+1); renderPage(); if(RD.i===RD.pages.length-1) celebrate(); };
  $("#rdBookmark").onclick=()=>{ const m=bookmarks(); m[id]=RD.i; setBookmarks(m); toast("Bookmarked"); };
  $("#rdNote").onclick=()=>{ const t=prompt("Write a note"); if(!t) return; const n=notes(); n[id]=(n[id]||[]); n[id].push({i:RD.i, text:t, ts:Date.now()}); setNotes(n); toast("Note added"); };
}
function renderPage(){
  const p=RD.pages[RD.i]; $("#rdTitle").textContent=`${RD.i+1}. ${p.type.toUpperCase()}`;
  $("#rdPage").innerHTML=p.html; $("#rdPageInfo").textContent=`${RD.i+1}/${RD.pages.length}`;
  $("#rdProgress").style.width=Math.round((RD.i+1)/RD.pages.length*100)+"%";
  const q=$("#qSubmit"); if(q){ q.onclick=()=>{ $("#qMsg").textContent="Submitted ✔ (+5)"; }; }
}
function celebrate(){ toast("Congratulations! 🎉"); }

/* Gradebook + PDFs (very simple demo) */
function renderGradebook(){
  const tb=$("#gbTable tbody"); const set=enrolls(); const list=(ALL.length?ALL:localCourses()).filter(c=>set.has(c.id));
  const rows=list.map(c=>({student:CURRENT?.email||"you@example.com",course:c.title,score:(80+Math.floor(Math.random()*20))+"%",credits:c.credits||3,progress:(Math.floor(Math.random()*90)+10)+"%"}));
  tb.innerHTML = rows.map(r=>`<tr><td>${esc(r.student)}</td><td>${esc(r.course)}</td><td>${esc(r.score)}</td><td>${esc(r.credits)}</td><td>${esc(r.progress)}</td></tr>`).join("") || "<tr><td colspan='5' class='muted'>No data</td></tr>";
}
$("#btn-cert").onclick=()=>downloadTextPdf("Certificate","Congratulations on successful completion!");
$("#btn-trans").onclick=()=>downloadTextPdf("Transcript","Credits and scores summary.");
function downloadTextPdf(title, body){
  // lightweight: create a printable HTML and open print dialog (mobile-friendly)
  const w=window.open("","_blank"); w.document.write(`<html><head><title>${esc(title)}</title></head><body><h2>${esc(title)}</h2><p>${esc(body)}</p><p>${new Date().toLocaleString()}</p></body></html>`); w.document.close(); w.focus(); w.print();
}

/* Admin: course CRUD (local for demo) */
async function renderAdminTable(){
  const tb=$("#adminCourseTable tbody"); const list=(ALL.length?ALL:localCourses());
  tb.innerHTML = list.map(c=>`<tr data-id="${esc(c.id)}"><td>${esc(c.id)}</td><td>${esc(c.title)}</td><td>${esc(c.category||"")}</td><td>${esc(c.level||"")}</td><td>${(c.price||0)>0?"$"+c.price:"Free"}</td><td>${esc(String(c.rating||4.6))}</td><td>${esc(String(c.hours||8))}</td><td><button class="btn small" data-edit="${esc(c.id)}">Edit</button> <button class="btn small" data-del="${esc(c.id)}">Delete</button></td></tr>`).join("") || "<tr><td colspan='8' class='muted'>No courses</td></tr>";
  tb.querySelectorAll("[data-del]").forEach(b=>b.onclick=()=>{ const id=b.dataset.del; const arr=localCourses().filter(x=>x.id!==id); setLocalCourses(arr); renderCatalog(); renderAdminTable(); });
  tb.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>{ const id=b.dataset.edit; const c=(localCourses().find(x=>x.id===id)||ALL.find(x=>x.id===id)); const t=prompt("New title", c?.title||""); if(!t) return; const arr=localCourses(); const i=arr.findIndex(x=>x.id===id); if(i>-1){ arr[i].title=t; setLocalCourses(arr); renderCatalog(); renderAdminTable(); } else toast("Edit supported in local only"); });
}

/* Announcements + Calendar (admin-only create) */
function isAdmin(){ // simple rule: email in BOOTSTRAP_ADMINS (LS) or role flag later
  const ADM = LS.get("BOOTSTRAP_ADMINS") || []; const me = (CURRENT?.email||"").toLowerCase();
  return ADM.map(x=>String(x).toLowerCase()).includes(me);
}
$("#btn-new-ann").onclick=()=>{
  if(!isAdmin()) return toast("Admin only");
  const t=prompt("Announcement title"); if(!t) return;
  const arr=anns(); arr.push({id:"a_"+Math.random().toString(36).slice(2,9), title:t, ts:Date.now()}); setAnns(arr); renderAnnouncements();
};
function renderAnnouncements(){
  const box=$("#annList"); const list=anns().slice().reverse();
  box.innerHTML = list.map(a=>`<div class="card row between"><div><b>${esc(a.title)}</b><div class="small muted">${new Date(a.ts).toLocaleString()}</div></div><div class="row">${isAdmin()?`<button class="btn small" data-edit="${a.id}">Edit</button><button class="btn small" data-del="${a.id}">Delete</button>`:""}</div></div>`).join("") || `<div class="muted">No announcements yet.</div>`;
  box.querySelectorAll("[data-del]").forEach(b=>b.onclick=()=>{ const id=b.dataset.del; setAnns(anns().filter(x=>x.id!==id)); renderAnnouncements(); });
  box.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>{ const id=b.dataset.edit; const arr=anns(); const i=arr.findIndex(x=>x.id===id); if(i<0) return; const t=prompt("Edit title", arr[i].title); if(!t) return; arr[i].title=t; setAnns(arr); renderAnnouncements(); });
}
/* Calendar (simple local) */
$("#addCal").onclick=()=>{
  if(!isAdmin()) return toast("Admin only");
  const t=$("#calTitle").value.trim(), d=$("#calDate").value; if(!t||!d) return;
  const arr=LS.get("ol_events")||[]; arr.push({id:"e_"+Math.random().toString(36).slice(2,9), title:t, date:d}); LS.set("ol_events", arr); renderCalendar(); $("#calTitle").value=""; $("#calDate").value="";
};
function renderCalendar(){
  const list=(LS.get("ol_events")||[]).sort((a,b)=>a.date.localeCompare(b.date));
  const ul=$("#calList"); ul.innerHTML = list.map(e=>`<div class="row between card"><div>${esc(e.title)} — <span class="muted">${esc(e.date)}</span></div>${isAdmin()?`<div class="row"><button class="btn small" data-edit="${e.id}">Edit</button><button class="btn small" data-del="${e.id}">Delete</button></div>`:""}</div>`).join("") || `<div class="muted">No events</div>`;
  ul.querySelectorAll("[data-del]").forEach(b=>b.onclick=()=>{ const id=b.dataset.del; const arr=(LS.get("ol_events")||[]).filter(x=>x.id!==id); LS.set("ol_events", arr); renderCalendar(); });
  ul.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>{ const id=b.dataset.edit; const arr=(LS.get("ol_events")||[]); const i=arr.findIndex(x=>x.id===id); if(i<0) return; const t=prompt("Title", arr[i].title)||arr[i].title; const d=prompt("YYYY-MM-DD", arr[i].date)||arr[i].date; arr[i].title=t; arr[i].date=d; LS.set("ol_events", arr); renderCalendar(); });
}

/* Contact (EmailJS) */
$("#cSend").onclick=async()=>{
  const n=$("#cName").value.trim(), e=$("#cEmail").value.trim(), m=$("#cMsg").value.trim();
  if(!n||!e||!m) return toast("Fill all");
  try{
    // EmailJS SDK (global) — lightweight inline loader
    if(!window.emailjs) {
      await new Promise((res,rej)=>{ const s=document.createElement("script"); s.src="https://cdn.jsdelivr.net/npm/emailjs-com@3/dist/email.min.js"; s.onload=res; s.onerror=rej; document.head.appendChild(s); });
    }
    emailjs.init(window.OPENLEARN_CFG.emailjs.publicKey);
    await emailjs.send(window.OPENLEARN_CFG.emailjs.serviceId, window.OPENLEARN_CFG.emailjs.templateId, {
      from_name:n, reply_to:e, message:m
    });
    $("#cStatus").textContent="Sent ✔"; $("#cName").value=""; $("#cEmail").value=""; $("#cMsg").value="";
  }catch(err){ console.error(err); $("#cStatus").textContent="Failed to send"; }
};

/* Search */
$("#topSearch").addEventListener("keydown", e=>{ if(e.key==="Enter"){ const term=e.target.value.toLowerCase().trim(); showPage("catalog"); document.querySelectorAll("#catalog-grid .course").forEach(card=>{ const text=card.textContent.toLowerCase(); card.style.display = !term || text.includes(term) ? "" : "none"; }); }});

/* Header quick links */
$("#btn-ann").onclick=()=>showPage("dashboard");
$("#btn-final").onclick=()=>showPage("mylearning");

/* Boot */
onAuthStateChanged(auth, u=>{
  CURRENT=u||null; toggleAuth(!!u);
  const theme=LS.get("ol_theme")||"ocean"; const font=LS.get("ol_font")||"18px";
  applyTheme(theme); applyFont(font);
  renderCatalog(); showPage(u?"catalog":"catalog");
});

/* Buttons */
$("#btn-add-samples").onclick=()=>addSamples();
$("#btn-new-course").onclick=()=>{
  if(!isAdmin()) return toast("Admin only");
  const t=prompt("Title"); if(!t) return;
  const arr=localCourses(); arr.push({id:"loc_"+Math.random().toString(36).slice(2,9), title:t, category:"General", level:"Beginner", price:0, credits:1, rating:4.7, hours:4, summary:"New course."});
  setLocalCourses(arr); renderCatalog(); renderAdminTable();
};