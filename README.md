# PeerNote

PeerNote helps students in the same course share class notes, catch up on lectures they missed, and find classmates to study with in study groups and video calls. Every note is screened for exam and answer-key content so PeerNote doesn't become a test bank. PeerNote has no AI features and needs no paid AI service.

Live site: https://peernote-eta.vercel.app

## What it does

| Feature | Where | How it works |
| --- | --- | --- |
| Accounts | `/signup`, `/login` | Supabase Auth (email and password, email confirmation, password reset). Everything a student creates is saved to their account. |
| Pick up where you left off | `/dashboard` | Remembers the last course you opened and shows new classmate notes, partner requests, and study groups. |
| Courses | `/courses` | Organize joined courses into expandable semester folders; search for a course or add one. Joining a class requires its private 12-character invite code. |
| Class materials | `/courses/[id]/materials` | Members can upload authorized PDFs, Office files, OpenDocument files, text and common images (up to 25 MB, 12 uploads/day; executables and archives are blocked), save Canvas/HTTPS links, organize by lecture date (optional), preview PDFs and images, and see a text preview of documents, slides, and spreadsheets. Private files use Supabase Storage and short-lived signed URLs. |
| Share notes | `/courses/[id]/notes/new` | Type notes in a Markdown editor (preview, autosaved draft, import from Word, PowerPoint, Excel, OpenDocument, RTF, HTML, and text files), or upload a PDF, photo, or document of your notes as-is. Note files appear on the Notes tab under their lecture date. |
| Integrity screening | every note save | Keyword and pattern scan. Content that looks like quiz/exam questions or answer keys is rejected with a reason. Notes can only be written by the server after the check passes. |
| Search notes | course Notes tab | Postgres full-text search across a course's notes. |
| Study partners | `/partners`, course Classmates tab | Classmates ranked by shared courses, overlapping free time, and study style. Contact info is revealed only after both people agree. |
| Study groups | course Study groups tab, `/groups/[id]` | Create or join a capped-size group with a time, place, and members-only message board. |
| Video call | `/courses/[id]/video` | One Jitsi Meet room per course, opened in a new tab. Only members see the link. |
| Notifications | `/notifications` | Private in-app alerts for new course notes, accepted study partner requests, group messages, and meeting reminders. |
| Course moderation | `/courses/[id]/moderation` | Course creators review content reports, remove inappropriate content, block unauthorized students and rotate private invite links. |
| Course invite links | `/join/[code]` | Classmates join from a shareable link after signing into PeerNote with a valid Tulane account. |

## Video calls

Each course has a video room on the free public Jitsi Meet server (`meet.jit.si`). The room name is a random ID stored in `course_video_rooms`, readable only by enrolled students (RLS). Jitsi itself can't check course membership, so anyone who gets the link can join. To limit that, the course gets a new room whenever its creator removes a student or resets the invite (`20261110010000_video_room_rotation.sql`).

The call opens in a new tab instead of being embedded in the page, because meet.jit.si ends embedded calls after about five minutes. Jitsi may ask the first person in a call to sign in to start it. For calls embedded in PeerNote or locked to course members, the team would need its own Jitsi server or a paid video API.

## Security and rollout considerations

