const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const esc = s => (s??'').toString().replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
const seedImg = id => `https://picsum.photos/seed/${encodeURIComponent(id)}/640/360`;

let currentUser=null, currentRole='guest', lastPage='catalog', lastNonAuthPage='catalog';

/* Router */
function showPage(id){
  $$('.page').forEach(p=>p.classList.remove('active'));
  const sec = $('#page-'+id);
  if(sec){ sec.classList.add('active'); lastPage=id; if(id!=='auth') lastNonAuthPage=id; window.scrollTo(0,0); }
  if(id==='catalog') renderCatalog();
  if(id==='mylearning') renderMyLearning();
  if(id==='gradebook') renderGradebook();
  if(id==='admin')     renderAdmin();
  if(id==='stu-dashboard'){ initStudentDashboard(); renderCalendar(); renderCalendarList(); }
  if(id==='profile')   renderProfile(currentUser, currentRole);
  localStorage.setItem('ol:last', id);
}

/* Firebase (from firebase.js) */
import {
  auth, db, onAuthStateChanged,
  signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut,
  doc, getDoc, setDoc
} from '/firebase.js';

const BOOTSTRAP_ADMINS = ['admin@openlearn.com', 'minmaung0307@gmail.com'];

/* Dynamic © year */
$('#copyYear').textContent = `© OpenLearn ${new Date().getFullYear()}`;

/* Burger (mobile) */
$('#btn-burger')?.addEventListener('click', ()=> $('#sidebar').classList.toggle('open'));
document.addEventListener('click', (e)=>{
  if(window.matchMedia('(max-width:820px)').matches){
    if(e.target.closest('.navbtn')) $('#sidebar').classList.remove('open');
  }
});

/* Auth modal + fullscreen auth */
function swapPane(group, which){
  const m = group==='modal';
  (m?$('#authLogin'):$('#authLoginPage')).classList.toggle('ol-hidden', which!=='login');
  (m?$('#authSignup'):$('#authSignupPage')).classList.toggle('ol-hidden', which!=='signup');
  (m?$('#authForgot'):$('#authForgotPage')).classList.toggle('ol-hidden', which!=='forgot');
}
function openLoginModal(){ swapPane('modal','login'); try{$('#authModal').showModal();}catch{} }
$('#btn-login').addEventListener('click', openLoginModal);
$('#btn-logout').addEventListener('click', async ()=>{ await signOut(auth); });

$('#linkSignup').addEventListener('click',(e)=>{e.preventDefault(); swapPane('modal','signup');});
$('#linkForgot').addEventListener('click',(e)=>{e.preventDefault(); swapPane('modal','forgot');});
$('#backToLogin1').addEventListener('click',(e)=>{e.preventDefault(); swapPane('modal','login');});
$('#backToLogin2').addEventListener('click',(e)=>{e.preventDefault(); swapPane('modal','login');});

$('#authLogin').addEventListener('submit', async (e)=>{
  e.preventDefault();
  try{ await signInWithEmailAndPassword(auth,$('#loginEmail').value.trim(),$('#loginPass').value); $('#authModal').close(); }
  catch(err){ alert(err?.message||'Login failed'); }
});
$('#authSignup').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const email=$('#signupEmail').value.trim(), pass=$('#signupPass').value;
  try{ const r=await createUserWithEmailAndPassword(auth,email,pass);
       const ref=doc(db,'users',r.user.uid), s=await getDoc(ref);
       const role=BOOTSTRAP_ADMINS.includes(email)?'admin':'student';
       if(!s.exists()) await setDoc(ref,{role,email,createdAt:Date.now()});
       $('#authModal').close();
  }catch(err){ alert(err?.message||'Sign up failed'); }
});
$('#authForgot').addEventListener('submit', async (e)=>{
  e.preventDefault();
  try{ await sendPasswordResetEmail(auth,$('#forgotEmail').value.trim()); alert('Reset link sent'); }
  catch(err){ alert(err?.message||'Failed'); }
});

/* Fullscreen Page Auth */
function swapAuthPage(which){ swapPane('page', which); }
$('#pageLinkSignup').addEventListener('click',(e)=>{e.preventDefault(); swapAuthPage('signup');});
$('#pageLinkForgot').addEventListener('click',(e)=>{e.preventDefault(); swapAuthPage('forgot');});
$('#pageBackToLogin1').addEventListener('click',(e)=>{e.preventDefault(); swapAuthPage('login');});
$('#pageBackToLogin2').addEventListener('click',(e)=>{e.preventDefault(); swapAuthPage('login');});
$('#authLoginPage').addEventListener('submit', async (e)=>{
  e.preventDefault();
  try{ await signInWithEmailAndPassword(auth,$('#loginEmailPage').value.trim(),$('#loginPassPage').value); }
  catch(err){ alert(err?.message||'Login failed'); }
});
$('#authSignupPage').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const email=$('#signupEmailPage').value.trim(), pass=$('#signupPassPage').value;
  try{ const r=await createUserWithEmailAndEmailAndPassword(auth,email,pass); /* typo guard below */ }catch{}
});
/* correct signup */
$('#authSignupPage').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const email=$('#signupEmailPage').value.trim(), pass=$('#signupPassPage').value;
  try{ const r=await createUserWithEmailAndPassword(auth,email,pass);
       const ref=doc(db,'users',r.user.uid), s=await getDoc(ref);
       const role=BOOTSTRAP_ADMINS.includes(email)?'admin':'student';
       if(!s.exists()) await setDoc(ref,{role,email,createdAt:Date.now()});
  }catch(err){ alert(err?.message||'Sign up failed'); }
});
$('#authForgotPage').addEventListener('submit', async (e)=>{
  e.preventDefault();
  try{ await sendPasswordResetEmail(auth,$('#forgotEmailPage').value.trim()); alert('Reset link sent'); }
  catch(err){ alert(err?.message||'Failed'); }
});

