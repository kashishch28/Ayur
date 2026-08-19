# AyurWell Payment API

A minimal Node/Express service that lets the AyurWell frontend take real
payments through Razorpay's Checkout widget, in **Test Mode** (no real
money moves). It exists because GitHub Pages only serves static files —
creating a Razorpay order and verifying a payment both require your
**secret key**, which can never be shipped to the browser.

```
Frontend (Razorpay Checkout.js)  →  this API  →  Razorpay
        ↑ public Key ID only         ↑ secret key lives only here
```

## 1. Get Razorpay test credentials

1. Sign up free at https://razorpay.com — no business verification is
   required to use Test Mode.
2. In the dashboard, toggle **Test Mode** (top-right switch).
3. Go to **Settings → API Keys → Generate Test Key**. You'll get a
   **Key ID** (`rzp_test_...`) and a **Key Secret** — copy both now, the
   secret is only shown once.

## 2. Run it locally

```bash
cd backend
npm install
cp .env.example .env
# paste your Key ID + Key Secret into .env
npm start
```

You should see `AyurWell payment API listening on port 4000`. Sanity check:

```bash
curl http://localhost:4000/
# -> {"status":"AyurWell payment API is running"}
```

## 3. Point the frontend at it

Open `script.js` (or the `<script>` block near the bottom of `index.html`
if you're using the single-file build) and edit `PAYMENT_CONFIG`:

```js
var PAYMENT_CONFIG = {
  backendUrl: 'http://localhost:4000',   // or your deployed URL, no trailing slash
  keyId: 'rzp_test_xxxxxxxxxxxx'          // your Key ID — safe to expose, it's public
};
```

The "⚡ Pay with Razorpay" button on the site checks this config and shows
a status line under itself (`backend not configured` in gold, or
`backend connected` in green) so it's obvious at a glance whether it's
wired up — handy to point at during a demo.

## 4. Test a payment

Click **⚡ Pay with Razorpay** with items in the cart. In the Checkout
widget:

- **Card**: any future expiry date, any random CVV. Razorpay shows a mock
  bank page with **Success**/**Failure** buttons — click either to see
  both paths. (Exact test card numbers vary by card network and can
  change — check the live list at
  https://razorpay.com/docs/payment-gateway/test-card-upi-details if you
  need a specific one.)
- **UPI**: enter `success@razorpay` to simulate a successful payment, or
  `failure@razorpay` to simulate a decline.

On success, the widget calls your `handler`, which sends the payment
details to `/api/verify-payment` — only once that comes back `verified:
true` does the order get recorded and the cart clear. That round trip is
the whole point: it's proof the payment was real and untampered with,
not just "the popup closed."

## 5. Deploy it somewhere that runs Node

GitHub Pages can't run this — pick any Node host:

- **Render** (free tier, easiest): New → Web Service → connect this
  folder/repo → Build command `npm install` → Start command `npm start`
  → add the three env vars from `.env` in the dashboard → deploy. You'll
  get a URL like `https://ayurwell-api.onrender.com`.
- **Railway** / **Fly.io**: similar — connect repo, set env vars, deploy.
- Paste the resulting URL into `PAYMENT_CONFIG.backendUrl` on the
  frontend and set `ALLOWED_ORIGIN` in the backend's env vars to your
  actual frontend URL (e.g. `https://kashishch28.github.io`) so CORS
  isn't wide open in production.

## 6. (Optional, worth mentioning in an interview) Webhooks

`/api/webhook` is a second, independent way of finding out a payment
succeeded — Razorpay calls it directly from their servers, so it still
fires even if the user's browser crashes or they close the tab right
after paying. Production systems use both: the `handler` callback for
instant UI feedback, and the webhook as the source of truth that
actually marks an order paid in the database. To wire it up: in the
Razorpay Dashboard go to **Settings → Webhooks**, add
`https://your-backend-url/api/webhook`, pick the `payment.captured`
event, and copy the webhook secret it gives you into
`RAZORPAY_WEBHOOK_SECRET`.

## What's intentionally left out

There's no database here — `create-order`/`verify-payment` are stateless
by design, and the frontend still tracks orders in `localStorage` per
user (see `recordOrder()` in the frontend). A real production build
would have this API write orders to Postgres/Mongo instead, keyed by
`razorpay_order_id`, and the webhook would update that same row. That's
the natural "next step" to describe if asked how you'd take this further.
