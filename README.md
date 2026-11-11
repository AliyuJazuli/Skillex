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

In Supabase Auth settings, enable the email provider, set the Site URL to `https://skillex-hydev.netlify.app`, and allow that exact origin as a redirect URL. Keep email confirmation enabled for production. Supabase's default email sender has strict limits; configure a custom SMTP sender in Auth email settings for reliable production sign-up and password recovery. Profile avatars are private and use signed URLs.

## Tests

Run the dependency-free checks with:

```powershell
node --test tests/*.test.cjs
node --check js/script.js
node --check js/backend.js
```

See [APP_README.md](APP_README.md) for user-facing behavior, setup details, and release checks.

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
