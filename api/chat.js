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
        model: 'llama-3.3-70b-versatile',
        max_tokens: 1024,
        messages: [{ role: 'system', content: systemPrompt.slice(0, 2000) }, ...trimmed]
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    // Only count a question once it has actually been answered.
    let remaining = null;
    if (!premium) {
      setFreeUsed(res, used + 1);
      remaining = Math.max(0, FREE_LIMIT - (used + 1));
    }

    return res.status(200).json({
      reply: data.choices[0].message.content,
      premium,
      remaining
    });

  } catch (err) {
    return res.status(500).json({ error: 'Server error: ' + err.message });
  }
}
