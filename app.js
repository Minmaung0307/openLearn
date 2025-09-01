// Fully-formed app.js (no ellipsis)
import {
  app, auth, db,
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail, updateProfile,
  collection, addDoc, serverTimestamp, doc, getDoc, getDocs, query, orderBy, where, limit
} from "./firebase.js";

const $ = (s,root=document)=>root.querySelector(s);
const $$ = (s,root=document)=>Array.from(root.querySelectorAll(s));
const esc = (s)=> (s||"").replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
const toast=(m,ms=2200)=>{const t=$("#toast"); if(!t) return; t.textContent=m; t.classList.add("show"); setTimeout(()=>t.classList.remove("show"), ms);};

// Palettes
const PALETTES={
  dark:{bg:"#0b0f17",fg:"#e7ecf3",card:"#121826",muted:"#9aa6b2",border:"#223",accent:"#66d9ef",btnBg:"#1f2937",btnFg:"#e7ecf3",btnPrimaryBg:"#2563eb",btnPrimaryFg:"#ffffff",inputBg:"#0b1220",inputFg:"#e7ecf3",hoverBg:"#0e1625"},
  light:{bg:"#f7fafc",fg:"#0b1220",card:"#ffffff",muted:"#4a5568",border:"#dbe2ea",accent:"#2563eb",btnBg:"#e2e8f0",btnFg:"#0b1220",btnPrimaryBg:"#0f172a",btnPrimaryFg:"#ffffff",inputBg:"#ffffff",inputFg:"#0b1220",hoverBg:"#eef2f7"}
  ,ocean:{bg:"#07131d",fg:"#dff3ff",card:"#0c2030",muted:"#8fb3c6",border:"#113347",accent:"#4cc9f0",btnBg:"#123247",btnFg:"#dff3ff",btnPrimaryBg:"#4cc9f0",btnPrimaryFg:"#08222f",inputBg:"#0b2231",inputFg:"#dff3ff",hoverBg:"#0f2b40"}
  ,forest:{bg:"#0b140f",fg:"#eaf7eb",card:"#102017",muted:"#9fbcaa",border:"#163223",accent:"#34d399",btnBg:"#173425",btnFg:"#eaf7eb",btnPrimaryBg:"#34d399",btnPrimaryFg:"#082015",inputBg:"#0d2317",inputFg:"#eaf7eb",hoverBg:"#123222"}
  ,grape:{bg:"#140a1a",fg:"#f3e8ff",card:"#1f0f2b",muted:"#c4a9d9",border:"#2b1840",accent:"#a78bfa",btnBg:"#2b1940",btnFg:"#f3e8ff",btnPrimaryBg:"#a78bfa",btnPrimaryFg:"#1a1130",inputBg:"#1a1030",inputFg:"#f3e8ff",hoverBg:"#241238"}
  ,solarized:{bg:"#002b36",fg:"#eee8d5",card:"#073642",muted:"#93a1a1",border:"#0a3c48",accent:"#b58900",btnBg:"#0d3d49",btnFg:"#eee8d5",btnPrimaryBg:"#b58900",btnPrimaryFg:"#002b36",inputBg:"#003542",inputFg:"#eee8d5",hoverBg:"#09414e"}
  ,rose:{bg:"#1a0b12",fg:"#ffe4e6",card:"#2a0f1f",muted:"#f8b4c0",border:"#351629",accent:"#fb7185",btnBg:"#3a1426",btnFg:"#ffe4e6",btnPrimaryBg:"#fb7185",btnPrimaryFg:"#2a0f1f",inputBg:"#2a0f1f",inputFg:"#ffe4e6",hoverBg:"#321425"}
  ,bumblebee:{bg:"#11100b",fg:"#fff7cc",card:"#1b1a0f",muted:"#d6cf9a",border:"#2a2815",accent:"#facc15",btnBg:"#2a2815",btnFg:"#fff7cc",btnPrimaryBg:"#facc15",btnPrimaryFg:"#1b1a0f",inputBg:"#1b1a0f",inputFg:"#fff7cc",hoverBg:"#252310"}
};
function applyPalette(name){
  const p = PALETTES[name] || PALETTES.dark;
  const r = document.documentElement;
  const map = {bg:"--bg",fg:"--fg",card:"--card",muted:"--muted",border:"--border",accent:"--accent",btnBg:"--btnBg",btnFg:"--btnFg",btnPrimaryBg:"--btnPrimaryBg",btnPrimaryFg:"--btnPrimaryFg",inputBg:"--inputBg",inputFg:"--inputFg",hoverBg:"--hoverBg"};
  for (const k in map){ r.style.setProperty(map[k], p[k]); }
}
function applyFont(px){ document.documentElement.style.setProperty("--fontSize", px+"px"); const pv=$("#fontPreview"); if(pv) pv.textContent=px+" px"; }
function initThemeControls(){
  const tSel=$("#themeSelect"), fSel=$("#fontSelect");
  const t=localStorage.getItem("ol_theme")||"dark", f=localStorage.getItem("ol_font")||"14";
  if (tSel) tSel.value=t; if (fSel) fSel.value=f;
  applyPalette(t); applyFont(f);
  tSel?.addEventListener("change", e=>{ const v=e.target.value; localStorage.setItem("ol_theme", v); applyPalette(v); });
  fSel?.addEventListener("change", e=>{ const v=e.target.value; localStorage.setItem("ol_font", v); applyFont(v); });
  $("#btnSettings")?.addEventListener("click", ()=> showPage("settings"));
}

