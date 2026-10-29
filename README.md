# PeerNote

PeerNote helps students in the same course share class notes, catch up on lectures they missed, and find classmates to study with. AI (Claude, by Anthropic) compares notes between classmates, fills in concepts one student missed, answers questions from the class's notes, and screens every upload so PeerNote never works as a test bank.

Live site: _coming soon_ (custom domain to be added)

## What it does

| Feature | Where | How it works |
| --- | --- | --- |
| Accounts | `/signup`, `/login` | Supabase Auth (email and password, email confirmation, password reset). Everything a student creates is saved to their account. |
| Pick up where you left off | `/dashboard` | Remembers the last course you opened and shows new classmate notes, requests, groups, and saved AI results. |
| Courses | `/courses` | Organize joined courses into expandable semester folders; search for a course or add one. Joining a class requires its private 12-character invite code. |
| Class materials | `/courses/[id]/materials` | Members can upload authorized PDF or PPTX slides (up to 4 MB), save Canvas/HTTPS links, organize by lecture date, preview PDFs and PowerPoint slide text, and optionally opt into AI-assisted study features. Private files use Supabase Storage and short-lived signed URLs. |
| Share notes | `/courses/[id]/notes/new` | Markdown editor with preview, autosaved draft, and import from any file: Word, PowerPoint, Excel, OpenDocument, RTF, HTML, and text or code files are read directly (no AI needed); photos and PDFs are transcribed with AI. iPhone HEIC and other photo formats are converted to JPG in the browser first. |
| Integrity screening | every note save | Keyword scan plus an AI check. Real quiz/exam content and answer keys are rejected with a reason. Notes can only be written by the server after the check passes. |
| Fill the gaps (AI) | a note you wrote | Compares your notes with classmates' notes from the same lecture and lists what you missed, with sources. |
| Catch up (AI) | `/courses/[id]/catch-up` | Builds a study guide from up to eight of the most-helpful notes for a class date. |
| Ask the notes (AI) | `/courses/[id]/ask` | Postgres full-text search finds relevant notes; Claude answers with citations, or says the notes don't cover it. |
| Study partners | `/partners`, course Classmates tab | Classmates ranked by shared courses, overlapping free time, and study style. Contact info is revealed only after both people agree. |
| Study groups | course Study groups tab, `/groups/[id]` | Create or join a capped-size group with a time, place, and members-only message board. |

## Security and rollout considerations

