# Skillex application guide

Skillex helps people teach what they know, learn from others, and make progress through guided, practical lessons.

**Live app:** [skillex-hydev.netlify.app](https://skillex-hydev.netlify.app)

**Source:** [AliyuJazuli/Skillex](https://github.com/AliyuJazuli/Skillex)

## Using the application

- **Browse** to explore courses and select a skill.
- **Learn** through the course overview, lesson content, quizzes, notes, and practical projects.
- **Save** skills and individual lessons to return to them later.
- **Create a profile** with your learning and teaching goals to discover peers.
- **Request an exchange** with a member and manage the request from the exchange area.

An account is required for profiles, saved items, cross-device progress, and peer exchanges. Public course information remains available to visitors.

## Local setup

The app is static; serve the repository root over HTTP using VS Code Live Server or another static server. Authentication and synced features require the configured Skillex Supabase project to be available.

The browser client configuration lives in `js/supabase-config.js`. Its URL and publishable key are public by design; database access must remain protected by the migrations' row-level security policies. Never expose a database password, secret key, or service-role key in the app.

## Data and account behavior

- Supabase Auth manages account sessions and confirmation links.
- Profiles, goals, saved skills, lesson progress, and exchange requests are stored in Postgres.
- Avatar files are stored in a private bucket and served with expiring signed URLs.
- Lesson curriculum is loaded from the `skills.course_content` records. The migration set includes both the full skill seed and curated authored lessons.
- Local storage is used as an application cache. Authenticated startup replaces private learning data with the signed-in account's server copy.
- Email address changes may require confirmation, depending on the project Auth settings.

## Release checklist

1. Apply all SQL migrations in filename order to the dedicated Skillex project only.
2. Verify the app's public Supabase URL and publishable key match that project.
3. Set the Supabase Auth Site URL to `https://skillex-hydev.netlify.app` and add that exact origin to allowed redirect URLs.
4. Keep email confirmation enabled and verify sign-up, confirmation, sign-in, and sign-out.
5. Test profile edits, skill goals, avatar upload, saved content, learning progress, and exchange-request status changes with controlled accounts.
6. Run `node --test tests/*.test.cjs` and the syntax checks in the root [README](README.md).
7. Deploy only after the backend checks pass, then verify the hosted origin, page metadata, icons, and responsive layouts.

Search engines and social platforms decide how and when indexed pages appear; a correct favicon and structured metadata improve readiness but cannot guarantee a particular search-result treatment.