/* Auth state */
onAuthStateChanged(auth, async (u)=>{
  currentUser=u||null;
  $('#btn-login').style.display=u?'none':'inline-flex';
  $('#btn-logout').style.display=u?'inline-flex':'none';

  if(u){
    try{
      const snap=await getDoc(doc(db,'users',u.uid));
      currentRole = snap.exists()? (snap.data().role||'student') : (BOOTSTRAP_ADMINS.includes(u.email||'')?'admin':'student');
      if(!snap.exists()) await setDoc(doc(db,'users',u.uid),{role:currentRole,email:u.email||'',createdAt:Date.now()});
    }catch{ currentRole = localStorage.getItem('ol:role') || 'student'; }
    localStorage.setItem('ol:role', currentRole);
    $('#page-auth').classList.remove('active');
    showPage(lastNonAuthPage || 'catalog');
  } else {
    currentRole='guest';
    localStorage.setItem('ol:role','guest');
    showPage('auth'); $('#page-auth').classList.add('active');
  }
  renderProfile(currentUser, currentRole);
  renderAdminVisibility(currentRole);
  toggleStaffUI();
});

/* localStorage helpers */
const save=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const read=(k,d=[])=>{try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(d))}catch{return d}};

/* samples */
const baseSamples=[
  {id:'web101',title:'HTML & CSS Basics',category:'Web',level:'Beginner',rating:4.6,price:0,hours:6,credits:3,description:'Learn the building blocks of the web.',
   benefits:['Build your first page','Modern CSS cheats','Certificate included']},
  {id:'js201', title:'Modern JavaScript', category:'Web',level:'Intermediate',rating:4.5,price:29,hours:12,credits:4,description:'ES6, modules, async, and more.',
   benefits:['Async mastery','Real projects','Interview prep']},
  {id:'py101', title:'Python for Everyone', category:'Data',level:'Beginner',rating:4.7,price:0,hours:10,credits:3,description:'Python fundamentals with practice.',
   benefits:['Hands-on labs','Cheat sheets','Community help']},
  {id:'sql200',title:'SQL Essentials',   category:'Data',level:'Intermediate',rating:4.4,price:19,hours:8,credits:2,description:'Queries, joins, and optimization.',
   benefits:['DB thinking','Query clinic','Perf insights']},
  {id:'ml300', title:'Intro to Machine Learning', category:'AI',level:'Intermediate',rating:4.5,price:39,hours:14,credits:4,description:'ML concepts and scikit-learn.',
   benefits:['Math-lite','Code notebooks','Career tips']},
  {id:'ux101', title:'UX Design Fundamentals', category:'Design',level:'Beginner',rating:4.3,price:0,hours:7,credits:2,description:'Research to wireframes.',
   benefits:['Real briefs','Portfolio ready','Mentor notes']},
  {id:'pm101', title:'Project Management', category:'Business',level:'Beginner',rating:4.2,price:9,hours:6,credits:2,description:'Plan, execute, deliver.',
   benefits:['Templates','Soft skills','Risk playbook']}
];
function appendSamples(){
  const list = read('ol:courses',[]);
  const batch = baseSamples.map((s,i)=> {
    const stamp = Date.now().toString().slice(-6) + '-' + i + '-' + (list.length+i);
    return {...s, id:`${s.id}-${stamp}`, img:seedImg(`${s.id}-${stamp}`)};
  });
  save('ol:courses', list.concat(batch));
  renderCatalog(); renderAdmin(); showPage('catalog');
}

/* catalog */
function cDetailsRow(lbl,val){ return `<div class="row"><div class="muted" style="width:120px">${esc(lbl)}</div><div>${val}</div></div>`; }
function renderCatalog(){
  const courses=read('ol:courses',[]);
  $('#catalog-grid').innerHTML = courses.map(c=>`
    <article class="card" data-id="${esc(c.id)}">
      <img class="course-thumb" src="${esc(c.img||seedImg(c.id))}" alt="">
      <div class="row"><div class="h4">${esc(c.title)}</div><div class="grow"></div><div>★ ${esc(c.rating)}</div></div>
      <div class="row"><span class="badge">${esc(c.category)}</span><span class="badge">${esc(c.level)}</span><div class="grow"></div><div>${c.price?'$'+c.price:'Free'} · ${esc(c.hours)}h</div></div>
      <p>${esc(c.description||'')}</p>
      <div class="row">
        <button class="btn" data-details="${esc(c.id)}">Details</button>
        <div class="grow"></div>
        <button class="btn primary" data-enroll="${esc(c.id)}">Enroll</button>
      </div>
    </article>
  `).join('') || `<div class="card">No courses yet. Click “Add sample data”.</div>`;
}

/* details modal */
const detailsModal=$('#detailsModal'), detailsBody=$('#detailsBody');
$('#closeDetails').addEventListener('click', ()=>detailsModal.close());
function openDetails(cid){
  const c = read('ol:courses',[]).find(x=>x.id===cid); if(!c) return;
  const bens = (c.benefits||[]).map(b=>`<li>${esc(b)}</li>`).join('') || '<li>—</li>';
  detailsBody.innerHTML = `
    <div class="row" style="gap:16px">
      <img src="${esc(c.img||seedImg(c.id))}" class="course-thumb" style="width:40%;min-width:260px;height:200px">
      <div class="grow">
        <h3 style="margin:0">${esc(c.title)}</h3>
        ${cDetailsRow('Category', esc(c.category))}
        ${cDetailsRow('Level', esc(c.level))}
        ${cDetailsRow('Rating', `★ ${esc(c.rating)}`)}
        ${cDetailsRow('Hours', esc(c.hours)+'h')}
        ${cDetailsRow('Credits', esc(c.credits||3))}
        ${cDetailsRow('Price', c.price?'$'+c.price:'Free')}
      </div>
    </div>
    <div class="card" style="margin-top:10px">
      <b>Description</b>
      <p>${esc(c.description||'')}</p>
      <b>Benefits</b>
      <ul style="margin-top:6px">${bens}</ul>
    </div>
  `;
  detailsModal.showModal();
}

