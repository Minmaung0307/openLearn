import { auth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, updateProfile } from "./firebase.js";

const $ = (s,root=document)=>root.querySelector(s);
const toast=(m,ms=2200)=>{let t=$("#toast"); if(!t){ t=document.createElement("div"); t.id="toast"; document.body.appendChild(t);} t.textContent=m; t.classList.add("show"); setTimeout(()=>t.classList.remove("show"), ms); };

function show(card){ ["form","signup","forgot"].forEach(k=> document.getElementById(k+"Card")?.classList.add("hidden")); document.getElementById(card+"Card")?.classList.remove("hidden"); }
function route(){ if (location.hash==="#signup") show("signup"); else show("form"); }
window.addEventListener("hashchange", route); route();

document.getElementById("formLogin")?.addEventListener("submit", async (e)=>{
  e.preventDefault();
  try{
    await signInWithEmailAndPassword(auth, document.getElementById("loginEmail").value, document.getElementById("loginPassword").value);
    location.href = "./";
  }catch(err){ console.error(err); toast(err.code||"Login failed"); }
});
document.getElementById("formSignup")?.addEventListener("submit", async (e)=>{
  e.preventDefault();
  const pw=document.getElementById("suPassword").value, cf=document.getElementById("suConfirm").value;
  if (pw!==cf) return toast("Passwords don't match");
  try{
    const cred = await createUserWithEmailAndPassword(auth, document.getElementById("suEmail").value, pw);
    const nm=document.getElementById("suName").value.trim(); if(nm) await updateProfile(cred.user,{displayName:nm});
    location.href="./";
  }catch(err){ console.error(err); toast(err.code||"Signup failed"); }
});
document.getElementById("formForgot")?.addEventListener("submit", async (e)=>{
  e.preventDefault();
  try{ await sendPasswordResetEmail(auth, document.getElementById("fpEmail").value.trim()); toast("Reset email sent"); location.href="./login.html"; }
  catch(err){ console.error(err); toast(err.code||"Reset failed"); }
});
