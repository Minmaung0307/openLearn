(()=> {
  const $=(s,r=document)=>r.querySelector(s);
  const KEY_C='ol:courses', KEY_E='ol:enroll';
  const getC=()=>JSON.parse(localStorage.getItem(KEY_C)||'[]');
  const getE=()=>JSON.parse(localStorage.getItem(KEY_E)||'[]');
  const setE=(v)=>localStorage.setItem(KEY_E, JSON.stringify(v));
  const isNew=(c)=> c?.isNew || (c?.createdAt && (Date.now()-c.createdAt < 7*24*3600*1000));

  function ensureDetailsModal(){
    if ($('#detailsModal')) return;
    const m=document.createElement('div');
    m.id='detailsModal'; m.className='modal'; m.hidden=true;
    m.innerHTML=`
      <div class="modal-card" style="max-width:1100px;width:80%;max-height:80vh;display:flex;flex-direction:column">
        <div class="modal-header">
          <h3 id="dtTitle">Course</h3>
          <button class="icon-btn" id="dtClose">✕</button>
        </div>
        <div class="modal-body stack gap-2" id="dtBody" style="overflow:auto"></div>
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
    const c=getC().find(x=>x.id===id); if(!c) return;
    currentCourse=c;
    $('#dtTitle').innerHTML = `${c.title} ${isNew(c)?'<span class="chip">NEW</span>':''}`;
    $('#dtBody').innerHTML = `
      <img src="${c.img||'/images/placeholder.jpg'}" style="width:100%;max-height:260px;object-fit:cover;border-radius:12px">
      <div class="row gap-2 small">
        <span class="chip">${c.category}</span>
        <span class="chip">${c.level}</span>
        <span class="chip">★ ${(c.rating??4.5).toFixed(1)}</span>
        <span class="chip">${c.hours||6} hr</span>
        <span class="chip">${c.credits||3} credits</span>
        <span class="chip">${c.price?('$'+c.price):'Free'}</span>
      </div>
      <p>${(c.short||'').replace(/</g,'&lt;')}</p>
      ${(c.content?`<div class="card p-3"><strong>Outline</strong><ol>${
        c.content.filter(x=>x.type==='header').map(h=>`<li>${h.text}</li>`).join('')
      }</ol></div>`:'')}
    `;
    $('#detailsModal').hidden=false;
  };

  $('#dtEnroll')?.addEventListener('click', ()=>{
    if (!currentCourse) return;
    if (!currentCourse.price){
      const mine=getE(); if (!mine.find(x=>x.courseId===currentCourse.id)){
        mine.push({courseId:currentCourse.id, progress:0, score:0, ts:Date.now()});
        setE(mine);
      }
      alert('Enrolled! Open it from My Learning.');
      $('#detailsModal').hidden=true; return;
    }
    const ok=confirm(`Pay $${currentCourse.price}? (PayPal/MMK gateway stub)`); // integrate real gateway later
    if (ok){
      const mine=getE(); if (!mine.find(x=>x.courseId===currentCourse.id)){
        mine.push({courseId:currentCourse.id, progress:0, score:0, ts:Date.now()});
        setE(mine);
      }
      alert('Payment successful (stub). Enrolled!');
      $('#detailsModal').hidden=true;
    }
  });

  // wire “Details” buttons
  document.addEventListener('click', (e)=>{
    const a=e.target.closest('[data-course-details]');
    if (a){ e.preventDefault(); window.showCourseDetails(a.getAttribute('data-course-details')); }
  });
})();