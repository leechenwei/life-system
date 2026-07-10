# Life System

A personal, single-user money + life tracker. Next.js + Supabase + Tailwind.

Screens: **Home** (net worth, month spend/income, goals, upcoming reminders) ·
**Add** (2-tap spend/income entry) · **Accounts** (balances + investments) ·
**Plan** (emergency-buffer brain: tells you when you have idle surplus to invest).

## One-time setup

### 1. Create the database
1. Go to [supabase.com](https://supabase.com) → **New project** (free tier is fine).
2. Open **SQL Editor** → paste all of `supabase/schema.sql` → **Run**.

### 2. Connect this app
In Supabase: **Project Settings → API**. Copy into `.env.local`:

```
SUPABASE_URL=                # "Project URL"
SUPABASE_SERVICE_ROLE_KEY=   # "service_role" secret key (NOT anon)
APP_PASSWORD=                # any long password — this is your login
```

> The service_role key is a secret. It only ever runs on the server. Never commit `.env.local` (it's gitignored).

### 3. Run it
```
npm run dev
```
Open http://localhost:3000 → login page → enter your `APP_PASSWORD`.

Add a couple of accounts (mark savings accounts as type **savings** — the Plan uses those),
log a few transactions, and the dashboard fills in.

## Deploy (to use it on your iPhone)
1. Push to GitHub, import the repo at [vercel.com](https://vercel.com).
2. Add the same 3 env vars in Vercel → Project → Settings → Environment Variables.
3. Deploy. On iPhone open the URL in Safari → Share → **Add to Home Screen** = a 2-tap app icon.

## Test
```
npm run test    # pure money logic (sign rules + buffer/surplus math)
```

## Deferred (phase 2)
- Gemini AI advisor (needs a month of data first)
- Gmail/SMS receipt auto-parsing (closest thing to "automatic" on iPhone)
- File attachments (Supabase Storage bucket + `attachments` table already in schema)
- Investment add-form (rows can be added directly in Supabase for now)
