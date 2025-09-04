// addon 13 placeholder

(()=> {
  // Step13: Lightweight Live Chat (localStorage room)
  const ROOM='general';
  const KEY=`ol:chat:${ROOM}`;
  const $=(s,r=document)=>r.querySelector(s);
  function ensureUI(){
    if ($('#chatSec')) return;
    const s=document.createElement('section'); s.id='chatSec';
    s.innerHTML=`
      <h2 class="h2">Live Chat</h2>
      <div class="card p-3" style="min-height:240px;max-height:320px;overflow:auto" id="chatBox"></div>
      <div class="row mt-3">
        <input id="chatInput" class="field" style="flex:1" placeholder="Say something..." />
        <button id="chatSend" class="btn btn-primary">Send</button>
      </div>`;
    (document.getElementById('main')||document.body).appendChild(s);
  }
  function get(){ try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return[]} }
  function set(v){ localStorage.setItem(KEY, JSON.stringify(v)); }
  function render(){
    const box=$('#chatBox'); if(!box) return;
    const list=get(); box.innerHTML=list.map(m=>`<div><strong>${m.who||'User'}:</strong> ${m.text}</div>`).join('');
    box.scrollTop=box.scrollHeight;
  }
  function send(){
    const inp=$('#chatInput'); if(!inp?.value.trim()) return;
    const who=(window.auth?.currentUser?.email) || (JSON.parse(localStorage.getItem('ol:fakeUser')||'{}').email) || 'Guest';
    const list=get(); list.push({who,text:inp.value.trim(),ts:Date.now()}); set(list); inp.value=''; render();
  }
  // init
  ensureUI(); render();
  $('#chatSend')?.addEventListener('click', send);
  $('#chatInput')?.addEventListener('keydown', e=>{ if(e.key==='Enter') send(); });
})();