(()=> {
  const ID='analyticsSec';
  function ensure(){
    if (document.getElementById(ID)) return;
    const s=document.createElement('section'); s.id=ID;
    s.innerHTML=`<h2 class="h2">Analytics</h2><div id="analyticsBody"></div>`;
    (document.getElementById('main')||document.body).appendChild(s);
  }
  function render(){
    const host=document.getElementById('analyticsBody'); if (!host) return;
    const enroll=JSON.parse(localStorage.getItem('ol:enroll')||'[]');
    const courses=JSON.parse(localStorage.getItem('ol:courses')||'[]');
    const totalCourses=courses.length;
    const myCourses=enroll.length;
    const avgScore=myCourses?Math.round(enroll.reduce((a,b)=>a+(b.score||0),0)/myCourses):0;
    host.innerHTML=`
      <div class="row gap-3">
        <div class="card p-3"><strong>Total Courses</strong><div style="font-size:28px">${totalCourses}</div></div>
        <div class="card p-3"><strong>My Enrollments</strong><div style="font-size:28px">${myCourses}</div></div>
        <div class="card p-3"><strong>Avg Score</strong><div style="font-size:28px">${avgScore}%</div></div>
      </div>`;
  }
  function show(v){ const s=document.getElementById(ID); if(s) s.style.display=v?'':'none'; }
  function maybe(name){
    if (name!=='analytics'){ show(false); return; }
    ensure(); render(); show(true);
  }
  window.addEventListener('ol:route', e=> maybe(e.detail.name));
  maybe(window.currentRoute||'');
})();