import {
  auth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
} from "./firebase.js";

const $ = (s, root = document) => root.querySelector(s);
const toast = (m, ms = 2200) => {
  let t = $("#toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "toast";
    document.body.appendChild(t);
  }
  t.textContent = m;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), ms);
};

function show(card) {
  ["form", "signup", "forgot"].forEach((k) =>
    $("#" + k + "Card")?.classList.add("hidden")
  );
  $("#" + card + "Card")?.classList.remove("hidden");
}
function route() {
  if (location.hash === "#signup") show("signup");
  else if (location.hash === "#forgot") show("forgot");
  else show("form");
}
window.addEventListener("hashchange", route);
route();

$("#lnkForgot")?.addEventListener("click", (e) => {
  e.preventDefault();
  location.hash = "#forgot";
});
$("#formLogin")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    await signInWithEmailAndPassword(
      auth,
      $("#loginEmail").value,
      $("#loginPassword").value
    );
    location.href = "./";
  } catch (err) {
    console.error(err);
    toast(err.code || "Login failed");
  }
});
$("#formSignup")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const pw = $("#suPassword").value,
    cf = $("#suConfirm").value;
  if (pw !== cf) return toast("Passwords don't match");
  try {
    const cred = await createUserWithEmailAndPassword(
      auth,
      $("#suEmail").value,
      pw
    );
    const nm = $("#suName").value.trim();
    if (nm) await updateProfile(cred.user, { displayName: nm });
    location.href = "./";
  } catch (err) {
    console.error(err);
    toast(err.code || "Signup failed");
  }
});
$("#formForgot")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    await sendPasswordResetEmail(auth, $("#fpEmail").value.trim());
    toast("Reset email sent");
    location.href = "./login.html";
  } catch (err) {
    console.error(err);
    toast(err.code || "Reset failed");
  }
});
