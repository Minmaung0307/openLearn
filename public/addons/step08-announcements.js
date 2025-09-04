(()=> {
  const ID='dashboardSec';
  function show(v){ const s=document.getElementById(ID); if (s) s.style.display=v?'':'none'; }
  async function maybe(name){
    if (name!=='dashboard'){ show(false); return; }
    window.ensureDashboardUI?.();
    window.wireAnnouncements?.();
    await window.refreshAnnouncements?.();
    show(true);
  }
  window.addEventListener('ol:route', e=> maybe(e.detail.name));
  maybe(window.currentRoute||'');
})();