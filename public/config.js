// public/config.js
window.CONFIG = {
  PAYPAL_CLIENT_ID: "",
  EMAILJS: {},
};

/* /config.js — export မသုံးပါနဲ့ */
(function () {
  window.PAYPAL_CLIENT_ID =
    "AVpfmQ8DyyatFaAGQ3Jg58XtUt_2cJDr1leqcc_JI8LvKIR2N5WB_yljqCOTTCtvK1hFJ7Q9X0ojXsEC";
  window.EMAILJS = {
    publicKey: "WT0GOYrL9HnDKvLUf",
    serviceId: "service_z9tkmvr",
    templateId: "template_q5q471f",
  };

  // Firebase web config (အမှန်တကယ် project က မှန်ကန်ရပါမယ်)
  window.FB = {
    apiKey: "AIzaSyBEkph2jnubq_FvZUcHOR2paKoOKhRaULg",
    authDomain: "openlearn-mm.firebaseapp.com",
    databaseURL: "https://openlearn-mm-default-rtdb.firebaseio.com",
    projectId: "openlearn-mm",
    storageBucket: "openlearn-mm.firebasestorage.app",
    messagingSenderId: "977262127138",
    appId: "1:977262127138:web:0ee1d4ac3c45f1334f427b",
    measurementId: "G-E65G177ZNJ",
  };
})();