/* enroll & payments */
const payModal=$('#payModal'), payBody=$('#payBody'); $('#closePay').addEventListener('click', ()=>payModal.close());
let payContext=null;
function requirePayment(cid){
  const c = read('ol:courses',[]).find(x=>x.id===cid); if(!c) return;
  payContext={cid, title:c.title, amount: c.price||0};
  $('#payTitle').textContent = `Checkout — ${c.title} · ${c.price?'$'+c.price:'Free'}`;
  // PayPal render
  const container=$('#paypal-container'); container.innerHTML='';
  const note=$('#paypalNote');
  if((window.PAYPAL_CLIENT_ID||'').trim() && window.paypal && paypal.Buttons){
    paypal.Buttons({
      createOrder: (data,actions)=>actions.order.create({
        purchase_units:[{amount:{value:String(c.price||1)}}]
      }),
      onApprove: async (data,actions)=>{
        try{ await actions.order.capture(); enrollPaid(cid,'paypal',data.orderID); payModal.close(); }
        catch{ alert('PayPal capture failed'); }
      }
    }).render(container);
    note.textContent='';
  } else {
    note.textContent='PayPal client ID not set in config.js — showing demo only.';
    container.innerHTML='<div class="muted">PayPal not configured.</div>';
  }
  payModal.showModal();
}
$('#mmkPaid').addEventListener('click', ()=>{
  if(!payContext) return;
  enrollPaid(payContext.cid,'mmk-qr','demo');
  payModal.close();
});
function enrollPaid(cid,method,ref){
  // mark payment record (local)
  const rec=read('ol:payments',[]); rec.push({cid,method,ref,at:Date.now(),uid:currentUser?.uid||'local'});
  save('ol:payments',rec);
  // enroll
  enroll(cid);
}

/* enroll (free or after pay) */
function enroll(cid){
  const list=read('ol:enrollments',[]);
  const courses=read('ol:courses',[]);
  const c=courses.find(x=>x.id===cid); if(!c) return;
  if((c.price||0)>0){
    // require payment
    requirePayment(cid); return;
  }
  if(!list.find(e=>e.courseId===cid)){
    list.push({courseId:cid,courseTitle:c.title,progress:0,score:0,credits:c.credits||3,price:c.price||0});
    save('ol:enrollments',list);
  }
  renderMyLearning();
  showPage('mylearning');
}

/* My Learning */
function renderMyLearning(){
  const enr=read('ol:enrollments',[]), courses=read('ol:courses',[]);
  const grid = $('#mylearn-grid');
  grid.classList.remove('hidden');
  $('#reader').classList.remove('open');
  grid.innerHTML = enr.map(e=>{
    const c=courses.find(x=>x.id===e.courseId)||{};
    return `<article class="card">
      <img class="course-thumb" src="${esc(c.img||seedImg(e.courseId))}" alt="">
      <div class="row"><div class="h4">${esc(c.title||e.courseId)}</div><div class="grow"></div><div>${Math.round(e.progress||0)}%</div></div>
      <div class="row"><div class="muted">${esc(c.category||'')}</div><div class="grow"></div><div>${c.price?'$'+c.price:'Free'}</div></div>
      <div class="row"><button class="btn primary" data-continue="${esc(e.courseId)}">Continue</button></div>
    </article>`;
  }).join('') || `<div class="card">No enrollments yet.</div>`;
}

/* reader with quizzes/assignments/final + fireworks + email report */
const fxCanvas = $('#fx');
function fireworks(duration=2000){
  const ctx=fxCanvas.getContext('2d'), W=fxCanvas.width=innerWidth, H=fxCanvas.height=innerHeight;
  fxCanvas.style.display='block';
  const parts=Array.from({length:120},()=>({x:W/2,y:H/2,vx:(Math.random()-0.5)*6,vy:(Math.random()-0.5)*6,life:Math.random()*60+30,color:`hsl(${Math.random()*360},90%,60%)`}));
  let t=0;
  (function loop(){
    t++; ctx.fillStyle='rgba(0,0,0,0.15)'; ctx.fillRect(0,0,W,H);
    parts.forEach(p=>{
      p.x+=p.vx; p.y+=p.vy; p.vy+=0.05; p.life--;
      ctx.fillStyle=p.color; ctx.fillRect(p.x,p.y,2,2);
    });
    if(t<duration/16){ requestAnimationFrame(loop); } else { fxCanvas.style.display='none'; }
  })();
}

