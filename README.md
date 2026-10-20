# PeerNote

PeerNote helps students in the same course find study partners and share class notes, including notes for a class they missed. Its AI compares notes from different students, fills in concepts one student missed, and suggests peers to study with.

Live site: _coming soon_ (custom domain to be added)

## Tech stack

- **Frontend:** Next.js (App Router) with TypeScript and Tailwind CSS
- **Backend and database:** Supabase (Postgres, Auth, Storage)
- **Hosting:** Vercel, deployed from this repo's `main` branch
- **AI features:** server-side routes only, so API keys never reach the browser

## Team

- **Project management:** Amelia, Avi
- **Frontend and design:** Emily, Amarya
- **Backend, testing, and deployment:** Miles, Danny

## Getting started

Requirements: Node.js 20 or newer, and npm.

```bash
git clone https://github.com/amaryapetra/peernote.git
cd peernote
npm install
cp .env.example .env.local   # then fill in the values from the team
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

Copy `.env.example` to `.env.local` and get the values from the team's Supabase project. Never commit `.env.local` or any file containing real keys. The `.gitignore` already excludes `.env*` files.

## Scripts

| Command         | What it does                       |
| --------------- | ---------------------------------- |
| `npm run dev`   | Start the local dev server         |
| `npm run build` | Create a production build          |
| `npm run lint`  | Run ESLint                         |
| `npx tsc --noEmit` | Type-check without emitting output |

## Workflow

- Work on a branch named after the ticket, such as `feat/note-upload`.
- Open a pull request into `main`. Vercel builds a preview for each one.
- Get one approving review before merging.
- Keep pull requests small, ideally under 300 lines.


## PeerNote dashboard branch: feature checklist

The `feat/peernote-dashboard` branch includes a responsive dashboard for desktop and phone.

| Feature | Current state |
| --- | --- |
| Overview and course cards | Implemented |
| Sign-up, sign-in, and persistent sessions | Implemented using Supabase Auth; requires configuration |
| Discover and join courses | Implemented using Supabase tables |
| Browse, search, share, and read text notes | Implemented using Supabase tables |
| Create and join study groups | Implemented using Supabase tables |
| Compare two classmates' notes | AI route implemented; requires a private API key |
| Preview without Supabase configured | Interactive demo with sample data; **does not persist** |
| PDF and image uploads | Not implemented yet — text note sharing is the current MVP |
| Academic integrity moderation | Basic keyword checks + author confirmation; **not foolproof** |
| Custom domain and published URL | Still requires Vercel and DNS setup |

### Setup for team members

1. Create a Supabase project at [supabase.com](https://supabase.com) (use **one** shared project).
2. Open **SQL Editor** and run the schema in `supabase/schema.sql`.
3. Copy `.env.example` to `.env.local`. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Supabase publishable/anon key), and `AI_API_KEY` (server-only).
4. Run `npm install` to install the new dependencies and **commit the regenerated `package-lock.json`** before merging; then run `npm run dev`.
5. Test sign-up, email confirmation, multiple accounts, note sharing, membership permissions, and note comparison. Run `npm run build` and `npx tsc --noEmit`.
6. Connect the GitHub repository to **Vercel**, add the same environment variables in Vercel, and deploy `main` after review.
7. Purchase or use a team-owned domain. Configure it under Vercel's project domain settings, then update the domain provider's DNS as instructed by Vercel.
8. Submit **both** the public GitHub repository and the actual deployed URL in Canvas by **Thursday, November 19, 2026**.

### Team review before launch

- **Frontend (Emily and Amarya):** confirm color palette, wording, mobile usability, accessibility and course displays.
- **Backend (Miles and Danny):** configure Supabase, test policies for students in other courses, rate-limit joins and AI calls, finish deployment.
- **Project managers (Amelia and Avi):** recruit test accounts, track deliverables, confirm domain ownership, run final demo.

**Important:** Currently the initial content is demonstration data when environment variables are absent. The application is **not yet a live, submission-ready product** until the Supabase project, credentials, schema, testing, deployment and custom domain are completed. Run review with classmates before uploading real student notes. Do not share confidential assessments or copyrighted class material without permission.
