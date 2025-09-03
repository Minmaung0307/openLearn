
const hostSel = '#page-mylearning';
function mount(){
  const host=document.querySelector(hostSel); if(!host) return;
  if(document.getElementById('stu-dash')) return;
  const box=document.createElement('section'); box.id='stu-dash'; box.className='ol-panel';
  box.innerHTML = `<div class="ol-row"><b>Student Dashboard</b><div class="ol-grow"></div>
    <button class="btn small" id="mk-post">+ Announcement</button></div>
    <div id="posts"></div>`;
  host.prepend(box);
  render();
  box.querySelector('#mk-post').onclick=()=>{
    const t=prompt('Announcement?'); if(!t) return;
    const list=JSON.parse(localStorage.getItem('ol:posts')||'[]'); list.unshift({t,at:Date.now()}); localStorage.setItem('ol:posts',JSON.stringify(list)); render();
  };
}
function render(){
  const posts=JSON.parse(localStorage.getItem('ol:posts')||'[]');
  const el=document.querySelector('#posts'); if(!el) return;
  el.innerHTML = posts.map(p=>`<div class="card"><div>${p.t}</div><div class="ol-badge">${new Date(p.at).toLocaleString()}</div></div>`).join('') || '<div class="ol-badge">No announcements yet.</div>';
}
document.addEventListener('DOMContentLoaded', mount);
