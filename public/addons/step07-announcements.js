
function mount(){
  const host=document.querySelector('#page-admin'); if(!host) return;
  if(document.getElementById('adm-anno')) return;
  const box=document.createElement('section'); box.id='adm-anno'; box.className='ol-panel';
  box.innerHTML = `<div class="ol-row"><b>Announcements</b><div class="ol-grow"></div>
    <button class="btn small" id="new">+ New</button></div><div id="list"></div>`;
  host.appendChild(box);
  const render=()=>{
    const arr=JSON.parse(localStorage.getItem('ol:posts')||'[]');
    box.querySelector('#list').innerHTML = arr.map((p,i)=>`<div class="card ol-row"><div class="ol-grow">${p.t}</div>
      <button class="btn small" data-del="${i}">Delete</button></div>`).join('') || '<div class="ol-badge">None</div>';
    box.querySelectorAll('[data-del]').forEach(b=> b.onclick=()=>{const a=JSON.parse(localStorage.getItem('ol:posts')||'[]'); a.splice(Number(b.dataset.del),1); localStorage.setItem('ol:posts',JSON.stringify(a)); render();});
  };
  box.querySelector('#new').onclick=()=>{const t=prompt('New announcement'); if(!t) return; const a=JSON.parse(localStorage.getItem('ol:posts')||'[]'); a.unshift({t,at:Date.now()}); localStorage.setItem('ol:posts',JSON.stringify(a)); render();};
  render();
}
document.addEventListener('DOMContentLoaded', mount);
