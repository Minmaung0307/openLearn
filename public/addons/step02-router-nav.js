// addon 02 placeholder

(()=> {
  // Step02: Lightweight client router glue → call existing showPage(name)
  const $= (s,r=document)=>r.querySelector(s);
  function go(hash){
    const name = (hash||'').replace(/^#\/?/,'') || 'courses';
    window.showPage?.(name);
  }
  window.addEventListener('hashchange', ()=>go(location.hash));
  // initial
  if (!location.hash) location.hash = '#/courses';
  go(location.hash);

  // wire sidebar buttons if present
  const map = {
    'nav-courses':'#/courses','nav-mylearning':'#/mylearning','nav-gradebook':'#/gradebook',
    'nav-dashboard':'#/dashboard','nav-profile':'#/profile','nav-settings':'#/settings','nav-chat':'#/livechat','nav-calendar':'#/calendar','nav-admin':'#/admin'
  };
  Object.entries(map).forEach(([id,hash])=>{
    const el = document.getElementById(id); if (!el) return;
    el.addEventListener('click', ()=>location.hash=hash);
  });
})();