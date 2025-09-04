(()=> {
  const ID='calendarSec';
  window.ensureCalendarUI = function(){
    if (document.getElementById(ID)) return;
    const s=document.createElement('section'); s.id=ID; s.style.display='none';
    s.innerHTML = `
      <div class="row items-center justify-between">
        <h2 class="h2">Calendar</h2>
      </div>
      <div id="calBoard" class="card p-3">No events yet</div>`;
    (document.getElementById('main')||document.body).appendChild(s);
  };
  window.refreshCalendar = function(){
    const host = document.getElementById('calBoard'); if (!host) return;
    const list = JSON.parse(localStorage.getItem('ol:calendar')||'[]');
    host.innerHTML = list.length ? list.map(e=>`<div>• ${e.title} — ${new Date(e.ts).toLocaleString()}</div>`).join('')
                                 : 'No events yet';
  };
  window.wireCalendar = function(){ /* keep your real handlers elsewhere */ };

  function show(v){ const s=document.getElementById(ID); if(s) s.style.display=v?'':'none'; }
  async function maybe(name){
    if (name!=='calendar'){ show(false); return; }
    window.ensureCalendarUI?.();
    window.refreshCalendar?.();
    show(true);
  }
  window.addEventListener('ol:route', e=> maybe(e.detail.name));
  if (document.readyState==='complete') maybe(window.currentRoute||''); else document.addEventListener('DOMContentLoaded', ()=> maybe(window.currentRoute||''));
})();