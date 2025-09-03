
window.__ol_bookmarks = {
  add(courseId, pointer){ const key='ol:bookmarks'; const list=JSON.parse(localStorage.getItem(key)||'[]'); list.unshift({courseId,pointer,at:Date.now()}); localStorage.setItem(key,JSON.stringify(list)); },
  list(){ return JSON.parse(localStorage.getItem('ol:bookmarks')||'[]'); }
};
