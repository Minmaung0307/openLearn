
window.__ol_showLegal = function(k){
  const map={privacy:'Privacy Policy…',policy:'Terms & Policy…',guide:'User Guide…',contact:'Contact: hello@example.com'};
  document.getElementById('legal-title').textContent=k[0].toUpperCase()+k.slice(1);
  document.getElementById('legal-body').textContent=map[k]||'';
  document.querySelector('[data-page="settings"]').click(); // ensure visible
  document.querySelector('[data-page="catalog"]').click(); // then go back if needed
  document.getElementById('legal-title').closest('.page').classList.add('active');
};
