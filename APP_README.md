# Skillex application guide

Skillex helps people teach what they know, learn from others, and make progress through guided, practical lessons.

**Live app:** [skillex-hydev.netlify.app](https://skillex-hydev.netlify.app)

**Source:** [AliyuJazuli/Skillex](https://github.com/AliyuJazuli/Skillex)

## Using the application

- **Browse** to explore courses and select a skill.
- **Learn** through the course overview, lesson content, quizzes, notes, and practical projects.
- **Save** skills and individual lessons to return to them later.
- **Request account access**; account creation is currently managed by the Skillex team.
- The team reviews access requests and aims to reply within 24 hours. Approved users receive a Supabase invitation and set a password before entering the app.
- **Forgot password?** on Login sends a secure reset link. Signed-in users can change a password after confirming the current password or request a reset email from Settings.
- **Create a profile** with your learning and teaching goals to discover peers after access is granted.
- **Request an exchange** with a member and manage the request from the exchange area.
- **Settings** lets signed-in members follow the system appearance or choose light/dark mode, and export/import account-bound learning data.

An account is required for profiles, saved items, cross-device progress, and peer exchanges. Public course information remains available to visitors.

Page-to-page navigation keeps the browser address at the Skillex homepage while loading the selected page in place. A branded loading screen covers route changes, and loaded styles are kept in place to prevent an unstyled flash. Direct page links remain available for sharing and indexing.

## Local setup

The app is static; serve the repository root over HTTP using VS Code Live Server or another static server. Authentication and synced features require the configured Skillex Supabase project to be available.

The browser client configuration lives in `js/supabase-config.js`. Its URL and publishable key are public by design; database access must remain protected by the migrations' row-level security policies. Never expose a database password, secret key, or service-role key in the app.

## Data and account behavior

- Supabase Auth manages account sessions and confirmation links.
- Profiles, goals, saved skills, lesson progress, and exchange requests are stored in Postgres.
- Avatar files are stored in a private bucket and served with expiring signed URLs.
- Lesson curriculum is loaded from the `skills.course_content` records. The migration set includes both the full skill seed and curated authored lessons.
- Local storage is used as an application cache. Authenticated startup replaces private learning data with the signed-in account's server copy.
- Public sign-up is disabled in the dedicated Skillex Supabase project. The access-request page submits a Netlify Form and never creates an account; approved users are invited from Supabase Auth and complete setup at `complete-profile.html`.
- Password reset and invitation links return to `reset-password.html` and `complete-profile.html`; both redirect URLs must be allowed in Supabase Auth.
- Access-request and contact form submissions are processed by Netlify Forms after a deployment containing those forms. Email notifications are configured for any form to `aliyujaxuli@gmail.com` and `hydeveco@gmail.com`; the HYDEV recipient must confirm its notification before delivery is active.
- Supabase's default SMTP is restricted to team-authorized recipients and has low rate limits. Configure custom SMTP before sending invitations or password resets to other addresses. Use `hydeveco@gmail.com` as the sender only if the SMTP provider authorizes it; never store SMTP credentials in client code.
- Community discussion posts currently save only in the visitor's browser; the interface labels this clearly and does not claim that posts are shared.
- Email address changes may require confirmation, depending on the project Auth settings.

## Release checklist

1. Apply all SQL migrations in filename order to the dedicated Skillex project only.
2. Verify the app's public Supabase URL and publishable key match that project.
3. Set the Supabase Auth Site URL to `https://skillex-hydev.netlify.app` and allow that origin plus `/complete-profile.html` and `/reset-password.html` as redirect URLs.
4. Keep public sign-up disabled and email confirmation enabled. Configure custom SMTP and branded invite/reset templates. Verify an owner-issued invitation, account completion, sign-in, password recovery, password change, and sign-out.
5. After deploy, confirm Netlify detected `account-access-request` and `contact`, confirm both email notification recipients are active, then test each form.
6. Test profile edits, skill goals, avatar upload, settings, data backup import/export, saved content, learning progress, and exchange-request status changes with controlled accounts.
7. Run `node --test tests/*.test.cjs` and the syntax checks in the root [README](README.md).
8. Deploy only after the backend checks pass, then verify the hosted origin, page metadata, icons, and responsive layouts.
9. Verify the site in Google Search Console, submit `https://skillex-hydev.netlify.app/sitemap.xml`, and request indexing for the homepage and privacy policy.

Search engines and social platforms decide how and when indexed pages appear; a correct favicon and structured metadata improve readiness but cannot guarantee a particular search-result treatment.
