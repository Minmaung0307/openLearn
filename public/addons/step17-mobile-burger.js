// addon 17 placeholder

(()=> {
  // Step17: Mobile burger → open/close sidebar
  const burger=document.getElementById('btn-burger');
  const sidebar=document.getElementById('sidebar');
  if (burger && sidebar){
    burger.addEventListener('click', ()=>{
      const open=sidebar.getAttribute('data-open')==='1';
      sidebar.setAttribute('data-open', open?'0':'1');
      sidebar.style.transform = open?'translateX(-100%)':'translateX(0)';
    });
    // initial hidden on small screens
    const mq=matchMedia('(max-width: 768px)');
    function apply(){ if (mq.matches){ sidebar.style.transform='translateX(-100%)'; sidebar.setAttribute('data-open','0'); } else { sidebar.style.transform=''; sidebar.removeAttribute('data-open'); } }
    mq.addEventListener('change',apply); apply();
  }
})();