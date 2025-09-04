// Auth Bridge: ensures login/logout visibility and modal handling
(() => {
  const loginBtn = document.getElementById("btn-login");
  const logoutBtn = document.getElementById("btn-logout");
  const modal = document.getElementById("authModal");
  const formLogin = document.getElementById("authLogin");
  const formSignup = document.getElementById("authSignup");
  const formForgot = document.getElementById("authForgot");

  function show(el) { if (el) el.style.display = ""; }
  function hide(el) { if (el) el.style.display = "none"; }

  // Demo fallback auth
  function setSignedIn(email) {
    localStorage.setItem("authUser", email || "");
    updateUI();
  }

  function updateUI() {
    const email = localStorage.getItem("authUser");
    if (email) {
      hide(loginBtn);
      show(logoutBtn);
      if (modal) modal.close();
    } else {
      show(loginBtn);
      hide(logoutBtn);
    }
  }

  if (loginBtn) loginBtn.onclick = () => modal?.showModal();
  if (logoutBtn) logoutBtn.onclick = () => setSignedIn("");

  if (formLogin) formLogin.addEventListener("submit", e => {
    e.preventDefault();
    const email = formLogin.querySelector("#loginEmail")?.value || "";
    if (email) setSignedIn(email);
  });

  if (formSignup) formSignup.addEventListener("submit", e => {
    e.preventDefault();
    const email = formSignup.querySelector("#signupEmail")?.value || "";
    if (email) setSignedIn(email);
  });

  if (formForgot) formForgot.addEventListener("submit", e => {
    e.preventDefault();
    alert("Password reset link sent (demo)");
  });

  document.addEventListener("DOMContentLoaded", updateUI);
  updateUI();
})();