const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const esc = s => (s??'').toString().replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const seedImg = id => `https://picsum.photos/seed/${encodeURIComponent(id)}/640/360`;

let currentUser=null, currentRole='guest', lastPage='catalog', lastNonAuthPage='catalog';

/* Router */
function showPage(id){
  $$('.page').forEach(p=>p.classList.remove('active'));
  const sec = $('#page-'+id);
  if(sec){ sec.classList.add('active'); lastPage=id; if(id!=='auth') lastNonAuthPage=id; window.scrollTo(0,0); }
  if(id==='mylearning') renderMyLearning();
  if(id==='gradebook') renderGradebook();
  if(id==='admin')     renderAdmin();
  if(id==='stu-dashboard') initStudentDashboard();
  if(id==='profile')   renderProfile(currentUser, currentRole);
}

/* Firebase (auth only; from firebase.js) */
import {
  auth, db, onAuthStateChanged,
  signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut,
  doc, getDoc, setDoc
} from '/firebase.js';
const BOOTSTRAP_ADMINS = ['admin@openlearn.com'];

/* Burger menu */
$('#btn-burger')?.addEventListener('click', ()=>{
  $('#sidebar').classList.toggle('open');
});
document.addEventListener('click', (e)=>{
  if(window.matchMedia('(max-width:820px)').matches){
    if(e.target.closest('.navbtn')) $('#sidebar').classList.remove('open');
  }
});

/* Auth Modal (kept) + Fullscreen Auth Page */
function swapPane(group, which){
  const m = group==='modal';
  (m?$('#authLogin'):$('#authLoginPage')).classList.toggle('ol-hidden', which!=='login');
  (m?$('#authSignup'):$('#authSignupPage')).classList.toggle('ol-hidden', which!=='signup');
  (m?$('#authForgot'):$('#authForgotPage')).classList.toggle('ol-hidden', which!=='forgot');
}
function openLoginModal(){ swapPane('modal','login'); try{$('#authModal').showModal();}catch{} }
$('#btn-login').addEventListener('click', openLoginModal);
$('#btn-logout').addEventListener('click', async ()=>{ await signOut(auth); });

/* Modal auth events */
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

/* Fullscreen auth page events */
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
    // hide full-screen login page, show last page
    $('#page-auth').classList.remove('active');
    showPage(lastNonAuthPage || 'catalog');
  } else {
    currentRole='guest';
    localStorage.setItem('ol:role','guest');
    // show full-screen login page only
    showPage('auth'); $('#page-auth').classList.add('active');
  }
  renderProfile(currentUser, currentRole);
  renderAdminVisibility(currentRole);
});

/* Local storage helpers */
const save=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const read=(k,d=[])=>{try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(d))}catch{return d}};

