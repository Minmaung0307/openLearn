import {
  app, auth, db,
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail, updateProfile,
  collection, addDoc, serverTimestamp, doc, getDoc, getDocs, query, orderBy, where, limit
} from "./firebase.js";

const $ = (s,root=document)=>root.querySelector(s);
const $$ = (s,root=document)=>Array.from(root.querySelectorAll(s));
const esc = (s)=> (s||"").replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
const toast=(m,ms=2200)=>{const t=$("#toast"); if(!t) return; t.textContent=m; t.classList.add("show"); setTimeout(()=>t.classList.remove("show"), ms);};

// palettes
const PALETTES={
  dark:{bg:"#0b0f17",fg:"#e7ecf3",card:"#121826",muted:"#9aa6b2",border:"#223",accent:"#66d9ef",btnBg:"#1f2937",btnFg:"#e7ecf3",btnPrimaryBg:"#2563eb",btnPrimaryFg:"#ffffff",inputBg:"#0b1220",inputFg:"#e7ecf3",hoverBg:"#0e1625"},
  light:{bg:"#f7fafc",fg:"#0b1220",card:"#ffffff",muted:"#4a5568",border:"#dbe2ea",accent:"#2563eb",btnBg:"#e2e8f0",btnFg:"#0b1220",btnPrimaryBg:"#0f172a",btnPrimaryFg:"#ffffff",inputBg:"#ffffff",inputFg:"#0b1220",hoverBg:"#eef2f7"},
  ocean:{bg:"#07131d",fg:"#dff3ff",card:"#0c2030",muted:"#8fb3c6",border:"#113347",accent:"#4cc9f0",btnBg:"#123247",btnFg:"#dff3ff",btnPrimaryBg:"#4cc9f0",btnPrimaryFg:"#08222f",inputBg:"#0b2231",inputFg:"#dff3ff",hoverBg:"#0f2b40"},
  forest:{bg:"#0b140f",fg:"#eaf7eb",card:"#102017",muted:"#9fbcaa",border:"#163223",accent:"#34d399",btnBg:"#173425",btnFg:"#eaf7eb",btnPrimaryBg:"#34d399",btnPrimaryFg:"#082015",inputBg:"#0d2317",inputFg:"#eaf7eb",hoverBg:"#123222"}
};
function applyPalette(name){
  const p=PALETTES[name]||PALETTES.dark, r=document.documentElement;
  for (const [k,v] of Object.entries({bg:"--bg",fg:"--fg",card:"--card",muted:"--muted",border:"--border",accent:"--accent",btnBg:"--btnBg",btnFg:"--btnFg",btnPrimaryBg:"--btnPrimaryBg",btnPrimaryFg:"--btnPrimaryFg",inputBg:"--inputBg",inputFg:"--inputFg",hoverBg:"--hoverBg"})){ r.style.setProperty(v, p[k]); }
}
function applyFont(px){ document.documentElement.style.setProperty("--fontSize", px+"px"); $("#fontPreview") && ($("#fontPreview").textContent = px+" px"); }
function initThemeControls(){
  const tSel=$("#themeSelect"), fSel=$("#fontSelect");
  const t=localStorage.getItem("ol_theme")||"dark", f=localStorage.getItem("ol_font")||"14";
  if (tSel) tSel.value=t; if (fSel) fSel.value=f;
  applyPalette(t); applyFont(f);
  tSel?.addEventListener("change", e=>{ const v=e.target.value; localStorage.setItem("ol_theme", v); applyPalette(v); });
  fSel?.addEventListener("change", e=>{ const v=e.target.value; localStorage.setItem("ol_font", v); applyFont(v); });
  $("#btnSettings")?.addEventListener("click", ()=> showPage("settings"));
}

