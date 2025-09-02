// === Utility ===
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const esc = (s) => String(s || "").replace(/[&<>"']/g,
  m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

// === State ===
let ALL = [];       // course catalog
let RD = null;      // reader state
let currentUser = null;
let USE_DB = false;

// === LocalStorage helpers ===
function getBookmarks(){ return JSON.parse(localStorage.getItem("ol_bookmarks")||"{}"); }
function setBookmark(cid, idx){ let b=getBookmarks(); b[cid]=idx; localStorage.setItem("ol_bookmarks",JSON.stringify(b)); }
function getNotes(){ return JSON.parse(localStorage.getItem("ol_notes")||"{}"); }
function addNote(cid, idx, text){ let n=getNotes(); (n[cid] ||= []).push({i:idx, text}); localStorage.setItem("ol_notes",JSON.stringify(n)); }

// === Loader helpers ===
async function loadJSON(path){
  const r = await fetch(path,{cache:"no-cache"}); if(!r.ok) throw new Error("fail "+path);
  return r.json();
}
async function loadHTML(path){
  const r = await fetch(path,{cache:"no-cache"}); if(!r.ok) throw new Error("fail "+path);
  return r.text();
}

// === Catalog ===
async function loadCatalog(){
  try{
    const cat = await loadJSON("/data/catalog.json");
    ALL = cat.items;
    renderCatalog(ALL);
  }catch(e){ console.warn("Catalog load failed",e); }
}
function renderCatalog(arr){
  const grid=$("#courseGrid");
  if(!grid) return;
  grid.innerHTML = arr.map(c=>`
    <div class="card course" data-id="${c.id}" data-search="${esc(c.title)} ${esc(c.category)} ${esc(c.level)}">
      <img src="${c.thumb}" alt="">
      <div class="c-body">
        <h4>${esc(c.title)}</h4>
        <p>${esc(c.description||"")}</p>
        <small>${c.category} • ${c.level} • ⭐${c.rating}</small>
        <button class="btn enroll" data-id="${c.id}">${c.price>0?`Buy $${c.price}`:"Enroll"}</button>
      </div>
    </div>`).join("");
}

// === Reader ===
async function openReader(cid){
  try{
    const {meta,pages,quiz} = await loadCourseBundle(cid);
    RD={cid, pages, i:(getBookmarks()[cid]??0), credits:meta.credits||3, score:0, quiz};
    showPage("reader"); renderPage();
  }catch(e){ console.error("Reader open fail",e); }
}
async function loadCourseBundle(slug){
  const meta = await loadJSON(`/data/courses/${slug}/meta.json`);
  const pages=[];
  for(const l of meta.lessons){
    const html=await loadHTML(`/data/courses/${slug}/${l.file}`);
    pages.push({type:"reading", html});
  }
  let quiz=null; try{quiz=await loadJSON(`/data/courses/${slug}/quiz.json`);}catch{}
  return {meta,pages,quiz};
}
function renderPage(){
  if(!RD) return;
  const p = RD.pages[RD.i];
  $("#readerBody").innerHTML = (p.type==="reading")? p.html : "";
  $("#progress").value = ((RD.i+1)/RD.pages.length)*100;
  setBookmark(RD.cid,RD.i);
}

// === Static pages (policy/privacy/guide) ===
async function loadPageJSON(key){
  try{
    const p = await loadJSON(`/data/pages/${key}.json`);
    $("#stTitle").textContent = p.title||key;
    $("#stBody").innerHTML = p.html||"<p>No content</p>";
    $("#dlgStatic").showModal();
  }catch(e){ console.error(e); }
}

// === Notes / Bookmarks UI ===
function addCurrentNote(){
  if(!RD) return;
  const t = prompt("Add note:");
  if(t){ addNote(RD.cid,RD.i,t); alert("Note saved!"); }
}

// === Theme / Settings ===
function applyTheme(th){ document.documentElement.setAttribute("data-theme",th); localStorage.setItem("ol_theme",th); }
function applyFontSize(sz){ document.documentElement.style.fontSize=sz+"px"; localStorage.setItem("ol_fs",sz); }

// === Sidebar Hover Drawer ===
function initSidebar(){
  const sb=$("#sidebar");
  sb.addEventListener("mouseenter",()=>sb.classList.add("open"));
  sb.addEventListener("mouseleave",()=>sb.classList.remove("open"));
}

// === Events ===
document.addEventListener("DOMContentLoaded",()=>{
  // sidebar
  initSidebar();
  // catalog
  loadCatalog();
  // enroll
  document.body.addEventListener("click",(e)=>{
    const cid=e.target.closest(".enroll")?.dataset.id;
    if(cid){
      const c=ALL.find(x=>x.id===cid);
      if(!c) return;
      if(c.price>0) alert("PayPal flow here…");
      else openReader(cid);
    }
  });
  // footer static
  $$("a[data-open-static]").forEach(a=>{
    a.addEventListener("click",(ev)=>{
      ev.preventDefault(); loadPageJSON(a.dataset.openStatic);
    });
  });
  // notes
  $("#btnNote")?.addEventListener("click",addCurrentNote);
  // settings load
  const th=localStorage.getItem("ol_theme")||"light"; applyTheme(th);
  const fs=+localStorage.getItem("ol_fs")||16; applyFontSize(fs);
});

// === Simple Chat (local fallback) ===
function initChat(){
  const box=$("#chatBox"), inp=$("#chatInput"), send=$("#chatSend");
  if(!box) return;
  const KEY="ol_chat"; let arr=JSON.parse(localStorage.getItem(KEY)||"[]");
  arr.forEach(m=>appendChat(m));
  send.onclick=()=>{
    const t=inp.value.trim(); if(!t) return;
    const m={user:(currentUser?.email||"guest"),text:t,ts:Date.now()};
    arr.push(m); localStorage.setItem(KEY,JSON.stringify(arr));
    appendChat(m); inp.value="";
  };
}
function appendChat(m){
  $("#chatBox").insertAdjacentHTML("beforeend",
    `<div class="msg"><b>${esc(m.user)}</b> <small>${new Date(m.ts).toLocaleTimeString()}</small><div>${esc(m.text)}</div></div>`);
}