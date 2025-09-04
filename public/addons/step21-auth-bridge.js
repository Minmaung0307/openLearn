(()=> {
  // Firebase auth state → role fallback
  function onReady(){
    if (!window.auth || !window.onAuthStateChanged) {
      // local mode fallback: localStorage override
      const force = localStorage.getItem('ol:forceRole');
      if (force) window.currentRole = force;
      return;
    }
    window.onAuthStateChanged(window.auth, (user)=>{
      const email = user?.email || null;
      // BOOTSTRAP_ADMINS များကို admin အဖြစ် သတ်မှတ် fallback
      if (email && (window.BOOTSTRAP_ADMINS||[]).includes(email)) {
        window.currentRole = 'admin';
      }
      window.dispatchEvent(new CustomEvent('ol:login', { detail:{ email, role: window.currentRole||'student' } }));
    });
  }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', onReady);
  else onReady();
})();