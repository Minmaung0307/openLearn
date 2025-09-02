const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
const PAGES=['catalog','mylearning','gradebook','dashboard','analytics','settings'];
function show(id){ PAGES.forEach(p=>$('#page-'+p).style.display=(p===id)?'':'none'); }
function initSidebar(){ const sb=$('#sidebar'); sb.addEventListener('mouseenter',()=>sb.classList.add('open')); sb.addEventListener('mouseleave',()=>sb.classList.remove('open')); $$('#sidebar .navbtn').forEach(b=>b.addEventListener('click',()=>show(b.dataset.goto))); }
document.addEventListener('DOMContentLoaded',()=>{ initSidebar(); show('catalog'); });