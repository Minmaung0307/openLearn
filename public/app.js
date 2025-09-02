import {
  LIVE, auth, db, rtdb,
  onAuthStateChanged, signOut,
  collection, addDoc, setDoc, serverTimestamp,
  doc, getDoc, getDocs, query, orderBy, where, limit,
  rRef, onChildAdded, push, rSet, rServerTs
} from "/firebase.js";

const $  = (s, r=document)=>r.querySelector(s);
const $$ = (s, r=document)=>Array.from(r.querySelectorAll(s));
const esc = s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));

// ─── Theme / Font ─────────────────────────────────────────────────────────────
const THEMES={dark:{bg:"#0b0f17",fg:"#eaf1ff",card:"#111827",muted:"#9fb0c3",border:"#1f2a3b",primary:"#2563eb"},
light:{bg:"#f6f8fc",fg:"#0e1116",card:"#ffffff",muted:"#556170",border:"#e4e8f0",primary:"#2563eb"},
ocean:{bg:"#07151a",fg:"#d6f6ff",card:"#0d222b",muted:"#8fb6c2",border:"#1e3a44",primary:"#00b4d8"},
violet:{bg:"#0d0a14",fg:"#efeaff",card:"#151028",muted:"#b7a7da",border:"#2a1f4a",primary:"#7c3aed"}};
function applyTheme(name){ const t=THEMES[name]||THEMES.dark; for(const k in t) document.documentElement.style.setProperty("--"+k,t[k]); document.documentElement.setAttribute("data-theme", name==="dark"?"":name); localStorage.setItem("ol_theme",name);}
function applyFont(px){ document.documentElement.style.setProperty("--font", px+"px"); localStorage.setItem("ol_font",px);}

// ─── State ────────────────────────────────────────────────────────────────────
let ALL=[];                                        // catalog
let ENR=new Set(JSON.parse(localStorage.getItem("ol_enrolls")||"[]"));
let RD={cid:null,pages:[],i:0};                    // reader
let USER=null;                                     // {uid,email,role}
const STAFF = new Set(["owner","admin","instructor","ta"]);
const isStaff = ()=> USER && STAFF.has(USER.role);

// ─── Routing & Sidebar ────────────────────────────────────────────────────────
const PAGES=["catalog","mylearning","gradebook","dashboard","analytics","settings"];
function show(id){
  PAGES.forEach(p=>$("#page-"+p).style.display = (p===id)?"":"none");
  if(id==="catalog")   renderCatalog(ALL);
  if(id==="mylearning")renderMy();
  if(id==="gradebook") renderGB();
  if(id==="dashboard") initDashboardLive();
  if(id==="analytics") renderAnalytics();
}
function initSidebar(){
  const sb=$("#sidebar");
  sb.addEventListener("mouseenter",()=>sb.classList.add("open"));
  sb.addEventListener("mouseleave",()=>sb.classList.remove("open"));
  $$("#sidebar .navbtn").forEach(b=> b.addEventListener("click", ()=> show(b.dataset.goto)));
}

// ─── Catalog ──────────────────────────────────────────────────────────────────
async function loadCatalog(){
  try{ const r=await fetch("/data/catalog.json?d="+Date.now()); const j=await r.json(); ALL=j.items||[]; }
  catch{ ALL=[]; }
  renderCatalog(ALL);
}
function cardHTML(c){
  const price = Number(c.price||0)===0 ? "Free" : "$"+Number(c.price).toFixed(0);
  const star  = "★ "+Number(c.rating||0).toFixed(1);
  return `<div class="card">
    <img src="${esc(c.thumb)}" alt="">
    <div class="body">
      <div class="h3">${esc(c.title)}</div>
      <div class="badge">${esc(c.category)} • ${esc(c.level)}</div>
      <div class="kv"><span class="small">${star}</span><span class="price">${price}</span></div>
      <p class="small">${esc(c.description||"")}</p>
      <div style="display:flex;gap:8px;margin-top:6px">
        <button class="btn primary enroll" data-id="${esc(c.id)}">Enroll</button>
      </div>
    </div></div>`;
}
function renderCatalog(list){ $("#courseGrid").innerHTML = list.map(cardHTML).join("") || `<div class="small">No courses</div>`; }