- **Course access:** Course metadata is searchable, but an invite code is required before joining and reading notes. Only members can view or share their course's code. PeerNote does not independently verify university enrollment; share codes only with classmates.
- **Integrity screening:** A keyword and pattern scan runs on every note. It can miss prohibited content; classmates can report anything that slips through. No automated screen guarantees compliance with a school honor code.
- **Old AI tables:** Earlier versions had AI features. Their tables (`ai_insights`, `ai_usage`) and quota function are still in the database but nothing uses them. Keep applying every migration in order.
- **Invite-code rollout:** Apply `20261029160000_secure_course_invites.sql` with the corresponding app release. It rotates previously exposed six-character codes to twelve characters and blocks direct enrollments. Existing members retain access; old shared codes stop working. The app does not collect Canvas screenshots.
- **Class materials rollout:** Apply `supabase/migrations/20261029170000_course_materials.sql` before deploying this version. File uploads use a private `course-materials` Storage bucket with course-members-only read access; uploads and deletions are performed server-side after membership checks. An uploader must confirm they have permission to share. Also apply `20261029190000_materials_any_file_type.sql`, which lets the database accept any file extension; the app itself only accepts the formats listed under File upload protections below. Only real PDFs and images open in the browser; every other file is stored as a generic download so an uploaded web page or script can't run for classmates. Canvas links are never fetched.
- **Pilot upgrade:** Apply `20261108000000_student_safety.sql` and `20261108001000_group_reminders.sql` to Supabase before deploying the matching app. These create in-app notifications, course reporting and moderation, join bans, upload-rate reservations, structured study group meetings and RSVP reminders. Existing content and accounts are kept.
- **Note files and bigger uploads:** Apply `20261110020000_note_files_and_larger_uploads.sql`. It adds note files, makes the lecture date optional for class materials, and raises the storage bucket limit to 25 MB. Files upload from the browser straight to Supabase Storage through a one-time signed link into a private `staging/<user>/` folder (Vercel caps request bodies at 4.5 MB); the server then checks the file and moves it into place. Supabase's project-wide upload limit (Storage settings) must be at least 25 MB; it's 50 MB by default.
- **Study group meeting fixes:** Apply `20261110000000_group_meeting_fixes.sql`. It lets organizers set and change meeting times (previously blocked by a missing column permission) and stops meeting reminders for students who left the group.
- **Privacy:** Avoid uploading private or instructor-restricted content. Test with multiple accounts and live Supabase before a public launch.

## Tech stack and architecture

- **Frontend and server:** Next.js 16 (App Router, Server Components, Server Actions, Cache Components) with TypeScript and Tailwind CSS 4.
- **Database and auth:** Supabase. Postgres holds all data; Supabase Auth handles accounts. Row level security (RLS) policies enforce who can see what in the database itself, so a bug in the website can't leak another course's notes.
- **Video calls:** Jitsi Meet (meet.jit.si), opened in a new tab.
- **Hosting:** Vercel, deployed from this repo's `main` branch, on a custom domain.

```
src/
  app/
    (marketing)/     Public pages: home, about, integrity, privacy (static, indexed)
    (auth)/          Login, sign up, password reset
    (app)/           Signed-in app: dashboard, courses, notes, groups, partners, profile
    actions/         Server Actions (every one re-checks who the user is)
    api/import-notes/ Imports a notes file (Word, slides, text...) as Markdown
    auth/confirm/    Landing route for email links
    sitemap.ts, robots.ts, opengraph-image.tsx, manifest.ts
  components/        UI pieces
  lib/
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

### Environment variables

| Name | Where it's used | Secret? |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Sitemap, canonical URLs, social previews, email links | No |
| `NEXT_PUBLIC_SUPABASE_URL` | All Supabase calls | No |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | All Supabase calls (RLS applies) | No |
| `SUPABASE_SERVICE_ROLE_KEY` | Saving notes after the integrity check | **Yes** |

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


### University email access

New PeerNote signups must use an email ending in exactly `@tulane.edu`. The signup form validates this and `20261029180000_tulane_only_signup.sql` adds a `BEFORE INSERT` trigger on `auth.users` so direct Supabase Auth requests cannot bypass it. Existing accounts are not changed. Keep email verification enabled to establish ownership of a university address.

### File upload protections (pilot)
File uploads are limited to **25 MB per file**, **12 upload attempts per student per 24 hours**, and a strict allowlist of ordinary classroom formats. Headers are checked to catch mislabeled PDFs/images/documents, executables and archives are rejected, and course-level reports are reviewed by course creators. These checks do **not** replace full antivirus scanning.
For an externally managed scanner, configure `MALWARE_SCAN_URL` (an HTTPS endpoint accepting raw bytes via POST and returning `{"clean":true}`) and `MALWARE_SCAN_TOKEN` in Vercel server-side environment variables. If configured, failed or inconclusive scans block an upload. Do not publicly launch broad file sharing without configuring and evaluating a reputable scanner and its data-processing terms.

### Scheduled study group reminders
RSVPs use the device's local timezone, stored as UTC. `20261108001000_group_reminders.sql` adds in-app 24-hour and 1-hour reminders for students who RSVP Going or Maybe. When Supabase Cron is supported, it creates the `peernote-group-reminders` job every 15 minutes. Check `SELECT jobname,active FROM cron.job WHERE jobname='peernote-group-reminders';` after deployment, and manually enable Cron if the job was not scheduled. It does not send email or phone push notifications.
