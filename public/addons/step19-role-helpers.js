// public/addons/step19-role-helpers.js
(()=> {
  // 1) isStaff(): BOOTSTRAP_ADMINS → local user → Firestore mirrored role → window.currentRole
  window.isStaff = function(){
    const email = (window.auth?.currentUser?.email)
               || (JSON.parse(localStorage.getItem('ol:fakeUser')||'{}').email);
    if (!email) return false;

    // Dev/local bootstrap admins
    if ((window.BOOTSTRAP_ADMINS||[]).includes(email)) return true;

    // If you mirror user doc into localStorage like 'ol:user:<email>' = { role: 'admin', ... }
    const u = JSON.parse(localStorage.getItem('ol:user:'+email) || 'null');
    if (u?.role && ['owner','admin','instructor','ta'].includes(u.role)) return true;

    // Fallback to window.currentRole (if your auth bootstrap set this already)
    if (['owner','admin','instructor','ta'].includes(window.currentRole)) return true;

    return false;
  };

  // 2) Announcement create shortcut (localStorage fallback demo)
  //   - Dashboard UI ထဲ Add ဒေါင်ခလုတ်မှ this function ကိုခေါ်သုံးနိုင်
  window.tryCreateAnnouncement = function(data){
    if (!window.isStaff()) { alert('Staff only'); return false; }
    const k='ol:ann';
    const list=JSON.parse(localStorage.getItem(k)||'[]');
    list.unshift({ id: Date.now(), title: data.title||'Untitled', body: data.body||'', ts: Date.now() });
    localStorage.setItem(k, JSON.stringify(list));
    window.refreshAnnouncements?.(); // step08 addon မှာ ရှိတဲ့ renderer ကိုခေါ်
    return true;
  };

  // 3) Route gating guard (optional): dashboard route တော့မှ Add UI ခလုတ် ပြ
  function guardDashboardButtons(){
    const addBtn = document.getElementById('btnAddAnnouncement');
    if (!addBtn) return;
    addBtn.style.display = window.isStaff() ? '' : 'none';
  }

  function updateSidebarByRole(){
  const show = (sel, on)=>{ const el=document.querySelector(sel); if(el) el.style.display = on? '': 'none'; };
  const staff = window.isStaff?.() === true;
  // Admin-only menus (ตัวอย่าง)
  show('#nav-admin', staff);
  show('#nav-analytics', staff);  // Analytics ကို staff-only လုပ်ချင်တဲ့အခါ
}
// boot
window.addEventListener('ol:login', updateSidebarByRole);
window.addEventListener('ol:route',  updateSidebarByRole);
document.addEventListener('DOMContentLoaded', updateSidebarByRole);

  // route ပြောင်းတိုင်း guard
  // window.addEventListener('ol:route', e=>{
  //   if (e.detail?.name === 'dashboard') guardDashboardButtons();
  // });
  // login ပြီး guard
  // window.addEventListener('ol:login', guardDashboardButtons);
  // initial
  // if (document.readyState==='complete') guardDashboardButtons();
  // else window.addEventListener('DOMContentLoaded', guardDashboardButtons);
})();