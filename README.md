# Vitano — Landing Page + Waitlist

High-converting landing page for Vitano. Captures waitlist emails via a Next.js API route backed by Supabase (or a local JSON file with zero config).

---

## Run locally

### Prerequisites
- Node.js 18+ (`node -v`)
- npm or pnpm

### Steps

```bash
cd macrolens
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

By default, signups are saved to `waitlist.json` in the project root.

---

## Supabase setup (optional, recommended for production)

1. Create a Supabase project at [supabase.com](https://supabase.com).

2. Run this SQL in the Supabase SQL editor:

```sql
create table waitlist (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  created_at timestamptz default now(),
  source text default 'landing'
);
```

3. Copy `.env.local.example` to `.env.local` and fill in your values:

```bash
cp .env.local.example .env.local
```

---

## Deploy to Vercel

### One-click deploy
1. Push this repo to GitHub.
2. Go to [vercel.com/new](https://vercel.com/new), import the repo, set the root directory to `macrolens`.
3. Add environment variables in Vercel → Settings → Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Deploy.

### CLI deploy
```bash
npm i -g vercel
vercel --prod
```

Set env vars when prompted, or add them after in the Vercel dashboard.

---

## Config

| Thing | Where |
|---|---|
| Waitlist count (social proof) | `app/page.tsx` → `WAITLIST_COUNT` |
| Value props | `app/page.tsx` → `VALUE_PROPS` |
| FAQs | `app/page.tsx` → `FAQS` |
| Accent color | `tailwind.config.ts` + `app/globals.css` |
| Contact email | `app/page.tsx` footer |

---

## Architecture

```
app/
  page.tsx              — landing page (server component)
  layout.tsx            — root layout + metadata
  globals.css           — tailwind + font import
  components/
    WaitlistForm.tsx    — client component (form state, validation, submit)
  api/
    waitlist/
      route.ts          — POST /api/waitlist
services/
  waitlist.ts           — backend-agnostic email storage (Supabase or local JSON)
```