// Admin-only new course button
$("#btnNewCourse").addEventListener("click", ()=> $("#dlgCourse").showModal());
$("#ncSubmit").addEventListener("click", async (e)=>{
  e.preventDefault();
  const newC = {
    id: slug($("#ncTitle").value),
    title: $("#ncTitle").value, category: $("#ncCategory").value,
    level: $("#ncLevel").value, rating: Number($("#ncRating").value||4.5),
    hours: Number($("#ncHours").value||8), price: Number($("#ncPrice").value||0),
    credits: Number($("#ncCredits").value||3), thumb: $("#ncThumb").value || "/images/web-fundamentals.jpg",
    description: $("#ncDesc").value||""
  };
  if (!newC.title){ alert("Title required"); return; }
  try{
    if (LIVE && isStaff()){
      await setDoc(doc(collection(db,"courses"), newC.id), { ...newC, createdBy: USER.uid, ts: serverTimestamp() });
    }
    // reflect immediately on client catalog
    ALL.unshift(newC);
    renderCatalog(ALL);
    $("#dlgCourse").close();
    alert("Course created.");
  }catch(err){ alert("Create failed: " + (err?.message||err)); }
});
function slug(s){ return String(s||"").toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,""); }

// EmailJS init + form submit handler
// 1) Load EmailJS config & init (after DOMContentLoaded is fine)
let EMAILJS = null;
async function initEmailJS() {
  try {
    const cfg = await (await fetch('/emailjs.json?d=' + Date.now())).json();
    EMAILJS = cfg;
    if (window.emailjs && cfg.publicKey) {
      emailjs.init(cfg.publicKey); // Public Key
    }
  } catch (e) {
    console.warn('EmailJS config missing:', e);
  }
}

// 2) Open contact dialog from footer link
document.addEventListener('click', (e)=>{
  if (e.target.closest('[data-open-contact]')) {
    e.preventDefault();
    document.getElementById('dlgContact')?.showModal();
  }
});

// 3) Handle submit -> EmailJS.send()
document.addEventListener('submit', async (e)=>{
  if (e.target.id !== 'contactForm') return;
  e.preventDefault();
  const f = e.target;
  const hint = document.getElementById('contactHint');
  hint.textContent = 'Sending...';
  try {
    if (!EMAILJS?.serviceId || !EMAILJS?.templateId) throw new Error('Missing EmailJS IDs');
    // Map template params (match keys with your EmailJS template)
    const params = {
      from_name: f.from_name.value,
      reply_to:  f.reply_to.value,
      message:   f.message.value
    };
    await emailjs.send(EMAILJS.serviceId, EMAILJS.templateId, params);
    hint.textContent = 'Sent! We will get back to you soon.';
    f.reset();
  } catch (err) {
    hint.textContent = 'Send failed: ' + (err?.message || err);
  }
});

// Call it during app init
document.addEventListener('DOMContentLoaded', async ()=>{
  // ... your existing init code ...
  initEmailJS();
});

// ─── Search ───────────────────────────────────────────────────────────────────
function initSearch(){
  const doSearch=()=>{ const term=($("#topSearch")?.value||"").toLowerCase().trim(); show("catalog");
    $$("#courseGrid .card").forEach(card=>{ const text=card.textContent.toLowerCase(); card.style.display = !term || text.includes(term) ? "" : "none";});
  };
  $("#topSearchBtn")?.addEventListener("click",doSearch);
  $("#topSearch")?.addEventListener("keydown",e=>{ if(e.key==="Enter") doSearch(); });
}

// ─── Enroll: Free (auto) / Paid (PayPal) ──────────────────────────────────────
document.addEventListener("click", (e)=>{
  const en=e.target.closest(".enroll"); if(!en) return;
  const c=ALL.find(x=>x.id===en.dataset.id); if(!c) return;
  if(Number(c.price||0)===0){
    ENR.add(c.id); persistEnrolls();
    if (LIVE && USER) tryRecordEnrollment(c).catch(()=>{});
    alert("Enrolled!"); renderMy(); show("mylearning");
  }else{
    openPayDialog(c);
  }
});
function persistEnrolls(){ localStorage.setItem("ol_enrolls", JSON.stringify([...ENR])); }
async function tryRecordEnrollment(c){
  try{
    await addDoc(collection(db,"enrollments"), {
      userId: USER.uid || USER.email || "anon",
      courseId: c.id,
      price: Number(c.price||0),
      ts: serverTimestamp()
    });
  }catch(_){}
}
function openPayDialog(course){
  $("#ppMeta").textContent = `${course.title} • $${Number(course.price||0).toFixed(2)}`;
  const dlg = $("#dlgPay"); dlg.showModal();
  const render = ()=>{
    if (!window.paypal || !paypal.Buttons) return;
    $("#paypalBtns").innerHTML = "";
    paypal.Buttons({
      style:{ shape:"pill", layout:"vertical" },
      createOrder: (_d, actions) => actions.order.create({
        purchase_units: [{ amount: { value: String(Number(course.price||0).toFixed(2)) }, description: `Course: ${course.title}` }]
      }),
      onApprove: async (_d, actions) => {
        try{
          await actions.order.capture();
          ENR.add(course.id); persistEnrolls();
          if (LIVE && USER) await tryRecordEnrollment(course);
          alert("Payment completed. Enrolled!");
          dlg.close(); renderMy(); show("mylearning");
        }catch(e){ alert("Capture failed: "+(e?.message||e)); }
      },
      onError: (err)=> alert("PayPal error: "+(err?.message||err))
    }).render("#paypalBtns");
  };
  setTimeout(render, 50);
}