- **Course access:** Course metadata is searchable, but an invite code is required before joining and reading notes. Only members can view or share their course's code. PeerNote does not independently verify university enrollment; share codes only with classmates.
- **Integrity screening:** Keyword checks always run. When an Anthropic key is configured, the entire note also receives AI screening; an AI outage prevents saving. Without an AI key, only keyword scanning runs and may miss prohibited content. No automated screen guarantees compliance with a school honor code.
- **AI usage:** Apply every migration (including `20261027000000_atomic_ai_quota.sql`) before deploying the matching app code. AI quotas are reserved atomically in Postgres.
- **Invite-code rollout:** Apply `20261029160000_secure_course_invites.sql` with the corresponding app release. It rotates previously exposed six-character codes to twelve characters and blocks direct enrollments. Existing members retain access; old shared codes stop working. The app does not collect Canvas screenshots.
- **Class materials rollout:** Apply `supabase/migrations/20261029170000_course_materials.sql` before deploying this version. File uploads use a private `course-materials` Storage bucket with course-members-only read access; uploads and deletions are performed server-side after membership checks. An uploader must confirm they have permission to share. PDF pages preview inline; PowerPoint slides have a text preview and a download link (full-fidelity PPTX rendering isn't available). Only opt-in extracted slide text is available for AI; Canvas links are never fetched.
- **Privacy:** Avoid uploading private or instructor-restricted content. Test with multiple accounts and live Supabase/Anthropic before a public launch.

## Tech stack and architecture

- **Frontend and server:** Next.js 16 (App Router, Server Components, Server Actions, Cache Components) with TypeScript and Tailwind CSS 4.
- **Database and auth:** Supabase. Postgres holds all data; Supabase Auth handles accounts. Row level security (RLS) policies enforce who can see what in the database itself, so a bug in the website can't leak another course's notes.
- **AI:** Claude API (`@anthropic-ai/sdk`), called only from the server so the key never reaches the browser. Responses use structured outputs validated with Zod. Each student has hourly limits per AI feature.
- **Hosting:** Vercel, deployed from this repo's `main` branch, on a custom domain.

```
src/
  app/
    (marketing)/     Public pages: home, about, integrity, privacy (static, indexed)
    (auth)/          Login, sign up, password reset
    (app)/           Signed-in app: dashboard, courses, notes, groups, partners, profile
    actions/         Server Actions (every one re-checks who the user is)
    api/transcribe/  Imports a notes file (any format) as Markdown
    auth/confirm/    Landing route for email links
    sitemap.ts, robots.ts, opengraph-image.tsx, manifest.ts
  components/        UI pieces
  lib/
    ai/              Claude prompts and the shared client
    supabase/        Server, admin, and proxy clients
    matching.ts      Study-partner scoring
    integrity.ts     Keyword pre-check for uploads
  proxy.ts           Refreshes the session and redirects signed-out visitors
supabase/
  migrations/        Database schema, triggers, and RLS policies
  tests/             RLS tests that run against a real Postgres
tests/               Unit tests (Vitest)
```

## Getting started

Requirements: Node.js 20 or newer, and npm.

```bash
git clone https://github.com/amaryapetra/peernote.git
cd peernote
npm install
cp .env.example .env.local   # then fill in the values (see below)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 1. Set up Supabase (one person does this once)

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor**, paste the contents of `supabase/migrations/20261020000000_init.sql`, and run it. (Or with the Supabase CLI: `supabase link` then `supabase db push`.)
3. Under **Authentication > URL Configuration**:
   - Set **Site URL** to the live domain (for example `https://peernote.app`).
   - Add these to **Redirect URLs**: `http://localhost:3000/**`, `https://<your-domain>/**`, and `https://*-<your-vercel-team>.vercel.app/**` for preview deployments.
4. Under **Project Settings > API**, copy the project URL, the `anon` key, and the `service_role` key into `.env.local`.
5. **Set up email sending before inviting people.** Supabase's built-in email sender only allows a couple of emails per hour for the whole project, so once a few people sign up, everyone else gets "We've hit our limit on sign-up emails" and can't create an account. Fix it with custom SMTP:
   - Create a free account with an email provider such as [Resend](https://resend.com) (or SendGrid, Postmark, Brevo) and get its SMTP host, port, username, and password.
   - In Supabase, go to **Authentication > Emails > SMTP Settings**, turn on **Enable custom SMTP**, and paste those in.
   - Then go to **Authentication > Rate Limits** and raise **Rate limit for sending emails** (for example to 100 per hour).
   - Alternative for testing only: turning off **Confirm email** under **Authentication > Sign In / Providers > Email** skips the email entirely, but then nobody's email address is verified.

### 2. Add a Claude API key (optional but recommended)

Create a key at [console.anthropic.com](https://console.anthropic.com) and set `ANTHROPIC_API_KEY`. Without it, the app still works; AI buttons explain that AI isn't set up, and uploads get the keyword integrity scan only.

### Environment variables

| Name | Where it's used | Secret? |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Sitemap, canonical URLs, social previews, email links | No |
| `NEXT_PUBLIC_SUPABASE_URL` | All Supabase calls | No |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | All Supabase calls (RLS applies) | No |
| `SUPABASE_SERVICE_ROLE_KEY` | Saving notes after the integrity check | **Yes** |
| `ANTHROPIC_API_KEY` | AI features | **Yes** |
| `ANTHROPIC_MODEL` | Optional model override (default `claude-opus-5-5`) | No |

Never commit `.env.local`. The `.gitignore` already excludes `.env*` files except `.env.example`.

## Deploying (Vercel) and the custom domain

1. In Vercel, **Add New > Project**, import `amaryapetra/peernote`. The framework is detected automatically.
2. Add every variable from the table above under **Settings > Environment Variables** (Production and Preview). Set `NEXT_PUBLIC_SITE_URL` to the custom domain.
3. Deploy. Every push to `main` deploys to production; every pull request gets a preview URL.
4. **Custom domain:** buy a domain (for example on Namecheap or Cloudflare), then in Vercel go to **Settings > Domains**, add it, and create the DNS records Vercel shows you (an `A` record for the root domain and a `CNAME` for `www`). HTTPS is automatic once DNS updates.
5. Back in Supabase, make sure the custom domain is the **Site URL** and is in the redirect list (step 1.3 above), or confirmation emails will link to the wrong place.
6. After launch, submit `https://<your-domain>/sitemap.xml` in [Google Search Console](https://search.google.com/search-console).

## SEO

- Page titles and descriptions on every public page (`metadata` exports), with a `%s · PeerNote` title template.
- Canonical URLs, Open Graph and Twitter cards, and a generated social preview image (`src/app/opengraph-image.tsx`).
- `sitemap.xml` and `robots.txt` generated from `src/app/sitemap.ts` and `src/app/robots.ts`. Signed-in pages are excluded and marked `noindex`.
- JSON-LD structured data on the home page (`WebApplication` and `FAQPage`).
- Semantic HTML: one `h1` per page, `header`/`nav`/`main`/`footer` landmarks, labeled forms, and a skip link.
- Public pages are prerendered as static HTML.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the local dev server |
| `npm run build` | Create a production build |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Generate route types and type-check |
| `npm test` | Run unit tests (Vitest) |
| `./scripts/test-db.sh` | Apply migrations to a throwaway local Postgres and run the RLS tests |

GitHub Actions runs all of these on every pull request (`.github/workflows/ci.yml`).

## Changing the database

Add a new file in `supabase/migrations/` (named with a timestamp so it sorts last) instead of editing the existing one, then run it in the SQL editor or with `supabase db push`. Update `src/lib/database.types.ts` to match (or regenerate it with `npx supabase gen types typescript --project-id <ref>`), and add a check to `supabase/tests/rls_test.sql` for any new policy.

## Team

- **Project management:** Amelia, Avi
- **Frontend and design:** Emily, Amarya
- **Backend, testing, and deployment:** Miles, Danny

## Workflow

- Work on a branch named after the ticket, such as `feat/note-upload`.
- Open a pull request into `main`. Vercel builds a preview for each one, and CI must pass.
- Get one approving review before merging.
- Keep pull requests small, ideally under 300 lines.
