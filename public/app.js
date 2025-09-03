const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const esc = s => (s??'').toString().replace(/[&<>"]/g,c=>({'&':'&','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function showPage(id){
  $$('.page').forEach(p=>p.classList.remove('active'));
  $('#page-'+id)?.classList.add('active');
  localStorage.setItem('ol:last', id);
}

// ---------- Firebase ----------
import {
  auth, db, onAuthStateChanged,
  signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut,
  doc, getDoc, setDoc
} from '/firebase.js';

// Optional: fixed bootstrap admins by email (local helper)
const BOOTSTRAP_ADMINS = ['admin@openlearn.com'];

// ---------- Auth Modal ----------
const modal = $('#authModal');
function openAuth(tab='login'){
  $('#authTitle').textContent = tab==='signup'?'Sign up':(tab==='forgot'?'Reset password':'Sign in');
  $$('.ol-tabs .tab').forEach(t=>t.classList.toggle('active', t.dataset.authtab===tab));
  $('#authLogin').classList.toggle('ol-hidden', tab!=='login');
  $('#authSignup').classList.toggle('ol-hidden', tab!=='signup');
  $('#authForgot').classList.toggle('ol-hidden', tab!=='forgot');
  $('#authMsg').textContent = '';
  try{ modal.showModal(); }catch{}
}
$('#authClose').addEventListener('click', ()=>{ modal.close(); document.body.style.pointerEvents='auto'; });

// Tabs
$$('.ol-tabs .tab').forEach(t=> t.addEventListener('click', ()=> openAuth(t.dataset.authtab)));

// Buttons
$('#btn-login').addEventListener('click', ()=> openAuth('login'));
$('#btn-logout').addEventListener('click', async ()=>{
  await signOut(auth);
  alert('Logged out');
});

// Form handlers
$('#authLogin').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const email=$('#loginEmail').value.trim(), pass=$('#loginPass').value;
  try{
    await signInWithEmailAndPassword(auth,email,pass);
    $('#authMsg').textContent='Signed in ✓';
    setTimeout(()=>{ modal.close(); document.body.style.pointerEvents='auto'; }, 250);
  }catch(err){
    console.warn(err); $('#authMsg').textContent=err?.message||'Login failed';
  }
});

$('#authSignup').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const email=$('#signupEmail').value.trim(), pass=$('#signupPass').value;
  try{
    const res=await createUserWithEmailAndPassword(auth,email,pass);
    const uref=doc(db,'users',res.user.uid);
    const snap=await getDoc(uref);
    const role = BOOTSTRAP_ADMINS.includes(email) ? 'admin' : 'student';
    if(!snap.exists()) await setDoc(uref,{role,email,createdAt:Date.now()});
    localStorage.setItem('ol:role', role);
    $('#authMsg').textContent='Account created ✓';
    setTimeout(()=>{ modal.close(); document.body.style.pointerEvents='auto'; }, 300);
  }catch(err){
    console.warn(err); $('#authMsg').textContent=err?.message||'Sign up failed';
  }
});

$('#authForgot').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const email=$('#forgotEmail').value.trim();
  try{
    await sendPasswordResetEmail(auth,email);
    $('#authMsg').textContent='Reset email sent ✓';
  }catch(err){ console.warn(err); $('#authMsg').textContent=err?.message||'Failed'; }
});

// Auth state → toggle UI
onAuthStateChanged(auth, async (u)=>{
  $('#btn-login').style.display = u ? 'none' : 'inline-flex';
  $('#btn-logout').style.display = u ? 'inline-flex' : 'none';
  // Enable clicks if modal/backdrop left hanging
  document.body.style.pointerEvents='auto';
  if(u){
    try{
      const uref=doc(db,'users',u.uid);
      const s=await getDoc(uref);
      let role=s.exists()? (s.data().role||'student') : (localStorage.getItem('ol:role')||'student');
      if(!s.exists()){
        await setDoc(uref,{role,email:u.email||'',createdAt:Date.now()});
      }
      localStorage.setItem('ol:role', role);
      renderProfile(u, role);
      toggleAdminComposer(role);
    }catch(e){
      // offline/local fallback
      const fallbackRole = localStorage.getItem('ol:role') || (BOOTSTRAP_ADMINS.includes(u.email||'')?'admin':'student');
      localStorage.setItem('ol:role', fallbackRole);
      renderProfile(u, fallbackRole);
      toggleAdminComposer(fallbackRole);
    }
  }else{
    renderProfile(null,'guest');
    toggleAdminComposer('guest');
  }
});

