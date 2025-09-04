// Sidebar FIX: remove analytics/calendar, ensure Dashboard/Admin icons
(() => {
  function sidebar() {
    return document.querySelector("#sidebar nav");
  }
  function makeBtn(id, label, icon, hash) {
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement("button");
      el.id = id;
      el.type = "button";
      el.className = "navbtn side-icon";
      el.innerHTML = `<span class="ico">${icon}</span><span class="label">${label}</span>`;
    }
    el.title = label;
    el.setAttribute("aria-label", label);
    el.onclick = () => (location.hash = hash);
    return el;
  }

  function run() {
    const side = sidebar();
    if (!side) return;

    // remove analytics/calendar
    ["nav-analytics", "nav-calendar"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.remove();
    });

    // ensure Dashboard/Admin exist
    const coursesBtn = side.querySelector('[data-page="catalog"]');
    const dash = makeBtn("nav-dashboard", "Dashboard", "🏠", "#/stu-dashboard");
    const admin = makeBtn("nav-admin", "Admin", "🛠️", "#/admin");

    if (!document.getElementById("nav-dashboard")) {
      coursesBtn?.insertAdjacentElement("afterend", dash);
    }
    if (!document.getElementById("nav-admin")) {
      dash.insertAdjacentElement("afterend", admin);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else run();
})();