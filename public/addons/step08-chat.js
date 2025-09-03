
function mount(){
  const host=document.querySelector('#page-mylearning'); if(!host) return;
  if(document.getElementById('chatbox')) return;
  const box=document.createElement('section'); box.id='chatbox'; box.className='ol-panel';
  box.innerHTML = `<div class="ol-row"><b>Live Chat (demo)</b></div>
  <div id="chatlog" style="max-height:200px;overflow:auto;margin:8px 0"></div>
  <div class="ol-row"><input id="chatmsg" placeholder="Type a message…" class="ol-grow"><button class="btn small" id="send">Send</button></div>`;
  host.appendChild(box);
  const key='ol:chat'; const log=box.querySelector('#chatlog'); const msg=box.querySelector('#chatmsg');
  const render=()=>{const arr=JSON.parse(localStorage.getItem(key)||'[]'); log.innerHTML = arr.map(m=>`<div class="card">${m.t} <span class="ol-badge">${new Date(m.at).toLocaleTimeString()}</span></div>`).join(''); log.scrollTop=log.scrollHeight;};
  box.querySelector('#send').onclick=()=>{ if(!msg.value.trim()) return; const arr=JSON.parse(localStorage.getItem(key)||'[]'); arr.push({t:msg.value.trim(), at:Date.now()}); localStorage.setItem(key,JSON.stringify(arr)); msg.value=''; render();};
  render();
}
document.addEventListener('DOMContentLoaded', mount);
