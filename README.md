# StudyAI — Deployment Guide

## How it works
Your API key lives on Vercel's servers. Users just open the website and start asking questions — they never see the key.

---

## Step by step setup (completely free)

### Step 1 — Get your free Groq API key
1. Go to **console.groq.com**
2. Sign up for free
3. Click "Create API Key"
4. Copy the key (starts with gsk_)

### Step 2 — Get a free GitHub account
1. Go to **github.com**
2. Sign up for free
3. Create a new repository called "studyai"
4. Upload all these files to it

### Step 3 — Deploy to Vercel (free)
1. Go to **vercel.com**
2. Sign up with your GitHub account
3. Click "Add New Project"
4. Select your "studyai" repository
5. Click Deploy

### Step 4 — Add your secret API key
1. In Vercel, go to your project settings
2. Click "Environment Variables"
3. Add a new variable:
   - Name: GROQ_API_KEY
   - Value: your key from Step 1
4. Click Save
5. Redeploy the project

### Step 5 — Share with everyone
Vercel gives you a free URL like:
**https://studyai-yourname.vercel.app**

Share that link with anyone — no API key needed, completely free!

---

## Files explained
- **index.html** — the frontend everyone sees
- **api/chat.js** — the backend that hides your API key
- **vercel.json** — tells Vercel how to run the backend
- **package.json** — project configuration

---

## Free limits on Groq
Groq's free tier is very generous:
- 30 requests per minute
- 14,400 requests per day
- That's enough for a whole school to use it

---

## Want to add more subjects?
Open index.html and find the SUBJECTS object.
Add a new entry following the same pattern as the existing subjects.

---

## Premium (Stripe) setup

Add these in Vercel → Settings → Environment Variables, then redeploy:

| Name | Value |
|---|---|
| `GROQ_API_KEY` | your Groq key |
| `STRIPE_SECRET_KEY` | Stripe secret key (`sk_test_...` while testing, `sk_live_...` when live) |
| `STRIPE_PRICE_ID` | the Price ID of the £4.99/month product (`price_...`) |
| `SESSION_SECRET` | any long random string (used to sign cookies) |
| `SITE_URL` | optional, e.g. `https://your-site.vercel.app` |

Users get 10 free questions (tracked in a signed cookie), then see the upgrade box.
Never put secret keys in the code or GitHub.
