(()=> {
  // Dev/local bootstrap admins (global may already exist)
  window.BOOTSTRAP_ADMINS = window.BOOTSTRAP_ADMINS || ["admin@openlearn.local"];

  window.isStaff = function(){
    try {
      const email = (window.auth?.currentUser?.email)
                 || (JSON.parse(localStorage.getItem('ol:fakeUser')||'{}').email);
      if (!email) return false;
      if ((window.BOOTSTRAP_ADMINS||[]).includes(email)) return true;
      const u = JSON.parse(localStorage.getItem('ol:user:'+email) || 'null');
      if (u?.role && ['owner','admin','instructor','ta'].includes(u.role)) return true;
      if (['owner','admin','instructor','ta'].includes(window.currentRole)) return true;
      return false;
    } catch { return false; }
  };

  // Local fallback announcements creator
  window.tryCreateAnnouncement = function(data){
    if (!window.isStaff()) { alert('Staff only'); return false; }
    const k='ol:ann';
    const list=JSON.parse(localStorage.getItem(k)||'[]');
    list.unshift({ id: Date.now(), title: data.title||'Untitled', body: data.body||'', ts: Date.now() });
    localStorage.setItem(k, JSON.stringify(list));
    window.refreshAnnouncements?.();
    return true;
  };

  // Sidebar visibility control (set true for everyone; change to window.isStaff() to restrict)
  function guardSidebar(){
    const show = (sel,on)=>{ const el=document.querySelector(sel); if (el) el.style.display = on?'':'none'; };
    show('#nav-analytics', true);
    show('#nav-calendar',  true);
  }
  window.addEventListener('ol:login', guardSidebar);
  window.addEventListener('ol:route',  guardSidebar);
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', guardSidebar); else guardSidebar();
})();