/* Samples */
const baseSamples=[
  {id:'web101',title:'HTML & CSS Basics',category:'Web',level:'Beginner',rating:4.6,price:0,hours:6,credits:3,description:'Learn the building blocks of the web.'},
  {id:'js201', title:'Modern JavaScript', category:'Web',level:'Intermediate',rating:4.5,price:29,hours:12,credits:4,description:'ES6, modules, async, and more.'},
  {id:'py101', title:'Python for Everyone', category:'Data',level:'Beginner',rating:4.7,price:0,hours:10,credits:3,description:'Python fundamentals with practice.'},
  {id:'sql200',title:'SQL Essentials',   category:'Data',level:'Intermediate',rating:4.4,price:19,hours:8,credits:2,description:'Queries, joins, and optimization.'},
  {id:'ml300', title:'Intro to Machine Learning', category:'AI',level:'Intermediate',rating:4.5,price:39,hours:14,credits:4,description:'ML concepts and scikit-learn.'},
  {id:'ux101', title:'UX Design Fundamentals', category:'Design',level:'Beginner',rating:4.3,price:0,hours:7,credits:2,description:'Research to wireframes.'},
  {id:'pm101', title:'Project Management', category:'Business',level:'Beginner',rating:4.2,price:9,hours:6,credits:2,description:'Plan, execute, deliver.'}
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

/* Catalog (Enroll only) */
function renderCatalog(){
  const courses=read('ol:courses',[]);
  $('#catalog-grid').innerHTML = courses.map(c=>`
    <article class="card" data-id="${esc(c.id)}">
      <img class="course-thumb" src="${esc(c.img||seedImg(c.id))}" alt="">
      <div class="row"><div class="h4">${esc(c.title)}</div><div class="grow"></div><div>★ ${esc(c.rating)}</div></div>
      <div class="row"><span class="badge">${esc(c.category)}</span><span class="badge">${esc(c.level)}</span><div class="grow"></div><div>${c.price?'$'+c.price:'Free'} · ${esc(c.hours)}h</div></div>
      <p>${esc(c.description||'')}</p>
      <div class="row"><button class="btn" data-enroll="${esc(c.id)}">Enroll</button></div>
    </article>
  `).join('') || `<div class="card">No courses yet. Click “Add sample data”.</div>`;
}

/* Enroll / MyLearning / Reader */
function enroll(cid){
  const list=read('ol:enrollments',[]);
  const courses=read('ol:courses',[]);
  const c=courses.find(x=>x.id===cid); if(!c) return;
  if(!list.find(e=>e.courseId===cid)){
    list.push({courseId:cid,courseTitle:c.title,progress:0,score:0,credits:c.credits||3,price:c.price||0});
    save('ol:enrollments',list);
  }
  renderMyLearning();
  showPage('mylearning'); // open My Learning after enroll
}
function renderMyLearning(){
  const enr=read('ol:enrollments',[]), courses=read('ol:courses',[]);
  $('#mylearn-grid').innerHTML = enr.map(e=>{
    const c=courses.find(x=>x.id===e.courseId)||{};
    return `<article class="card">
      <img class="course-thumb" src="${esc(c.img||seedImg(e.courseId))}" alt="">
      <div class="row"><div class="h4">${esc(c.title||e.courseId)}</div><div class="grow"></div><div>${Math.round(e.progress||0)}%</div></div>
      <div class="row"><div class="muted">${esc(c.category||'')}</div><div class="grow"></div><div>${c.price?'$'+c.price:'Free'}</div></div>
      <div class="row"><button class="btn primary" data-continue="${esc(e.courseId)}">Continue</button></div>
    </article>`;
  }).join('') || `<div class="card">No enrollments yet.</div>`;
}
function openReader(cid){
  const r=$('#reader');
  r.dataset.courseId=cid; showPage('mylearning'); r.style.display='';
  r.innerHTML = `
    <div class="row">
      <button class="btn" id="back" type="button">← Back</button>
      <div class="grow"></div><div id="prog">0%</div>
    </div>
    <div style="height:8px;background:#0002;border-radius:6px;margin:8px 0"><div id="bar" style="height:8px;width:0;background:var(--primary);border-radius:6px"></div></div>
    <div>
      <h3>${esc(cid)}</h3>
      <p>Sample chapter content — text, image, audio, video, quizzes… (demo).</p>
    </div>`;
  $('#back').onclick=()=> showPage('mylearning');
}

/* Gradebook */
function renderGradebook(){
  const data=read('ol:enrollments',[]);
  $('#gradebook').innerHTML = `
    <table class="ol-table">
      <thead><tr><th>Course</th><th>Progress</th><th>Score</th><th>Credits</th></tr></thead>
      <tbody>${data.map(e=>`<tr><td>${esc(e.courseTitle||e.courseId)}</td><td>${Math.round(e.progress||0)}%</td><td>${Math.round(e.score||0)}%</td><td>${e.credits||3}</td></tr>`).join('')}</tbody>
    </table>`;
}

/* Profile */
function renderProfile(u, role){
  $('#profilePanel').innerHTML = u
    ? `<div><b>${esc(u.email||'')}</b></div><div class="muted">UID: ${esc(u.uid||'-')}</div><div class="muted">Role: ${esc(role||'student')}</div>`
    : `<div class="muted">Not signed in.</div>`;
}

/* Dashboard (announcements) */
function renderAdminVisibility(role){
  $('#adminDashComposer').classList.toggle('ol-hidden', !['owner','admin','instructor','ta'].includes(role));
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
  $('#dashTitle').value=''; $('#dashBody').value=''; initStudentDashboard();
});

/* Admin table */
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