// Sidebar hover-expand + sections (no click needed to read labels)
function initSidebar(){
  const sb=$("#sidebar");
  const expand=()=>{ sb.classList.add("expanded"); document.body.classList.add("sidebar-expanded"); };
  const collapse=()=>{ sb.classList.remove("expanded"); document.body.classList.remove("sidebar-expanded"); };
  if (window.matchMedia("(min-width:1025px)").matches){
    sb.addEventListener("mouseenter", expand);
    sb.addEventListener("mouseleave", collapse);
  }
  $("#hamburger")?.addEventListener("click", ()=> sb.classList.toggle("expanded"));
  // Sections: clicking a section shows only that group
  $$("[data-toggle]").forEach(head=>{
    head.addEventListener("click", ()=>{
      const key=head.getAttribute("data-toggle");
      $$("[data-group]").forEach(g=> g.classList.add("collapsed"));
      const grp=$(`[data-group="${key}"]`); grp?.classList.remove("collapsed");
    });
  });
}

// Routing
const PAGE_ALIAS={courses:"catalog"};
function showPage(id){
  $$(".page").forEach(p=>p.classList.remove("visible"));
  $(`#page-${id}`)?.classList.add("visible");
  $$(".side-item").forEach(x=> x.classList.toggle("active",(PAGE_ALIAS[x.dataset.page]||x.dataset.page)===id));
}

// Sidebar items
function bindSidebarNav(){
  $$(".side-item").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id=PAGE_ALIAS[btn.dataset.page]||btn.dataset.page;
      showPage(id);
      if (id==="admin") { /* keep settings icon visible */ }
    });
  });
}

// Auth state (Admin menu visible for demo regardless of login)
let currentUser=null;
function gateUI(){
  $("#btnLogin")?.classList.toggle("hidden", !!currentUser);
  $("#btnSignup")?.classList.toggle("hidden", !!currentUser);
  $("#userMenu")?.classList.toggle("hidden", !currentUser);
  $("#userName") && ($("#userName").textContent = currentUser ? (currentUser.displayName || currentUser.email) : "");
  // Admin button always visible in this demo build
  $$(".admin-only").forEach(el=> el.classList.remove("hidden"));
  $("#btnTopAdmin")?.classList.remove("hidden");
  $("#btnTopAdmin")?.addEventListener("click", ()=> showPage("admin"));
}
onAuthStateChanged(auth, u=>{ currentUser=u||null; gateUI(); });

// Header search
function bindTopSearch(){
  const doSearch = ()=>{
    const q=$("#topSearch").value.toLowerCase().trim();
    showPage("catalog");
    document.querySelectorAll(".card.course").forEach(card=>{
      const text = (card.dataset.search||"").toLowerCase();
      card.style.display = !q || text.includes(q) ? "" : "none";
    });
  };
  $("#topSearchBtn")?.addEventListener("click", doSearch);
  $("#topSearch")?.addEventListener("keydown", e=>{ if(e.key==="Enter") doSearch(); });
}

/* ---------- Local fallback when Firestore writes fail ---------- */
function getLocalCourses(){
  try{ return JSON.parse(localStorage.getItem("ol_local_courses")||"[]"); }catch{return [];}
}
function setLocalCourses(arr){
  localStorage.setItem("ol_local_courses", JSON.stringify(arr||[]));
}
async function safeAddCourse(payload){
  try{
    const ref=await addDoc(collection(db,"courses"), payload);
    return {id:ref.id, ...payload};
  }catch(e){
    console.warn("Firestore add failed, using local fallback", e);
    const list=getLocalCourses(); const id="loc_"+Math.random().toString(36).slice(2,9);
    list.push({id, ...payload}); setLocalCourses(list);
    return {id, ...payload, __local:true};
  }
}
async function fetchAllCourses(){
  try{
    const snap=await getDocs(query(collection(db,"courses"), orderBy("title","asc")));
    if (snap.size>0) return snap.docs.map(d=>({id:d.id, ...d.data()}));
  }catch(e){ console.warn("Fetch Firestore failed, fallback to local", e); }
  return getLocalCourses();
}
/* --------------------------------------------------------------- */

