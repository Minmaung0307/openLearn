(()=> {
  const ID='dashboardAnnouncements';
  function host(){ return document.getElementById('main') || document.querySelector('main') || document.body; }

  window.ensureDashboardAnnouncements = function(){
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
    host().appendChild(s);
  };

  function renderList(){
    const list = window.annStorage?.list() || [];
    const host = document.getElementById('annList'); if (!host) return;
    if (!list.length){ host.innerHTML='<div class="muted">No announcement yet</div>'; }
    else {
      host.innerHTML = list.map(a=>`
        <div class="card p-3 row justify-between">
          <div class="stack">
            <strong>${a.title}</strong>
            <div class="muted small">${new Date(a.ts).toLocaleString()}</div>
            <p>${(a.body||'').replace(/</g,'&lt;')}</p>
          </div>
          ${ (window.isAdmin?.() ? `
          <div class="row gap-2">
            <button class="btn" data-ann-edit="${a.id}">Edit</button>
            <button class="btn" data-ann-del="${a.id}">Delete</button>
          </div>` : '') }
        </div>`).join('');
    }
    window.updateHeaderIndicators?.(); // header badges refresh
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
        if (!window.isAdmin?.()) { alert('Admin only'); return; }
        form.style.display=''; t.value=''; b.value='';
      };
    }
    if (cc) cc.onclick = ()=> form.style.display='none';
    if (sv) sv.onclick = ()=>{
      if (!window.isAdmin?.()) return alert('Admin only');
      if (!t.value.trim()) return alert('Title required');
      window.annStorage?.add({ title: t.value.trim(), body: b.value.trim() });
      form.style.display='none'; renderList();
    };

    document.getElementById('annList')?.addEventListener('click', (e)=>{
      const del = e.target.closest('[data-ann-del]');
      const edt = e.target.closest('[data-ann-edit]');
      if (del){
        if (!window.isAdmin?.()) return alert('Admin only');
        const id = +del.getAttribute('data-ann-del');
        window.annStorage?.remove(id); renderList();
      }
      if (edt){
        if (!window.isAdmin?.()) return alert('Admin only');
        const id = +edt.getAttribute('data-ann-edit');
        const cur = window.annStorage?.list().find(x=>x.id===id); if(!cur) return;
        const title = prompt('Title', cur.title||''); if (title==null) return;
        const body  = prompt('Body',  cur.body ||''); if (body==null)  return;
        window.annStorage?.update(id, { title, body }); renderList();
      }
    });
  };

  function show(v){ const s=document.getElementById(ID); if(s) s.style.display=v?'':'none'; }
  function maybe(name){
    if (name!=='dashboard'){ show(false); return; }
    window.ensureDashboardAnnouncements?.();
    window.wireAnnouncements?.();
    window.refreshAnnouncements?.();
    const addBtn=document.getElementById('btnAddAnnouncement');
    if (addBtn) addBtn.style.display = (window.isAdmin?.() ? '' : 'none');
    show(true);
  }

  window.addEventListener('ol:route', e=> maybe(e.detail.name));
  window.addEventListener('ol:login', ()=> maybe('dashboard'));
  if (document.readyState==='complete') maybe((window.currentRoute||'').replace(/^#\/?/,''));
  else document.addEventListener('DOMContentLoaded', ()=> maybe((window.currentRoute||'').replace(/^#\/?/,'')));
})();