// Drawer & sections
function initDrawer(){
  const sb=$("#sidebar");
  $("#hamburger")?.addEventListener("click", ()=> sb.classList.toggle("collapsed"));
  $$("[data-toggle]").forEach(head=>{
    head.addEventListener("click", ()=>{
      const key=head.getAttribute("data-toggle");
      const grp=document.querySelector(`[data-group="${key}"]`);
      grp?.classList.toggle("collapsed");
    });
  });
}

// routing
const PAGE_ALIAS={courses:"catalog"};
function showPage(id){
  $$(".page").forEach(p=>p.classList.remove("visible"));
  $(`#page-${id}`)?.classList.add("visible");
  $$(".side-item").forEach(x=> x.classList.toggle("active", (PAGE_ALIAS[x.dataset.page]||x.dataset.page)===id));
}

// sidebar nav
function bindSidebar(){
  $$(".side-item").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id=PAGE_ALIAS[btn.dataset.page]||btn.dataset.page;
      showPage(id);
    });
  });
}

// dialogs/auth
function bindDialogs(){
  $$(".dlg-close").forEach(b=> b.addEventListener("click", ()=> b.closest("dialog")?.close()));
  $("#btnLogin")?.addEventListener("click", ()=> $("#dlgLogin").showModal());
  $("#btnSignup")?.addEventListener("click", ()=> $("#dlgSignup").showModal());
  $("#lnkForgot")?.addEventListener("click", (e)=>{ e.preventDefault(); $("#dlgLogin").close(); $("#dlgForgot").showModal(); });
  $("#lnkToSignup")?.addEventListener("click", (e)=>{ e.preventDefault(); $("#dlgLogin").close(); $("#dlgSignup").showModal(); });
  $("#lnkToLogin")?.addEventListener("click", (e)=>{ e.preventDefault(); $("#dlgSignup").close(); $("#dlgLogin").showModal(); });

  $("#formLogin")?.addEventListener("submit", async (e)=>{
    e.preventDefault();
    try{
      await signInWithEmailAndPassword(auth, $("#loginEmail").value, $("#loginPassword").value);
      $("#dlgLogin").close();
    }catch(err){ console.error(err); toast(err.code||"Login failed"); }
  });
  $("#formSignup")?.addEventListener("submit", async (e)=>{
    e.preventDefault();
    const pw=$("#suPassword").value, cf=$("#suConfirm").value;
    if (pw!==cf) return toast("Passwords don't match");
    try{
      const cred=await createUserWithEmailAndPassword(auth, $("#suEmail").value, pw);
      const nm=$("#suName").value.trim(); if(nm) await updateProfile(cred.user,{displayName:nm});
      $("#dlgSignup").close();
    }catch(err){ console.error(err); toast(err.code||"Signup failed"); }
  });
  $("#formForgot")?.addEventListener("submit", async (e)=>{
    e.preventDefault();
    try{ await sendPasswordResetEmail(auth, $("#fpEmail").value.trim()); toast("Reset email sent"); $("#dlgForgot").close(); }
    catch(err){ console.error(err); toast(err.code||"Reset failed"); }
  });
  $("#btnLogoutTop")?.addEventListener("click", async ()=>{ try{ await signOut(auth);}catch{} });
}

// auth state
let currentUser=null;
function gateUI(){
  $("#btnLogin")?.classList.toggle("hidden", !!currentUser);
  $("#btnSignup")?.classList.toggle("hidden", !!currentUser);
  $("#userMenu")?.classList.toggle("hidden", !currentUser);
  $("#userName") && ($("#userName").textContent = currentUser ? (currentUser.displayName || currentUser.email) : "");
  const isStaff=false; // extend via roles
  $$(".admin-only").forEach(el=> el.classList.toggle("hidden", !isStaff));
  $("#btnTopAdmin")?.classList.toggle("hidden", !isStaff);
  $("#btnTopAdmin")?.addEventListener("click", ()=> showPage("admin"));
}
onAuthStateChanged(auth, u=>{ currentUser=u||null; gateUI(); });

