import { app, auth, db } from "./firebase.js";
const $ = (s,root=document)=>root.querySelector(s);
const $$ = (s,root=document)=>Array.from(root.querySelectorAll(s));
function showPage(id){
  $$(".page").forEach(p=>p.classList.remove("visible"));
  $("#page-"+id)?.classList.add("visible");
  $$(".side-item").forEach(x=>x.classList.toggle("active", (x.dataset.page===id)));
}
function bindSidebarNav(){
  const alias={courses:"catalog"};
  $$(".side-item").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      $$(".side-item").forEach(x=>x.classList.remove("active"));
      btn.classList.add("active");
      const page=alias[btn.dataset.page]||btn.dataset.page;
      showPage(page);
      $("#sidebar")?.classList.remove("show");
    });
  });
  $("#hamburger")?.addEventListener("click", ()=> $("#sidebar")?.classList.toggle("show"));
}
document.addEventListener("DOMContentLoaded", ()=>{
  bindSidebarNav();
  $$(".dlg-close").forEach(b=> b.addEventListener("click", ()=> b.closest("dialog")?.close()));
  $("#themeSelect")?.addEventListener("change", e=>{localStorage.setItem("ol_theme",e.target.value);applyTheme();});
  $("#fontRange")?.addEventListener("input", e=>{localStorage.setItem("ol_fontsize",e.target.value);applyFontSize();});
  applyTheme();applyFontSize();
});
function applyTheme(){ const t=localStorage.getItem("ol_theme")||"dark"; document.body.dataset.theme=t;}
function applyFontSize(){ const fs=localStorage.getItem("ol_fontsize")||"14"; document.documentElement.style.setProperty("--fontSize", fs+"px"); $("#fontPreview").textContent=fs+"px";}