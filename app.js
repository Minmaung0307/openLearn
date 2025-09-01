// v1Fix+ interactions
import { app, auth, db } from "./firebase.js";
const $ = (s,root=document)=>root.querySelector(s);
const $$ = (s,root=document)=>Array.from(root.querySelectorAll(s));
const toast=(m,ms=2000)=>{const t=$("#toast");t.textContent=m;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),ms);};

// Page routing
function showPage(id){
  $$(".page").forEach(p=>p.classList.remove("visible"));
  $("#page-"+id)?.classList.add("visible");
  $$(".side-item").forEach(x=>{
    const alias={courses:"catalog"};
    const pid=alias[x.dataset.page]||x.dataset.page;
    x.classList.toggle("active", pid===id);
  });
}

// Sidebar nav binding
function bindSidebarNav(){
  const alias={courses:"catalog"};
  $$(".side-item").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id=alias[btn.dataset.page]||btn.dataset.page;
      showPage(id);
      $("#sidebar")?.classList.remove("show");
    });
  });
  $("#hamburger")?.addEventListener("click", ()=> $("#sidebar")?.classList.toggle("show"));
}

// Top bar actions
function bindTopBar(){
  $("#toggleTheme")?.addEventListener("click", ()=>{
    const cur=localStorage.getItem("ol_theme")||"dark";
    const next=cur==="dark"?"light":"dark";
    localStorage.setItem("ol_theme",next); applyTheme(); toast("Theme: "+next);
  });
  // Auth dialogs open
  $("#btnLogin")?.addEventListener("click", ()=> $("#dlgLogin").showModal());
  $("#btnSignup")?.addEventListener("click", ()=> $("#dlgSignup").showModal());
  $("#btnLogoutTop")?.addEventListener("click", ()=> toast("Logged out (wire to Firebase)"));
  $("#btnLogout")?.addEventListener("click", ()=> toast("Logged out (wire to Firebase)"));
  $("#btnTopAdmin")?.addEventListener("click", ()=> showPage("admin"));

  // Global search demo
  $("#topSearchBtn")?.addEventListener("click", ()=>{
    const q=$("#topSearch").value.trim();
    toast(q?("Search: "+q):"Type to search");
  });
}

// Auth dialog links + close buttons
function bindDialogs(){
  // close buttons
  $$(".dlg-close").forEach(b=> b.addEventListener("click", ()=> b.closest("dialog")?.close()));
  // form link switches
  $("#lnkForgot")?.addEventListener("click", (e)=>{e.preventDefault(); $("#dlgLogin").close(); $("#dlgForgot").showModal();});
  $("#lnkToSignup")?.addEventListener("click", (e)=>{e.preventDefault(); $("#dlgLogin").close(); $("#dlgSignup").showModal();});
  $("#lnkToLogin")?.addEventListener("click", (e)=>{e.preventDefault(); $("#dlgSignup").close(); $("#dlgLogin").showModal();});

  // (Wire these to Firebase in your project)
  $("#formLogin")?.addEventListener("submit", (e)=>{ e.preventDefault(); toast("Login submit (connect to Firebase)"); $("#dlgLogin").close(); });
  $("#formSignup")?.addEventListener("submit", (e)=>{ e.preventDefault(); toast("Signup submit (connect to Firebase)"); $("#dlgSignup").close(); });
  $("#formForgot")?.addEventListener("submit", (e)=>{ e.preventDefault(); toast("Reset email sent (connect to Firebase)"); $("#dlgForgot").close(); });
}

// Theme & font-size
function applyTheme(){ const t=localStorage.getItem("ol_theme")||"dark"; document.body.dataset.theme=t; }
function applyFontSize(){ const fs=localStorage.getItem("ol_fontsize")||"14"; document.documentElement.style.setProperty("--fontSize", fs+"px"); $("#fontPreview") && ($("#fontPreview").textContent=fs+"px"); }
function bindSettings(){
  $("#themeSelect")?.addEventListener("change", (e)=>{ localStorage.setItem("ol_theme", e.target.value); applyTheme(); });
  $("#fontRange")?.addEventListener("input", (e)=>{ localStorage.setItem("ol_fontsize", e.target.value); applyFontSize(); });
}

// Boot
document.addEventListener("DOMContentLoaded", ()=>{
  bindSidebarNav(); bindTopBar(); bindDialogs(); bindSettings();
  applyTheme(); applyFontSize();
  showPage("catalog");
});