function openReader(cid){
  showPage('mylearning');
  const grid=$('#mylearn-grid'), r=$('#reader');
  grid.classList.add('hidden');
  r.classList.add('open');
  r.dataset.courseId=cid;

  const chapters=[
    {h:'Introduction', body:'Welcome to the course. This section gives you an overview.'},
    {h:'Chapter 1: Concepts', body:'Core ideas and visual examples with an image.'},
    {h:'Chapter 2: Media', body:'Audio and video sample below for richer learning.'},
    {h:'Exercise', body:'Short quiz and a reflection assignment.'},
    {h:'Final Exam', body:'Single best-answer question to finish the course.'}
  ];
  let ix=0, score=0;

  const renderBody=()=>{
    const c=chapters[ix];
    const pct = Math.round(((ix+1)/chapters.length)*100);
    r.innerHTML = `
      <div class="row">
        <button class="btn" id="back" type="button">← Back</button>
        <div class="grow"></div><div id="prog">${pct}%</div>
      </div>
      <div style="height:8px;background:#0002;border-radius:6px;margin:8px 0">
        <div id="bar" style="height:8px;width:${pct}%;background:var(--primary);border-radius:6px"></div>
      </div>
      <h3>${esc(c.h)} — (${ix+1}/${chapters.length})</h3>
      <p>${esc(c.body)}</p>
      ${ix===1?`<img class="course-thumb" src="${seedImg(cid+'-chapter')}" alt="">`:''}
      ${ix===2?`
        <audio controls style="width:100%;margin-top:8px">
          <source src="https://www.kozco.com/tech/piano2-CoolEdit.mp3" type="audio/mpeg">
        </audio>
        <video controls style="width:100%;margin-top:8px">
          <source src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4" type="video/mp4">
        </video>`:''}
      ${ix===3?`
        <div class="card" style="margin-top:10px">
          <b>Quick Quiz</b>
          <div><label><input type="radio" name="q1" value="A"> Option A</label></div>
          <div><label><input type="radio" name="q1" value="B"> Option B (correct)</label></div>
          <div><label><input type="radio" name="q1" value="C"> Option C</label></div>
          <b style="display:block;margin-top:10px">Short Answer</b>
          <textarea id="shortAns" rows="3" placeholder="Write a short reflection..."></textarea>
          <b style="display:block;margin-top:10px">Assignment (optional link)</b>
          <input id="assLink" placeholder="Paste your assignment link (Google Doc / GitHub)"/>
          <button class="btn" id="submitQuiz" style="margin-top:8px">Submit</button>
          <div id="quizStatus" class="muted" style="margin-top:6px"></div>
        </div>`:''}
      ${ix===4?`
        <div class="card" style="margin-top:10px">
          <b>Final Exam</b>
          <p>Which statement is true?</p>
          <div><label><input type="radio" name="final" value="X"> X</label></div>
          <div><label><input type="radio" name="final" value="Y"> Y (correct)</label></div>
          <div><label><input type="radio" name="final" value="Z"> Z</label></div>
          <button class="btn primary" id="finishBtn" style="margin-top:8px">Finish & Generate Certificate</button>
          <div id="finalStatus" class="muted" style="margin-top:6px"></div>
        </div>`:''}
      <div class="row" style="margin-top:12px">
        <button class="btn" id="prev" ${ix===0?'disabled':''}>Previous</button>
        <div class="grow"></div>
        <button class="btn primary" id="next" ${ix===chapters.length-1?'disabled':''}>Next</button>
      </div>`;

    $('#back').onclick=()=>{ r.classList.remove('open'); grid.classList.remove('hidden'); showPage('mylearning'); window.scrollTo({top:0,behavior:'smooth'}); };
    $('#prev').onclick=()=>{ if(ix>0){ ix--; renderBody(); } };
    $('#next').onclick=()=>{ if(ix<chapters.length-1){ ix++; renderBody(); } };

    $('#submitQuiz')?.addEventListener('click', ()=>{
      const correct = ($$('input[name="q1"]')).find(x=>x.checked)?.value === 'B';
      const sa = $('#shortAns')?.value.trim();
      score = correct ? 80 : 50;
      if(sa?.length>50) score += 10;
      if($('#assLink')?.value.trim()) score += 10;
      $('#quizStatus').textContent = `Recorded — provisional score ${score}%`;
    });

    $('#finishBtn')?.addEventListener('click', ()=>{
      const fin = ($$('input[name="final"]')).find(x=>x.checked)?.value === 'Y';
      if(!fin) { $('#finalStatus').textContent='Pick the correct answer to finish.'; return; }
      const enr=read('ol:enrollments',[]);
      const row = enr.find(e=>e.courseId===cid); if(row){ row.progress=100; row.score = Math.max(row.score||0, score||90); save('ol:enrollments',enr); }
      renderGradebook(); renderMyLearning();
      openCertificate(row?.courseTitle||cid, row?.score||90, currentUser?.email||'Student');
      sendProgressReport(row?.courseTitle||cid, row?.score||90);
      fireworks(2200);
      alert('🎉 Congratulations! You’ve completed the course.');
    });
  };
  renderBody();
}

/* EmailJS report (optional) */
function sendProgressReport(courseTitle, score){
  const admins = ['owner@openlearn.local','admin@openlearn.local'];
  const payload = {
    course: courseTitle,
    score: String(Math.round(score||0))+'%',
    student: currentUser?.email||'anonymous',
    when: new Date().toLocaleString()
  };
  // If EmailJS config present, attempt to send
  try{
    const eid = window.EMAILJS?.SERVICE_ID, tid=window.EMAILJS?.TEMPLATE_ID, kid=window.EMAILJS?.PUBLIC_KEY;
    if(eid && tid && kid && window.emailjs){
      emailjs.init(kid);
      emailjs.send(eid, tid, {...payload, to_email: admins.join(',')});
    } else {
      const log=read('ol:reports',[]); log.push(payload); save('ol:reports',log);
    }
  }catch{
    const log=read('ol:reports',[]); log.push(payload); save('ol:reports',log);
  }
}

