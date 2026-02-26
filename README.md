# Madness at the Palace (Demo)

This is a **working demo** of the March Madness bracket challenge app.

## What works in this demo
- Dummy tournament (64 placeholder teams)
- Create an entry (name/email/phone/tiebreaker)
- Pick winners for Round of 64
- Admin can set winners (finalize results)
- Leaderboard auto-updates based on finalized winners

## What is local-only in this demo
- Entries and tournament state are stored in the browser (localStorage).
- Hosting + a shared database is the next step so everyone sees the same leaderboard.

## Run locally
1) Install Node.js (18+)
2) In this folder:
   - `npm install`
   - `npm run dev`
3) Open the URL shown in the terminal (usually http://localhost:5173)

## Next steps (we’ll add)
- Full bracket progression (R32/S16/E8/F4/CH) based on user picks
- Selection Sunday import (CSV/paste) for official teams+seeds
- Hosted database (Supabase/Firebase/etc.) so entries are shared
- PWA install + QR code + public URL


## Supabase (shared beta)
Set Cloudflare Pages env vars:
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY

Then run the SQL in `matp_supabase_setup.sql` (provided separately) in Supabase SQL Editor.
