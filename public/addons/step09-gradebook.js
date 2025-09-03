
function mount(){
  const host=document.querySelector('#page-gradebook'); if(!host) return;
  const key='ol:enrollments'; const data=JSON.parse(localStorage.getItem(key)||'[]');
  host.querySelector('#gradebook').innerHTML = '<table class="ol-table"><thead><tr><th>Course</th><th>Progress</th><th>Score</th><th>Credits</th></tr></thead><tbody>' +
    data.map(e=>`<tr><td>${e.courseTitle||e.courseId}</td><td>${Math.round(e.progress||0)}%</td><td>${Math.round(e.score||0)}%</td><td>${e.credits||3}</td></tr>`).join('') +
    '</tbody></table>';
}
document.addEventListener('DOMContentLoaded', mount);
