
import { PAYPAL_CLIENT_ID } from '/config.js';
function loadSDK(){
  return new Promise((resolve,reject)=>{
    if(!PAYPAL_CLIENT_ID){ console.warn('PAYPAL_CLIENT_ID empty'); return resolve(); }
    if(window.paypal) return resolve();
    const s=document.createElement('script');
    s.src=`https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(PAYPAL_CLIENT_ID)}`;
    s.onload=()=>resolve(); s.onerror=()=>reject(new Error('PayPal SDK load failed'));
    document.head.appendChild(s);
  });
}
async function mount(){
  await loadSDK();
  if(!window.paypal) return;
  const host=document.getElementById('paypal-button-container'); if(!host) return;
  window.paypal.Buttons({
    createOrder:(data,actions)=>actions.order.create({purchase_units:[{amount:{value:'10.00'}}]}),
    onApprove:(data,actions)=>actions.order.capture().then(det=>{ alert('Payment success'); console.log(det); })
  }).render('#paypal-button-container');
}
document.addEventListener('DOMContentLoaded', mount);
