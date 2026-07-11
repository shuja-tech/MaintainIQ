# MaintainIQ — AI-Powered QR Maintenance & Asset History Platform

**Live link:** https://maintainiq.vercel.app

**--**
**SMIT Hackathon**
**--**

**Track:** B — Supabase (Backend-as-a-Service)
**Stack:** React 18 + Vite + React Router + Tailwind CSS + Supabase (Postgres, Auth, Edge Functions) + `qrcode.react`

> Scan. Report. Diagnose. Maintain.

MaintainIQ gives every physical asset a digital identity: a unique code, a QR-accessible public
page, an AI-assisted issue-reporting workflow, technician assignment, a maintenance record, and a
permanent history timeline.

This is a **multi-file, multi-page application** — not a single-page/single-file prototype. Routing
is handled by React Router across dedicated pages (`src/pages/*`), with shared components
(`src/components/*`), a Supabase client/context layer (`src/lib`, `src/context`), and a server-side
Edge Function (`supabase/functions/ai-triage`) so the AI API key is never exposed to the browser.

---

## 1. Project structure

```
maintainiq/
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── vercel.json                 # SPA rewrite rule for Vercel
├── .env.example                # copy to .env and fill in your Supabase keys
├── public/
│   └── _redirects              # SPA rewrite rule for Netlify
├── src/
│   ├── main.jsx                # app entry point
│   ├── App.jsx                 # route table
│   ├── index.css               # design tokens / global styles
│   ├── context/
│   │   └── AuthContext.jsx     # session + role-aware auth context
│   ├── lib/
│   │   ├── supabaseClient.js   # Supabase client init
│   │   └── aiTriage.js         # calls the ai-triage edge function (timeout/fallback safe)
│   ├── components/
│   │   ├── Navbar.jsx
│   │   ├── ProtectedRoute.jsx
│   │   ├── StatusBadge.jsx
│   │   ├── QRCodeDisplay.jsx
│   │   └── Loader.jsx
│   └── pages/
│       ├── Home.jsx            # public landing page
│       ├── Login.jsx / Register.jsx
│       ├── Dashboard.jsx        # role-aware summary cards + recent issues
│       ├── Assets.jsx           # searchable/filterable asset list
│       ├── AssetNew.jsx         # asset registration (admin)
│       ├── AssetDetails.jsx     # internal asset view: edit, QR, history, issues
│       ├── PublicAssetPage.jsx  # /asset/:code — the page a QR scan opens (no login)
│       ├── Issues.jsx           # searchable/filterable issue list
│       ├── IssueDetails.jsx     # assignment, guarded status workflow, maintenance log
│       └── NotFound.jsx
└── supabase/
    ├── schema.sql               # full Postgres schema + RLS policies
    ├── seed_demo_data.sql       # optional demo assets for evaluation
    └── functions/ai-triage/
        └── index.ts             # Edge Function: calls Anthropic API server-side
```

---

## 2. Setting up Supabase (one-time)

