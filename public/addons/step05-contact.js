
import { EMAILJS } from '/config.js';
function ensure(){
  if(!EMAILJS?.publicKey){ console.warn('EMAILJS keys empty'); }
}
ensure();
window.__ol_contact = async function sendContact({name,email,message}){
  if(!window.emailjs) return alert('EmailJS SDK not loaded');
  try{
    const res = await emailjs.send(EMAILJS.serviceId, EMAILJS.templateId, {from_name:name, reply_to:email, message});
    alert('Sent ✓'); console.log(res);
  }catch(e){ console.error(e); alert('Failed to send'); }
};