// ─── My Learning & Reader + completion ➜ grade + PDF tools ───────────────────
function renderMy(){
  const list=ALL.filter(c=>ENR.has(c.id));
  $("#myGrid").innerHTML = list.map(c=>`
    <div class="card"><img src="${esc(c.thumb)}"><div class="body">
      <div class="h3">${esc(c.title)}</div>
      <button class="btn primary open" data-id="${esc(c.id)}">Open</button>
    </div></div>`).join("") || `<div class="small">No enrolled courses yet.</div>`;
}
document.addEventListener("click",(e)=>{ const b=e.target.closest(".open"); if(!b) return; openReader(b.dataset.id); });

async function openReader(cid){
  try{
    const meta=await (await fetch(`/data/courses/${cid}/meta.json?d=${Date.now()}`)).json();
    const pages=[]; for(const l of meta.lessons||[]){ pages.push(await (await fetch(`/data/courses/${cid}/${l.file}`)).text()); }
    RD={cid,pages,i:0, meta}; $("#rdTitle").textContent=meta.title||cid; $("#rdBody").innerHTML=pages[0]||"<p class='small'>No content</p>";
    $("#rdInfo").textContent=`1 / ${pages.length||1}`; $("#rdProg").style.width=pages.length?"0%":"100%"; $("#reader").style.display="";
    show("mylearning");
  }catch(e){ alert("Failed to open course."); }
}
$("#rdPrev").onclick=()=>{ if(!RD.pages.length) return; RD.i=Math.max(0,RD.i-1); renderPage(); };
$("#rdNext").onclick=()=>{ if(!RD.pages.length) return; RD.i=Math.min(RD.pages.length-1,RD.i+1); renderPage(); maybeComplete(); };
function renderPage(){ $("#rdBody").innerHTML=RD.pages[RD.i]; $("#rdInfo").textContent=`${RD.i+1} / ${RD.pages.length}`; $("#rdProg").style.width=Math.round((RD.i+1)/RD.pages.length*100)+"%"; }
$("#rdBookmark").onclick=()=>{ const bm=JSON.parse(localStorage.getItem("ol_bm")||"{}"); bm[RD.cid]=RD.i; localStorage.setItem("ol_bm",JSON.stringify(bm)); alert("Bookmarked"); };
$("#rdNote").onclick=()=>{ const ns=JSON.parse(localStorage.getItem("ol_notes")||"{}"); const t=prompt("Write a note"); if(!t) return; (ns[RD.cid]=ns[RD.cid]||[]).push({i:RD.i,ts:Date.now(),text:t}); localStorage.setItem("ol_notes",JSON.stringify(ns)); alert("Note saved"); };

function computeProgress(){ return RD.pages.length ? (RD.i+1)/RD.pages.length : 0; }
async function maybeComplete(){
  const p = computeProgress();
  const score = Math.round(p*100);
  if (p<1) return;
  // save grade locally
  const g = JSON.parse(localStorage.getItem("ol_grades")||"{}");
  g[RD.cid] = { score, credits: RD.meta?.credits ?? 3, completedAt: Date.now() };
  localStorage.setItem("ol_grades", JSON.stringify(g));
  // Firestore mirror
  if (LIVE && USER){
    try{
      await addDoc(collection(db,"grades"), {
        userId: USER.uid, courseId: RD.cid, score, credits: RD.meta?.credits ?? 3, completedAt: serverTimestamp()
      });
    }catch(_){}
  }
}

$("#btnCertificate").onclick = ()=> {
  const g = JSON.parse(localStorage.getItem("ol_grades")||"{}")[RD.cid];
  if(!g){ alert("Complete the course to unlock certificate."); return; }
  generateCertificatePDF(USER?.email||"Student", RD.meta?.title||RD.cid, g.score);
};
$("#btnTranscript").onclick = ()=> {
  const grades = JSON.parse(localStorage.getItem("ol_grades")||"{}");
  generateTranscriptPDF(USER?.email||"Student", grades);
};

