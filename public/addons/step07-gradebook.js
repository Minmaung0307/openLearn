// addon 07 placeholder

(()=> {
  // Step07: Render simple Gradebook with Scores/Credits
  const KEY_E='ol:enroll', KEY_C='ol:courses';
  const getE=()=>{ try{return JSON.parse(localStorage.getItem(KEY_E)||'[]')}catch{return[]} };
  const getC=()=>{ try{return JSON.parse(localStorage.getItem(KEY_C)||'[]')}catch{return[]} };
  function render(){
    const host=document.getElementById('gradebookTable'); if (!host) return;
    const courses=getC(), enroll=getE();
    if (!enroll.length){ host.innerHTML='<div class="muted">No enrollments yet</div>'; return; }
    host.innerHTML = `
      <table class="table">
        <thead><tr><th>Course</th><th>Score</th><th>Credits</th><th>Updated</th></tr></thead>
        <tbody>
          ${enroll.map(e=>{
            const c=courses.find(x=>x.id===e.courseId)||{};
            return `<tr>
              <td>${(c.title||'')}</td>
              <td>${e.score||0}</td>
              <td>${c.credits||0}</td>
              <td>${new Date(e.ts||Date.now()).toLocaleString()}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>`;
  }
  window.renderGradebook = render;
  // call when page shown
})();