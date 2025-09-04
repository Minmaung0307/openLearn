// Inject Analytics & Calendar buttons into sidebar if missing (icon-only safe)
(()=>{
  function ensureBtn(id, label, icon, hash){
    if (document.getElementById(id)) return;
    const side = document.querySelector('#sidebar, .sidebar, nav.sidebar, aside');
    if (!side) return;
    const btn = document.createElement('button');
    btn.id = id;
    btn.className = 'side-icon';
    btn.title = label; btn.setAttribute('aria-label', label);
    btn.innerHTML = `<span class="ico">${icon}</span><span class="label">${label}</span>`;
    btn.addEventListener('click', ()=> location.hash = hash);
    side.appendChild(btn);
  }
  const run = ()=>{
    ensureBtn('nav-analytics','Analytics','📊', '#/analytics');
    ensureBtn('nav-calendar', 'Calendar',  '📅', '#/calendar');
  };
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', run); else run();
})();