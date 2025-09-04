(()=> {
  const $=(s,r=document)=>r.querySelector(s);
  const KEY_C='ol:courses', KEY_NOTES='ol:notes';
  const getC=()=>{ try{return JSON.parse(localStorage.getItem(KEY_C)||'[]')}catch{return[]} };

  function blockHTML(b){
    if (!b) return '';
    if (b.type==='header') return `<h3 style="margin:8px 0">${b.text||''}</h3>`;
    if (b.type==='text')   return `<p>${(b.text||'').replace(/</g,'&lt;')}</p>`;
    if (b.type==='image')  return `<img src="${b.src}" alt="${b.alt||''}" style="max-width:100%;border-radius:10px">`;
    if (b.type==='audio')  return `<audio controls src="${b.src}" style="width:100%"></audio>`;
    if (b.type==='video')  return `<video controls src="${b.src}" style="width:100%;max-height:420px;border-radius:10px"></video>`;
    if (b.type==='assignment') return `<div class="card p-3"><strong>Assignment:</strong> ${b.text||''}</div>`;
    if (b.type==='short') return `<div class="card p-3"><strong>Short Answer:</strong> ${b.text||''}</div>`;
    if (b.type==='quiz'){
      const items=(b.items||[]).map((it,i)=>`
        <div class="card p-3 mt-3">
          <div><strong>Q${i+1}.</strong> ${it.q}</div>
          <div class="stack mt-1">
            ${(it.a||[]).map((opt,j)=>`
              <label><input type="${it.multi?'checkbox':'radio'}" name="q${i}" value="${j}"> ${opt}</label>
            `).join('')}
          </div>
        </div>
      `).join('');
      return `<div>${items}</div>`;
    }
    if (b.type==='final') return `<div class="card p-3"><strong>Final Exam:</strong> ${b.text||''}</div>`;
    return '';
  }

  function readerTemplate(c){
    const blocks = (c.content||[]).map(blockHTML).join('') || `<p>${(c.short||'Lorem…')}</p>`;
    return `
      <div class="row items-center justify-between">
        <div class="row gap-2">
          <button class="btn" id="readerBack">← Back</button>
          <strong>${c.title}</strong>
          ${isNew(c) ? '<span class="chip">NEW</span>' : ''}
        </div>
        <div class="row gap-2">
          <button class="btn" id="btnNote">Add Note</button>
          <div class="chip" id="progressChip">Progress: 0%</div>
        </div>
      </div>
      <div class="card p-3" style="min-height:40vh">${blocks}</div>
      <div class="row justify-between mt-3">
        <button class="btn" id="prevPage">Prev</button>
        <button class="btn btn-primary" id="nextPage">Next</button>
      </div>`;
  }
  function isNew(c){
    if (c?.isNew) return true;
    const t = c?.createdAt; if (!t) return false;
    return (Date.now()-t) < 7*24*3600*1000; // 7 days
  }
  function setMain(html){
    const main=document.getElementById('main')||document.body;
    let host=document.getElementById('readerHost');
    if (!host){ host=document.createElement('div'); host.id='readerHost'; main.appendChild(host); }
    // hide list section if exists
    const sec=document.getElementById('mylearningSec'); if (sec) sec.style.display='none';
    host.innerHTML=html;
  }
  function removeReader(){
    const host=document.getElementById('readerHost'); if (host) host.remove();
    const sec=document.getElementById('mylearningSec'); if (sec) sec.style.display='';
  }

  window.openLearning = (courseId)=>{
    const c = getC().find(x=>x.id===courseId); if (!c) return alert('Course not found');
    setMain(readerTemplate(c));
    let p=0;
    const upd=()=>{ const ch=document.getElementById('progressChip'); if (ch) ch.textContent=`Progress: ${p}%`; };
    $('#readerBack').onclick = ()=> removeReader();
    $('#btnNote').onclick = ()=>{
      const key=`${KEY_NOTES}:${courseId}`;
      const arr= JSON.parse(localStorage.getItem(key)||'[]');
      const t=prompt('Note text'); if (!t) return; arr.push({t,ts:Date.now()});
      localStorage.setItem(key, JSON.stringify(arr));
      alert('Saved note');
    };
    $('#prevPage').onclick = ()=>{ p=Math.max(0,p-10);upd(); };
    $('#nextPage').onclick = ()=>{ p=Math.min(100,p+10);upd(); if (p===100) alert('🎉 Congratulations!'); };
  };

  // continue buttons
  document.addEventListener('click',(e)=>{
    const a=e.target.closest('[data-continue]'); if (!a) return;
    e.preventDefault(); window.openLearning(a.getAttribute('data-continue'));
  });
})();