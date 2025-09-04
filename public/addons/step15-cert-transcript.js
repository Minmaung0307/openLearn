// addon 15 placeholder

(()=> {
  // Step15: Certificate/Transcript mock (download text/PDF-lite)
  function certText(name, course){ return `Certificate of Completion\n\nThis certifies that ${name} has successfully completed ${course}.\n\nOpenLearn`; }
  function dl(name, content){
    const blob=new Blob([content], {type:'text/plain'}); const a=document.createElement('a');
    a.href=URL.createObjectURL(blob); a.download=name; a.click(); URL.revokeObjectURL(a.href);
  }
  // buttons by id
  const bc=document.getElementById('btn-cert'), bt=document.getElementById('btn-transcript');
  bc?.addEventListener('click', ()=>{
    const u=(window.auth?.currentUser?.email)||'Student';
    dl('certificate.txt', certText(u, 'Your Course'));
  });
  bt?.addEventListener('click', ()=>{
    const tr={ name:(window.auth?.currentUser?.email)||'Student', items: JSON.parse(localStorage.getItem('ol:enroll')||'[]') };
    dl('transcript.json', JSON.stringify(tr,null,2));
  });
})();