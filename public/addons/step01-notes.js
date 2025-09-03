
const $=(s,r=document)=>r.querySelector(s);
window.__ol_notes = {
  add(text){ const list=JSON.parse(localStorage.getItem('ol:notes')||'[]'); list.unshift({text,at:Date.now()}); localStorage.setItem('ol:notes',JSON.stringify(list)); },
  list(){ return JSON.parse(localStorage.getItem('ol:notes')||'[]'); }
};
