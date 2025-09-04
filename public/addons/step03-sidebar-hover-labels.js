// addon 03 placeholder

(()=> {
  // Step03: Sidebar icons-only → expand labels on hover (drawer style)
  const bar = document.getElementById('sidebar'); if (!bar) return;
  bar.style.width = '64px';
  bar.addEventListener('mouseenter', ()=>{ bar.style.width='220px'; bar.classList.add('expanded'); });
  bar.addEventListener('mouseleave', ()=>{ bar.style.width='64px'; bar.classList.remove('expanded'); });

  // if labels exist with [data-label], show/hide by CSS (no layout break)
  const style = document.createElement('style');
  style.textContent = `
    #sidebar .label{opacity:0;white-space:nowrap;transition:opacity .15s ease;}
    #sidebar.expanded .label{opacity:1;}
  `;
  document.head.appendChild(style);
})();