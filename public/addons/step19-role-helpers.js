(()=> {
  // Admin bootstrap (လက်ရှိထည့်ပြီးသားတွေချန်)
  window.BOOTSTRAP_ADMINS = window.BOOTSTRAP_ADMINS || ["admin@openlearn.local"];

  // True for owner/admin only (Announcements = Admin only)
  window.isAdmin = function(){
    try {
      const email = (window.auth?.currentUser?.email)
                 || (JSON.parse(localStorage.getItem('ol:fakeUser')||'{}').email);
      if (!email) return false;
      if ((window.BOOTSTRAP_ADMINS||[]).includes(email)) return true;

      const u = JSON.parse(localStorage.getItem('ol:user:'+email) || 'null');
      if (u?.role && ['owner','admin'].includes(u.role)) return true;
      if (['owner','admin'].includes(window.currentRole)) return true;
      const force = localStorage.getItem('ol:forceRole');
      if (['owner','admin'].includes(force)) return true;
      return false;
    } catch { return false; }
  };

  // Announcements storage helpers (local fallback)
  const ANN_KEY = 'ol:ann';
  window.annStorage = {
    list(){ return JSON.parse(localStorage.getItem(ANN_KEY)||'[]'); },
    save(list){ localStorage.setItem(ANN_KEY, JSON.stringify(list)); },
    add(item){
      const list = this.list();
      list.unshift({ id: Date.now(), title:item.title||'Untitled', body:item.body||'', ts: Date.now() });
      this.save(list);
      return list[0];
    },
    update(id, patch){
      const list = this.list();
      const a = list.find(x=>x.id===id); if (!a) return false;
      Object.assign(a, patch);
      this.save(list); return true;
    },
    remove(id){
      const list = this.list().filter(x=>x.id!==id);
      this.save(list); return true;
    }
  };

  // Finals storage (icon badge အတွက်)
  const FIN_KEY = 'ol:finals';
  window.finalStorage = {
    list(){ return JSON.parse(localStorage.getItem(FIN_KEY)||'[]'); },
    save(list){ localStorage.setItem(FIN_KEY, JSON.stringify(list)); },
    add(item){
      const list = this.list();
      list.unshift({ id: Date.now(), courseId:item.courseId||'', title:item.title||'Final Exam', dueTs:item.dueTs||Date.now() });
      this.save(list); return list[0];
    },
    remove(id){ this.save(this.list().filter(x=>x.id!==id)); }
  };

  // Bridge auth → role (admin fallback)
  function bridge(){
    if (window.onAuthStateChanged && window.auth){
      window.onAuthStateChanged(window.auth, (user)=>{
        const email=user?.email||null;
        if (email && (window.BOOTSTRAP_ADMINS||[]).includes(email)) window.currentRole='admin';
        window.dispatchEvent(new CustomEvent('ol:login', { detail:{ email, role: window.currentRole||'student' }}));
      });
    } else {
      const force = localStorage.getItem('ol:forceRole');
      if (force) window.currentRole=force;
    }
  }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', bridge); else bridge();
})();