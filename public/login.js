import { LIVE, auth,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendPasswordResetEmail } from "/firebase.js";

const $=s=>document.querySelector(s);
const info = $("#loginInfo");

function setInfo(t){ info.textContent=t||""; }

async function localLogin(email){
  localStorage.setItem("ol_user", JSON.stringify({email}));
  location.href="/";
}

$("#doLogin").addEventListener("click", async ()=>{
  const email=$("#email").value.trim(); const pw=$("#pw").value.trim();
  if(!email || !pw) return setInfo("Enter email & password");
  setInfo("Signing in...");
  try{
    if (LIVE) {
      await signInWithEmailAndPassword(auth, email, pw);
    } else {
      await localLogin(email);
      return;
    }
    location.href="/";
  }catch(e){ setInfo(e.message||"Login failed"); }
});

$("#doSignup").addEventListener("click", async ()=>{
  const email=$("#email").value.trim(); const pw=$("#pw").value.trim();
  if(!email || !pw) return setInfo("Enter email & password");
  setInfo("Creating account...");
  try{
    if (LIVE) {
      await createUserWithEmailAndPassword(auth, email, pw);
    } else {
      await localLogin(email);
      return;
    }
    location.href="/";
  }catch(e){ setInfo(e.message||"Sign up failed"); }
});

$("#doReset").addEventListener("click", async ()=>{
  const email=$("#email").value.trim();
  if(!email) return setInfo("Enter your email then click reset");
  setInfo("Sending reset email...");
  try{
    if (LIVE) {
      await sendPasswordResetEmail(auth, email);
      setInfo("Reset email sent.");
    } else {
      setInfo("Demo mode: no email sent.");
    }
  }catch(e){ setInfo(e.message||"Reset failed"); }
});