# 🌿 AyurWell

A full Ayurvedic wellness storefront — herb shop, dosha quiz, doctor booking, and a personal dashboard — built with **nothing but HTML, CSS, and vanilla JavaScript**. No framework. No build step. No backend. No `npm install`. Clone it, open `index.html`, and it just works.

> Yes, really — zero dependencies to install. The only network calls are CDN `<script>` tags for Tailwind, Chart.js, AOS, and flatpickr.

---

## ✨ What's inside

| Feature | What it does |
|---|---|
| 🛒 **Shop & Cart** | Filterable herb catalog, live cart sidebar, quantity controls |
| 🧘 **Dosha Quiz** | Answer a few questions → get your Vata/Pitta/Kapha profile + herb recommendations |
| 👩‍⚕️ **Doctor Booking** | Browse practitioners, pick a slot, book a consultation |
| 📊 **Dashboard** | Order history, appointments, dosha history chart (Chart.js), daily routine tracker |
| 🔐 **Auth** | Sign up / sign in — a real account system, just running entirely in your browser |
| 💳 **Checkout** | "Simulate Payment" — a convincing fake payment flow (loading state, success toast, order saved) |

---

## 🗂️ Project structure

```
ayurwell/
├── index.html    → all markup
├── styles.css    → all custom styles (Tailwind handles the rest via CDN)
└── script.js     → all logic: cart, quiz, auth, catalog, doctors, dashboard
```

That's it. Three files. No `dist/`, no `node_modules/`, no config to fight with.

---

## 🧠 How it works under the hood

There's no database — **`localStorage` is the database.** A thin set of helper functions (`loadUsers`, `saveUserData`, etc.) read and write JSON to the browser, so the rest of the app never touches `localStorage` directly. This means:

- Every account, order, and dosha result you create actually **persists across refreshes**
- It's genuinely a self-contained demo of a full user journey — signup → quiz → shop → checkout → dashboard
- ⚠️ It's not a real backend: passwords are stored in plaintext locally, and nothing stops a user from editing their own data in devtools. Great for a demo, not for production auth.

---

## 🚀 Running it

**Option A — do nothing fancy:**
Double-click `index.html`. Done.

**Option B — deploy it:**
Drag the folder into Netlify, or push it to a repo and flip on GitHub Pages. It's static — any host that serves files works.

---

## 🛠️ Built with

`HTML5` · `CSS3` · `Vanilla JS (ES5-friendly)` · `Tailwind CDN` · `Chart.js` · `AOS` (scroll animations) · `flatpickr` (date picking)

---

*Originally shipped with a small Node/Express backend for real Razorpay payments — that layer has been stripped out so the whole project stays 100% static and dependency-free.*