1. Create a free project at [supabase.com](https://supabase.com).
2. Go to **SQL Editor → New query**, paste the contents of `supabase/schema.sql`, and run it.
   This creates all tables, the `profiles` auto-provisioning trigger, RLS policies, the safe
   `public_assets` view, and the `next_issue_number()` helper.
3. (Optional) Sign up one admin account in the running app first, then run
   `supabase/seed_demo_data.sql` to load 5 demo assets for the evaluator to explore immediately.
4. Go to **Project Settings → API** and copy your **Project URL** and **anon public key**.

### Deploying the AI Issue Triage Edge Function

The AI call happens **server-side** so the Anthropic API key is never shipped to the browser
(as required by the brief).

```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy ai-triage
supabase secrets set ANTHROPIC_API_KEY=sk-ant-your-key-here
```

If you don't have an API key yet, the function still works: it returns a safe, clearly-labeled
fallback suggestion instead of erroring out, so the reporting flow is never blocked (per the
"AI timeout / unavailable service" requirement).

---

## 3. Running the app locally

```bash
npm install
cp .env.example .env
# edit .env with your Supabase URL + anon key
npm run dev
```

Visit `http://localhost:5173`.

## 4. Building for production / deployment

```bash
npm run build
npm run preview   # sanity-check the production build locally
```

Deploy the `dist/` folder to Vercel, Netlify, or any static host. `vercel.json` and
`public/_redirects` are already included so client-side routes (e.g. `/asset/AST-100001`) don't
404 on a hard refresh.

---

## 5. Demo walkthrough (matches the brief's expected scenario)

1. **Register** an admin account (`/register`), or sign in with seeded credentials.
2. **Register an asset** — "Classroom Projector 01" — from `/assets/new`. A unique asset code and
   QR-accessible link are generated automatically.
3. Open the asset's details page and click **Open public page** (or scan the QR with a phone).
4. On the public page, click **Report an issue** and describe:
   *"The projector display is flickering and sometimes does not detect HDMI."*
5. Click **Get AI diagnostic suggestions** — the AI Issue Triage edge function returns a
   professional title, category, priority, possible causes, and safe initial checks. Edit any
   field before submitting (required by the brief: AI output is advisory only).
6. Submit the report — an issue number is generated, the asset status flips to *Issue Reported*,
   and a history entry is recorded.
7. Sign in as an admin, open **Issues**, and **assign the issue** to a technician.
8. Sign in as that technician, open the issue, click **Add maintenance note**, record findings
   (e.g. "HDMI cable damaged, replaced"), then advance the status through
   **Inspection Started → Maintenance In Progress → Resolved**.
9. The asset automatically returns to **Operational**, and both the issue and asset history
   timelines show the full record.

## 6. Roles & demo credentials

Create two accounts through `/register`:

| Role | Example email | Password |
|---|---|---|
| Administrator | admin@maintainiq.demo | demo1234 |
| Technician | tech@maintainiq.demo | demo1234 |

Reporters need **no account** — the public asset page is fully anonymous, as required.

## 7. Business rules implemented

- Unique `asset_code` and `issue_number`, enforced at the database level.
- Asset status is kept in sync automatically as an issue moves through its workflow
  (Reported → Issue Reported, Inspection Started → Under Inspection, Maintenance In Progress →
  Under Maintenance, Resolved → Operational), plus a manual "Mark Out of Service" action for
  critical/safety issues.
- Guarded status transitions (`ALLOWED_NEXT` map in `IssueDetails.jsx`) — only valid next steps
  are ever offered in the UI.
- An issue cannot be marked **Resolved** without at least one maintenance record.
- **Closed** issues are read-only until reopened.
- Maintenance cost cannot be negative (validated client-side and via a Postgres `check` constraint).
- Next service date is validated against the last service date.
- Critical-priority issues are visually distinguished (pulsing red badge + safety banner).
- The public asset page only ever reads from the `public_assets` view / safe columns — private
  technician notes, costs, and internal attachments are never sent to anonymous visitors.

## 8. AI integration notes

- **Mandatory capability implemented:** AI Issue Triage (`supabase/functions/ai-triage`).
- Runs server-side; the API key lives in a Supabase secret, never in client code.
- Returns strict JSON, validated before being trusted by the client (`ALLOWED_PRIORITIES` check,
  array-shape check) — invalid or unparseable output falls back to a safe default instead of being
  stored blindly.
- The reporter always reviews and can edit the AI-suggested title/category/priority before
  submitting; `ai_suggested` and `ai_edited` are stored on the issue row per the brief's
  requirement to track whether a field was AI-suggested and whether it was edited.
- The system prompt explicitly forbids unsafe electrical/mechanical/fire instructions and forces
  `Critical` priority + "contact a qualified technician" language whenever a complaint suggests a
  safety hazard.

## 9. What's intentionally out of scope

Per Track B's mandatory scope, GenAI is optional but implemented; Redis/AWS/Docker/CI are Track A
bonus items and are not required here. The design is left ready to extend with realtime
(`supabase.channel`), email notifications (Supabase + a provider like Resend), and an AI
maintenance-summary enhancement if you want to chase extra credit.
