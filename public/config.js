window.OPENLEARN_CFG = {
    firebase: {
      apiKey: "AIzaSyBEkph2jnubq_FvZUcHOR2paKoOKhRaULg",
      authDomain: "openlearn-mm.firebaseapp.com",
      projectId: "openlearn-mm",
      // ✅ Storage bucket must be *.appspot.com
      storageBucket: "openlearn-mm.appspot.com",
      messagingSenderId: "977262127138",
      appId: "1:977262127138:web:0ee1d4ac3c45f1334f427b",
      measurementId: "G-E65G177ZNJ",
      databaseURL: "https://openlearn-mm-default-rtdb.firebaseio.com"
    },
    paypalClientId: "AVpfmQ8DyyatFaAGQ3Jg58XtUt_2cJDr1leqcc_JI8LvKIR2N5WB_yljqCOTTCtvK1hFJ7Q9X0ojXsEC",
    emailjs: {
      publicKey: "WT0GOYrL9HnDKvLUf",
      serviceId: "service_z9tkmvr",
      templateId: "template_q5q471f"
    }
  };

  // Expose convenience globals used by addons/app
  window.PAYPAL_CLIENT_ID = window.OPENLEARN_CFG.paypalClientId;
  window.EMAILJS = window.OPENLEARN_CFG.emailjs;