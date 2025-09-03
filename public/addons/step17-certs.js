
const jsPDF = window.jspdf?.jsPDF;
function selCourse(){ const enr=JSON.parse(localStorage.getItem('ol:enrollments')||'[]'); if(!enr.length){alert('No enrollments'); return null;} const id=prompt('Course ID to certify? (e.g., web101)'); return enr.find(x=>x.courseId===id); }
function certPDF(enr){
  const doc=new jsPDF({unit:'pt',format:'a4'});
  doc.setFillColor(37,99,235); doc.rect(0,0,595,60,'F');
  doc.setDrawColor(37,99,235); doc.setLineWidth(2); doc.rect(24,24,547,794);
  doc.setFontSize(26); doc.setTextColor(37,99,235); doc.text('Certificate of Completion',297.5,120,{align:'center'});
  doc.setTextColor(0); doc.setFontSize(20); doc.text(enr.courseTitle||enr.courseId,297.5,195,{align:'center'});
  doc.setFontSize(12); doc.text(`Progress: ${Math.round(enr.progress||0)}%  Score: ${Math.round(enr.score||0)}%`,297.5,245,{align:'center'});
  doc.save(`Certificate_${(enr.courseTitle||enr.courseId).replace(/\W+/g,'_')}.pdf`);
}
function transcriptPDF(){
  const rows=(JSON.parse(localStorage.getItem('ol:enrollments')||'[]')||[]);
  if(!rows.length) return alert('No enrollments');
  const doc=new jsPDF({unit:'pt',format:'a4'});
  doc.setFillColor(37,99,235); doc.rect(0,0,595,50,'F');
  doc.setTextColor(255); doc.setFontSize(18); doc.text('Academic Transcript',30,35);
  doc.setTextColor(0); doc.setFontSize(12); doc.text(`Issued: ${new Date().toLocaleDateString()}`,30,70);
  const body = rows.map(r=>[r.courseTitle||r.courseId, String(r.progress||0)+'%', String(r.score||0)+'%']);
  doc.autoTable({startY:90, head:[['Course','Progress','Score']], body, styles:{fontSize:11,cellPadding:6}, headStyles:{fillColor:[37,99,235],textColor:255}});
  doc.save('Transcript.pdf');
}
document.addEventListener('DOMContentLoaded',()=>{
  const gb=document.querySelector('#page-gradebook'); if(!gb) return;
  const box=document.createElement('div'); box.className='ol-row';
  box.innerHTML = `<button class="btn" id="dl-cert">Download Cert</button><button class="btn" id="dl-tr">Download Transcript</button>`;
  gb.appendChild(box);
  box.querySelector('#dl-cert').onclick=()=>{ const enr=selCourse(); if(enr) certPDF(enr); };
  box.querySelector('#dl-tr').onclick=()=>transcriptPDF();
});
