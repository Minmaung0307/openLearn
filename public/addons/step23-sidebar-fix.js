// step23-sidebar-fix.js — Ensure Dashboard/Admin buttons exist & visible.
// Labels show when sidebar is expanded OR on hover (compact).
(() => {
  const $ = (q, r=document)=>r.querySelector(q);

  function sideNav() {
    const side = $('#sidebar') || $('aside') || $('.sidebar');
    if (!side) return null;
    return $('nav', side) || side;
  }

  function sampleClass() {
    const ref = $('#sidebar .navbtn') || $('#sidebar .side-icon') || $('.navbtn') || $('.side-icon');
    return ref ? ref.className : 'navbtn side-icon';
  }

  function mkBtn(id, label, icon, hash) {
    let el = document.getElementById(id);
    const cls = sampleClass();
    if (!el) { el = document.createElement('button'); el.id = id; el.type = 'button'; }
    el.className = cls;
    if (!el.classList.contains('navbtn')) el.classList.add('navbtn');
    if (!el.classList.contains('side-icon')) el.classList.add('side-icon');
    el.innerHTML = `<span class="ico">${icon}</span><span class="label">${label}</span>`;
    el.title = label; el.setAttribute('aria-label', label);
    el.style.display = ''; el.tabIndex = 0; el.style.cursor = 'pointer';
    const go = () => (location.hash = hash);
    el.onclick = go;
    el.onkeydown = (e)=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); go(); } };
    return el;
  }

  function insertAfter(ref, node, container) {
    if (!ref || !ref.parentNode) { (container||sideNav())?.appendChild(node); return; }
    ref.parentNode.insertBefore(node, ref.nextSibling);
  }

  function run() {
    const nav = sideNav(); if (!nav) return;

    // remove analytics/calendar if still exist
    ['nav-analytics','nav-calendar'].forEach(id => { const x = document.getElementById(id); if (x) x.remove(); });

    const coursesBtn =
      document.getElementById('nav-courses') ||
      $('button[data-page="catalog"]', nav) ||
      $('button[title="Courses"]', nav) || $('button', nav);

    const dash = mkBtn('nav-dashboard', 'Dashboard', '🏠', '#/stu-dashboard');
    if (!document.getElementById('nav-dashboard')) insertAfter(coursesBtn, dash, nav);

    const admin = mkBtn('nav-admin', 'Admin', '🛠️', '#/admin');
    if (!document.getElementById('nav-admin')) insertAfter(dash, admin, nav);

    // Always visible
    ['nav-dashboard','nav-admin'].forEach(id => { const el = document.getElementById(id); if (el) el.style.display = ''; });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();