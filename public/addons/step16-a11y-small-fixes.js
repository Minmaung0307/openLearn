// /addons/step16-a11y-small-fixes.js (သို့) addon အသစ်
(function(){
  const noisy = [
    "google.firestore.v1.Firestore/Listen/channel",
    "TYPE=terminate"
  ];
  const orig = console.error;
  console.error = function(...args){
    const msg = (args && args[0] && String(args[0])) || "";
    if (noisy.some(k => msg.includes(k))) return; // swallow noisy stream terminations
    return orig.apply(console, args);
  };
})();