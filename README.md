# Skillex

**Where people exchange skills, share knowledge, and grow together.**

Skillex is a peer-learning platform for discovering skills, following guided lessons, tracking progress, and arranging skill exchanges. It is a HYDEV product.

**Live app:** [skillex-hydev.netlify.app](https://skillex-hydev.netlify.app)

**Source repository:** [AliyuJazuli/Skillex](https://github.com/AliyuJazuli/Skillex)

## Features

- Browse skill courses and structured learning paths.
- Track lesson completion, notes, quiz scores, and learning time.
- Save skills and lessons to revisit later.
- Create a profile, set learning and teaching goals, and find peers.
- Send and manage skill-exchange requests.
- Request access, finish an invited account, and recover or change a password.
- Use responsive public pages and installable app assets.

## Technology

- Static, multi-page HTML and CSS with vanilla JavaScript modules
- Supabase Auth and Postgres, protected by Row Level Security
- Private Supabase Storage for profile avatars
- Supabase JavaScript client loaded from jsDelivr; no bundler or build step
- Netlify static hosting and deployment from the `main` branch
- Node's built-in test runner for dependency-free regression tests

## Run locally

No build step or package installation is required.

1. Clone the repository.
2. Open the project in VS Code.
3. Serve the project root using Live Server or another local HTTP server.
4. Open the local site URL in a browser.

The browser-safe Supabase project URL and publishable key are configured in `js/supabase-config.js`. Never put a database password, secret key, or service-role key in the client.

## Supabase setup

The SQL migrations in `supabase/migrations/` must be run, in filename order, against the dedicated Skillex project:

1. `20261110201250_initial_schema.sql`
2. `20261110220000_rich_skill_content.sql`
3. `20261110230000_curated_course_content.sql`

The first migration creates the schema, storage bucket, and row-level security policies. The second adds learning fields and all 17 catalog entries. The third adds the authored, detailed lesson material for the eight fully curated courses. The remaining catalog entries retain their existing in-app learning paths. Do not run these migrations against another Supabase project.

In Supabase Auth settings, keep the email provider enabled, **disable public sign-ups**, set the Site URL to `https://skillex-hydev.netlify.app`, and allow the site origin plus `/complete-profile.html` and `/reset-password.html` as redirect URLs. Public sign-ups are disabled in the dedicated Skillex project. Review access requests, then invite approved users from that project's Auth Users page; the public request form never creates an account. Invitees finish setup at `complete-profile.html`. Keep email confirmation enabled.

Supabase's default email sender only delivers to pre-authorized team addresses and is heavily rate-limited. Configure custom SMTP before sending invitations or password resets to arbitrary users. Use `hydeveco@gmail.com` as the sender only if the SMTP provider authorizes it; keep SMTP credentials out of the browser and repository. The invite and reset email templates can be branded in the Supabase Auth email-template settings.

The site uses Netlify Forms for account-access requests and contact messages. Access requests tell users the team will reply within 24 hours. Form detection is enabled, and email notifications for any form are configured for `aliyujaxuli@gmail.com` and `hydeveco@gmail.com`; the HYDEV recipient must confirm its notification. After deploying a build that contains these forms, confirm that Netlify detected them and both notifications are active.

## Tests

Run the dependency-free checks with:

```powershell
node --test tests/*.test.cjs
node --check js/script.js
node --check js/backend.js
```

See [APP_README.md](APP_README.md) for user-facing behavior, setup details, and release checks. Signed-in members can configure the system/light/dark appearance, change their password, and import or export account-bound learning data from `settings.html`. New visitors can request access at `signup.html`; that request is not an account creation.

## Project structure

```text
Skillex/
├── assets/                 # App, favicon, social, and HYDEV footer assets
├── css/                    # Responsive application styles
├── js/                     # App behavior, Supabase integration, course data
├── supabase/migrations/    # Ordered schema and course migrations
├── tests/                  # Node built-in smoke tests
├── *.html                  # Static application pages
├── site.webmanifest        # PWA identity and icons
├── robots.txt
└── sitemap.xml
```

## License

MIT License. See [LICENSE](LICENSE).
