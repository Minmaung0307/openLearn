(()=> {
  const go = (hash)=>{
    const name = (hash||'').replace(/^#\/?/, '') || 'courses';
    // your app's internal page switcher (existing)
    window.showPage?.(name);
    // tell all addons which page is active
    window.currentRoute = name;
    window.dispatchEvent(new CustomEvent('ol:route', { detail:{ name } }));
  };
  window.addEventListener('hashchange', ()=>go(location.hash));
  if (!location.hash) location.hash = '#/courses'; // loginပြီးတိုင်း Home=Courses
  go(location.hash);

  // sidebar ids → hashes
  const map = {
    'nav-courses':'#/courses',
    'nav-mylearning':'#/mylearning',
    'nav-gradebook':'#/gradebook',
    'nav-dashboard':'#/dashboard',
    'nav-profile':'#/profile',
    'nav-settings':'#/settings',
    'nav-chat':'#/livechat',
    'nav-calendar':'#/calendar',
    'nav-analytics':'#/analytics',
    'nav-admin':'#/admin'
  };
  Object.entries(map).forEach(([id,hash])=>{
    const el=document.getElementById(id); if (!el) return;
    el.addEventListener('click', ()=>location.hash=hash);
  });
})();