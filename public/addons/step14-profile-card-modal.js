(()=> {
  const ID='profileSec';
  function show(v){ const s=document.getElementById(ID); if(s) s.style.display=v?'':'none'; }
  function bootOnce(){
    if (document.getElementById(ID)) return;
    // (the same content as previous step14, omitted for brevity)
    // … paste your existing step14 DOM creation & wiring here …
  }
  function maybe(name){
    if (name!=='profile'){ show(false); return; }
    bootOnce(); show(true);
  }
  window.addEventListener('ol:route', e=> maybe(e.detail.name));
  maybe(window.currentRoute||'');
})();