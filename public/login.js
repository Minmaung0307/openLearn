// public/login.js
import {
  auth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut
} from "./firebase.js";
import { HAS_CONFIG } from "./firebase.js";

const $ = (s, r=document) => r.querySelector(s);

function toast(m) {
  let t = $("#toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "toast";
    t.style.cssText = "position:fixed;bottom:14px;left:50%;transform:translateX(-50%);background:#111827;color:#eaf1ff;border:1px solid #1f2a3b;border-radius:10px;padding:8px 12px;z-index:9999";
    document.body.appendChild(t);
  }
  t.textContent = m;
  t.style.opacity = "1";
  setTimeout(() => (t.style.opacity = "0"), 2000);
}

function centerLoginModal() {
  const dlg = $("#authModal");
  if (!dlg) return;
  dlg.classList.add("ol-modal","card");
  dlg.style.display = "grid";
  dlg.style.placeItems = "center";
  if (!dlg.open) dlg.showModal();
}

function wireLoginModal() {
  const dlg = $("#authModal");
  const fLogin  = $("#authLogin");
  const fSignup = $("#authSignup");
  const fForgot = $("#authForgot");

  const show = (id) => {
    ["authLogin","authSignup","authForgot"].forEach(x => $("#"+x)?.classList.add("ol-hidden"));
    $("#"+id)?.classList.remove("ol-hidden");
    if (!dlg.open) dlg.showModal();
  };

  $("#btn-login")?.addEventListener("click", () => show("authLogin"));
  $("#linkSignup")?.addEventListener("click", (e)=>{ e.preventDefault(); show("authSignup"); });
  $("#backToLogin1")?.addEventListener("click", (e)=>{ e.preventDefault(); show("authLogin"); });
  $("#linkForgot")?.addEventListener("click", (e)=>{ e.preventDefault(); show("authForgot"); });
  $("#backToLogin2")?.addEventListener("click", (e)=>{ e.preventDefault(); show("authLogin"); });

  if (!HAS_CONFIG) {
    [fLogin,fSignup,fForgot].forEach(f => f && f.querySelectorAll("input,button").forEach(el => el.disabled = true));
    toast("Please set Firebase config.js first.");
    return;
  }

  fLogin?.addEventListener("submit", async (e)=>{
    e.preventDefault();
    const email = $("#loginEmail")?.value.trim();
    const pass  = $("#loginPass")?.value.trim();
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      toast("Signed in");
      dlg.close();
    } catch(err){ console.error(err); toast(err.code || "Login failed"); }
  });

  fSignup?.addEventListener("submit", async (e)=>{
    e.preventDefault();
    const email = $("#signupEmail")?.value.trim();
    const pass  = $("#signupPass")?.value.trim();
    try {
      await createUserWithEmailAndPassword(auth, email, pass);
      toast("Account created");
      dlg.close();
    } catch(err){ console.error(err); toast(err.code || "Signup failed"); }
  });

  fForgot?.addEventListener("submit", async (e)=>{
    e.preventDefault();
    const email = $("#forgotEmail")?.value.trim();
    try {
      await sendPasswordResetEmail(auth, email);
      toast("Reset link sent");
      dlg.close();
    } catch(err){ console.error(err); toast(err.code || "Send failed"); }
  });
}

function gateTopbar() {
  const btnLogin  = $("#btn-login");
  const btnLogout = $("#btn-logout");
  onAuthStateChanged(auth, (u)=>{
    const logged = !!u;
    btnLogin  && (btnLogin.style.display  = logged ? "none" : "");
    btnLogout && (btnLogout.style.display = logged ? "" : "none");
  });
  btnLogout?.addEventListener("click", async ()=>{
    try { await signOut(auth); toast("Signed out"); centerLoginModal(); }
    catch(err){ console.error(err); toast(err.code || "Logout failed"); }
  });
}

document.addEventListener("DOMContentLoaded", ()=>{
  centerLoginModal();
  wireLoginModal();
  gateTopbar();
});