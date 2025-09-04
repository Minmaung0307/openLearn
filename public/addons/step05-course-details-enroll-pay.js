(()=> {
  const $=(s,r=document)=>r.querySelector(s);
  const KEY_C='ol:courses', KEY_E='ol:enroll';
  const getC=()=>JSON.parse(localStorage.getItem(KEY_C)||'[]');
  const getE=()=>JSON.parse(localStorage.getItem(KEY_E)||'[]');
  const setE=v=>localStorage.setItem(KEY_E, JSON.stringify(v));
  const isNew=c=> c?.isNew || (c?.createdAt && (Date.now()-c.createdAt<7*24*3600*1000));

  function loadPayPalOnce(){
    return new Promise(res=>{
      const id = 'paypal-sdk';
      if (document.getElementById(id)) return res();
      const cid = window.CONFIG?.PAYPAL_CLIENT_ID;
      if (!cid) return res(); // no SDK → we’ll fall back to demo confirm
      const s=document.createElement('script');
      s.id=id;
      s.src=`https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(cid)}&currency=USD`;
      s.onload=()=>res();
      s.onerror=()=>res(); // still resolve → we’ll use demo
      document.head.appendChild(s);
    });
  }

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
        <div class="modal-footer row justify-between">
          <div class="small muted" id="ppHint"></div>
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

  async function renderPayPalButtons(container, price){
    await loadPayPalOnce();
    if (!window.paypal || !window.CONFIG?.PAYPAL_CLIENT_ID){
      // fallback demo
      $('#ppHint').textContent = 'PayPal not configured (showing demo confirm).';
      container.innerHTML = '';
      return (onApprove)=>{
        const ok = confirm(`Pay $${price} with demo?`);
        if (ok) onApprove();
      };
    }
    // Real PayPal buttons
    container.innerHTML = '<div id="paypal-buttons"></div>';
    return (onApprove)=>{
      window.paypal.Buttons({
        createOrder: (data, actions)=> actions.order.create({
          purchase_units:[{ amount:{ value: price.toFixed(2) } }]
        }),
        onApprove: async (data, actions)=>{
          try { await actions.order.capture(); } catch(e) {}
          onApprove();
        }
      }).render('#paypal-buttons');
    };
  }

  window.showCourseDetails = async (id)=>{
    ensureDetailsModal();
    const c=getC().find(x=>x.id===id); if(!c) return;
    currentCourse=c;

    $('#dtTitle').innerHTML = `${c.title} ${isNew(c)?'<span class="chip">NEW</span>':''}`;
    $('#dtBody').innerHTML = `
      <img src="${c.img||'/images/placeholder.jpg'}" style="width:100%;max-height:260px;object-fit:cover;border-radius:12px">
      <div class="row gap-2 small sticky" style="top:0">
        <span class="chip">${c.category}</span>
        <span class="chip">${c.level}</span>
        <span class="chip">★ ${(c.rating??4.5).toFixed(1)}</span>
        <span class="chip">${c.hours||6} hr</span>
        <span class="chip">${c.credits||3} credits</span>
        <span class="chip">${c.price?('$'+c.price):'Free'}</span>
      </div>
      <p>${(c.short||'').replace(/</g,'&lt;')}</p>
      ${(c.content?`<div class="card p-3"><strong>Outline</strong><ol style="margin-left:18px">${
        c.content.filter(x=>x.type==='header').map(h=>`<li>${h.text}</li>`).join('')
      }</ol></div>`:'')}
      ${c.price ? '<div class="card p-3" id="ppContainer"></div>' : ''}
    `;
    $('#detailsModal').hidden=false;

    // Paid → mount PayPal
    if (c.price) {
      const mount = await renderPayPalButtons(document.getElementById('ppContainer'), Number(c.price));
      $('#dtEnroll').style.display='none'; // we use PayPal button instead
      mount(()=> {
        const mine=getE(); if (!mine.find(x=>x.courseId===c.id)){
          mine.push({courseId:c.id, progress:0, score:0, ts:Date.now()});
          setE(mine);
        }
        alert('Payment successful. Enrolled!');
        $('#detailsModal').hidden=true;
      });
    } else {
      $('#ppHint').textContent = '';
      $('#dtEnroll').style.display='';
    }
  };

  $('#dtEnroll')?.addEventListener('click', ()=>{
    if (!currentCourse) return;
    const c=currentCourse;
    const mine=getE(); if (!mine.find(x=>x.courseId===c.id)){
      mine.push({courseId:c.id, progress:0, score:0, ts:Date.now()});
      setE(mine);
    }
    alert('Enrolled! Open it from My Learning.');
    $('#detailsModal').hidden=true;
  });

  // DETAILS & ENROLL triggers on cards
  document.addEventListener('click', (e)=>{
    const a=e.target.closest('[data-course-details]');
    if (a){ e.preventDefault(); window.showCourseDetails(a.getAttribute('data-course-details')); }
    const b=e.target.closest('[data-enroll]');
    if (b){ e.preventDefault(); window.showCourseDetails(b.getAttribute('data-enroll')); }
  });
})();