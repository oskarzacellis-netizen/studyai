import { stripe, siteUrl } from './_lib.js';

// Creates a Stripe Checkout page for the £4.99/month subscription and returns its URL.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const price = process.env.STRIPE_PRICE_ID;
    if (!price) throw new Error('STRIPE_PRICE_ID is not set');
    const base = siteUrl(req);

    const session = await stripe('checkout/sessions', {
      method: 'POST',
      form: {
        mode: 'subscription',
        'line_items[0][price]': price,
        'line_items[0][quantity]': '1',
        success_url: `${base}/?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${base}/`
      }
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    return res.status(500).json({ error: 'Could not start checkout: ' + err.message });
  }
}