/* gradebook + cert/transcript */
function renderGradebook(){
  const data=read('ol:enrollments',[]);
  $('#gradebook').innerHTML = `
    <table class="ol-table">
      <thead><tr><th>Course</th><th>Progress</th><th>Score</th><th>Credits</th><th>Docs</th></tr></thead>
      <tbody>${
        data.map(e=>`<tr>
          <td>${esc(e.courseTitle||e.courseId)}</td>
          <td>${Math.round(e.progress||0)}%</td>
          <td>${Math.round(e.score||0)}%</td>
          <td>${e.credits||3}</td>
          <td>
            <button class="btn small" data-cert="${esc(e.courseTitle||e.courseId)}">Certificate</button>
            <button class="btn small" data-tr="${esc(e.courseTitle||e.courseId)}">Transcript</button>
          </td>
        </tr>`).join('')
      }</tbody>
    </table>`;
}
function openCertificate(courseTitle, score, name){
  const w=window.open('','_blank','width=900,height=700');
  w.document.write(`
    <html><head><title>Certificate</title>
      <style>
        body{font-family:Inter,system-ui,sans-serif;background:#f7fafc;color:#0b0f17;padding:40px}
        .wrap{border:6px solid #1f2937;border-radius:16px;padding:40px;text-align:center}
        h1{font-size:38px;margin:0 0 8px} h2{margin:0 0 20px}
        .muted{color:#475569}
      </style>
    </head><body>
      <div class="wrap">
        <h1>Certificate of Completion</h1>
        <p class="muted">This certifies that</p>
        <h2>${esc(name)}</h2>
        <p class="muted">has successfully completed</p>
        <h2>${esc(courseTitle)}</h2>
        <p>Final Score: <b>${Math.round(score||0)}%</b></p>
        <p class="muted">Date: ${new Date().toLocaleDateString()}</p>
      </div>
      <script>window.print()</script>
    </body></html>
  `);
  w.document.close();
}
function openTranscript(){
  const enr=read('ol:enrollments',[]);
  const name=currentUser?.email||'Student';
  const rows = enr.map(e=>`<tr><td>${esc(e.courseTitle||e.courseId)}</td><td>${Math.round(e.score||0)}%</td><td>${e.credits||3}</td></tr>`).join('');
  const w=window.open('','_blank','width=900,height=700');
  w.document.write(`
    <html><head><title>Transcript</title>
      <style>
        body{font-family:Inter,system-ui,sans-serif;background:#f8fafc;color:#0b0f17;padding:40px}
        table{width:100%;border-collapse:collapse} th,td{border-bottom:1px solid #cbd5e1;padding:10px;text-align:left}
      </style>
    </head><body>
      <h2>Unofficial Transcript — ${esc(name)}</h2>
      <table><thead><tr><th>Course</th><th>Score</th><th>Credits</th></tr></thead><tbody>${rows}</tbody></table>
      <p style="margin-top:14px">Issued: ${new Date().toLocaleString()}</p>
      <script>window.print()</script>
    </body></html>
  `);
  w.document.close();
}

/* profile */
function renderProfile(u, role){
  const p = read('ol:profileSelf', {displayName:'',photoURL:'',bio:'',site:'',github:'',linkedin:'',portfolio:'',dob:''});
  const isBirthday = (()=>{ if(!p.dob) return false; const d=new Date(p.dob); const n=new Date(); return d.getMonth()===n.getMonth() && d.getDate()===n.getDate(); })();
  $('#profilePanel').innerHTML = u
    ? `<div class="profile-card">
        <img src="${esc(p.photoURL||'https://picsum.photos/seed/profile/200/200')}" alt="">
        <div>
          <div><b>${esc(p.displayName||u.email||'Student')}</b></div>
          <div class="muted">UID: ${esc(u.uid||'-')} · Role: ${esc(role||'student')}</div>
          ${p.dob?`<div class="muted">DOB: ${esc(p.dob)}</div>`:''}
          ${isBirthday?`<div>🎂 <b>Happy Birthday!</b> Wishing you joyful learning! ✨</div>`:''}
          <p>${esc(p.bio||'')}</p>
          <div class="row">
            ${p.site? `<a class="badge" href="${esc(p.site)}" target="_blank">Website</a>`:''}
            ${p.github? `<a class="badge" href="${esc(p.github)}" target="_blank">GitHub</a>`:''}
            ${p.linkedin? `<a class="badge" href="${esc(p.linkedin)}" target="_blank">LinkedIn</a>`:''}
            ${p.portfolio? `<a class="badge" href="${esc(p.portfolio)}" target="_blank">Portfolio</a>`:''}
          </div>
        </div>
      </div>`
    : `<div class="muted">Not signed in.</div>`;
  if(isBirthday) fireworks(1800);
}
function renderAdminVisibility(role){
  const isStaff=['owner','admin','instructor','ta'].includes(role);
  $('#announceToolbar')?.classList.toggle('ol-hidden', !isStaff);
  // hide Admin menu for non-staff
  const adminBtn = $$('.navbtn').find(b=>b.dataset.page==='admin');
  if(adminBtn) adminBtn.style.display = isStaff? 'flex':'none';
}
function toggleStaffUI(){ renderAdminVisibility(currentRole); }

