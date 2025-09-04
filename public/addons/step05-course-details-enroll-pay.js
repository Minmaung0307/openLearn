// addon 05 placeholder

(()=> {
  // Step05: "Details" modal + Enroll logic (free auto-enroll; paid → PayPal stub)
  const $=(s,r=document)=>r.querySelector(s);
  const KEY_C='ol:courses', KEY_E='ol:enroll';
  const getC=()=>{ try{return JSON.parse(localStorage.getItem(KEY_C)||'[]')}catch{return[]} };
  const getE=()=>{ try{return JSON.parse(localStorage.getItem(KEY_E)||'[]')}catch{return[]} };
  const setE=(v)=>localStorage.setItem(KEY_E, JSON.stringify(v));

  function ensureDetailsModal(){
    if ($('#detailsModal')) return;
    const m = document.createElement('div');
    m.id='detailsModal'; m.className='modal'; m.hidden=true;
    m.innerHTML=`
      <div class="modal-card" style="max-width:800px;width:80%;">
        <div class="modal-header">
          <h3 id="dtTitle">Course</h3>
          <button class="icon-btn" id="dtClose">✕</button>
        </div>
        <div class="modal-body stack gap-2" id="dtBody"></div>
        <div class="modal-footer">
          <div></div>
          <div class="row gap-2">
            <button class="btn" id="dtCancel">Close</button>
            <button class="btn btn-primary" id="dtEnroll">Enroll</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(m);
    $('#dtClose').onclick=()=>m.hidden=true;
    $('#dtCancel').onclick=()=>m.hidden=true;
  }

  let currentCourse=null;
  window.showCourseDetails = (id)=>{
    ensureDetailsModal();
    const c = getC().find(x=>x.id===id); if (!c) return;
    currentCourse=c;
    $('#dtTitle').textContent=c.title;
    $('#dtBody').innerHTML = `
      <img src="${c.img||'/images/placeholder.jpg'}" style="width:100%;max-height:220px;object-fit:cover;border-radius:12px" alt="">
      <div class="row gap-2 small">
        <span class="chip">${c.category}</span>
        <span class="chip">${c.level}</span>
        <span class="chip">★ ${c.rating?.toFixed?.(1)||'4.5'}</span>
        <span class="chip">${c.hours||6} hr</span>
        <span class="chip">${c.credits||3} credits</span>
        <span class="chip">${c.price?('$'+c.price):'Free'}</span>
      </div>
      <p>${(c.short||'').replace(/</g,'&lt;')}</p>
      <ul>${(c.benefits||[]).map(b=>`<li>• ${b}</li>`).join('')}</ul>
    `;
    $('#detailsModal').hidden=false;
  };

  $('#dtEnroll')?.addEventListener('click', ()=>{
    if (!currentCourse) return;
    if (!currentCourse.price || currentCourse.price===0){
      // free → add to enroll
      const mine=getE(); if (!mine.find(x=>x.courseId===currentCourse.id)){
        mine.push({courseId:currentCourse.id, progress:0, score:0, ts:Date.now()});
        setE(mine);
      }
      alert('Enrolled! Open it from My Learning.');
      $('#detailsModal').hidden = true;
      return;
    }
    // paid → PayPal stub (replace with real SDK on production)
    const ok=confirm(`Pay $${currentCourse.price}? (PayPal stub)`);
    if (ok){
      const mine=getE(); if (!mine.find(x=>x.courseId===currentCourse.id)){
        mine.push({courseId:currentCourse.id, progress:0, score:0, ts:Date.now()});
        setE(mine);
      }
      alert('Payment successful (stub). Enrolled!');
      $('#detailsModal').hidden=true;
    }
  });

  // wire to cards if they set data-id & .btn-details / .btn-enroll
  document.addEventListener('click', (e)=>{
    const a=e.target.closest('[data-course-details]');
    if (a){ e.preventDefault(); const id=a.getAttribute('data-course-details'); window.showCourseDetails(id); }
    const b=e.target.closest('[data-enroll]');
    if (b){ e.preventDefault(); const id=b.getAttribute('data-enroll'); window.showCourseDetails(id); }
  });
})();