// ─── Gradebook (real score from local/Firestore) ─────────────────────────────
async function renderGB(){
  const grades = JSON.parse(localStorage.getItem("ol_grades")||"{}");
  const rows = ALL.filter(c=>ENR.has(c.id)).map(c=>{
    const g = grades[c.id];
    const score = g ? g.score : Math.round(((JSON.parse(localStorage.getItem("ol_bm")||"{}")[c.id]||0)+1) / (c.lessonsCount||3) * 100) || "—";
    const credits = g ? g.credits : (c.credits??3);
    const prog = (c.id===RD.cid) ? Math.round(computeProgress()*100)+"%" : (g ? "100%" : "—");
    return `<tr><td>${esc(c.title)}</td><td>${esc(score)}</td><td>${esc(credits)}</td><td>${esc(prog)}</td></tr>`;
  }).join("");
  $("#gbTbody").innerHTML = rows || "<tr><td colspan='4' class='small'>No data</td></tr>";
}

// ─── Dashboard Live: Chat + Announcements (RTDB) ─────────────────────────────
let chatInited=false, annInited=false;
function initDashboardLive(){
  if (LIVE && rtdb){
    if(!chatInited){ chatInited=true; initChat(); }
    if(!annInited){ annInited=true; initAnnouncements(); }
  }
}
function initChat(){
  const box=$("#chatBox");
  const listRef = rRef(rtdb, "chats/rooms/global/messages");
  onChildAdded(listRef, (snap)=>{
    const m=snap.val(); const el=document.createElement("div");
    const who = esc(m.email || m.uid || "anon");
    el.innerHTML = `<div class="small"><b>${who}</b> • ${new Date(m.ts||Date.now()).toLocaleString()}</div><div>${esc(m.text||"")}</div>`;
    box.appendChild(el); box.scrollTop=box.scrollHeight;
  });
  $("#chatSend").onclick=async()=>{
    const t=$("#chatInput").value.trim(); if(!t) return;
    $("#chatInput").value="";
    const u = USER || {};
    await rSet(push(listRef), { uid: u.uid||"anon", email: u.email||"", text: t, ts: rServerTs() });
  };
}
function initAnnouncements(){
  const list=$("#annList"), btn=$("#annNew");
  btn.style.display = isStaff() ? "" : "none";
  const annRef = rRef(rtdb, "announcements");
  onChildAdded(annRef, (snap)=>{
    const a=snap.val();
    const el=document.createElement("div");
    el.className="card"; el.innerHTML = `<div class="body"><div class="h3">${esc(a.title||"Announcement")}</div><div class="small">${new Date(a.ts||Date.now()).toLocaleString()}</div><p>${esc(a.body||"")}</p></div>`;
    list.prepend(el);
  });
  btn.onclick=async()=>{
    const title = prompt("Title"); if(!title) return;
    const body = prompt("Body"); if(!body) return;
    await rSet(push(annRef), { title, body, ts: rServerTs(), by: USER?.uid||"staff" });
    alert("Announcement posted.");
  };
}

// ─── Analytics (Chart.js) ─────────────────────────────────────────────────────
let chartA, chartB;
function renderAnalytics(){
  const ctxA=$("#chartEnrolls"), ctxB=$("#chartByCat");
  const enrolled = ALL.filter(c=>ENR.has(c.id));
  const a = [enrolled.length, ALL.length - enrolled.length];
  if(chartA) chartA.destroy();
  chartA = new Chart(ctxA, { type:"doughnut", data:{ labels:["Enrolled","Not"], datasets:[{ data:a }] }, options:{ plugins:{legend:{position:"bottom"}} }});
  const byCat={}; for(const c of enrolled){ byCat[c.category]=(byCat[c.category]||0)+1; }
  const labels = Object.keys(byCat); const values = Object.values(byCat);
  if(chartB) chartB.destroy();
  chartB = new Chart(ctxB, { type:"bar", data:{ labels, datasets:[{ label:"Enrollments", data: values }] }, options:{ plugins:{legend:{display:false}}, scales:{ y:{ beginAtZero:true }}}});
}

