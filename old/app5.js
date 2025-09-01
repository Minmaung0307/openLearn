// v1Fix Pro — full wiring for sidebar + auth + theme/font
import {
  app, auth, db,
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail, updateProfile
} from "./firebase.js";

// ---------- helpers ----------
const $ = (s,root=document)=>root.querySelector(s);
const $$ = (s,root=document)=>Array.from(root.querySelectorAll(s));
const toast=(m,ms=2200)=>{const t=$("#toast"); if(!t) return; t.textContent=m; t.classList.add("show"); setTimeout(()=>t.classList.remove("show"), ms);};

const PAGE_ALIAS = { courses:"catalog" };
function mapPage(key){ return PAGE_ALIAS[key] || key; }

// ---------- theme & font palettes ----------
const PALETTES = {
  dark:   {bg:"#0b0f17", fg:"#e7ecf3", card:"#121826", muted:"#9aa6b2", border:"#223", accent:"#66d9ef"},
  light:  {bg:"#f7fafc", fg:"#0b1220", card:"#ffffff", muted:"#4a5568", border:"#dbe2ea", accent:"#2563eb"},
  ocean:  {bg:"#07131d", fg:"#dff3ff", card:"#0c2030", muted:"#8fb3c6", border:"#113347", accent:"#4cc9f0"},
  forest: {bg:"#0b140f", fg:"#eaf7eb", card:"#102017", muted:"#9fbcaa", border:"#163223", accent:"#34d399"},
  grape:  {bg:"#140a1a", fg:"#f3e8ff", card:"#1f0f2b", muted:"#c4a9d9", border:"#2b1840", accent:"#a78bfa"}
};
function applyPalette(name){
  const p = PALETTES[name] || PALETTES.dark;
  const r = document.documentElement;
  r.style.setProperty("--bg", p.bg);
  r.style.setProperty("--fg", p.fg);
  r.style.setProperty("--card", p.card);
  r.style.setProperty("--muted", p.muted);
  r.style.setProperty("--border", p.border);
  r.style.setProperty("--accent", p.accent);
}
function applyFont(px){
  document.documentElement.style.setProperty("--fontSize", px+"px");
  const pv=$("#fontPreview"); if (pv) pv.textContent = px+" px";
}
function initThemeControls(){
  const tSel=$("#themeSelect"), fSel=$("#fontSelect");
  const t = localStorage.getItem("ol_theme") || "dark";
  const f = localStorage.getItem("ol_font") || "14";
  if (tSel) tSel.value = t;
  if (fSel) fSel.value = f;
  applyPalette(t); applyFont(f);
  tSel?.addEventListener("change", e=>{ const v=e.target.value; localStorage.setItem("ol_theme", v); applyPalette(v); });
  fSel?.addEventListener("change", e=>{ const v=e.target.value; localStorage.setItem("ol_font", v); applyFont(v); });
  // quick settings button
  $("#btnSettings")?.addEventListener("click", ()=> showPage("settings"));
}

// ---------- routing & sidebar ----------
function showPage(id){
  $$(".page").forEach(p=>p.classList.remove("visible"));
  $("#page-"+id)?.classList.add("visible");
  $$(".side-item").forEach(x=> x.classList.toggle("active", mapPage(x.dataset.page)===id));
}
function bindSidebar(){
  $$(".side-item").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      showPage(mapPage(btn.dataset.page));
      $("#sidebar")?.classList.remove("show");
    });
  });
  $("#hamburger")?.addEventListener("click", ()=> $("#sidebar")?.classList.toggle("show"));
}

// ---------- auth dialogs ----------
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
    }catch(err){ console.error(err); toast(err.code? err.code : "Login failed"); }
  });
  $("#formSignup")?.addEventListener("submit", async (e)=>{
    e.preventDefault();
    const pw=$("#suPassword").value, cf=$("#suConfirm").value;
    if (pw!==cf) return toast("Passwords don't match");
    try{
      const cred = await createUserWithEmailAndPassword(auth, $("#suEmail").value, pw);
      const nm=$("#suName").value.trim(); if (nm) await updateProfile(cred.user, {displayName:nm});
      $("#dlgSignup").close();
    }catch(err){ console.error(err); toast(err.code? err.code : "Signup failed"); }
  });
  $("#formForgot")?.addEventListener("submit", async (e)=>{
    e.preventDefault();
    try{
      await sendPasswordResetEmail(auth, $("#fpEmail").value.trim());
      toast("Reset email sent"); $("#dlgForgot").close();
    }catch(err){ console.error(err); toast(err.code? err.code : "Reset failed"); }
  });
  $("#btnLogoutTop")?.addEventListener("click", async ()=>{
    try{ await signOut(auth); }catch{}
  });
}

// ---------- auth state ----------
let currentUser=null;
function gateUI(){
  $("#btnLogin")?.classList.toggle("hidden", !!currentUser);
  $("#btnSignup")?.classList.toggle("hidden", !!currentUser);
  $("#userMenu")?.classList.toggle("hidden", !currentUser);
  $("#userName") && ( $("#userName").textContent = currentUser ? (currentUser.displayName || currentUser.email) : "" );
  const isStaff = false; // wire your role check if using Firestore profile
  $$(".admin-only").forEach(el=> el.classList.toggle("hidden", !isStaff));
  $("#btnTopAdmin")?.classList.toggle("hidden", !isStaff);
}

onAuthStateChanged(auth, user=>{
  currentUser = user || null;
  gateUI();
});

// ---------- top search → catalog search box ----------
function bindTopSearch(){
  const doSearch = ()=>{
    const q = $("#topSearch").value.trim();
    showPage("catalog");
    const si=$("#searchInput"); if (si){ si.value=q; si.dispatchEvent(new Event("input")); }
  };
  $("#topSearchBtn")?.addEventListener("click", doSearch);
  $("#topSearch")?.addEventListener("keydown", e=>{ if(e.key==="Enter") doSearch(); });
}

// ---------- boot ----------
document.addEventListener("DOMContentLoaded", ()=>{
  initThemeControls();
  bindSidebar();
  bindDialogs();
  bindTopSearch();
  showPage("catalog");
});
