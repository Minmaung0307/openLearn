
// Step 15 — Course Manager modal (localStorage-first)
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const LS={courses:'ol:courses'};
const readLS=k=>{try{return JSON.parse(localStorage.getItem(k)||'[]')}catch{return []}};
const writeLS=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
function esc(s){return (s||'').toString().replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}

function ensureDialog(){
  if($('#ol-editors')) return $('#ol-editors');
  const d=document.createElement('dialog'); d.id='ol-editors';
  d.innerHTML=`<div class="hd"><b>Course Manager</b><button class="btn small" id="ol-close">Close</button></div>
  <div class="bd">
    <div class="ol-row">
      <button class="btn primary" id="ol-new-course">+ New Course</button>
      <div class="ol-grow"></div>
      <input id="ol-filter" placeholder="Filter by title…" />
    </div>
    <table class="ol-table" id="ol-courses"><thead><tr><th>Title</th><th>Cat/Level</th><th>Rating</th><th>Price</th><th>Hours</th><th>Actions</th></tr></thead><tbody></tbody></table>
  </div>`;
  document.body.appendChild(d);
  $('#ol-close',d).onclick=()=>d.close();
  $('#ol-filter',d).oninput=()=>renderTable($('#ol-filter').value.trim().toLowerCase());
  $('#ol-new-course',d).onclick=()=>editCourse();
  return d;
}
function renderTable(q=''){
  const tb=$('#ol-courses tbody'); const list=readLS(LS.courses).filter(c=>c.title.toLowerCase().includes(q));
  tb.innerHTML = list.map(c=>`<tr>
    <td>${esc(c.title)}</td><td>${esc(c.category)} / ${esc(c.level)}</td>
    <td>${esc(c.rating||0)}</td><td>${c.price? '$'+c.price:'Free'}</td><td>${esc(c.hours||0)}</td>
    <td>
      <button class="btn small" data-edit="${esc(c.id)}">Edit</button>
      <button class="btn small" data-del="${esc(c.id)}">Delete</button>
    </td></tr>`).join('');
  $$('#ol-courses [data-edit]').forEach(b=> b.onclick=()=> editCourse(b.dataset.edit));
  $$('#ol-courses [data-del]').forEach(b=> b.onclick=()=> delCourse(b.dataset.del));
}
function editCourse(id){
  const list=readLS(LS.courses); const c=id? (list.find(x=>x.id===id)||{}) : {id:('c_'+Date.now()), title:'', category:'', level:'Beginner', rating:4.5, price:0, hours:6, description:''};
  const dlg=document.createElement('dialog'); dlg.className='card'; dlg.innerHTML=`
    <div class="hd"><b>${id?'Edit':'New'} Course</b><button class="btn small" id="x">Close</button></div>
    <div class="bd ol-form">
      <label>Title<input id="t" value="${esc(c.title)}"></label>
      <label>Category<input id="cat" value="${esc(c.category||'')}"></label>
      <label>Level<select id="lvl"><option>Beginner</option><option ${c.level==='Intermediate'?'selected':''}>Intermediate</option><option ${c.level==='Advanced'?'selected':''}>Advanced</option></select></label>
      <label>Rating<input id="rate" type="number" min="0" max="5" step="0.1" value="${esc(c.rating||4.5)}"></label>
      <label>Price (USD)<input id="price" type="number" min="0" step="1" value="${esc(c.price||0)}"></label>
      <label>Hours<input id="hrs" type="number" min="1" step="1" value="${esc(c.hours||6)}"></label>
      <label>Description<textarea id="desc">${esc(c.description||'')}</textarea></label>
      <div class="ol-row"><div class="ol-grow"></div><button class="btn primary" id="save">Save</button></div>
    </div>`;
  document.body.appendChild(dlg);
  dlg.showModal();
  $('#x',dlg).onclick=()=>dlg.close();
  $('#save',dlg).onclick=()=>{
    const up={
      id:c.id, title:$('#t',dlg).value.trim(), category:$('#cat',dlg).value.trim(),
      level:$('#lvl',dlg).value, rating:Number($('#rate',dlg).value||0),
      price:Number($('#price',dlg).value||0), hours:Number($('#hrs',dlg).value||0),
      description:$('#desc',dlg).value.trim()
    };
    const list=readLS(LS.courses); const i=list.findIndex(x=>x.id===c.id);
    if(i>=0) list[i]=up; else list.push(up);
    writeLS(LS.courses,list); dlg.close(); renderTable(); alert('Saved ✓');
  };
}
function delCourse(id){
  if(!confirm('Delete this course?')) return;
  const list=readLS(LS.courses).filter(x=>x.id!==id); writeLS(LS.courses,list); renderTable();
}
function openManage(){ const d=ensureDialog(); d.showModal(); renderTable(); }
document.addEventListener('DOMContentLoaded',()=>{
  const btn=document.querySelector('#btn-manage'); if(btn) btn.onclick=openManage;
});