// ─── Auth header & role-based visibility ──────────────────────────────────────
function initAuthHeader(){
  const login=$("#btnLogin"), logout=$("#btnLogout");
  const setUI = async (u)=>{
    if (!u){
      USER=null;
      login.style.display="inline-block"; logout.style.display="none";
      $("#btnNewCourse").style.display="none";
      $("#navAnalytics").style.display="none";
      return;
    }
    // default role student
    USER={ email:u.email, uid:u.uid, role:"student" };
    if (LIVE){
      try{
        const ud = await getDoc(doc(collection(db,"users"), u.uid));
        if (ud.exists()) USER.role = ud.data().role || "student";
      }catch(_){}
    } else {
      const saved = JSON.parse(localStorage.getItem("ol_role")||"\"student\"");
      USER.role = saved;
    }
    // role-based menus
    $("#btnNewCourse").style.display = isStaff() ? "" : "none";
    $("#navAnalytics").style.display = isStaff() ? "" : "none";
    $("#annNew").style.display = isStaff() ? "" : "none";
    // header
    login.style.display="none"; logout.style.display="inline-block";
  };
  if (LIVE){
    onAuthStateChanged(auth, (u)=>{ setUI(u); });
  } else {
    const lu = JSON.parse(localStorage.getItem("ol_user")||"null");
    setUI(lu);
  }
  logout.addEventListener("click", async ()=>{
    if (LIVE) await signOut(auth); else localStorage.removeItem("ol_user");
    location.reload();
  });
}

// ─── PDF Generators (Certificates / Transcript) ───────────────────────────────
function generateCertificatePDF(name, courseTitle, score){
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit:"pt", format:"a4" });
  doc.setFillColor(37,99,235); doc.rect(0,0,595,120,"F");
  doc.setTextColor(255,255,255); doc.setFontSize(26);
  doc.text("Certificate of Completion", 40, 70);
  doc.setTextColor(20,20,20);
  doc.setFontSize(18); doc.text(`This certifies that`, 40, 170);
  doc.setFontSize(24); doc.text(name, 40, 205);
  doc.setFontSize(18); doc.text(`has successfully completed`, 40, 240);
  doc.setFontSize(22); doc.text(courseTitle, 40, 275);
  doc.setFontSize(16); doc.text(`Final Score: ${score}`, 40, 310);
  doc.setFontSize(12); doc.text(`Date: ${new Date().toLocaleDateString()}`, 40, 340);
  doc.save(`${courseTitle.replace(/\s+/g,'_')}-certificate.pdf`);
}
function generateTranscriptPDF(name, gradesMap){
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit:"pt", format:"a4" });
  doc.setFontSize(22); doc.text("Academic Transcript", 40, 60);
  doc.setFontSize(12); doc.text(`Student: ${name}`, 40, 85);
  let y=120;
  doc.setFontSize(14); doc.text("Course", 40, y); doc.text("Score", 320, y); doc.text("Credits", 420, y);
  doc.setLineWidth(.5); doc.line(38,y+8,550,y+8);
  y+=28;
  let totalC=0, totalS=0;
  for(const cid in gradesMap){
    const g=gradesMap[cid];
    const title = (ALL.find(c=>c.id===cid)?.title)||cid;
    doc.setFontSize(12);
    doc.text(title, 40, y);
    doc.text(String(g.score??"—"), 320, y);
    doc.text(String(g.credits??"—"), 420, y);
    y+=22;
    totalC += (g.credits||0);
    totalS += (g.score||0)*(g.credits||0);
  }
  const gpa = totalC ? (totalS/totalC/25).toFixed(2) : "—"; // coarse GPA-ish
  y+=20; doc.setFontSize(14); doc.text(`Total Credits: ${totalC}`, 40, y);
  y+=20; doc.text(`GPA (approx): ${gpa}`, 40, y);
  doc.save("transcript.pdf");
}

// ─── Footer static pages (JSON) ───────────────────────────────────────────────
document.addEventListener("click",(e)=>{
  const k=e.target.closest("[data-open-static]")?.getAttribute("data-open-static"); if(!k) return; e.preventDefault();
  fetch(`/data/pages/${k}.json?d=${Date.now()}`).then(r=>r.json()).then(p=>{ $("#stTitle").textContent=p.title||k; $("#stBody").innerHTML=p.html||"<p>—</p>"; $("#dlgStatic").showModal(); });
});

// ─── Settings ─────────────────────────────────────────────────────────────────
$("#themeSel")?.addEventListener("change", e=> applyTheme(e.target.value));
$("#fontSel")?.addEventListener("change",  e=> applyFont(e.target.value));

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async ()=>{
  applyTheme(localStorage.getItem("ol_theme")||"dark");
  applyFont(localStorage.getItem("ol_font")||"16");
  initSidebar(); initSearch(); initAuthHeader();
  await loadCatalog(); show("catalog");
});