import { LIVE, auth,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendPasswordResetEmail } from "/firebase.js";

const $=s=>document.querySelector(s);
const info = $("#loginInfo");
const hint = (t)=> info.textContent = t||"";

async function localLogin(email){
  localStorage.setItem("ol_user", JSON.stringify({email}));
  location.href="/";
}

function showErr(prefix, e){
  const code = e?.code || e?.message || String(e);
  console.error(prefix, e);
  // Friendly mapping
  const map = {
    "auth/invalid-credential":"Invalid email or password.",
    "auth/user-not-found":"No user found with that email.",
    "auth/wrong-password":"Wrong password.",
    "auth/too-many-requests":"Too many attempts. Try again later.",
    "auth/network-request-failed":"Network error. Check connectivity.",
    "auth/operation-not-allowed":"Email/password provider disabled in Firebase.",
    "auth/domain-config-required":"Add your domain to Authorized domains.",
    "auth/configuration-not-found":"Firebase config missing in firebase.js"
  };
  const msg = map[code] || code;
  hint(`Error: ${msg}`);
}

$("#doLogin").addEventListener("click", async ()=>{
  const email=$("#email").value.trim(); const pw=$("#pw").value.trim();
  if(!email || !pw) return hint("Enter email & password");
  hint(LIVE ? "Signing in..." : "Local demo login…");
  try{
    if (LIVE) {
      await signInWithEmailAndPassword(auth, email, pw);
    } else {
      await localLogin(email);
      return;
    }
    location.href="/";
  }catch(e){
    // domain hint if LIVE
    if (LIVE && location.host.endsWith('web.app')){
      hint("Auth failed. Check Authorized domains & Email/Password provider in Firebase.");
    }
    showErr("login failed", e);
  }
});

$("#doSignup").addEventListener("click", async ()=>{
  const email=$("#email").value.trim(); const pw=$("#pw").value.trim();
  if(!email || !pw) return hint("Enter email & password");
  hint(LIVE ? "Creating account..." : "Local demo signup…");
  try{
    if (LIVE) {
      await createUserWithEmailAndPassword(auth, email, pw);
    } else {
      await localLogin(email);
      return;
    }
    location.href="/";
  }catch(e){
    showErr("signup failed", e);
  }
});

$("#doReset").addEventListener("click", async ()=>{
  const email=$("#email").value.trim();
  if(!email) return hint("Enter your email then click reset");
  hint(LIVE ? "Sending reset email..." : "Demo mode: no email sent.");
  try{
    if (LIVE) {
      await sendPasswordResetEmail(auth, email);
      hint("Reset email sent. Check your inbox.");
    }
  }catch(e){
    showErr("reset failed", e);
  }
});