// ---------- Data (local demo) ----------
const samples=[
  {id:'web101',title:'HTML & CSS Basics',img:'/icons/icon-192.png',category:'Web',level:'Beginner',rating:4.6,price:0,hours:6,credits:3,description:'Learn the building blocks of the web.'},
  {id:'js201', title:'Modern JavaScript', img:'/icons/icon-192.png',category:'Web',level:'Intermediate',rating:4.5,price:29,hours:12,credits:4,description:'ES6, modules, async, and more.'},
  {id:'py101', title:'Python for Everyone', img:'/icons/icon-192.png',category:'Data',level:'Beginner',rating:4.7,price:0,hours:10,credits:3,description:'Python fundamentals with practice.'},
  {id:'sql200',title:'SQL Essentials',   img:'/icons/icon-192.png',category:'Data',level:'Intermediate',rating:4.4,price:19,hours:8,credits:2,description:'Queries, joins, and optimization.'},
  {id:'ml300', title:'Intro to Machine Learning', img:'/icons/icon-192.png',category:'AI',level:'Intermediate',rating:4.5,price:39,hours:14,credits:4,description:'ML concepts and scikit-learn.'},
  {id:'ux101', title:'UX Design Fundamentals', img:'/icons/icon-192.png',category:'Design',level:'Beginner',rating:4.3,price:0,hours:7,credits:2,description:'Research to wireframes.'},
  {id:'pm101', title:'Project Management', img:'/icons/icon-192.png',category:'Business',level:'Beginner',rating:4.2,price:9,hours:6,credits:2,description:'Plan, execute, deliver.'}
];
const save=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const read=(k,d=[])=>{try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(d))}catch{return d}};

// ---------- Catalog ----------
function renderCatalog(){
  const cur=read('ol:courses',[]);
  if(!cur.length) save('ol:courses', samples.slice());
  const courses=read('ol:courses',[]);
  $('#catalog-grid').innerHTML = courses.map(c=>`
    <article class="card" data-id="${esc(c.id)}">
      <img class="course-thumb" src="${esc(c.img||'/icons/icon-192.png')}" alt="">
      <div class="row"><div class="h4">${esc(c.title)}</div><div class="grow"></div><div>★ ${esc(c.rating)}</div></div>
      <div class="row"><span class="badge">${esc(c.category)}</span><span class="badge">${esc(c.level)}</span><div class="grow"></div><div>${c.price?'$'+c.price:'Free'} · ${esc(c.hours)}h</div></div>
      <p>${esc(c.description||'')}</p>
      <div class="row">
        <button class="btn" data-enroll="${esc(c.id)}">Enroll</button>
        <button class="btn primary" data-open="${esc(c.id)}">Open</button>
      </div>
    </article>
  `).join('');
}
function enroll(cid){
  const list=read('ol:enrollments',[]);
  const courses=read('ol:courses',[]);
  const c=courses.find(x=>x.id===cid); if(!c) return;
  if(!list.find(e=>e.courseId===cid)){
    list.push({courseId:cid,courseTitle:c.title,progress:0,score:0,credits:c.credits||3,price:c.price||0});
    save('ol:enrollments',list);
  }
  renderMyLearning(); alert('Enrolled ✓');
}
$('#btn-new-course').addEventListener('click', ()=>{
  const id='c_'+Date.now();
  const title=prompt('Course title?'); if(!title) return;
  const img=prompt('Thumbnail image URL?','/icons/icon-192.png')||'/icons/icon-192.png';
  const category=prompt('Category?','General')||'General';
  const level=prompt('Level? (Beginner/Intermediate/Advanced)','Beginner')||'Beginner';
  const price=Number(prompt('Price USD? (0 for free)','0')||0);
  const rating=Number(prompt('Rating 0~5?','4.5')||4.5);
  const hours=Number(prompt('Hours?','6')||6);
  const credits=Number(prompt('Credits?','3')||3);
  const description=prompt('Short description?')||'';
  const list=read('ol:courses',[]);
  list.push({id,title,img,category,level,price,rating,hours,credits,description});
  save('ol:courses',list); renderCatalog();
});
$('#btn-add-samples').addEventListener('click', ()=>{
  const cur=read('ol:courses',[]);
  samples.forEach(s=>{ if(!cur.find(x=>x.id===s.id)) cur.push(s); });
  save('ol:courses',cur); renderCatalog(); alert('7 samples added ✓');
});

// ---------- Reader / My Learning ----------
function openReader(cid){
  const r=$('#reader');
  r.dataset.courseId=cid; showPage('mylearning'); r.style.display='';
  r.innerHTML = `
    <div class="row"><button class="btn" id="back" type="button">← Back</button><div class="grow"></div><div id="prog">0%</div></div>
    <div style="height:8px;background:#0002;border-radius:6px;margin:8px 0"><div id="bar" style="height:8px;width:0;background:var(--primary);border-radius:6px"></div></div>
    <div><h3>${esc(cid)}</h3><p>Sample chapter content… (images, video, audio, quizzes can be wired next)</p></div>`;
  $('#back').onclick=()=> showPage('mylearning');
}
function renderMyLearning(){
  const enr=read('ol:enrollments',[]), courses=read('ol:courses',[]);
  $('#mylearn-grid').innerHTML = enr.map(e=>{
    const c=courses.find(x=>x.id===e.courseId)||{};
    return `<article class="card">
      <img class="course-thumb" src="${esc(c.img||'/icons/icon-192.png')}" alt="">
      <div class="row"><div class="h4">${esc(c.title||e.courseId)}</div><div class="grow"></div><div>${Math.round(e.progress||0)}%</div></div>
      <div class="row"><div class="muted">${esc(c.category||'')}</div><div class="grow"></div><div>${c.price?'$'+c.price:'Free'}</div></div>
      <div class="row"><button class="btn primary" data-continue="${esc(e.courseId)}">Continue</button></div>
    </article>`;
  }).join('');
}
function renderGradebook(){
  const data=read('ol:enrollments',[]);
  $('#gradebook').innerHTML = `
    <table class="ol-table">
      <thead><tr><th>Course</th><th>Progress</th><th>Score</th><th>Credits</th></tr></thead>
      <tbody>${data.map(e=>`<tr><td>${esc(e.courseTitle||e.courseId)}</td><td>${Math.round(e.progress||0)}%</td><td>${Math.round(e.score||0)}%</td><td>${e.credits||3}</td></tr>`).join('')}</tbody>
    </table>`;
}
function renderProfile(u, role){
  $('#profilePanel').innerHTML = u
    ? `<div><b>${esc(u.email||'')}</b></div><div class="muted">UID: ${esc(u.uid||'-')}</div><div class="muted">Role: ${esc(role)}</div>`
    : `<div class="muted">Not signed in.</div>`;
}

