(() => {
  // ====== Safe helpers ======
  const $ = (sel,root=document)=>root.querySelector(sel);
  const $$ = (sel,root=document)=>Array.from(root.querySelectorAll(sel));
  const esc = (s)=>String(s??'').replace(/[&<>"]/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));

  // detect role (fallback to student)
  function canManage(){
    const r = (window.currentRole||'student').toLowerCase();
    return ['owner','admin','instructor','ta'].includes(r);
  }

  // Firestore availability (silent fallback to local)
  const FIRESTORE_OFF = !!window.FIRESTORE_OFF;
  const db = window.db || null;
  const FS = window.firebaseFirestoreExports || null;
  const EVENTS_USE_FIRESTORE = !FIRESTORE_OFF && !!db && !!FS;
  const ANN_USE_FIRESTORE    = !FIRESTORE_OFF && !!db && !!FS;

  // --------- HTML injectors (non-destructive) ----------
  function ensureCalendarUI(){
    let sec = $('#calendarSec') || (()=> {
      const s = document.createElement('section');
      s.id='calendarSec';
      s.innerHTML = `
        <div class="row items-center justify-between" id="calHeader">
          <h2 class="h2">Calendar</h2>
          <button id="btn-new-event" class="btn btn-primary" style="display:none">+ New Event</button>
        </div>
        <div id="calendar"></div>
        <div id="calendarList" class="stack gap-2 mt-3"></div>

        <div id="eventModal" class="modal" hidden>
          <div class="modal-card" style="max-width:720px;width:70%;">
            <div class="modal-header">
              <h3 id="eventModalTitle">New Event</h3>
              <button class="icon-btn" id="eventModalClose">✕</button>
            </div>
            <div class="modal-body grid gap-3">
              <label class="field"><span>Title</span><input id="evTitle" type="text"/></label>
              <div class="grid grid-cols-2 gap-3">
                <label class="field"><span>Date</span><input id="evDate" type="date"/></label>
                <label class="field"><span>Time</span><input id="evTime" type="time"/></label>
              </div>
              <label class="field"><span>Description</span><textarea id="evDesc" rows="3"></textarea></label>
            </div>
            <div class="modal-footer">
              <div></div>
              <div class="row gap-2">
                <button class="btn" id="eventModalCancel">Close</button>
                <button class="btn btn-primary" id="eventModalSave">Save</button>
              </div>
            </div>
          </div>
        </div>`;
      // place under main content if exists
      (document.getElementById('main') || document.body).appendChild(s);
      return s;
    })();

    // toggle new button by role
    const b = $('#btn-new-event', sec);
    if (b) b.style.display = canManage() ? 'inline-flex' : 'none';
  }

  function ensureDashboardUI(){
    let sec = $('#dashboardSec') || (()=> {
      const s = document.createElement('section');
      s.id='dashboardSec';
      s.innerHTML = `
        <div class="row items-center justify-between">
          <h2 class="h2">Dashboard</h2>
          <button id="btn-add-ann" class="btn btn-primary" style="display:none">+ Add Announcement</button>
        </div>
        <div id="annList" class="stack gap-2 mt-3"></div>

        <div id="annModal" class="modal" hidden>
          <div class="modal-card" style="max-width:680px;width:60%;">
            <div class="modal-header">
              <h3 id="annModalTitle">New Announcement</h3>
              <button class="icon-btn" id="annClose">✕</button>
            </div>
            <div class="modal-body grid gap-3">
              <label class="field"><span>Title</span><input id="annTitle" type="text"/></label>
              <label class="field"><span>Body</span><textarea id="annBody" rows="4"></textarea></label>
            </div>
            <div class="modal-footer">
              <div></div>
              <div class="row gap-2">
                <button class="btn" id="annCancel">Close</button>
                <button class="btn btn-primary" id="annSave">Save</button>
              </div>
            </div>
          </div>
        </div>`;
      (document.getElementById('main') || document.body).appendChild(s);
      return s;
    })();

    const b = $('#btn-add-ann', sec);
    if (b) b.style.display = canManage() ? 'inline-flex' : 'none';
  }

  // ---------- Calendar data layer ----------
  const LS_EVENTS_KEY = 'ol:events';
  const lsEvGet =()=>{ try{return JSON.parse(localStorage.getItem(LS_EVENTS_KEY)||'[]')}catch{return[]} };
  const lsEvSet =(a)=>localStorage.setItem(LS_EVENTS_KEY, JSON.stringify(a));

  async function evFetch(){
    if (EVENTS_USE_FIRESTORE){
      try{
        const { getDocs, collection, query, orderBy } = FS;
        const qs = await getDocs(query(collection(db,'events'), orderBy('date','asc'), orderBy('time','asc')));
        return qs.docs.map(d=>({ id:d.id, ...d.data() }));
      }catch(e){ console.warn('FS events -> local', e); }
    }
    return lsEvGet();
  }
  async function evSave(ev){
    if (EVENTS_USE_FIRESTORE){
      try{
        const { doc, setDoc, addDoc, collection, serverTimestamp } = FS;
        if (ev.id) await setDoc(doc(db,'events',ev.id), { ...ev, ts: serverTimestamp() }, { merge:true });
        else { const ref = await addDoc(collection(db,'events'), { ...ev, ts: serverTimestamp() }); ev.id = ref.id; }
        return ev.id;
      }catch(e){ console.warn('FS events save -> local', e); }
    }
    const arr = lsEvGet();
    if (ev.id){ const i = arr.findIndex(x=>x.id===ev.id); if (i>-1) arr[i]=ev; else arr.push(ev);}
    else { ev.id='ev_'+Date.now(); arr.push(ev); }
    lsEvSet(arr); return ev.id;
  }
  async function evDelete(id){
    if (EVENTS_USE_FIRESTORE){
      try{ const { doc, deleteDoc } = FS; await deleteDoc(doc(db,'events',id)); return; }
      catch(e){ console.warn('FS events del -> local', e); }
    }
    lsEvSet(lsEvGet().filter(x=>x.id!==id));
  }

  // ---------- Announcements data layer ----------
  const LS_ANN_KEY = 'ol:ann';
  const lsAnnGet =()=>{ try{return JSON.parse(localStorage.getItem(LS_ANN_KEY)||'[]')}catch{return[]} };
  const lsAnnSet =(a)=>localStorage.setItem(LS_ANN_KEY, JSON.stringify(a));

  async function annFetch(){
    if (ANN_USE_FIRESTORE){
      try{
        const { getDocs, collection, orderBy, query } = FS;
        const qs = await getDocs(query(collection(db,'announcements'), orderBy('ts','desc')));
        return qs.docs.map(d=>({ id:d.id, ...d.data() }));
      }catch(e){ console.warn('FS ann -> local', e); }
    }
    return lsAnnGet();
  }
  async function annSave(a){
    if (ANN_USE_FIRESTORE){
      try{
        const { doc, setDoc, addDoc, collection, serverTimestamp } = FS;
        if (a.id) await setDoc(doc(db,'announcements',a.id), { ...a, ts: serverTimestamp() }, { merge:true });
        else { const ref = await addDoc(collection(db,'announcements'), { ...a, ts: serverTimestamp() }); a.id = ref.id; }
        return a.id;
      }catch(e){ console.warn('FS ann save -> local', e); }
    }
    const arr = lsAnnGet();
    if (a.id){ const i = arr.findIndex(x=>x.id===a.id); if (i>-1) arr[i]=a; else arr.push(a); }
    else { a.id='ann_'+Date.now(); arr.push(a); }
    lsAnnSet(arr); return a.id;
  }
  async function annDelete(id){
    if (ANN_USE_FIRESTORE){
      try{ const { doc, deleteDoc } = FS; await deleteDoc(doc(db,'announcements',id)); return; }
      catch(e){ console.warn('FS ann del -> local', e); }
    }
    lsAnnSet(lsAnnGet().filter(x=>x.id!==id));
  }

  // ---------- Calendar UI wiring ----------
  let evEditingId = null;
  async function refreshCalendar(){
    const list = await evFetch();
    const wrap = $('#calendarList'); if (!wrap) return;
    if (!list.length){ wrap.innerHTML = `<div class="muted">No events yet</div>`; return; }
    const can = canManage();
    wrap.innerHTML = list.map(ev=>`
      <div class="card p-3 row justify-between items-start">
        <div class="stack">
          <div class="row items-center gap-2">
            <strong>${esc(ev.title)}</strong>
            <span class="chip">${esc(ev.date)}${ev.time?(' '+esc(ev.time)) : ''}</span>
          </div>
          <div class="small muted">${esc(ev.desc||'')}</div>
        </div>
        <div class="row gap-2" style="${can?'':'display:none;'}">
          <button class="icon-btn" data-ev-ed="${ev.id}" title="Edit">✎</button>
          <button class="icon-btn" data-ev-del="${ev.id}" title="Delete">🗑</button>
        </div>
      </div>
    `).join('');

    $$('#calendarList [data-ev-ed]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const id = btn.getAttribute('data-ev-ed');
        const all = lsEvGet(); const ev = all.find(x=>x.id===id);
        openEventModal(ev || {id});
      });
    });
    $$('#calendarList [data-ev-del]').forEach(btn=>{
      btn.addEventListener('click', async ()=>{
        const id = btn.getAttribute('data-ev-del');
        if (!confirm('Delete this event?')) return;
        await evDelete(id); await refreshCalendar();
      });
    });
  }

  function openEventModal(ev){
    evEditingId = ev?.id || null;
    $('#eventModalTitle').textContent = evEditingId ? 'Edit Event' : 'New Event';
    $('#evTitle').value = ev?.title || '';
    $('#evDate').value  = ev?.date  || '';
    $('#evTime').value  = ev?.time  || '';
    $('#evDesc').value  = ev?.desc  || '';
    $('#eventModal').hidden = false;
  }
  function closeEventModal(){ $('#eventModal').hidden = true; evEditingId=null; }

  function wireCalendar(){
    const btnNew = $('#btn-new-event');
    if (btnNew) {
      btnNew.style.display = canManage() ? 'inline-flex' : 'none';
      btnNew.addEventListener('click', ()=>openEventModal(null));
    }
    $('#eventModalClose')?.addEventListener('click', closeEventModal);
    $('#eventModalCancel')?.addEventListener('click', closeEventModal);
    $('#eventModalSave')?.addEventListener('click', async ()=>{
      const payload = {
        id: evEditingId || undefined,
        title: $('#evTitle').value.trim(),
        date: $('#evDate').value,
        time: $('#evTime').value,
        desc: $('#evDesc').value.trim()
      };
      if (!payload.title || !payload.date){ alert('Title & Date required'); return; }
      await evSave(payload); closeEventModal(); await refreshCalendar();
    });
  }

  // ---------- Announcements UI wiring ----------
  let annEditingId = null;
  async function refreshAnnouncements(){
    const list = await annFetch();
    const host = $('#annList'); if (!host) return;
    if (!list.length){ host.innerHTML = `<div class="muted">No announcement yet</div>`; return; }
    const can = canManage();
    host.innerHTML = list.map(a=>`
      <div class="card p-3 stack gap-1">
        <div class="row justify-between items-center">
          <strong>${esc(a.title)}</strong>
          <span class="row gap-1" style="${can?'':'display:none;'}">
            <button class="icon-btn" data-ann-ed="${a.id}" title="Edit">✎</button>
            <button class="icon-btn" data-ann-del="${a.id}" title="Delete">🗑</button>
          </span>
        </div>
        <div>${esc(a.body)}</div>
      </div>
    `).join('');

    $$('#annList [data-ann-ed]').forEach(b=>{
      b.addEventListener('click', ()=>{
        const id = b.getAttribute('data-ann-ed');
        const a = lsAnnGet().find(x=>x.id===id);
        openAnnModal(a || {id});
      });
    });
    $$('#annList [data-ann-del]').forEach(b=>{
      b.addEventListener('click', async ()=>{
        const id = b.getAttribute('data-ann-del');
        if (!confirm('Delete this announcement?')) return;
        await annDelete(id); await refreshAnnouncements();
      });
    });
  }

  function openAnnModal(a){
    annEditingId = a?.id || null;
    $('#annModalTitle').textContent = annEditingId ? 'Edit Announcement' : 'New Announcement';
    $('#annTitle').value = a?.title || '';
    $('#annBody').value  = a?.body || '';
    $('#annModal').hidden = false;
  }
  function closeAnnModal(){ $('#annModal').hidden = true; annEditingId=null; }

  function wireAnnouncements(){
    const btn = $('#btn-add-ann');
    if (btn){
      btn.style.display = canManage() ? 'inline-flex' : 'none';
      btn.addEventListener('click', ()=>openAnnModal(null));
    }
    $('#annClose')?.addEventListener('click', closeAnnModal);
    $('#annCancel')?.addEventListener('click', closeAnnModal);
    $('#annSave')?.addEventListener('click', async ()=>{
      const payload = { id: annEditingId || undefined, title: $('#annTitle').value.trim(), body: $('#annBody').value.trim() };
      if (!payload.title || !payload.body){ alert('Fill title & body'); return; }
      await annSave(payload); closeAnnModal(); await refreshAnnouncements();
    });
  }

  // expose for other scripts
  window.refreshCalendar = refreshCalendar;
  window.refreshAnnouncements = refreshAnnouncements;

  // --------- Boot ---------
  function boot(){
    ensureCalendarUI();
    ensureDashboardUI();

    wireCalendar();
    wireAnnouncements();

    // initial drawings (won't break layout)
    refreshCalendar();
    refreshAnnouncements();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else { boot(); }
})();