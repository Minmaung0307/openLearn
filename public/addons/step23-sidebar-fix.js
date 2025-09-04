// Sidebar FIX: remove Analytics/Calendar; ensure Dashboard/Admin present and clickable
(() => {
  function sidebar() {
    return document.querySelector('#sidebar, .sidebar, nav.sidebar, aside');
  }
  function sampleClass() {
    const s = document.querySelector('#nav-courses, #sidebar .side-icon, .sidebar .side-icon, .nav-btn, [data-nav="courses"]');
    return s ? s.className : 'side-icon';
  }
  function makeBtn(id, label, icon, hash) {
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement('button');
      el.id = id;
      el.type = 'button';
      el.className = sampleClass();
      if (!el.className.split(' ').includes('side-icon')) el.classList.add('side-icon');
      el.innerHTML = `<span class="ico">${icon}</span><span class="label">${label}</span>`;
    } else {
      // normalize contents/class to align with others
      el.className = sampleClass();
      if (!el.className.split(' ').includes('side-icon')) el.classList.add('side-icon');
      el.innerHTML = `<span class="ico">${icon}</span><span class="label">${label}</span>`;
    }
    el.title = label; el.setAttribute('aria-label', label); el.style.display = ''; el.tabIndex = 0;
    const go = () => (location.hash = hash);
    el.onclick = go;
    el.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } };
    return el;
  }
  function insertAfter(ref, node) {
    if (!ref || !ref.parentNode) { sidebar()?.appendChild(node); return; }
    ref.parentNode.insertBefore(node, ref.nextSibling);
  }
  function removeIf(id) {
    const x = document.getElementById(id);
    if (x) x.remove();
  }

  function run() {
    const side = sidebar(); if (!side) return;

    // 1) REMOVE analytics/calendar buttons if any
    removeIf('nav-analytics');
    removeIf('nav-calendar');

    // 2) ENSURE Dashboard/Admin exist and aligned
    const after = document.getElementById('nav-courses') || side.querySelector('[data-nav="courses"]');

    const dash = makeBtn('nav-dashboard', 'Dashboard', '🏠', '#/dashboard');
    if (!document.getElementById('nav-dashboard')) insertAfter(after, dash);

    const admin = makeBtn('nav-admin', 'Admin', '🛠️', '#/admin');
    if (!document.getElementById('nav-admin')) insertAfter(dash, admin);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();