/* profile modal handlers */
const profModal=$('#profileModal'), profForm=$('#profileForm');
$('#btn-edit-profile')?.addEventListener('click', ()=>{
  const p = read('ol:profileSelf', {});
  for (const k of ['displayName','photoURL','bio','site','github','linkedin','portfolio','dob']) {
    if(profForm[k]) profForm[k].value = p[k]||'';
  }
  profModal.showModal();
});
$('#btn-view-card')?.addEventListener('click', ()=>{
  const p = read('ol:profileSelf', {});
  const u=currentUser||{};
  const w=window.open('','_blank','width=800,height=600');
  w.document.write(`
    <html><head><title>Profile Card</title>
      <style>
        body{font-family:Inter,system-ui,sans-serif;background:#0b0f17;color:#eaf1ff;padding:30px}
        .wrap{background:#111827;border:1px solid #1f2a3b;border-radius:16px;padding:20px}
        img{width:120px;height:120px;border-radius:12px;object-fit:cover}
        .muted{color:#9fb0c3}
        .badge{display:inline-block;margin-right:8px;border:1px solid #1f2a3b;border-radius:999px;padding:4px 10px}
      </style>
    </head><body>
      <div class="wrap">
        <div style="display:flex;gap:14px;align-items:center">
          <img src="${esc(p.photoURL||'https://picsum.photos/seed/profile/200/200')}">
          <div>
            <h2 style="margin:0">${esc(p.displayName||u.email||'Student')}</h2>
            <div class="muted">UID: ${esc(u.uid||'-')}</div>
            ${p.dob?`<div class="muted">DOB: ${esc(p.dob)}</div>`:''}
          </div>
        </div>
        <p>${esc(p.bio||'')}</p>
        <div>
          ${p.site? `<a class="badge" href="${esc(p.site)}" target="_blank">Website</a>`:''}
          ${p.github? `<a class="badge" href="${esc(p.github)}" target="_blank">GitHub</a>`:''}
          ${p.linkedin? `<a class="badge" href="${esc(p.linkedin)}" target="_blank">LinkedIn</a>`:''}
          ${p.portfolio? `<a class="badge" href="${esc(p.portfolio)}" target="_blank">Portfolio</a>`:''}
        </div>
      </div>
    </body></html>
  `);
  w.document.close();
});
$('#closeProfileModal').addEventListener('click', ()=> profModal.close());
$('#cancelProfile').addEventListener('click', ()=> profModal.close());
profForm.addEventListener('submit', (e)=>{
  e.preventDefault();
  const fd = new FormData(profForm);
  const obj = Object.fromEntries(fd.entries());
  save('ol:profileSelf', obj);
  profModal.close();
  renderProfile(currentUser, currentRole);
  alert('Profile updated.');
});

/* announcements */
function initStudentDashboard(){
  const posts=read('ol:posts',[]);
  $('#stuDashPanel').innerHTML = posts.length
    ? posts.map(p=>`<div class="card" data-post="${esc(p.id)}">
        <div class="row"><div class="h4">${esc(p.t)}</div><div class="grow"></div><div class="muted">${new Date(p.at).toLocaleString()}</div></div>
        <p>${esc(p.b||'')}</p>
        ${['owner','admin','instructor','ta'].includes(currentRole)?`
          <div class="row" style="justify-content:flex-end;gap:6px">
            <button class="btn small" data-edit-post="${esc(p.id)}">Edit</button>
            <button class="btn small" data-del-post="${esc(p.id)}">Delete</button>
          </div>`:''
        }
      </div>`).join('')
    : 'No announcements yet.';
}
function upsertPost({id,t,b}){
  const arr=read('ol:posts',[]);
  if(id){
    const i=arr.findIndex(x=>x.id===id); if(i>=0) arr[i]={...arr[i],t,b,at:Date.now()};
  }else{
    arr.unshift({id:'p_'+Date.now(), t, b, at:Date.now()});
  }
  save('ol:posts',arr); initStudentDashboard();
}
const postModal=$('#postModal');
$('#btn-new-post')?.addEventListener('click', ()=>{
  if(!['owner','admin','instructor','ta'].includes(currentRole)) return alert('Staff only');
  $('#postModalTitle').textContent='New Announcement';
  $('#pmId').value=''; $('#pmTitle').value=''; $('#pmBody').value='';
  postModal.showModal();
});
$('#closePostModal').addEventListener('click', ()=> postModal.close());
$('#cancelPost').addEventListener('click', ()=> postModal.close());
$('#postForm').addEventListener('submit',(e)=>{
  e.preventDefault();
  const id=$('#pmId').value||null, t=$('#pmTitle').value.trim(), b=$('#pmBody').value.trim();
  if(!t||!b) return;
  upsertPost({id,t,b}); postModal.close();
});
document.addEventListener('click',(e)=>{
  const ep=e.target.closest('[data-edit-post]'); if(ep){
    const id=ep.dataset.editPost; const p=read('ol:posts',[]).find(x=>x.id===id); if(!p) return;
    $('#postModalTitle').textContent='Edit Announcement';
    $('#pmId').value=id; $('#pmTitle').value=p.t; $('#pmBody').value=p.b;
    postModal.showModal(); return;
  }
  const dp=e.target.closest('[data-del-post]'); if(dp){
    const id=dp.dataset.delPost; if(!confirm('Delete this post?')) return;
    const arr=read('ol:posts',[]).filter(x=>x.id!==id); save('ol:posts',arr); initStudentDashboard(); return;
  }
});

