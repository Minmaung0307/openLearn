(()=> {
  const ID='analyticsSec';
  function host(){ return document.getElementById('main') || document.querySelector('main') || document.body; }

  function ensure(){
    if (document.getElementById(ID)) return;
    const s=document.createElement('section'); s.id=ID; s.style.display='none';
    s.innerHTML = `
      <div class="row items-center justify-between">
        <h2 class="h2">Analytics</h2>
      </div>
      <div class="card p-3">Charts coming here… (placeholder)</div>`;
    host().appendChild(s);
  }
  function show(v){ const s=document.getElementById(ID); if(s) s.style.display=v?'':'none'; }
  function maybe(name){
    if (name!=='analytics'){ show(false); return; }
    ensure(); show(true);
  }
  window.addEventListener('ol:route', e=> maybe(e.detail.name));
  if (document.readyState==='complete') maybe((window.currentRoute||'').replace(/^#\/?/,''));
  else document.addEventListener('DOMContentLoaded', ()=> maybe((window.currentRoute||'').replace(/^#\/?/,'')));
})();