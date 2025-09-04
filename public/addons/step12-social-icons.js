// addon 12 placeholder

(()=> {
  // Step12: Ensure correct social icons (SVG inline) in footer
  const map = {
    youtube:'M10 15l6-3-6-3v6z',
    tiktok:'M14 3v3a4 4 0 0 1-4-4h4z',
    facebook:'M9 8H7v4h2v8h4v-8h2l1-4h-3V7a1 1 0 0 1 1-1h2V3h-3a4 4 0 0 0-4 4v1z',
    instagram:'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm6-2h-2a2 2 0 0 0-2-2H10a2 2 0 0 0-2 2H6a2 2 0 0 0-2 2v2h2V7h2v2h8V7h2v2h2V7a2 2 0 0 0-2-2z',
    twitter:'M22 5.8c-.7.3-1.5.5-2.2.6.8-.5 1.4-1.2 1.7-2.1-.7.4-1.6.8-2.4 1A3.7 3.7 0 0 0 12 7.7c0 .3 0 .6.1.9A10.5 10.5 0 0 1 3 5.2a3.7 3.7 0 0 0 1.1 5 3.7 3.7 0 0 1-1.7-.5v.1a3.7 3.7 0 0 0 3 3.6c-.4.1-.9.2-1.3.1.4 1.3 1.7 2.2 3.2 2.3A7.5 7.5 0 0 1 2 18.3 10.6 10.6 0 0 0 7.7 20c6.9 0 10.8-5.8 10.8-10.8v-.5c.7-.5 1.4-1.2 1.9-1.9z'
  };
  function icon(name){ const d=map[name]; if(!d) return ''; return `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="${d}"/></svg>`; }
  [['icoYT','youtube'],['icoTT','tiktok'],['icoFB','facebook'],['icoIG','instagram'],['icoTW','twitter']]
  .forEach(([id, key])=>{
    const el=document.getElementById(id); if (!el) return;
    if (!el.innerHTML.trim()) el.innerHTML = icon(key);
  });
})();