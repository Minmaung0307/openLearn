
const $=(s,r=document)=>r.querySelector(s);
function mountReader(cid){
  const r=$('#reader'); if(!r) return;
  r.innerHTML = `<div class="ol-reader ol-grid2">
    <div>
      <div class="ol-head">
        <button class="ol-rbtn" id="back">← Back</button>
        <div class="grow"></div>
        <button class="ol-rbtn" id="note">Add Note</button>
        <button class="ol-rbtn" id="mark">Bookmark</button>
      </div>
      <div class="ol-prog"><div id="progbar" style="width:0%"></div></div>
      <div class="ol-body">
        <h3>Reading: ${cid}</h3>
        <p>Sample chapter. Add your lessons & quizzes from Course Manager.</p>
        <div class="ol-media">
          <iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" height="240" allowfullscreen></iframe>
        </div>
      </div>
    </div>
    <aside class="ol-sticky"><div class="card"><b>Notes</b><div id="notes"></div></div></aside>`;
  r.querySelector('#back').onclick=()=>{ r.dataset.courseId=''; r.style.display='none'; document.querySelector('[data-page=mylearning]').click(); };
  r.querySelector('#note').onclick=()=>{ const t=prompt('Note?'); if(!t) return; const div=document.createElement('div'); div.textContent=t; r.querySelector('#notes').prepend(div); };
  let p=0; const bar=r.querySelector('#progbar'); const tick=()=>{p=Math.min(100,p+10); bar.style.width=p+'%'; if(p<100) setTimeout(tick,400);}; tick();
}
const ob=new MutationObserver(()=>{ const r=document.querySelector('#reader'); if(r?.dataset?.courseId){ mountReader(r.dataset.courseId); } });
document.addEventListener('DOMContentLoaded',()=>{ const r=document.querySelector('#reader'); if(r) ob.observe(r,{attributes:true}); });
