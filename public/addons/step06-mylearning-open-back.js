// addon 06 placeholder

(()=> {
  // Step06: My Learning → Continue opens inline reader; Back returns to My Learning
  const $=(s,r=document)=>r.querySelector(s);
  const KEY_E='ol:enroll', KEY_C='ol:courses', KEY_NOTES='ol:notes';
  const getE=()=>{ try{return JSON.parse(localStorage.getItem(KEY_E)||'[]')}catch{return[]} };
  const getC=()=>{ try{return JSON.parse(localStorage.getItem(KEY_C)||'[]')}catch{return[]} };
  function readerTemplate(c){
    return `
      <div class="row items-center justify-between">
        <div class="row gap-2">
          <button class="btn" id="readerBack">← Back</button>
          <strong>${c.title}</strong>
        </div>
        <div class="row gap-2">
          <button class="btn" id="btnNote">Add Note</button>
          <div class="chip" id="progressChip">Progress: 0%</div>
        </div>
      </div>
      <div class="card p-3" style="min-height:40vh">
        <p>${(c.short||'Lorem ipsum…').replace(/</g,'&lt;')}</p>
        <div class="small muted">[ Images / Audio / Video / Quizzes can render here … ]</div>
      </div>
      <div class="row justify-between mt-3">
        <button class="btn" id="prevPage">Prev</button>
        <button class="btn btn-primary" id="nextPage">Next</button>
      </div>`;
  }
  function setMain(html){
    const main=document.getElementById('main')||document.body;
    const host = document.createElement('div');
    host.id='readerHost';
    host.innerHTML = html;
    // hide mylearning list if exists
    const sec = document.getElementById('mylearningSec');
    if (sec) sec.style.display='none';
    main.appendChild(host);
  }
  function removeReader(){
    const r= document.getElementById('readerHost'); if (r) r.remove();
    const sec = document.getElementById('mylearningSec'); if (sec) sec.style.display='';
  }
  window.openLearning = (courseId)=>{
    const c = getC().find(x=>x.id===courseId); if (!c) return alert('Course not found');
    setMain(readerTemplate(c));
    let p=0;
    const upd=()=>{ const ch=document.getElementById('progressChip'); if (ch) ch.textContent=`Progress: ${p}%`; };
    $('#readerBack').onclick = ()=> removeReader();
    $('#btnNote').onclick = ()=>{
      const t=prompt('Note text'); if (!t) return;
      const key=`${KEY_NOTES}:${courseId}`;
      const arr= JSON.parse(localStorage.getItem(key)||'[]'); arr.push({t,ts:Date.now()});
      localStorage.setItem(key, JSON.stringify(arr));
      alert('Saved note');
    };
    $('#prevPage').onclick = ()=>{ p=Math.max(0,p-10);upd(); };
    $('#nextPage').onclick = ()=>{ p=Math.min(100,p+10);upd(); if (p===100) alert('🎉 Congratulations!'); };
  };

  // wire "Continue" buttons (data-continue)
  document.addEventListener('click',(e)=>{
    const a=e.target.closest('[data-continue]'); if (!a) return;
    e.preventDefault(); window.openLearning(a.getAttribute('data-continue'));
  });
})();