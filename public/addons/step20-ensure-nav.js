// Inject Analytics & Calendar buttons into sidebar if missing (icon-only safe)
(()=>{
  function copyClassFromExisting() {
    // သင့်အပေါ်က menu button တစ်ခုပေါ်က className ကိုမိတ္တူကူး
    const sample = document.querySelector(
      '#nav-courses, .nav-btn, .side-icon, [data-nav="courses"]'
    );
    return sample ? sample.className : 'side-icon';
  }

  function ensureBtn(id, label, icon, hash){
    if (document.getElementById(id)) return;

    const side = document.querySelector('#sidebar, .sidebar, nav.sidebar, aside');
    if (!side) return;

    const btn = document.createElement('button');
    btn.id = id;
    btn.type = 'button';  // form submit မဖြစ်ပေမယ့် သေချာတင်
    btn.className = copyClassFromExisting();   // ဗဟို menu class နဲ့ပေါင်းညီ
    if (!btn.className.split(' ').includes('side-icon')) {
      btn.classList.add('side-icon');         // fallback: side-icon class ထည့်
    }

    btn.title = label;
    btn.setAttribute('aria-label', label);
    btn.setAttribute('tabindex', '0');
    btn.innerHTML = `<span class="ico">${icon}</span><span class="label">${label}</span>`;

    // click + keyboard
    const navigate = ()=> (location.hash = hash);
    btn.addEventListener('click', navigate);
    btn.addEventListener('keydown', (e)=>{
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(); }
    });

    side.appendChild(btn);
  }

  const run = ()=>{
    ensureBtn('nav-analytics','Analytics','📊', '#/analytics');
    ensureBtn('nav-calendar', 'Calendar',  '📅', '#/calendar');
  };

  if (document.readyState==='loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();