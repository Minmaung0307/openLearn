
window.__ol_progress = {
  set(courseId, pct){ const key='ol:enrollments'; const list=JSON.parse(localStorage.getItem(key)||'[]'); const i=list.findIndex(x=>x.courseId===courseId); if(i>=0){list[i].progress=pct; localStorage.setItem(key,JSON.stringify(list));} },
  score(courseId, val){ const key='ol:enrollments'; const list=JSON.parse(localStorage.getItem(key)||'[]'); const i=list.findIndex(x=>x.courseId===courseId); if(i>=0){list[i].score=val; localStorage.setItem(key,JSON.stringify(list));} }
};
