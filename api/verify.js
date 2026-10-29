import { stripe, grantPremium, ACTIVE } from './_lib.js';

// Called when Stripe sends the customer back to /?session_id=cs_...
// We ask Stripe directly whether that session really led to an active subscription,
// and only then hand out the signed premium cookie.
export default async function handler(req, res) {
  const id = String(req.query?.session_id || '');
  if (!/^cs_[A-Za-z0-9_]+$/.test(id)) {
    return res.status(400).json({ premium: false, error: 'Bad session id' });
  }

  try {
    const session = await stripe(`checkout/sessions/${id}`);
    const paid = session.status === 'complete' &&
      ['paid', 'no_payment_required'].includes(session.payment_status);
    const subId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;

    if (session.mode !== 'subscription' || !paid || !subId) {
      return res.status(200).json({ premium: false });
    }

    const sub = await stripe(`subscriptions/${subId}`);
    if (!ACTIVE.has(sub.status)) return res.status(200).json({ premium: false });

    grantPremium(res, subId);
    return res.status(200).json({ premium: true });
  } catch (err) {
    return res.status(500).json({ premium: false, error: 'Server error: ' + err.message });
  }
}
