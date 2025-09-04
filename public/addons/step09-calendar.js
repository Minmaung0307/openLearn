(()=> {
  const ID='calendarSec';
  function show(v){ const s=document.getElementById(ID); if (s) s.style.display=v?'':'none'; }
  async function maybe(name){
    if (name!=='calendar'){ show(false); return; }
    window.ensureCalendarUI?.();
    window.wireCalendar?.();
    await window.refreshCalendar?.();
    show(true);
  }
  window.addEventListener('ol:route', e=> maybe(e.detail.name));
  maybe(window.currentRoute||'');
})();