// Inject Analytics & Calendar buttons neatly into the existing sidebar
(()=>{
  function copyClassFromExisting() {
    // မင်းရဲ့ရှိပြီးသား nav button class ကို ကူးယူ (အော်ဒါ/အရွယ်အစားညီ)
    const sample = document.querySelector(
      '#nav-courses, #sidebar .side-icon, .sidebar .side-icon, .nav-btn, [data-nav="courses"]'
    );
    return sample ? sample.className : 'side-icon';
  }

  function insertAfter(ref, node) {
    if (!ref || !ref.parentNode) return (ref?.parentNode||document.querySelector('#sidebar,.sidebar,nav.sidebar,aside'))?.appendChild(node);
    ref.parentNode.insertBefore(node, ref.nextSibling);
  }

  function ensureBtn(id, label, icon, hash){
    if (document.getElementById(id)) return;

    const side = document.querySelector('#sidebar, .sidebar, nav.sidebar, aside');
    if (!side) return;

    const btn = document.createElement('button');
    btn.id = id;
    btn.type = 'button';
    btn.className = copyClassFromExisting();
    if (!btn.className.split(' ').includes('side-icon')) btn.classList.add('side-icon');
    btn.title = label; btn.setAttribute('aria-label', label);
    btn.innerHTML = `<span class="ico">${icon}</span><span class="label">${label}</span>`;

    const navigate = ()=> (location.hash = hash);
    btn.addEventListener('click', navigate);
    btn.addEventListener('keydown', (e)=>{
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(); }
    });

    // courses button ရှိလျှင် သူနောက်တန်းကို တည့်ထည့် → footer အောက်မတင်အောင်
    const coursesBtn = document.getElementById('nav-courses') 
                     || side.querySelector('[data-nav="courses"]');
    if (coursesBtn) insertAfter(coursesBtn, btn);
    else side.appendChild(btn);
  }

  const run = ()=>{
    ensureBtn('nav-analytics','Analytics','📊', '#/analytics');
    ensureBtn('nav-calendar', 'Calendar',  '📅', '#/calendar');
  };

  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();