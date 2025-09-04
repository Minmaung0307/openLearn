(()=> {
  const ID='dashboardSec';
  window.ensureDashboardUI = function(){
    if (document.getElementById(ID)) return;
    const s=document.createElement('section'); s.id=ID; s.style.display='none';
    s.innerHTML = `
      <div class="row items-center justify-between">
        <h2 class="h2">Announcements</h2>
        <button id="btnAddAnnouncement" class="btn">Add Announcement</button>
      </div>
      <div id="annForm" class="card p-3" style="display:none">
        <input id="annTitle" class="field" placeholder="Title">
        <textarea id="annBody" class="field" placeholder="Body"></textarea>
        <div class="row gap-2 mt-2">
          <button id="annSave" class="btn btn-primary">Save</button>
          <button id="annCancel" class="btn">Cancel</button>
        </div>
      </div>
      <div id="annList" class="stack"></div>`;
    (document.getElementById('main')||document.body).appendChild(s);
  };

  function renderList(){
    const list = JSON.parse(localStorage.getItem('ol:ann')||'[]');
    const host = document.getElementById('annList');
    if (!host) return;
    if (!list.length){ host.innerHTML='<div class="muted">No announcement yet</div>'; return; }
    host.innerHTML = list.map(a=>`
      <div class="card p-3 row justify-between">
        <div class="stack">
          <strong>${a.title}</strong>
          <div class="muted small">${new Date(a.ts).toLocaleString()}</div>
          <p>${(a.body||'').replace(/</g,'&lt;')}</p>
        </div>
        ${ (window.isStaff?.() ? `
        <div class="row gap-2">
          <button class="btn" data-ann-edit="${a.id}">Edit</button>
          <button class="btn" data-ann-del="${a.id}">Delete</button>
        </div>` : '')
        }
      </div>`).join('');
  }
  window.refreshAnnouncements = renderList;

  window.wireAnnouncements = function(){
    const btn = document.getElementById('btnAddAnnouncement');
    const form = document.getElementById('annForm');
    const sv = document.getElementById('annSave');
    const cc = document.getElementById('annCancel');
    const t  = document.getElementById('annTitle');
    const b  = document.getElementById('annBody');

    if (btn){
      btn.onclick = ()=>{
        if (!window.isStaff?.()) { alert('Staff only'); return; }
        form.style.display=''; t.value=''; b.value='';
      };
    }
    if (cc) cc.onclick = ()=> form.style.display='none';
    if (sv) sv.onclick = ()=>{
      const ok = window.tryCreateAnnouncement?.({ title: (t.value||'').trim(), body: (b.value||'').trim() });
      if (ok){ form.style.display='none'; renderList(); }
    };

    document.getElementById('annList')?.addEventListener('click', (e)=>{
      const del = e.target.closest('[data-ann-del]');
      const edt = e.target.closest('[data-ann-edit]');
      if (del){
        if (!window.isStaff?.()) return alert('Staff only');
        const id = +del.getAttribute('data-ann-del');
        const k='ol:ann'; const list=JSON.parse(localStorage.getItem(k)||'[]');
        const after = list.filter(x=>x.id!==id);
        localStorage.setItem(k, JSON.stringify(after));
        renderList();
      }
      if (edt){
        if (!window.isStaff?.()) return alert('Staff only');
        const id = +edt.getAttribute('data-ann-edit');
        const k='ol:ann'; const list=JSON.parse(localStorage.getItem(k)||'[]');
        const item = list.find(x=>x.id===id); if (!item) return;
        const title = prompt('Title', item.title||''); if (title==null) return;
        const body  = prompt('Body',  item.body||'');  if (body==null)  return;
        item.title = title; item.body = body;
        localStorage.setItem(k, JSON.stringify(list));
        renderList();
      }
    });
  };

  function show(v){ const s=document.getElementById(ID); if(s) s.style.display=v?'':'none'; }
  async function maybe(name){
    if (name!=='dashboard'){ show(false); return; }
    window.ensureDashboardUI?.();
    window.wireAnnouncements?.();
    window.refreshAnnouncements?.();
    const addBtn=document.getElementById('btnAddAnnouncement');
    if (addBtn) addBtn.style.display = (window.isStaff?.() ? '' : 'none');
    show(true);
  }
  window.addEventListener('ol:route', e=> maybe(e.detail.name));
  window.addEventListener('ol:login', ()=> maybe('dashboard'));
  if (document.readyState==='complete') maybe(window.currentRoute||''); else document.addEventListener('DOMContentLoaded', ()=> maybe(window.currentRoute||''));
})();