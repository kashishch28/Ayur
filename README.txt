AyurWell — Full Project
========================
FRONTEND (static — deploy as-is to GitHub Pages)
  index.html   Markup only — links styles.css, loads script.js
  styles.css   All custom CSS
  script.js    All JS: original site logic, then new modules
               (auth, catalog, doctors, dashboard, smart reminders,
               real Razorpay payment integration)

BACKEND (Node/Express — deploy separately, e.g. Render/Railway)
  backend/     Only needed for the real "Pay with Razorpay" button.
               See backend/README.md for setup + deployment steps.
               The "Simulate Payment" button works with zero backend.

Quick start: open index.html in a browser — the whole site works
immediately except the real Razorpay button, which needs backend/
deployed and PAYMENT_CONFIG in script.js pointed at it.
