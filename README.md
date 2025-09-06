public/
  index.html
  styles.css
  app.js
  manifest.json
  data/
    catalog.json
    courses/
      js-essentials/
        meta.json
        l1.html
        l2.html
        quiz.json

## Login modal: 
	•	Login modal = login-only default (Sign up/Forgot ကို link နှိပ်မှထွက်)
	•	ပိုကြီး၊ dark gradient bg + label/readability ပြင်, placeholder alignment စီ, links ကို muted color, Sign up / Forgot ကို link နှိပ်才့နောက်မှ ပြ
	•	စာကြည့်ရလွယ်၊ links muted, size ကြီး
	•	login-only by default; Sign up / Forgot via links; readable; centered ✔

## Sidebar: 
	•	icon-only by default, hover (desktop) / burger (mobile) မှ labels drawer အနေနဲ့ မြင်
	•	icon-only + drawer labels (hover/burger)
	•	Sidebar = icon-only (hover/drawer တွင် labels ပြ)
	•	solid bg; icon-only by default; hover/drawer shows labels ✔

## Topbar:
	•	logo + search + announcements/final pills + login/logout inline
	•	inline (logo + search + announcements pill + finals pill + login/logout) ✔

## Courses Details: 
	•	pretty modal (card bg) + readable text
	•	modal readable bg
	•	Details + Enroll (free/paid)
	•	Details modal body = darker/lighter bg (switch); text readable ✔

## My Learning: 
	•	Continue နှိပ်လို့ course reader ကို full ပြ (cards ဖျောက်) — Back နှိပ်ရင် grid ပြန်လာ
	•	Continue = reader full view
	•	“Continue” = open reader fullscreen (card grid hidden while reading) ✔

## Announcements: 
	•	modal form နဲ့ CRUD (prompt မဟုတ်)

## Final Exam:
	•	Final Exam ကိုကြေညာဖို့ button တစ်ခုခု ထည့်ပေးပါ
	•	ကျောင်းသားတွေက courses တွေကို တစ်ခန်းစီ လေ့လာမယ်၊
	•	အခန်းတိုင်းမှာ သင်ခန်းစာတွေပါမယ်, ဓာတ်ပုံလေးတွေလဲပါမယ်, အသံဖိုင်ပါမယ်, ဗွီဒီယိုလဲပါမယ်, လေ့ကျင့်ခန်းမေးခွန်း (quizzes and short answer) တွေလဲပါမယ်
	•	လေ့ကျင့်ခန်းမေးခွန်းတွေက random ဖြစ်ရမယ် (ကျောင်းသား တစ်ယောက်နဲ့တစ်ယောက် ပုစ္ဆာမတူရ) 
	•	final မှာ သင်ခန်းစာများထဲက မေးခွန်းတွေထဲက random ၁၂-ခုယူပြီးမေးမယ်၊ အဲ့ဒါအောင်မှ certificate နဲ့ transcript ကို download လုပ်လို့ရမယ်

## New:
	•	New Course / Announcement / Profile modals = one-per-line fields; readable headings ✔

## Profile: 
	•	avatar + links layout လှပစီစဉ်
	•	Add Data modal + card view

## Themes: 
	•	selection ပြောင်းတာနဲ့ ချက်ချင်း လှည့် (CSS variables palettes)
	•	instant switch

## PayPal unload warning: 
	•	SDK ရဲ့ browser policy warning ဖြစ်လို့ app လုပ်ဆောင်ချက်မသက်ရောက်—လက်လော့ ignore OK (အောက်က မှတ်ချက်ထဲ ရေးထား)

## Mobile burger:
	•	shows icon+labels; selecting a menu closes drawer ✔
	•	compactable with iPhone 15

## Add course lessons/media/quizzes/short answer
	1.	/data/courses/<course-id>/meta.json
	2.	/data/courses/<course-id>/01-intro.html
	3.	quiz: /data/courses/<course-id>/quiz.json (single or multi choice quizzes)
	4.	shortAnswer: /data/courses/<course-id>/shortanswer.json


## export const CONFIG = {
  PAYPAL_CLIENT_ID: "AVpfmQ8DyyatFaAGQ3Jg58XtUt_2cJDr1leqcc_JI8LvKIR2N5WB_yljqCOTTCtvK1hFJ7Q9X0ojXsEC",
  EMAILJS: {
    publicKey: "WT0GOYrL9HnDKvLUf",
    serviceId: "service_z9tkmvr",
    templateId: "template_q5q471f"
  }
};
window.CONFIG = CONFIG;
