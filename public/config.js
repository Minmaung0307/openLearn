// Edit these IDs/keys for live integrations
export const PAYPAL_CLIENT_ID = "AVpfmQ8DyyatFaAGQ3Jg58XtUt_2cJDr1leqcc_JI8LvKIR2N5WB_yljqCOTTCtvK1hFJ7Q9X0ojXsEC"; // e.g. AbCdEf... from PayPal Developer
export const EMAILJS = {
  publicKey: "WT0GOYrL9HnDKvLUf",       // e.g. 'p_xxx'
  serviceId: "service_z9tkmvr",       // e.g. 'service_abc'
  templateId: "template_q5q471f"       // e.g. 'template_xyz'
};
// expose globally for emailjs init convenience
window.EMAILJS = EMAILJS;
