// addon 10 placeholder

(()=> {
  // Step10: Instant theme + font-size switch (Settings area)
  const r = document.documentElement.style;
  function applyTheme(palette){
    // Expect palette like {bg, fg, card, border, primary, muted}
    Object.entries(palette||{}).forEach(([k,v])=> r.setProperty(`--${k}`, v));
    localStorage.setItem('ol:theme', JSON.stringify(palette));
  }
  function applyFont(size){ r.setProperty('--font', size); localStorage.setItem('ol:font', size); }

  // preload from storage
  try{
    const t=JSON.parse(localStorage.getItem('ol:theme')||'null'); if (t) applyTheme(t);
    const f=localStorage.getItem('ol:font'); if (f) applyFont(f);
  }catch{}

  // wire selects if exist
  const selTheme=document.getElementById('selTheme');
  const selFont=document.getElementById('selFont');
  selTheme?.addEventListener('change', ()=>{
    const v=selTheme.value;
    const presets={
      ocean:{bg:'#0b0f17',fg:'#eaf1ff',card:'#111827',muted:'#9fb0c3',border:'#1f2a3b',primary:'#2563eb'},
      latte:{bg:'#faf7f2',fg:'#222',card:'#fff',muted:'#666',border:'#eee',primary:'#7c3aed'},
      forest:{bg:'#0f1412',fg:'#e6ffe8',card:'#122018',muted:'#9ec7a2',border:'#1b2a22',primary:'#10b981'}
    };
    applyTheme(presets[v]||presets.ocean);
  });
  selFont?.addEventListener('change', ()=> applyFont(selFont.value || '16px'));

  // immediate reflect buttons/menus as well (CSS variables already affect all)
})();