// ---------- Dashboard (Announcements) ----------
function toggleAdminComposer(role){
  $('#adminDashComposer').classList.toggle('ol-hidden', !(role==='owner'||role==='admin'||role==='instructor'||role==='ta'));
}
function initStudentDashboard(){
  const posts=JSON.parse(localStorage.getItem('ol:posts')||'[]');
  $('#stuDashPanel').innerHTML = posts.length
    ? posts.map(p=>`<div class="card"><div class="h4">${esc(p.t)}</div><div class="muted">${new Date(p.at).toLocaleString()}</div><p>${esc(p.b||'')}</p></div>`).join('')
    : 'No announcements yet.';
}
$('#postDash').addEventListener('click', ()=>{
  const t=$('#dashTitle').value.trim(), b=$('#dashBody').value.trim(); if(!t) return;
  const posts=JSON.parse(localStorage.getItem('ol:posts')||'[]'); posts.unshift({t,b,at:Date.now()});
  localStorage.setItem('ol:posts', JSON.stringify(posts));
  $('#dashTitle').value=''; $('#dashBody').value=''; initStudentDashboard(); alert('Posted ✓');
});

// ---------- Settings (Theme + Font) ----------
const $root=document.documentElement; const THEMES=['dark','rose','amber','slate'];
function applyTheme(t){ $root.classList.remove(...THEMES.map(x=>'theme-'+x)); if(t!=='dark') $root.classList.add('theme-'+t); localStorage.setItem('ol:theme',t); }
function applyFont(px){ $root.style.setProperty('--font', px); localStorage.setItem('ol:font', px); }
$('#themeSel')?.addEventListener('change', e=> applyTheme(e.target.value));
$('#fontSel')?.addEventListener('change', e=> applyFont(e.target.value));

// ---------- Global nav + search ----------
document.addEventListener('click', (ev)=>{
  const b = ev.target.closest('.navbtn');
  if(b){ showPage(b.dataset.page); return; }

  const enrollBtn = ev.target.closest('[data-enroll]');
  if(enrollBtn){ enroll(enrollBtn.dataset.enroll); return; }

  const openBtn = ev.target.closest('[data-open]');
  if(openBtn){ openReader(openBtn.dataset.open); return; }

  const contBtn = ev.target.closest('[data-continue]');
  if(contBtn){ openReader(contBtn.dataset.continue); return; }
});

$('#topSearch').addEventListener('input', ()=>{
  const q=$('#topSearch')?.value?.trim()?.toLowerCase() || '';
  const list=read('ol:courses',[]);
  const picked=q? list.filter(c=> (c.title||'').toLowerCase().includes(q) ) : list;
  $('#catalog-grid').innerHTML = picked.map(c=>`
    <article class="card">
      <img class="course-thumb" src="${esc(c.img||'/icons/icon-192.png')}" alt="">
      <div class="row"><div class="h4">${esc(c.title)}</div><div class="grow"></div><div>★ ${esc(c.rating)}</div></div>
      <div class="row"><span class="badge">${esc(c.category)}</span><span class="badge">${esc(c.level)}</span><div class="grow"></div><div>${c.price?'$'+c.price:'Free'} · ${esc(c.hours)}h</div></div>
      <p>${esc(c.description||'')}</p>
      <div class="row"><button class="btn" data-enroll="${esc(c.id)}">Enroll</button><button class="btn primary" data-open="${esc(c.id)}">Open</button></div>
    </article>`).join('');
});

// ---------- Boot ----------
function boot(){
  // apply settings first
  applyTheme(localStorage.getItem('ol:theme')||'dark');
  applyFont(localStorage.getItem('ol:font')||'16px');

  renderCatalog(); renderMyLearning(); renderGradebook(); initStudentDashboard();

  // restore last page
  showPage(localStorage.getItem('ol:last') || 'catalog');

  // safety: ensure pointer-events enabled (in case dialog/backdrop got stuck)
  document.body.style.pointerEvents='auto';
}
document.addEventListener('DOMContentLoaded', boot);