/* Course modal */
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
  const list = read('ol:courses',[]);
  const idx = list.findIndex(x=>x.id===obj.id);
  if(idx>=0) list[idx]=obj; else list.push(obj);
  save('ol:courses', list);
  courseModal.close();
  renderCatalog(); renderAdmin();
});

/* Live Chat (local demo rooms) */
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
  const arr = JSON.parse(localStorage.getItem('ol:chat:'+key)||'[]');
  $('#chatlog').innerHTML = arr.map(m=>`<div class="row"><b>${esc(m.from)}</b><span class="muted">${new Date(m.at).toLocaleTimeString()}</span><div class="grow"></div></div><div style="margin:-6px 0 8px 0">${esc(m.text)}</div>`).join('') || `<div class="muted">No messages in ${esc(key)}.</div>`;
}
$('#chatRoomSel').addEventListener('change', renderChat);
$('#chatTarget').addEventListener('input', renderChat);
$('#sendChat').addEventListener('click', ()=>{
  const key=roomKey(), text=$('#chatmsg').value.trim(); if(!text) return;
  const arr = JSON.parse(localStorage.getItem('ol:chat:'+key)||'[]');
  arr.push({from: currentUser?.email || 'guest', text, at: Date.now()});
  localStorage.setItem('ol:chat:'+key, JSON.stringify(arr));
  $('#chatmsg').value=''; renderChat();
});

/* Global click delegation */
document.addEventListener('click', (ev)=>{
  const nav = ev.target.closest('.navbtn');
  if(nav){ showPage(nav.dataset.page); return; }

  const addSamples = ev.target.closest('#btn-add-samples');
  if(addSamples){ appendSamples(); return; }

  const newCourse = ev.target.closest('#btn-new-course');
  if(newCourse){ openCourseModal('new'); return; }

  const editBtn = ev.target.closest('[data-edit]');
  if(editBtn){ const id=editBtn.dataset.edit; const list=read('ol:courses',[]); const c=list.find(x=>x.id===id); if(c) openCourseModal('edit', c); return; }

  const delBtn = ev.target.closest('[data-del]');
  if(delBtn){ const id=delBtn.dataset.del; if(confirm('Delete course?')){ let list=read('ol:courses',[]); list=list.filter(x=>x.id!==id); save('ol:courses',list); renderCatalog(); renderAdmin(); } return; }

  const enrollBtn = ev.target.closest('[data-enroll]');
  if(enrollBtn){ enroll(enrollBtn.dataset.enroll); return; }

  const contBtn = ev.target.closest('[data-continue]');
  if(contBtn){ openReader(contBtn.dataset.continue); return; }

  const backBtn = ev.target.closest('[data-back]');
  if(backBtn){ showPage(lastNonAuthPage || 'catalog'); return; }

  const footerLink = ev.target.closest('[data-link]');
  if(footerLink){ showPage(footerLink.dataset.link); return; }
});

/* Search */
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
      <div class="row"><button class="btn" data-enroll="${esc(c.id)}">Enroll</button></div>
    </article>`).join('');
});

/* Theme + Font */
const $root=document.documentElement; const THEMES=['dark','rose','amber','slate','emerald','purple','orange','teal','indigo','ocean'];
function applyTheme(t){ $root.classList.remove(...THEMES.map(x=>'theme-'+x)); if(t!=='dark') $root.classList.add('theme-'+t); localStorage.setItem('ol:theme',t); }
function applyFont(px){ $root.style.setProperty('--font', px); localStorage.setItem('ol:font', px); }
$('#themeSel')?.addEventListener('change', e=> applyTheme(e.target.value));
$('#fontSel')?.addEventListener('change', e=> applyFont(e.target.value));

/* Boot */
function boot(){
  applyTheme(localStorage.getItem('ol:theme')||'dark');
  applyFont(localStorage.getItem('ol:font')||'16px');
  if(!read('ol:courses',[]).length) appendSamples();
  renderCatalog(); renderMyLearning(); renderGradebook(); initStudentDashboard(); renderAdmin(); renderChat();
  const saved = localStorage.getItem('ol:last') || 'catalog';
  showPage(saved);
}
document.addEventListener('DOMContentLoaded', boot);