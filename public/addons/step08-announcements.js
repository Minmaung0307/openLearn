// Admin-only create/edit/delete for announcements
(function(){
  const btn = document.getElementById("btn-new-post");
  const toolbar = document.getElementById("announceToolbar");
  if (!toolbar) return;

  function isAdmin(u){
    const r = window.AppState?.role || u?.role;
    return r === "owner" || r === "admin";
  }

  // reflect role on auth change
  window.AppEvents?.on?.("auth:changed", (user) => {
    if (!toolbar) return;
    toolbar.style.display = isAdmin(user) ? "" : "none";
  });

  // keep initial state consistent
  const initUser = window.AppState?.user || null;
  toolbar.style.display = isAdmin(initUser) ? "" : "none";

  // handler
  btn?.addEventListener("click", (e) => {
    e.preventDefault();
    if (!isAdmin(window.AppState?.user)) {
      alert("Admin only");
      return;
    }
    // open modal
    const pm = document.getElementById("postModal");
    if (pm?.showModal) {
      document.getElementById("pmId").value = "";
      document.getElementById("pmTitle").value = "";
      document.getElementById("pmBody").value  = "";
      pm.showModal();
    }
  });

  // save handler (uses app.js provided window.DB.saveAnnouncement)
  document.getElementById("postForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!isAdmin(window.AppState?.user)) { alert("Admin only"); return; }
    const id    = document.getElementById("pmId").value.trim();
    const title = document.getElementById("pmTitle").value.trim();
    const body  = document.getElementById("pmBody").value.trim();
    if (!title || !body) return;

    try {
      await window.DB.saveAnnouncement({ id, title, body });
      document.getElementById("postModal")?.close();
      window.AppEvents?.emit?.("announcements:refresh");
    } catch (err) {
      alert(err.message || "Failed to save");
    }
  });

  document.getElementById("cancelPost")?.addEventListener("click", ()=> {
    document.getElementById("postModal")?.close();
  });
  document.getElementById("closePostModal")?.addEventListener("click", ()=> {
    document.getElementById("postModal")?.close();
  });

})();