/* calendar */
function renderCalendar(){
  const grid = $('#calGrid'); if(!grid) return;
  const list = read('ol:cal',[]);
  const now = new Date(); const y=now.getFullYear(), m=now.getMonth();
  const first = new Date(y,m,1); const startDay = first.getDay();
  const daysInMonth = new Date(y, m+1, 0).getDate();
  const cells=[];
  for(let i=0;i<startDay;i++) cells.push({blank:true});
  for(let d=1; d<=daysInMonth; d++){
    const iso = new Date(y,m,d).toISOString().slice(0,10);
    const events = list.filter(e=>e.date===iso);
    cells.push({d, iso, events});
  }
  grid.innerHTML = cells.map(c=> c.blank? `<div class="cell"></div>`
    : `<div class="cell" data-day="${c.iso}">
        <div class="d">${c.d}</div>
        ${c.events.map(e=>`<div class="event" data-eid="${esc(e.id)}"><div class="t">${esc(e.title)}</div></div>`).join('')}
      </div>`
  ).join('');
}
function renderCalendarList(){
  const list = read('ol:cal',[]);
  $('#calList').innerHTML = list.length? list.map(e=>`
    <div class="row" data-eid="${esc(e.id)}">
      <div>${esc(e.date)} · <b>${esc(e.title)}</b></div>
      ${['owner','admin','instructor','ta'].includes(currentRole)?`
      <div class="row">
        <button class="btn small" data-edit-cal="${esc(e.id)}">Edit</button>
        <button class="btn small" data-del-cal="${esc(e.id)}">Delete</button>
      </div>`:''}
    </div>
  `).join(''): `<div class="muted">No events yet.</div>`;
}
$('#addCal')?.addEventListener('click', ()=>{
  const t=$('#calTitle')?.value.trim(), d=$('#calDate')?.value;
  if(!t||!d) return alert('Title & date required');
  const arr=read('ol:cal',[]); 
  arr.push({id:'e_'+Date.now(), title:t,date:d});
  save('ol:cal',arr);
  $('#calTitle').value=''; $('#calDate').value='';
  renderCalendar(); renderCalendarList();
  alert('Event added.');
});
document.addEventListener('click',(e)=>{
  const ec=e.target.closest('[data-edit-cal]'); if(ec){
    if(!['owner','admin','instructor','ta'].includes(currentRole)) return alert('Staff only');
    const id=ec.dataset.editCal; const arr=read('ol:cal',[]); const it=arr.find(x=>x.id===id); if(!it) return;
    const nt = prompt('Edit title', it.title||''); if(nt==null) return;
    const nd = prompt('Edit date (YYYY-MM-DD)', it.date||''); if(!nd) return;
    it.title=nt; it.date=nd; save('ol:cal',arr); renderCalendar(); renderCalendarList(); return;
  }
  const dc=e.target.closest('[data-del-cal]'); if(dc){
    if(!['owner','admin','instructor','ta'].includes(currentRole)) return alert('Staff only');
    const id=dc.dataset.delCal; if(!confirm('Delete event?')) return;
    let arr=read('ol:cal',[]); arr=arr.filter(x=>x.id!==id); save('ol:cal',arr); renderCalendar(); renderCalendarList(); return;
  }
});

/* admin course table */
function renderAdmin(){
  const tbody = $('#adminCourseTable tbody');
  const list = read('ol:courses',[]);
  tbody.innerHTML = list.map(c=>`
    <tr data-id="${esc(c.id)}">
      <td>${esc(c.id)}</td><td>${esc(c.title)}</td><td>${esc(c.category)}</td><td>${esc(c.level)}</td>
      <td>${c.price?('$'+c.price):'Free'}</td><td>${esc(c.rating)}</td><td>${esc(c.hours)}</td>
      <td style="text-align:right">
        <button class="iconbtn" data-edit="${esc(c.id)}" title="Edit">✏️</button>
        <button class="iconbtn" data-del="${esc(c.id)}" title="Delete">🗑️</button>
      </td>
    </tr>`).join('') || `<tr><td colspan="8">No courses.</td></tr>`;
}

/* new/edit course modal */
const courseModal=$('#courseModal'), courseForm=$('#courseForm');
$('#courseClose').addEventListener('click', ()=> courseModal.close());
$('#courseCancel').addEventListener('click', ()=> courseModal.close());
function openCourseModal(mode='new', course=null){
  $('#courseModalTitle').textContent = mode==='edit' ? 'Edit Course' : 'New Course';
  courseForm.reset();
  if(mode==='edit' && course){
    courseForm.id.value = course.id;
    courseForm.title.value = course.title||'';
    courseForm.category.value = course.category||'General';
    courseForm.level.value = course.level||'Beginner';
    courseForm.price.value = course.price||0;
    courseForm.rating.value = course.rating||4.5;
    courseForm.hours.value = course.hours||6;
    courseForm.credits.value = course.credits||3;
    courseForm.img.value = course.img||'';
    courseForm.description.value = course.description||'';
    courseForm.benefits.value = (course.benefits||[]).join('\n');
  } else {
    courseForm.id.value = 'c_'+Date.now();
  }
  courseModal.showModal();
}
courseForm.addEventListener('submit', (e)=>{
  e.preventDefault();
  const fd = new FormData(courseForm);
  const obj = Object.fromEntries(fd.entries());
  obj.price = Number(obj.price||0);
  obj.rating = Number(obj.rating||4.5);
  obj.hours = Number(obj.hours||6);
  obj.credits = Number(obj.credits||3);
  obj.img = obj.img?.trim() || seedImg(obj.id);
  obj.benefits = (obj.benefits||'').split('\n').map(x=>x.trim()).filter(Boolean);
  const list = read('ol:courses',[]);
  const idx = list.findIndex(x=>x.id===obj.id);
  if(idx>=0) list[idx]=obj; else list.push(obj);
  save('ol:courses', list);
  courseModal.close();
  renderCatalog(); renderAdmin();
});

/* chat (local demo) */
function roomKey(){
  const mode = $('#chatRoomSel').value;
  const tgt  = ($('#chatTarget').value||'').trim();
  if(mode==='general') return 'general';
  if(mode==='course')  return 'course:'+(tgt || $('#reader')?.dataset.courseId || 'none');
  if(mode==='dm')      return 'dm:'+ (tgt||'someone@example.com');
  if(mode==='ta')      return 'dm:ta@openlearn.local';
  return 'general';
}
function renderChat(){
  const key = roomKey();
  const arr = read('ol:chat:'+key,[]);
  $('#chatlog').innerHTML = arr.length? arr.map(m=>`<div class="row"><b>${esc(m.from)}</b><span class="muted">${new Date(m.at).toLocaleTimeString()}</span><div class="grow"></div></div><div style="margin:-6px 0 8px 0">${esc(m.text)}</div>`).join('') : `<div class="muted">No messages in ${esc(key)}.</div>`;
}
$('#chatRoomSel').addEventListener('change', renderChat);
$('#chatTarget').addEventListener('input', renderChat);
$('#sendChat').addEventListener('click', ()=>{
  const key=roomKey(), text=$('#chatmsg').value.trim(); if(!text) return;
  const arr = read('ol:chat:'+key,[]);
  arr.push({from: currentUser?.email || 'guest', text, at: Date.now()});
  save('ol:chat:'+key, arr);
  $('#chatmsg').value=''; renderChat();
});

