(()=> {
  const ID='chatSec';
  function ensure(){ if (document.getElementById(ID)) return true;
    const s=document.createElement('section'); s.id=ID;
    s.innerHTML=`<h2 class="h2">Live Chat</h2>
      <div class="card p-3" style="min-height:240px;max-height:320px;overflow:auto" id="chatBox"></div>
      <div class="row mt-3"><input id="chatInput" class="field" style="flex:1" placeholder="Say something..." />
      <button id="chatSend" class="btn btn-primary">Send</button></div>`;
    (document.getElementById('main')||document.body).appendChild(s);
    const send=()=>{
      const k='ol:chat:general';
      const who=(window.auth?.currentUser?.email)||'Guest';
      const list=JSON.parse(localStorage.getItem(k)||'[]');
      const inp=document.getElementById('chatInput'); if(!inp?.value.trim()) return;
      list.push({who,text:inp.value.trim(),ts:Date.now()});
      localStorage.setItem(k, JSON.stringify(list)); inp.value=''; render();
    };
    const render=()=>{
      const box=document.getElementById('chatBox'); const k='ol:chat:general';
      const list=JSON.parse(localStorage.getItem(k)||'[]');
      box.innerHTML=list.map(m=>`<div><strong>${m.who}:</strong> ${m.text}</div>`).join('');
      box.scrollTop=box.scrollHeight;
    };
    s.querySelector('#chatSend').onclick=send;
    s.querySelector('#chatInput').addEventListener('keydown',e=>{ if(e.key==='Enter') send(); });
    s.render=render;
    return true;
  }
  function show(v){ const s=document.getElementById(ID); if (s) s.style.display=v?'':'none'; }
  function maybe(name){
    if (name!=='livechat'){ show(false); return; }
    if (ensure()) document.getElementById(ID).render();
    show(true);
  }
  window.addEventListener('ol:route', e=> maybe(e.detail.name));
  maybe(window.currentRoute||'');
})();