// Catalog render + sample autocreate
async function renderCatalog(autofill=true){
  const grid=$("#courseGrid"); if (!grid) return;
  let list = await fetchAllCourses();
  if (autofill && list.length===0){ await addSamples(true); list = await fetchAllCourses(); }
  const cats=new Set();
  const html = list.map(c=>{
    cats.add(c.category||"");
    const search=[c.title,c.summary,c.category,c.level].join(" ");
    const id=c.id;
    return `<div class="card course" data-id="${id}" data-search="${esc(search)}">
      <img class="course-cover" src="${esc(c.cover||('https://picsum.photos/seed/'+id+'/640/360'))}" alt="cover">
      <div class="course-body">
        <div class="row between"><strong>${esc(c.title)}</strong><span class="badge">${esc(c.level||'')}</span></div>
        <div class="muted">${esc(c.summary||'')}</div>
        <div class="row between"><span>${(c.price||0)>0? '$'+c.price : 'Free'}</span><button class="btn" data-open="${id}">Open</button></div>
      </div>
    </div>`;
  }).join("") || `<div class="muted">No courses yet.</div>`;
  grid.innerHTML = html;
  const catSel=$("#filterCategory"); if (catSel){
    catSel.innerHTML = `<option value="">All Categories</option>` + Array.from(cats).filter(Boolean).map(x=>`<option>${esc(x)}</option>`).join("");
    catSel.onchange = ()=> applyFilters();
  }
  $("#filterLevel").onchange = ()=> applyFilters();
  $("#sortBy").onchange = ()=> applyFilters();

  function applyFilters(){
    const cat=catSel.value, lv=$("#filterLevel").value, sort=$("#sortBy").value;
    const cards=[...document.querySelectorAll(".card.course")];
    cards.forEach(el=>{
      const level=el.querySelector(".badge")?.textContent||"";
      const summary=el.querySelector(".muted")?.textContent||"";
      const matches = (!cat || summary.includes(cat)) && (!lv || level===lv);
      el.style.display = matches ? "" : "none";
    });
    const vis=[...document.querySelectorAll(".card.course")].filter(el=>el.style.display!=="none");
    vis.sort((a,b)=>{
      const ta=a.querySelector("strong").textContent.toLowerCase();
      const tb=b.querySelector("strong").textContent.toLowerCase();
      const pa=a.querySelector(".row.between span").textContent;
      const pb=b.querySelector(".row.between span").textContent;
      if (sort==="title-asc") return ta.localeCompare(tb);
      if (sort==="title-desc") return tb.localeCompare(ta);
      const na=pa.startsWith("$")? parseFloat(pa.slice(1)):0;
      const nb=pb.startsWith("$")? parseFloat(pb.slice(1)):0;
      if (sort==="price-asc") return na-nb;
      if (sort==="price-desc") return nb-na;
      return 0;
    }).forEach(el=> grid.appendChild(el));
  }
  document.querySelectorAll("[data-open]").forEach(b=> b.addEventListener("click", ()=> openCourse(b.getAttribute("data-open")) ));
}

