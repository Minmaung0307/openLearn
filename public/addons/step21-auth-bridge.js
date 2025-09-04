// step21-auth-bridge.js — Safe bridge: use Firebase if available, else demo fallback.
// Also wires Login/Signup/Forgot forms + header login/logout.
(function () {
  const byId = (x) => document.getElementById(x);

  // --- 1) Create window.AppEvents (tiny pub/sub) if missing ---
  if (!window.AppEvents) {
    const ev = {};
    window.AppEvents = {
      on: (k, fn) => ((ev[k] = ev[k] || []).push(fn)),
      emit: (k, payload) => (ev[k] || []).forEach((fn) => fn(payload)),
    };
  }
  window.AppState = window.AppState || { user: null, role: null };

  // --- 2) Build window.Auth if missing (fallback demo auth) ---
  // If Firebase modular is already set up and exposes Auth, we reuse it.
  const hasFirebaseAuth =
    !!(window.firebaseAuth || window.Auth?.__isFirebaseAuth);

  if (!window.Auth) {
    // Try to wrap Firebase modular if present on window
    const fb = window.firebaseApp && window.firebaseAuth;
    if (fb) {
      // Expect window.firebaseAuth exports: signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut
      window.Auth = {
        __isFirebaseAuth: true,
        async signIn(email, pass) {
          const { signInWithEmailAndPassword } = window.firebaseAuth;
          const { auth } = window.firebaseAuth;
          const cred = await signInWithEmailAndPassword(auth, email, pass);
          const user = { uid: cred.user.uid, email: cred.user.email };
          window.AppState.user = user;
          // OPTIONAL: fetch role from users/{uid} and set AppState.role
          window.AppEvents.emit("auth:changed", user);
          return user;
        },
        async signUp(email, pass) {
          const { createUserWithEmailAndPassword } = window.firebaseAuth;
          const { auth } = window.firebaseAuth;
          const cred = await createUserWithEmailAndPassword(auth, email, pass);
          const user = { uid: cred.user.uid, email: cred.user.email };
          window.AppState.user = user;
          window.AppEvents.emit("auth:changed", user);
          return user;
        },
        async reset(email) {
          const { sendPasswordResetEmail } = window.firebaseAuth;
          const { auth } = window.firebaseAuth;
          await sendPasswordResetEmail(auth, email);
          return true;
        },
        async signOut() {
          const { signOut } = window.firebaseAuth;
          const { auth } = window.firebaseAuth;
          await signOut(auth);
          window.AppState.user = null;
          window.AppEvents.emit("auth:changed", null);
        },
      };
    } else {
      // DEMO fallback (no Firebase). Stores user in localStorage.
      window.Auth = {
        __isDemo: true,
        async signIn(email, pass) {
          const user = { uid: "demo-" + btoa(email), email };
          // Make admin if email in BOOTSTRAP_ADMINS (optional)
          const admins =
            (window.BOOTSTRAP_ADMINS && Array.isArray(window.BOOTSTRAP_ADMINS)
              ? window.BOOTSTRAP_ADMINS
              : ["admin@openlearn.local"]);
          const role = admins.includes(email) ? "admin" : "student";
          window.AppState.user = user;
          window.AppState.role = role;
          localStorage.setItem("ol_demo_user", JSON.stringify({ user, role }));
          window.AppEvents.emit("auth:changed", user);
          return user;
        },
        async signUp(email, pass) {
          return this.signIn(email, pass);
        },
        async reset(email) {
          // demo no-op
          return true;
        },
        async signOut() {
          localStorage.removeItem("ol_demo_user");
          window.AppState.user = null;
          window.AppState.role = null;
          window.AppEvents.emit("auth:changed", null);
        },
      };
      // restore demo session
      try {
        const saved = JSON.parse(localStorage.getItem("ol_demo_user") || "null");
        if (saved?.user) {
          window.AppState.user = saved.user;
          window.AppState.role = saved.role || "student";
          setTimeout(() => window.AppEvents.emit("auth:changed", saved.user), 0);
        }
      } catch {}
    }
  }

  // --- 3) Hook UI elements (defensive — only if exist) ---
  function bindAuthUI() {
    const $loginBtn  = byId("btn-login");
    const $logoutBtn = byId("btn-logout"); // NOTE: id="btn-logout" (not btnLogout)
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

    const showPageAuth = (show = true) => {
      if ($pageAuth) $pageAuth.style.display = show ? "" : "none";
    };
    const openModal  = () => $authModal?.showModal && $authModal.showModal();
    const closeModal = () => $authModal?.close && $authModal.close();

    if ($loginBtn)  $loginBtn.onclick  = openModal;
    if ($logoutBtn) $logoutBtn.onclick = async () => { try { await window.Auth.signOut(); } catch(e){} };

    // MODAL forms
    if ($loginForm)
      $loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = byId("loginEmail")?.value?.trim();
        const pass  = byId("loginPass")?.value;
        if (!email || !pass) return;
        try { await window.Auth.signIn(email, pass); closeModal(); showPageAuth(false); }
        catch (err) { alert(err.message || "Login failed"); }
      });

    if ($signupForm)
      $signupForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = byId("signupEmail")?.value?.trim();
        const pass  = byId("signupPass")?.value;
        try { await window.Auth.signUp(email, pass); closeModal(); showPageAuth(false); }
        catch (err) { alert(err.message || "Sign up failed"); }
      });

    if ($forgotForm)
      $forgotForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = byId("forgotEmail")?.value?.trim();
        try { await window.Auth.reset(email); alert("Reset link sent"); }
        catch (err) { alert(err.message || "Reset failed"); }
      });

    // PAGE forms
    byId("pageLinkSignup")?.addEventListener("click", (e)=>{ e.preventDefault();
      $loginPage?.classList.add("ol-hidden"); $signupPage?.classList.remove("ol-hidden");
    });
    byId("pageLinkForgot")?.addEventListener("click", (e)=>{ e.preventDefault();
      $loginPage?.classList.add("ol-hidden"); $forgotPage?.classList.remove("ol-hidden");
    });
    byId("pageBackToLogin1")?.addEventListener("click", (e)=>{ e.preventDefault();
      $signupPage?.classList.add("ol-hidden"); $loginPage?.classList.remove("ol-hidden");
    });
    byId("pageBackToLogin2")?.addEventListener("click", (e)=>{ e.preventDefault();
      $forgotPage?.classList.add("ol-hidden"); $loginPage?.classList.remove("ol-hidden");
    });

    // auth state → header buttons + fullscreen page
    window.AppEvents.on("auth:changed", (user) => {
      if ($logoutBtn) $logoutBtn.style.display = user ? "" : "none";
      if ($loginBtn)  $loginBtn.style.display  = user ? "none" : "";
      showPageAuth(!user);
    });

    // initial reflect
    const initUser = window.AppState?.user || null;
    if ($logoutBtn) $logoutBtn.style.display = initUser ? "" : "none";
    if ($loginBtn)  $loginBtn.style.display  = initUser ? "none" : "";
    showPageAuth(!initUser);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindAuthUI);
  } else {
    bindAuthUI();
  }
})();