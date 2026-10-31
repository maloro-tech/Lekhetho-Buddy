# Lekhetho Buddy

A mobile-first companion for small businesses in Lesotho. It keeps simple sales and expense records, shows one educational next step, answers from approved notes, and lets an authorised officer follow up inside this prototype.

It does not register a business, file a return, collect tax, or deliver a case into Revenue Services Lesotho’s systems.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173.

Demo accounts are created on this device the first time the app loads:

| Role | Email | Password |
| --- | --- | --- |
| Business owner | thabo@lekhetho.demo | buddy-demo |
| RSL officer | mpho@lekhetho.demo | buddy-demo |

You can also create a new owner account on the sign-in screen. New accounts are always owners. Officer access cannot be self-assigned.

`npm run typecheck` checks the app and the Buddy server. `npm run self-check` checks totals and the education-note answers. `npm run build` then `npm run preview` serves the production build with the same `/api/buddy` endpoint.

## What works without credentials

- Accounts, business profiles, records, totals, the journey, help requests, and the officer desk are stored in the browser (`localStorage`).
- Totals are calculated in application code.
- `POST /api/buddy` answers from the education notes in `server/knowledge.ts`. It does not invent tax rates, thresholds, deadlines, forms, or amounts to pay. Uncertain questions set `needs_human_help`.

## What still needs real credentials

**Supabase.** Apply `supabase/migrations/20261031120000_init.sql`. The migration creates the tables, Row Level Security, and `business_record_summary`. Owners can read only their own line items. Officers can read help requests and profiles, not private notes or phone numbers, and monthly totals only when the owner consented. Promote an officer from the SQL editor or service role; sign-up always creates an owner and authenticated users cannot change `role`.

The client keeps using local data until `VITE_DATA_BACKEND=supabase` is set. The anon key may live in `VITE_SUPABASE_ANON_KEY`. The service-role key must never be added to any `VITE_` variable or client file. `src/lib/data/supabase-repository.ts` is the adapter boundary and is not connected yet.

**OpenAI.** Set `OPENAI_API_KEY` in the server environment (see `.env.example`) and restart `npm run dev`. The key is read only by the Vite server plugin. Do not prefix it with `VITE_`. When the key is missing, Buddy stays on the education notes. When it is present, `/api/buddy` calls the OpenAI API and still replaces answers that invent a rate, a filing, a registration, or a payment.
