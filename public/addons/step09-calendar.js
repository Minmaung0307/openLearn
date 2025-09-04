(()=> {
  const MOUNT_ID = 'calendarSec';
  function show(v){
    const sec=document.getElementById(MOUNT_ID);
    if (sec) sec.style.display = v ? '' : 'none';
  }
  async function maybeMount(name){
    if (name!=='calendar') { show(false); return; }
    // inject UI once (step18 addon already created if missing)
    window.ensureCalendarUI?.();
    window.wireCalendar?.();
    await window.refreshCalendar?.();
    show(true);
  }
  window.addEventListener('ol:route', e=> maybeMount(e.detail.name));
  // initial
  maybeMount(window.currentRoute||'');
})();