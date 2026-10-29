import { FREE_LIMIT, getFreeUsed, isPremium } from './_lib.js';

// Tells the page whether to show "X free questions left" or the Premium badge.
export default async function handler(req, res) {
  try {
    const premium = await isPremium(req, res);
    const remaining = premium ? null : Math.max(0, FREE_LIMIT - getFreeUsed(req));
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ premium, remaining, limit: FREE_LIMIT });
  } catch (err) {
    return res.status(500).json({ error: 'Server error: ' + err.message });
  }
}