/* delegates (clicks) */
document.addEventListener('click', (ev)=>{
  const nav = ev.target.closest('.navbtn');    if(nav){ showPage(nav.dataset.page); return; }
  const go = ev.target.closest('[data-go]');    if(go){ showPage(go.dataset.go); return; }
  const addSamples = ev.target.closest('#btn-add-samples'); if(addSamples){ appendSamples(); return; }
  const newCourse = ev.target.closest('#btn-new-course');   if(newCourse){ openCourseModal('new'); return; }
  const editBtn = ev.target.closest('[data-edit]'); if(editBtn){ const id=editBtn.dataset.edit; const list=read('ol:courses',[]); const c=list.find(x=>x.id===id); if(c) openCourseModal('edit', c); return; }
  const delBtn = ev.target.closest('[data-del]'); if(delBtn){ const id=delBtn.dataset.del; if(confirm('Delete course?')){ let list=read('ol:courses',[]); list=list.filter(x=>x.id!==id); save('ol:courses',list); renderCatalog(); renderAdmin(); } return; }
  const enrollBtn = ev.target.closest('[data-enroll]'); if(enrollBtn){ enroll(enrollBtn.dataset.enroll); return; }
  const contBtn = ev.target.closest('[data-continue]'); if(contBtn){ openReader(contBtn.dataset.continue); return; }
  const detailsBtn = ev.target.closest('[data-details]'); if(detailsBtn){ openDetails(detailsBtn.dataset.details); return; }

  const footerLink = ev.target.closest('[data-link]'); if(footerLink){ showPage(footerLink.dataset.link); return; }

  const certBtn = ev.target.closest('[data-cert]'); if(certBtn){
    const title=certBtn.dataset.cert; const enr=read('ol:enrollments',[]).find(e=>(e.courseTitle||e.courseId)===title);
    openCertificate(title, enr?.score||0, currentUser?.email||'Student'); return;
  }
  const trBtn = ev.target.closest('[data-tr]'); if(trBtn){ openTranscript(); return; }
});

/* search */
$('#topSearch').addEventListener('input', ()=>{
  const q=$('#topSearch')?.value?.trim()?.toLowerCase() || '';
  const list=read('ol:courses',[]);
  const picked=q? list.filter(c=> (c.title||'').toLowerCase().includes(q) ) : list;
  $('#catalog-grid').innerHTML = picked.map(c=>`
    <article class="card">
      <img class="course-thumb" src="${esc(c.img||seedImg(c.id))}" alt="">
      <div class="row"><div class="h4">${esc(c.title)}</div><div class="grow"></div><div>★ ${esc(c.rating)}</div></div>
      <div class="row"><span class="badge">${esc(c.category)}</span><span class="badge">${esc(c.level)}</span><div class="grow"></div><div>${c.price?'$'+c.price:'Free'} · ${esc(c.hours)}h</div></div>
      <p>${esc(c.description||'')}</p>
      <div class="row">
        <button class="btn" data-details="${esc(c.id)}">Details</button>
        <div class="grow"></div>
        <button class="btn primary" data-enroll="${esc(c.id)}">Enroll</button>
      </div>
    </article>`).join('');
});

/* Contact send (demo) */
$('#cSend')?.addEventListener('click', ()=>{
  const n=$('#cName').value.trim(), e=$('#cEmail').value.trim(), m=$('#cMsg').value.trim();
  if(!n||!e||!m) return $('#cStatus').textContent='Please fill all fields.';
  $('#cStatus').textContent='Thanks! We will get back soon. (demo)';
});

/* theme + font (global) */
const $root=document.documentElement; const THEMES=['dark','rose','amber','slate','emerald','purple','orange','teal','indigo','ocean'];
function applyTheme(t){ $root.classList.remove(...THEMES.map(x=>'theme-'+x)); if(t!=='dark') $root.classList.add('theme-'+t); localStorage.setItem('ol:theme',t); }
function applyFont(px){ $root.style.setProperty('--font', px); localStorage.setItem('ol:font', px); }
$('#themeSel')?.addEventListener('change', e=> applyTheme(e.target.value));
$('#fontSel')?.addEventListener('change', e=> applyFont(e.target.value));

/* boot */
function boot(){
  applyTheme(localStorage.getItem('ol:theme')||'dark');
  applyFont(localStorage.getItem('ol:font')||'16px');
  if(!read('ol:courses',[]).length) appendSamples();
  renderCatalog(); renderMyLearning(); renderGradebook(); initStudentDashboard(); renderAdmin(); renderChat(); renderCalendar(); renderCalendarList();
  const saved = localStorage.getItem('ol:last') || 'catalog';
  showPage(saved);
}
document.addEventListener('DOMContentLoaded', boot);

/* ===== Role-based menus (info for owner/admin/ta/student) =====
owner/admin/ta/instructor: can see Dashboard (add/edit/delete announcements), Calendar edit/delete, Admin menu (course CRUD)
student: sees Courses, My Learning, Gradebook, Dashboard (read-only), Profile, Settings, Live Chat
(Implementation: renderAdminVisibility() toggles Admin; announcement toolbar hidden for non-staff)
===== */