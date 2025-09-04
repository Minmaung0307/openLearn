# OpenLearn — Entire Build (with PayPal & EmailJS hooks)
- 18 addons included
- Edit /public/config.js with your PAYPAL_CLIENT_ID and EMAILJS keys
- Deploy: firebase deploy --only hosting

Folders
- public/ (index.html, styles.css, app.js, firebase.js, sw.js, manifest.json, addons/, icons/)
- firebase.json, firestore.rules, storage.rules, database.rules.json


# ပြီးပြီးသား Completed / Updated Features (Quick List)
	•	Link pages (Contact / Guide / Privacy / Policy): back button ပါ၊ design မတူအောင် gradient hero styles; Guide မှာ menu အသုံးပြုနည်း အစုံအလင်.
	•	Announcements: Dashboard မှာ + New Announcement (staff only) modal; edit/delete ခလုတ်များ.
	•	Calendar: add + edit/delete (list view actions) — grid & list နှစ်မျိုးပြ.
	•	Reader: quizzes, short answer, assignment link, Final exam; 100% ရောက်သွားရင် Finish ➜ Certificate preview/print.
	•	Gradebook: per-course Certificate / Transcript buttons (browser print ➜ PDF).
	•	Profile: Edit Profile modal (photo/bio/links); profile card UI အလှ.
	•	Sidebar (Mobile): open အခြေအနေမှာ labels readable; burger toggle.
	•	New Course Modal: ~70% viewport သောကြာင့် ကြည့်ကောင်း.
	•	Theme & Font: Settings မှာ global apply (sidebar/login/others).
	•	Contact form (demo): local feedback.


## export const CONFIG = {
  PAYPAL_CLIENT_ID: "AVpfmQ8DyyatFaAGQ3Jg58XtUt_2cJDr1leqcc_JI8LvKIR2N5WB_yljqCOTTCtvK1hFJ7Q9X0ojXsEC",
  EMAILJS: {
    publicKey: "WT0GOYrL9HnDKvLUf",
    serviceId: "service_z9tkmvr",
    templateId: "template_q5q471f"
  }
};
window.CONFIG = CONFIG;