// header search
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

// catalog
async function renderCatalog(){
  const grid=$("#courseGrid"); if (!grid) return;
  const snap = await getDocs(query(collection(db,"courses"), orderBy("title","asc")));
  const cats=new Set();
  const html = snap.docs.map(d=>{
    const c=d.data(); cats.add(c.category||"");
    const search=[c.title,c.summary,c.category,c.level].join(" ");
    return `<div class="card course" data-id="${d.id}" data-search="${esc(search)}">
      <img class="course-cover" src="${esc(c.cover||('https://picsum.photos/seed/'+d.id+'/640/360'))}" alt="cover">
      <div class="course-body">
        <div class="row between"><strong>${esc(c.title)}</strong><span class="badge">${esc(c.level||'')}</span></div>
        <div class="muted">${esc(c.summary||'')}</div>
        <div class="row between"><span>${(c.price||0)>0? '$'+c.price : 'Free'}</span><button class="btn" data-open="${d.id}">Open</button></div>
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
    const visible=[...document.querySelectorAll(".card.course")].filter(el=>el.style.display!=="none");
    visible.sort((a,b)=>{
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

// open course
async function openCourse(cid){
  showPage("course");
  const d=await getDoc(doc(db,"courses",cid));
  if(!d.exists()){ toast("Course not found"); return; }
  const c=d.data();
  $("#courseTitle").textContent=c.title||"Course";
  $("#courseSummary").textContent=c.summary||"";
  $("#cCategory").textContent=c.category||"";
  $("#cLevel").textContent=c.level||"";
  $("#cPrice").textContent=(c.price||0)>0? '$'+c.price : 'Free';
  const list=$("#lessonList"); list.innerHTML="";
  const ls=await getDocs(query(collection(db,"lessons"), where("courseId","==",cid), orderBy("index","asc"), limit(200)));
  let items=ls.docs.map(x=>x.data());
  if(items.length===0){ items=[
    {index:1,title:"Welcome & Overview",content:"Intro video placeholder"},
    {index:2,title:"Module 1 — Basics",content:"Slides / video"},
    {index:3,title:"Quiz 1",content:"5 questions"}
  ];}
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

// admin
function bindAdmin(){
  $("#btnNewCourse")?.addEventListener("click", ()=> $("#dlgCourse").showModal());
  $("#formCourse")?.addEventListener("submit", async (e)=>{
    e.preventDefault();
    try{
      const payload={
        title: $("#cTitle").value.trim(),
        category: $("#cCategory").value.trim(),
        level: $("#cLevel").value,
        price: Number($("#cPrice").value||0),
        summary: $("#cSummary").value.trim(),
        createdAt: serverTimestamp()
      };
      const ref=await addDoc(collection(db,"courses"), payload);
      toast("Course created"); $("#dlgCourse").close();
      await renderCatalog(); openCourse(ref.id);
    }catch(err){ console.error(err); toast(err.code||"Create failed"); }
  });
  $("#btnAddSample")?.addEventListener("click", addSamples);
}
async function addSamples(){
  const samples=[
    {title:"JS Essentials", category:"Web", level:"Beginner", price:0, summary:"Start JavaScript from zero."},
    {title:"React Fast-Track", category:"Web", level:"Intermediate", price:49, summary:"Build modern UIs."},
    {title:"Data Analysis with Python", category:"Data", level:"Intermediate", price:79, summary:"Pandas & plots."},
    {title:"Cloud Fundamentals", category:"Cloud", level:"Beginner", price:29, summary:"AWS/GCP basics."}
  ];
  for(const c of samples){ await addDoc(collection(db,"courses"), {...c, createdAt:serverTimestamp()}); }
  toast("Sample courses added"); renderCatalog();
}

// certificate & transcript
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
  const blob=new Blob([csv],{type:'text/csv'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='transcript.csv'; a.click();
}

// boot
onAuthStateChanged(auth, u=>{ currentUser=u||null; gateUI(); });
document.addEventListener("DOMContentLoaded", async ()=>{
  initThemeControls(); initDrawer(); bindSidebar(); bindDialogs(); bindTopSearch(); bindAdmin();
  showPage("catalog");
  try{ await renderCatalog(); }catch(e){ console.warn('catalog', e); }
});
