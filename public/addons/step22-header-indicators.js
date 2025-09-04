(()=> {
  function host(){
    // Logout button နားကို စိုက်ထည့်မယ် — သင့် header structure အရ selector ပြန်ညှိနိုင်
    return document.getElementById('topbar')
        || document.querySelector('.topbar,.header,.appbar')
        || document.body;
  }

  function ensureShell(){
    if (document.getElementById('olHeadIndicators')) return;
    const box=document.createElement('div');
    box.id='olHeadIndicators';
    box.style.display='flex';
    box.style.alignItems='center';
    box.style.gap='10px';
    box.style.marginLeft='auto';  // right side
    // Logout (သင့် App မှာရှိပြီးသား button နဲ့တစ်ပြိုင်နက်တင်လိုပါက selector ပြန်ချိန်)
    const logout = document.getElementById('btnLogout') || document.querySelector('.logout');
    if (logout && logout.parentNode) logout.parentNode.insertBefore(box, logout);
    else host().appendChild(box);

    box.innerHTML = `
      <button id="olAnnIcon" class="icon-btn" title="Announcements" aria-label="Announcements">🔔<span id="olAnnBadge" class="ol-badge"></span></button>
      <button id="olFinalIcon" class="icon-btn" title="Final Exams" aria-label="Final Exams">🎓<span id="olFinalBadge" class="ol-badge"></span></button>
      <!-- keep logout at the end (already in DOM) -->
    `;

    // Modals
    if (!document.getElementById('olAnnModal')){
      const m=document.createElement('div');
      m.id='olAnnModal'; m.hidden=true;
      m.innerHTML=`
        <div class="modal-card" style="max-width:900px;width:70%;max-height:80vh;overflow:auto">
          <div class="modal-header"><h3>Announcements</h3><button class="icon-btn" data-close="olAnnModal">✕</button></div>
          <div class="modal-body" id="olAnnBody"></div>
        </div>`;
      m.className='modal';
      document.body.appendChild(m);
    }
    if (!document.getElementById('olFinalModal')){
      const m=document.createElement('div');
      m.id='olFinalModal'; m.hidden=true;
      m.innerHTML=`
        <div class="modal-card" style="max-width:900px;width:70%;max-height:80vh;overflow:auto">
          <div class="modal-header"><h3>Final Exams</h3><button class="icon-btn" data-close="olFinalModal">✕</button></div>
          <div class="modal-body" id="olFinalBody"></div>
        </div>`;
      m.className='modal';
      document.body.appendChild(m);
    }

    document.addEventListener('click',(e)=>{
      const c=e.target.closest('[data-close]');
      if (c){ document.getElementById(c.getAttribute('data-close')).hidden=true; }
      if (e.target.closest('#olAnnIcon')) openAnn();
      if (e.target.closest('#olFinalIcon')) openFinals();
    });
  }

  function badge(elId, n){
    const el=document.getElementById(elId);
    if (el) el.textContent = n>0 ? String(n) : '';
  }

  function openAnn(){
    const body=document.getElementById('olAnnBody'); if (!body) return;
    const list=window.annStorage?.list() || [];
    body.innerHTML = list.length ? list.map(a=>`
      <div class="card p-2" style="margin:.5rem 0">
        <strong>${a.title}</strong>
        <div class="small muted">${new Date(a.ts).toLocaleString()}</div>
        <div>${(a.body||'').replace(/</g,'&lt;')}</div>
      </div>`).join('') : '<div class="muted">No announcement</div>';
    document.getElementById('olAnnModal').hidden=false;
  }

  function openFinals(){
    const body=document.getElementById('olFinalBody'); if (!body) return;
    const list=window.finalStorage?.list() || [];
    body.innerHTML = list.length ? list.map(f=>`
      <div class="card p-2" style="margin:.5rem 0">
        <strong>${f.title}</strong>
        <div class="small muted">Due: ${new Date(f.dueTs).toLocaleString()}</div>
        <div class="small muted">Course: ${f.courseId||'-'}</div>
      </div>`).join('') : '<div class="muted">No finals</div>';
    document.getElementById('olFinalModal').hidden=false;
  }

  // Public: Update indicators (Announcements list / Finals list count)
  window.updateHeaderIndicators = function(){
    ensureShell();
    const a = (window.annStorage?.list()||[]).length;
    const f = (window.finalStorage?.list()||[]).length;
    badge('olAnnBadge', a);
    badge('olFinalBadge', f);
  };

  // Initial
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', ()=>{ ensureShell(); window.updateHeaderIndicators(); });
  else { ensureShell(); window.updateHeaderIndicators(); }
})();