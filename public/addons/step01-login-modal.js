// addon 01 placeholder
(()=> {
  // Step01: Make sure Login Modal UX exists (Logo → Email → Password → Login → Sign up / Forgot)
  const $= (s,r=document)=>r.querySelector(s);
  function ensureLoginModal(){
    if ($('#loginModal')) return;
    const m = document.createElement('div');
    m.id='loginModal'; m.className='modal'; m.hidden=true;
    m.innerHTML = `
      <div class="modal-card" style="max-width:480px;width:90%;">
        <div class="modal-header">
          <div class="row items-center gap-2">
            <img src="/icons/icon-192.png" alt="logo" width="28" height="28" />
            <strong>Sign in</strong>
          </div>
          <button class="icon-btn" id="lgClose">✕</button>
        </div>
        <div class="modal-body stack gap-3">
          <label class="field"><span>Email</span><input id="lgEmail" type="email" placeholder="you@example.com"/></label>
          <label class="field"><span>Password</span><input id="lgPass" type="password" placeholder="••••••••"/></label>
          <button id="lgSubmit" class="btn btn-primary">Login</button>
          <div class="row justify-between small">
            <a href="#" id="lgSignup">Sign up</a>
            <a href="#" id="lgForgot">Forgot password</a>
          </div>
        </div>
      </div>`;
    (document.body).appendChild(m);

    $('#lgClose').onclick = ()=> m.hidden=true;
    // wire to existing auth if provided
    const auth= window.auth, fba = window.firebaseAuthExports || {};
    $('#lgSubmit').onclick = async ()=>{
      try {
        const email=$('#lgEmail').value.trim(), pass=$('#lgPass').value.trim();
        if (!email || !pass) return alert('Fill email & password');
        if (auth && fba.signInWithEmailAndPassword) {
          await fba.signInWithEmailAndPassword(auth, email, pass);
        } else {
          // local fake
          localStorage.setItem('ol:fakeUser', JSON.stringify({email}));
          window.currentRole = (window.BOOTSTRAP_ADMINS||[]).includes(email) ? 'admin':'student';
        }
        m.hidden = true;
      } catch(e){ alert(e.message||'Login failed'); }
    };
    $('#lgSignup').onclick = (e)=>{e.preventDefault(); window.showSignup?.();};
    $('#lgForgot').onclick = (e)=>{e.preventDefault(); window.showForgot?.();};
  }

  // expose showLogin for existing "Login" button
  window.showLogin = ()=>{ ensureLoginModal(); $('#loginModal').hidden=false; };
  // If your existing login button has id="btn-login"
  const btn = document.getElementById('btn-login');
  if (btn) btn.onclick = ()=> window.showLogin();

  // make sure topbar Login/Logout visible states stay intact
})();