// Course page (supports local-fallback id)
async function openCourse(cid){
  showPage("course");
  let c=null;
  if (cid.startsWith("loc_")){
    c = getLocalCourses().find(x=>x.id===cid);
  }else{
    try{ const d=await getDoc(doc(db,"courses",cid)); if(d.exists()) c=d.data(); }catch(e){ console.warn(e); }
  }
  if(!c){ toast("Course not found"); return; }
  $("#courseTitle").textContent=c.title||"Course";
  $("#courseSummary").textContent=c.summary||"";
  $("#cCategory").textContent=c.category||"";
  $("#cLevel").textContent=c.level||"";
  $("#cPrice").textContent=(c.price||0)>0? '$'+c.price : 'Free';
  const list=$("#lessonList"); list.innerHTML="";
  // simple demo syllabus if none
  const items=[
    {index:1,title:"Welcome & Overview",content:"Intro video placeholder"},
    {index:2,title:"Module 1 — Basics",content:"Slides / video"},
    {index:3,title:"Quiz 1",content:"5 questions"}
  ];
  items.forEach(it=>{ const li=document.createElement("li"); li.textContent=`${it.index}. ${it.title}`; li.addEventListener("click", ()=> loadLesson(it)); list.appendChild(li); });
  loadLesson(items[0]);
  $("#btnMarkComplete")?.addEventListener("click", ()=> toast("Marked complete"));
  $("#toggleSyllabus")?.addEventListener("click", ()=> $(".syllabus")?.classList.toggle("collapsed"));
  $("#btnDownloadCertificate")?.addEventListener("click", ()=> downloadCertificate(c.title));
  $("#btnDownloadTranscript")?.addEventListener("click", ()=> downloadTranscript(c.title));
}
function loadLesson(it){
  $("#lessonContent").innerHTML = `<h3>${esc(it.title)}</h3>
    <p class="muted">${esc(it.content||'Lesson content placeholder')}</p>
    <video controls poster="https://picsum.photos/seed/lesson${it.index}/800/320"></video>`;
}

// Admin new course
function bindAdmin(){
  $("#btnNewCourse")?.addEventListener("click", ()=> $("#dlgCourse").showModal());
  $$(".dlg-close").forEach(b=> b.addEventListener("click", ()=> b.closest("dialog")?.close()));
  $("#formCourse")?.addEventListener("submit", async (e)=>{
    e.preventDefault();
    try{
      const payload={
        id: undefined,
        title: $("#cTitle").value.trim(),
        category: $("#cCategory").value.trim(),
        level: $("#cLevel").value,
        price: Number($("#cPrice").value||0),
        summary: $("#cSummary").value.trim(),
        createdAt: Date.now()
      };
      const obj=await safeAddCourse(payload);
      toast("Course created"); $("#dlgCourse").close();
      await renderCatalog(false); openCourse(obj.id);
      renderMyLearning(); renderGradebook();
    }catch(err){ console.error(err); toast(err.code||"Create failed"); }
  });
  $("#btnAddSample")?.addEventListener("click", ()=> addSamples(true));
}
async function addSamples(alot=false){
  const base=[
    {title:"JavaScript Essentials",category:"Web",level:"Beginner",price:0,summary:"Start JavaScript from zero."},
    {title:"React Fast-Track",category:"Web",level:"Intermediate",price:49,summary:"Build modern UIs."},
    {title:"Advanced React Patterns",category:"Web",level:"Advanced",price:69,summary:"Hooks, contexts, performance."},
    {title:"Data Analysis with Python",category:"Data",level:"Intermediate",price:79,summary:"Pandas & plots."},
    {title:"Intro to Machine Learning",category:"Data",level:"Beginner",price:59,summary:"Supervised, unsupervised."},
    {title:"Cloud Fundamentals",category:"Cloud",level:"Beginner",price:29,summary:"AWS/GCP basics."},
    {title:"DevOps CI/CD",category:"Cloud",level:"Intermediate",price:69,summary:"Pipelines, Docker, K8s."}
  ];
  const many = alot ? base.concat(base.map(s=>({...s,title:s.title+" II"}))) : base;
  for(const c of many){ await safeAddCourse({...c, createdAt: Date.now()}); }
  toast("Sample courses added"); await renderCatalog(false); renderMyLearning(); renderGradebook();
}

