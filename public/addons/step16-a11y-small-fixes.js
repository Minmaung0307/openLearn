// addon 16 placeholder

(()=> {
  // Step16: Small accessibility & focus management
  document.addEventListener('keydown', (e)=>{
    if (e.key==='Escape'){
      document.querySelectorAll('.modal:not([hidden])').forEach(m=> m.hidden=true);
    }
  });
  // Focus outlines for keyboard users only
  const s=document.createElement('style');
  s.textContent=`*:focus{outline:2px solid var(--primary,#2563eb);outline-offset:2px}`;
  document.head.appendChild(s);
})();