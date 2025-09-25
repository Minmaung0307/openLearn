// Global app configuration (loaded via <script src="/config.js">)
window.OPENLEARN_CFG = {
  firebase: {
    apiKey: "AIzaSyBEkph2jnubq_FvZUcHOR2paKoOKhRaULg",
    authDomain: "openlearn-mm.firebaseapp.com",
    projectId: "openlearn-mm",
    // FIX: Firebase Storage bucket should use appspot.com (not firebasestorage.app)
    storageBucket: "openlearn-mm.appspot.com",
    messagingSenderId: "977262127138",
    appId: "1:977262127138:web:0ee1d4ac3c45f1334f427b",
    measurementId: "G-E65G177ZNJ",
    databaseURL: "https://openlearn-mm-default-rtdb.firebaseio.com/"
  },

  // PayPal client ID (for live checkout)
  paypalClientId: "AVpfmQ8DyyatFaAGQ3Jg58XtUt_2cJDr1leqcc_JI8LvKIR2N5WB_yljqCOTTCtvK1hFJ7Q9X0ojXsEC",

  // EmailJS (contact form)
  emailjs: {
    publicKey: "WT0GOYrL9HnDKvLUf",
    serviceId: "service_z9tkmvr",
    templateId: "template_q5q471f"
  },

  chat: { allowAnon: true },

  admins: ["minmaung0307@gmail.com", "panna07@gmail.com"],  // lowercase emails

  cloudOverride: true,  // ★ Cloud override ON
};

window.OPENLEARN_CFG.payments = {
  paypal: { enabled: true },
  wallets: {
    KBZPay: { enabled: true, qr: '/assets/qr/kbz.png', name: 'Your Co', account: '09-xxxx' },
    CBPay:  { enabled: true, qr: '/assets/qr/cb.png',  name: 'Your Co', account: '09-xxxx' },
    AyaPay: { enabled: true, qr: '/assets/qr/aya.png', name: 'Your Co', account: '09-xxxx' }
  }
};

const pm = window.OPENLEARN_CFG?.payments || {};
const list = [
  pm.paypal?.enabled ? {id:'paypal',  label:'PayPal'} : null,
  pm.wallets?.KBZPay?.enabled ? {id:'kbz', label:'KBZPay'} : null,
  pm.wallets?.CBPay?.enabled  ? {id:'cb',  label:'CBPay'} : null,
  pm.wallets?.AyaPay?.enabled ? {id:'aya', label:'AyaPay'} : null,
].filter(Boolean);
// render radio list; if kbz/cb/aya → show wallet modal with QR + upload

window.OPENLEARN_CFG.cloudOverride = true;