// addon 18 placeholder

(()=> {
  // Step18: Simple analytics cards (local stats)
  const host=document.getElementById('analyticsSec'); if (!host) return;
  const enroll = JSON.parse(localStorage.getItem('ol:enroll')||'[]');
  const courses= JSON.parse(localStorage.getItem('ol:courses')||'[]');
  const totalCourses = courses.length;
  const myCourses = enroll.length;
  const avgScore = enroll.length ? Math.round(enroll.reduce((a,b)=>a+(b.score||0),0)/enroll.length) : 0;
  host.innerHTML = `
    <div class="row gap-3">
      <div class="card p-3"><strong>Total Courses</strong><div style="font-size:28px">${totalCourses}</div></div>
      <div class="card p-3"><strong>My Enrollments</strong><div style="font-size:28px">${myCourses}</div></div>
      <div class="card p-3"><strong>Avg Score</strong><div style="font-size:28px">${avgScore}%</div></div>
    </div>`;
})();