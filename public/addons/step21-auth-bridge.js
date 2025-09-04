// /addons/step21-auth-bridge.js
(function () {
  const byId = (x) => document.getElementById(x);
  const $loginBtn  = byId("btn-login");
  const $logoutBtn = byId("btnLogout");
  const $authModal = byId("authModal");

  // Fullscreen page auth
  const $pageAuth   = byId("page-auth");
  const $loginPage  = byId("authLoginPage");
  const $signupPage = byId("authSignupPage");
  const $forgotPage = byId("authForgotPage");

  // Modal auth
  const $loginForm  = byId("authLogin");
  const $signupForm = byId("authSignup");
  const $forgotForm = byId("authForgot");

  function showPageAuth(show=true){
    if(!$pageAuth) return;
    $pageAuth.style.display = show ? "" : "none";
  }

  function openModal(){
    if ($authModal?.showModal) $authModal.showModal();
  }
  function closeModal(){
    if ($authModal?.close) $authModal.close();
  }

  // Header buttons
  if ($loginBtn)  $loginBtn.onclick  = openModal;
  if ($logoutBtn) $logoutBtn.onclick = async () => {
    try { await window.Auth.signOut(); } catch(e){ console.warn(e) }
  };

  // ---------- Hook up MODAL forms ----------
  if ($loginForm) {
    $loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = byId("loginEmail")?.value?.trim();
      const pass  = byId("loginPass")?.value;
      if (!email || !pass) return;
      try {
        await window.Auth.signIn(email, pass);
        closeModal(); showPageAuth(false);
      } catch (err) { alert(err.message || "Login failed"); }
    });
  }
  if ($signupForm) {
    $signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = byId("signupEmail")?.value?.trim();
      const pass  = byId("signupPass")?.value;
      try {
        await window.Auth.signUp(email, pass);
        closeModal(); showPageAuth(false);
      } catch (err) { alert(err.message || "Sign up failed"); }
    });
  }
  if ($forgotForm) {
    $forgotForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = byId("forgotEmail")?.value?.trim();
      try {
        await window.Auth.reset(email);
        alert("Reset link sent");
      } catch (err) { alert(err.message || "Reset failed"); }
    });
  }

  // ---------- Hook up PAGE forms (fullscreen) ----------
  if ($loginPage) {
    $loginPage.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = byId("loginEmailPage")?.value?.trim();
      const pass  = byId("loginPassPage")?.value;
      try { await window.Auth.signIn(email, pass); showPageAuth(false); }
      catch (err){ alert(err.message || "Login failed"); }
    });
  }
  byId("pageLinkSignup")?.addEventListener("click", (e)=>{ e.preventDefault();
    $loginPage?.classList.add("ol-hidden");
    $signupPage?.classList.remove("ol-hidden");
  });
  byId("pageLinkForgot")?.addEventListener("click", (e)=>{ e.preventDefault();
    $loginPage?.classList.add("ol-hidden");
    $forgotPage?.classList.remove("ol-hidden");
  });
  byId("pageBackToLogin1")?.addEventListener("click", (e)=>{ e.preventDefault();
    $signupPage?.classList.add("ol-hidden");
    $loginPage?.classList.remove("ol-hidden");
  });
  byId("pageBackToLogin2")?.addEventListener("click", (e)=>{ e.preventDefault();
    $forgotPage?.classList.add("ol-hidden");
    $loginPage?.classList.remove("ol-hidden");
  });

  // Auth state reflect UI
  window.AppEvents?.on?.("auth:changed", (user) => {
    if ($logoutBtn) $logoutBtn.style.display = user ? "" : "none";
    if ($loginBtn)  $loginBtn.style.display  = user ? "none" : "";
    // signed-out → show fullscreen auth page
    showPageAuth(!user);
  });
})();