import { FREE_LIMIT, getFreeUsed, setFreeUsed, isPremium } from './_lib.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { messages, systemPrompt } = req.body || {};

    if (!Array.isArray(messages) || !messages.length || typeof systemPrompt !== 'string') {
      return res.status(400).json({ error: 'Missing messages or systemPrompt' });
    }
    // Keep costs predictable: only the last 20 messages, each capped in length.
    const trimmed = messages.slice(-20).map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: String(m.content).slice(0, 4000)
    }));

    const premium = await isPremium(req, res);
    const used = getFreeUsed(req);

    if (!premium && used >= FREE_LIMIT) {
      return res.status(402).json({ error: 'free_limit_reached', remaining: 0 });
    }

    // API key stays hidden on the server — users never see it
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        // Groq retired llama-3.3-70b-versatile on 16 Aug 2026. Override with GROQ_MODEL in Vercel if it changes again.
        model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
        // gpt-oss "thinks" first; thinking tokens count towards this limit, so keep it roomy.
        max_completion_tokens: 4096,
        reasoning_effort: 'low',
        messages: [{ role: 'system', content: systemPrompt.slice(0, 2000) }, ...trimmed]
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    const reply = data.choices?.[0]?.message?.content;
    if (!reply) {
      return res.status(502).json({ error: 'The AI did not return an answer. Please try again.' });
    }

    // Only count a question once it has actually been answered.
    let remaining = null;
    if (!premium) {
      setFreeUsed(res, used + 1);
      remaining = Math.max(0, FREE_LIMIT - (used + 1));
    }

    return res.status(200).json({
      reply,
      premium,
      remaining
    });

  } catch (err) {
    return res.status(500).json({ error: 'Server error: ' + err.message });
  }
}