// My Learning: take first 6 available
async function renderMyLearning(){
  const grid=$("#myCourses"); if (!grid) return;
  const cs = await fetchAllCourses();
  const cards = cs.slice(0, 6).map(c=>{
    const id=c.id;
    return `<div class="card course"><img class="course-cover" src="${esc(c.cover||'https://picsum.photos/seed/'+id+'/640/360')}" alt=""><div class="course-body">
      <strong>${esc(c.title)}</strong><div class="muted">${esc(c.summary||'')}</div><button class="btn" data-open="${id}">Continue</button></div></div>`;
  }).join("") || `<div class="muted">No enrollments yet. Browse Courses.</div>`;
  grid.innerHTML = cards;
  grid.querySelectorAll("[data-open]")?.forEach(b=> b.addEventListener("click", ()=> openCourse(b.getAttribute("data-open")) ));
}

// Gradebook sample rows
async function renderGradebook(){
  const sel=$("#gbCourseSelect"); const tbody=$("#gbTable tbody");
  const cs = await fetchAllCourses();
  sel.innerHTML = cs.map(c=>`<option value="${c.id}">${esc(c.title)}</option>`).join("") || "";
  const courseName = sel.options[sel.selectedIndex]?.text || "—";
  const rows=[
    {student:"alice@example.com", course:courseName, progress:"3/12", activity:"Today"},
    {student:"bob@example.com", course:courseName, progress:"7/12", activity:"Yesterday"},
    {student:"charlie@example.com", course:courseName, progress:"1/12", activity:"3 days ago"}
  ];
  tbody.innerHTML = rows.map(r=>`<tr><td>${esc(r.student)}</td><td>${esc(r.course)}</td><td>${esc(r.progress)}</td><td>${esc(r.activity)}</td></tr>`).join("");
}
$("#gbCourseSelect")?.addEventListener("change", renderGradebook);
$("#gbRefresh")?.addEventListener("click", renderGradebook);

// Certificate & transcript
function downloadCertificate(courseTitle){
  const name=(currentUser?.displayName||currentUser?.email||"Student");
  const date=new Date().toLocaleDateString();
  const c=document.createElement('canvas'); c.width=1400; c.height=900; const ctx=c.getContext('2d');
  const css=getComputedStyle(document.documentElement);
  ctx.fillStyle=css.getPropertyValue('--card')||'#fff'; ctx.fillRect(0,0,c.width,c.height);
  ctx.strokeStyle=css.getPropertyValue('--accent')||'#000'; ctx.lineWidth=10; ctx.strokeRect(20,20,c.width-40,c.height-40);
  ctx.fillStyle=css.getPropertyValue('--fg')||'#000';
  ctx.font='48px serif'; ctx.fillText('Certificate of Completion', 380, 170);
  ctx.font='36px serif'; ctx.fillText('This certifies that', 560, 260);
  ctx.font='64px serif'; ctx.fillText(name, 420, 360);
  ctx.font='32px serif'; ctx.fillText('has successfully completed the course', 460, 420);
  ctx.font='44px serif'; ctx.fillText(courseTitle, 420, 480);
  ctx.font='28px serif'; ctx.fillText('Date: '+date, 420, 560);
  const a=document.createElement('a'); a.download=`certificate_${courseTitle.replace(/\s+/g,'_')}.png`; a.href=c.toDataURL('image/png'); a.click();
}
function downloadTranscript(courseTitle){
  const name=(currentUser?.displayName||currentUser?.email||'Student');
  const rows=[['Name','Course','Credits','Grade'], [name, courseTitle, '3.0','A']];
  const csv = rows.map(r=>r.map(x=>`"${String(x).replaceAll('"','""')}"`).join(',')).join('\n');
  const blob=new Blob([csv],{type:'text/csv'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='transcript.csv'; a.click();
}

// Boot
onAuthStateChanged(auth, u=>{ currentUser=u||null; gateUI(); });
document.addEventListener("DOMContentLoaded", async ()=>{
  initThemeControls(); initSidebar(); bindSidebarNav(); bindAdmin(); bindTopSearch();
  showPage("catalog");
  try{ await renderCatalog(); await renderMyLearning(); await renderGradebook(); }catch(e){ console.warn('boot', e); }
});
