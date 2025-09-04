// Sidebar FIX (final): remove Analytics/Calendar; ensure Dashboard/Admin exist,
// match v1 classes, and are fully clickable/keyboardable.
(() => {
  // === helpers ===
  const $ = (q, root = document) => root.querySelector(q);
  const $$ = (q, root = document) => Array.from(root.querySelectorAll(q));

  // sidebar container → we want the <nav> inside #sidebar if available
  function sideContainer() {
    const side = $('#sidebar') || $('aside') || $('.sidebar');
    if (!side) return null;
    return $('nav', side) || side; // prefer nav
  }

  // use an existing sidebar button to copy classes (keeps design consistent)
  function sampleClass() {
    const ref =
      $('#sidebar .navbtn') ||
      $('#sidebar .side-icon') ||
      $('.navbtn') ||
      $('.side-icon');
    return ref ? ref.className : 'navbtn side-icon';
  }

  // build/normalize one button
  function makeBtn(id, label, icon, hash) {
    let el = document.getElementById(id);
    const cls = sampleClass();
    if (!el) {
      el = document.createElement('button');
      el.id = id;
      el.type = 'button';
    }
    el.className = cls;
    if (!el.classList.contains('side-icon')) el.classList.add('side-icon');
    if (!el.classList.contains('navbtn')) el.classList.add('navbtn');
    el.innerHTML = `<span class="ico">${icon}</span><span class="label">${label}</span>`;
    el.title = label;
    el.setAttribute('aria-label', label);
    el.style.display = '';
    el.tabIndex = 0;
    el.style.cursor = 'pointer';
    const go = () => (location.hash = hash);
    el.onclick = go;
    el.onkeydown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault(); go();
      }
    };
    return el;
  }

  function insertAfter(ref, node, container) {
    if (!ref || !ref.parentNode) {
      (container || sideContainer())?.appendChild(node);
      return;
    }
    ref.parentNode.insertBefore(node, ref.nextSibling);
  }

  function removeIfSel(sel) { $$(sel).forEach((x) => x.remove()); }
  function removeIfId(id)  { const x = document.getElementById(id); if (x) x.remove(); }

  // try to find the existing "Courses" button to insert after
  function findCoursesBtn(container) {
    return (
      $('#nav-courses') ||
      $('button[data-page="catalog"]', container) ||
      $('button[title="Courses"]', container) ||
      // final fallback: first nav button
      $('button', container)
    );
  }

  // === main ===
  function run() {
    const container = sideContainer();
    if (!container) return;

    // 1) Remove Analytics/Calendar everywhere (by id OR patterns)
    removeIfId('nav-analytics');
    removeIfId('nav-calendar');
    removeIfSel('#sidebar .side-icon[title="Analytics"], #sidebar .side-icon[aria-label="Analytics"]');
    removeIfSel('#sidebar .side-icon[title="Calendar"],  #sidebar .side-icon[aria-label="Calendar"]');

    // 2) Ensure Dashboard/Admin present and aligned
    // NOTE: v1 routes → Dashboard = "#/stu-dashboard", Admin="#/admin"
    const after = findCoursesBtn(container);

    const dash = makeBtn('nav-dashboard', 'Dashboard', '🏠', '#/stu-dashboard');
    if (!document.getElementById('nav-dashboard')) {
      insertAfter(after, dash, container);
    } else {
      // normalize existing one
      after && insertAfter(after, document.getElementById('nav-dashboard'), container);
    }

    const admin = makeBtn('nav-admin', 'Admin', '🛠️', '#/admin');
    if (!document.getElementById('nav-admin')) {
      insertAfter(document.getElementById('nav-dashboard') || after, admin, container);
    }

    // 3) Always visible (UI only; server-side rules still apply)
    const show = (id) => { const el = document.getElementById(id); if (el) el.style.display = ''; };
    show('nav-dashboard');
    show('nav-admin');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();