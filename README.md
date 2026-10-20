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
