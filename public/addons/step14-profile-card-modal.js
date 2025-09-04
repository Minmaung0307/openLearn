// addon 14 placeholder

(()=> {
  // Step14: Profile → Edit modal + View card
  const KEY='ol:profile';
  const $=(s,r=document)=>r.querySelector(s);
  function get(){ try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return{}} }
  function set(v){ localStorage.setItem(KEY, JSON.stringify(v)); }
  function ensureUI(){
    if ($('#profileSec')) return;
    const s=document.createElement('section'); s.id='profileSec';
    s.innerHTML=`
      <div class="row justify-between items-center">
        <h2 class="h2">Profile</h2>
        <button class="btn" id="pfEdit">Edit</button>
      </div>
      <div id="pfView" class="card p-3"></div>

      <div id="pfModal" class="modal" hidden>
        <div class="modal-card" style="max-width:720px;width:70%;">
          <div class="modal-header">
            <strong>Edit Profile</strong>
            <button class="icon-btn" id="pfClose">✕</button>
          </div>
          <div class="modal-body grid gap-3">
            <label class="field"><span>Full name</span><input id="pfName" type="text"/></label>
            <label class="field"><span>Photo URL</span><input id="pfPhoto" type="url"/></label>
            <label class="field"><span>Portfolio (Comma-separated links)</span><input id="pfPortfolio" type="text"/></label>
            <label class="field"><span>Date of Birth</span><input id="pfDob" type="date"/></label>
            <label class="field"><span>Bio</span><textarea id="pfBio" rows="3"></textarea></label>
          </div>
          <div class="modal-footer">
            <div></div><button class="btn btn-primary" id="pfSave">Save</button>
          </div>
        </div>
      </div>`;
    (document.getElementById('main')||document.body).appendChild(s);
  }
  function render(){
    const v=get();
    const host=document.getElementById('pfView'); if(!host) return;
    const links=(v.portfolio||'').split(',').map(x=>x.trim()).filter(Boolean).map(h=>`<a href="${h}" target="_blank">${h}</a>`).join(' • ');
    let birthday='';
    if (v.dob){
      const d=new Date(v.dob); const t=new Date();
      if (d.getMonth()===t.getMonth() && d.getDate()===t.getDate()) birthday='<div class="chip">🎂 Happy Birthday!</div>';
    }
    host.innerHTML=`
      <div class="row gap-3 items-center">
        <img src="${v.photo||'/images/avatar.png'}" alt="" width="72" height="72" style="border-radius:50%">
        <div class="stack">
          <strong>${v.name||'Your Name'}</strong>
          <div class="small muted">${v.bio||''}</div>
          <div class="small">${links||''}</div>
          ${birthday||''}
        </div>
      </div>`;
  }
  function openModal(){
    const v=get(); ['Name','Photo','Portfolio','Dob','Bio'].forEach(k=>{
      const el=document.getElementById('pf'+k); if(!el) return;
      const key=k.toLowerCase(); el.value = v[key]||'';
    });
    document.getElementById('pfModal').hidden=false;
  }
  function closeModal(){ document.getElementById('pfModal').hidden=true; }

  // boot
  ensureUI(); render();
  document.getElementById('pfEdit')?.addEventListener('click', openModal);
  document.getElementById('pfClose')?.addEventListener('click', closeModal);
  document.getElementById('pfSave')?.addEventListener('click', ()=>{
    const v={
      name: document.getElementById('pfName').value.trim(),
      photo: document.getElementById('pfPhoto').value.trim(),
      portfolio: document.getElementById('pfPortfolio').value.trim(),
      dob: document.getElementById('pfDob').value,
      bio: document.getElementById('pfBio').value.trim()
    };
    localStorage.setItem(KEY, JSON.stringify(v)); closeModal(); render();
  });
})();