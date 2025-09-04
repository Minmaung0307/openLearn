// addon 11 placeholder

(()=> {
  // Step11: Link pages (Contact/Guide/Privacy/Policy) with Back button & large layout
  const $=(s,r=document)=>r.querySelector(s);
  function openPage(id,title,contentHtml){
    const main=document.getElementById('main')||document.body;
    const wrap=document.createElement('div'); wrap.id='linkPage';
    wrap.innerHTML=`
      <div class="modal" style="display:flex;">
        <div class="modal-card" style="max-width:960px;width:80%;min-height:60vh">
          <div class="modal-header">
            <div class="row items-center gap-2"><strong>${title}</strong></div>
            <button class="btn" id="lpBack">Back</button>
          </div>
          <div class="modal-body" style="font-size:clamp(14px,2vw,16px)">${contentHtml}</div>
        </div>
      </div>`;
    main.appendChild(wrap);
    $('#lpBack',wrap).onclick=()=>wrap.remove();
  }

  const pages = {
    contact:`<p><strong>Contact us</strong> at <a href="mailto:support@openlearn.local">support@openlearn.local</a></p>
             <p>We reply within 2 business days.</p>`,
    guide:`<h4>How to use this site</h4>
           <ol>
             <li><strong>Courses</strong> — Browse, Details, Enroll (Free or Paid).</li>
             <li><strong>My Learning</strong> — Continue reading inline, add notes, track progress.</li>
             <li><strong>Gradebook</strong> — See scores & credits.</li>
             <li><strong>Dashboard</strong> — Announcements, posts (staff can add/edit/delete).</li>
             <li><strong>Calendar</strong> — Events (staff can add/edit/delete).</li>
             <li><strong>Profile</strong> — Edit your bio & portfolio; view card.</li>
             <li><strong>Settings</strong> — Theme palettes & font-size.</li>
             <li><strong>Live Chat</strong> — Talk with classmates/TA.</li>
           </ol>`,
    privacy:`<p>Your privacy matters. We only store data essential for learning features. You can export or delete your data on request.</p>`,
    policy:`<p>All course contents are for educational purposes. Redistribution is prohibited without permission.</p>`
  };

  // footer anchors by id
  ['lnkContact','lnkGuide','lnkPrivacy','lnkPolicy'].forEach(id=>{
    const el=document.getElementById(id); if (!el) return;
    el.addEventListener('click', (e)=>{
      e.preventDefault();
      const key = id.replace('lnk','').toLowerCase();
      openPage(key, key[0].toUpperCase()+key.slice(1), pages[key]||'<p>Coming soon…</p>');
    });
  });
})();