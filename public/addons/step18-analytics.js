
function timeline(days){const a=[];const t=new Date();t.setHours(0,0,0,0);for(let i=days-1;i>=0;i--){const d=new Date(t);d.setDate(d.getDate()-i);a.push(d.toISOString().slice(0,10));}return a;}
function line(ctxId,labels,data){const ctx=document.querySelector(ctxId).getContext('2d'); return new Chart(ctx,{type:'line',data:{labels,datasets:[{data,fill:false,tension:.25}]},options:{plugins:{legend:{display:false}},scales:{y:{beginAtZero:true}}}});}
function mount(){
  const host=document.querySelector('#page-admin'); if(!host) return;
  if(document.getElementById('ol-ana2')) return;
  const box=document.createElement('section'); box.id='ol-ana2'; box.className='ol-panel';
  box.innerHTML = `<div class="ol-row"><b>Analytics</b><div class="ol-grow"></div><select id="rng"><option value="7">7d</option><option value="30" selected>30d</option></select><button class="btn small" id="ref">Refresh</button></div>
  <div class="grid"><canvas id="enr" height="140"></canvas><canvas id="comp" height="140"></canvas></div>`;
  host.appendChild(box);
  const refresh=()=>{
    const days=Number(box.querySelector('#rng').value||30); const labels=timeline(days);
    const enr=(JSON.parse(localStorage.getItem('ol:enrollments')||'[]')||[]);
    const map=new Map(); enr.forEach(e=>{const k=new Date().toISOString().slice(0,10); map.set(k,(map.get(k)||0)+1);});
    line('#enr',labels,labels.map(k=>map.get(k)||0));
    line('#comp',labels,labels.map(k=>0));
  };
  box.querySelector('#ref').onclick=refresh; refresh();
}
document.addEventListener('DOMContentLoaded', mount);
