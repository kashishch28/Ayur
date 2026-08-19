/**
 * AyurWell Payment API
 * ---------------------
 * A deliberately small Node/Express service that does exactly the two
 * things a static frontend (GitHub Pages, in this case) can never safely
 * do itself:
 *
 *   1. Create a Razorpay order        -> needs the SECRET key
 *   2. Verify a completed payment     -> needs the SECRET key
 *
 * The secret key lives only in this process's environment (.env), never
 * in any file shipped to the browser. The frontend only ever sees the
 * public Key ID and this API's URL.
 *
 * Deploy this anywhere that runs Node (Render, Railway, Fly.io, a VPS —
 * NOT GitHub Pages, which only serves static files). See README.md.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const Razorpay = require('razorpay');

const app = express();

const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';
app.use(cors({ origin: allowedOrigin }));

/**
 * Webhook route MUST be registered with express.raw() BEFORE the global
 * express.json() middleware below — signature verification needs the
 * exact raw request body bytes, and once express.json() has parsed (and
 * therefore consumed/reserialized) the body, the raw bytes are gone and
 * the signature will never match.
 */
app.post('/api/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || '';

  if (!secret) {
    console.warn('Webhook hit but RAZORPAY_WEBHOOK_SECRET is not set — ignoring.');
    return res.status(400).json({ error: 'Webhook secret not configured' });
  }

  const expected = crypto.createHmac('sha256', secret).update(req.body).digest('hex');

  if (signature !== expected) {
    return res.status(400).json({ error: 'Invalid webhook signature' });
  }

  const event = JSON.parse(req.body.toString('utf8'));
  console.log('Razorpay webhook received:', event.event);

  // TODO: in a real app, look up the order (event.payload.payment.entity.order_id)
  // in your database and mark it paid/failed here. This is what keeps your
  // records correct even if the user closes their browser tab mid-payment.

  res.json({ received: true });
});

// Every route below this line gets JSON body parsing.
app.use(express.json());

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

app.get('/', (req, res) => {
  res.json({ status: 'AyurWell payment API is running' });
});

/**
 * POST /api/create-order
 * body: { amount: 1250 }   // rupees, as shown in the cart
 * returns: the Razorpay order object (id, amount, currency, ...)
 */
app.post('/api/create-order', async (req, res) => {
  try {
    const { amount } = req.body;

    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // Razorpay wants paise, not rupees
      currency: 'INR',
      receipt: 'aw_rcpt_' + Date.now()
    });

    res.json(order);
  } catch (err) {
    console.error('create-order error:', err);
    res.status(500).json({ error: 'Could not create order' });
  }
});

/**
 * POST /api/verify-payment
 * body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
 * returns: { verified: true | false }
 *
 * This is the step that actually proves the payment is genuine: Razorpay
 * signs (order_id + '|' + payment_id) with your secret key and sends the
 * result back via the Checkout widget's success handler. We recompute
 * that same signature here, server-side, and compare. If someone tried
 * to fake a "payment succeeded" call directly against this API without a
 * real Razorpay transaction, the signatures would not match.
 */
app.post('/api/verify-payment', (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ verified: false, error: 'Missing fields' });
  }

  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(razorpay_order_id + '|' + razorpay_payment_id)
    .digest('hex');

  const verified = expected === razorpay_signature;
  res.json({ verified });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`AyurWell payment API listening on port ${PORT}`);
});
