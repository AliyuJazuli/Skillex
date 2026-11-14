# Skillex

**Where people exchange skills, share knowledge, and grow together.**

Skillex is a peer-learning platform for discovering skills, following guided lessons, tracking progress, and arranging skill exchanges. It is a HYDEV product.

**Live app:** [skillex-hydev.netlify.app](https://skillex-hydev.netlify.app)

## Features

- Browse skill courses and structured learning paths.
- Learn through focused lesson steps and track course progress, completion, notes, quiz scores, and time.
- Save skills and lessons to revisit later.
- Create a profile, set learning and teaching goals, and find peers.
- Send and manage skill-exchange requests.
- Request access, finish an invited account, and recover or change a password.
- Use responsive public pages, route-specific loading skeletons, and installable app assets.
- Navigate between pages with animated transitions; legal pages provide a back link.

## Technology

- Static, multi-page HTML and CSS with vanilla JavaScript modules
- Client-side page navigation that retains direct HTML routes for sharing and indexing
- Supabase Auth and Postgres, protected by Row Level Security
- Private Supabase Storage for profile avatars
- Supabase JavaScript client loaded from jsDelivr
- Netlify static hosting and serverless functions
- Node's built-in test runner for dependency-free regression tests

## Backend architecture

Skillex separates public presentation, authenticated data access, and privileged server operations.

- **Client:** HTML pages, CSS, and vanilla JavaScript provide the interface, page navigation, learning flows, and account settings. The browser Supabase client uses only the project URL and publishable key from `js/supabase-config.js`.
- **Authentication and data:** Supabase Auth manages sessions and invitations. Postgres stores profiles, courses, progress, exchange requests, access requests, announcements, and mapped page content. Row Level Security protects user-owned records. Profile images live in a private Supabase Storage bucket and are delivered with expiring signed URLs.
- **Server API:** Netlify Functions under `netlify/functions/` handle privileged work. `access-requests.js` manages private invitation requests; `admin.js` authorizes owner operations and sends Supabase invitations; `contact.js` delivers messages through Gmail; and `public-content.js` reads published announcements and mapped text. Service-role and Gmail credentials stay in server-side environment variables and are never sent to the browser.
- **Content and moderation:** Owner edits are restricted to text mapped with `data-cms-key`; the server publishes those values without letting the editor alter page markup or styles. Owner APIs verify the signed-in user and configured owner email before acting.
- **Learning data:** Signed-in clients read and write account data through Supabase policies. The browser keeps a request-status token for lookup and a cache for responsive startup; Supabase remains authoritative.

The invitation lifecycle is `pending` → `approved` → `invited` → `completed`. Public visitors can browse courses and request access, but public account creation is disabled. See [APP_README.md](APP_README.md) for user behavior, data handling, and release checks.

## Application behavior

Public visitors can browse course information and submit an access request; the request form does not create an account. The owner reviews requests and sends Supabase Auth invitations from the unlinked `/admin.html` dashboard. That dashboard also manages members, community moderation, announcements, and mapped text fields on public pages. Page navigation uses `js/navigation.js`; `js/page-skeleton.js` displays a page-shaped skeleton until the app is ready, and `js/script.js` initializes the current page. Page content animates in after loading. The app supports system, light, and dark appearance preferences.

The in-app lesson experience presents one step at a time—Learn, Explore, Practice, Check, and Finish—with course and lesson progress, notes, and completion tracking. Some courses use a generic fallback lesson path when authored course material is not available. See [APP_README.md](APP_README.md) for account behavior, data handling, and release checks.

## App installation and updates

Install Skillex from **Settings → App & updates** when the browser offers an install prompt. Browsers without a prompt provide their browser-menu or home-screen instructions. The same section checks for a newer app worker and asks before applying it; choosing to keep the current version leaves the update pending. When releasing a new version, update `SKILLEX_APP_VERSION` in `js/app-version.js`; the service worker imports that file to detect deployments. The worker keeps requests online and does not provide offline access.

## Supabase setup

The SQL migrations in `supabase/migrations/` must be run, in filename order, against the dedicated Skillex project:

1. `20261110201250_initial_schema.sql`
2. `20261110220000_rich_skill_content.sql`
3. `20261110230000_curated_course_content.sql`
4. `20261113170000_access_requests.sql`
5. `20261113221400_admin_dashboard.sql`

The first migration creates the schema, storage bucket, and row-level security policies. The second adds learning fields and all 17 catalog entries. The third adds authored lesson material. The fourth creates the private invitation-request table. The fifth adds shared community posts and owner-managed site pages and announcements. Do not run these migrations against another Supabase project.

In Supabase Auth settings, keep the email provider enabled, **disable public sign-ups**, set the Site URL to the deployed site, and allow the site origin plus `/complete-profile.html` and `/reset-password.html` as redirect URLs. Keep email confirmation enabled. The owner account must exist in Supabase Auth and its email must match the server-side `ADMIN_EMAIL`.

Supabase's default email sender only delivers to pre-authorized team addresses and is heavily rate-limited. In the dedicated Skillex Supabase project, open **Authentication → Emails → SMTP Settings**, enter the host, port, username, and password supplied by your SMTP provider, and set a sender name/address that the provider has verified. Add the provider's required DNS records before testing delivery. Use `hydeveco@gmail.com` as the sender only if the provider authorizes it. Save the settings and test an invitation and password reset. Brand the messages under Supabase Auth email templates. Never put SMTP credentials in the browser or repository.

Access requests and their statuses are stored in the private Supabase `access_requests` table through `netlify/functions/access-requests.js`. Supabase is authoritative for request state. Set these server-side Netlify Function variables: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_EMAIL`, and `PUBLIC_SITE_URL`. The service-role key must never be added to client configuration. The owner dashboard API verifies the signed-in Supabase user and owner email server-side.

Contact messages go through `netlify/functions/contact.js` to the configured Gmail recipient and are not saved to the dashboard. Configure `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`, `GMAIL_SENDER_EMAIL`, and `CONTACT_RECIPIENT_EMAIL` as private Function variables. Never commit secrets.

The invitation flow is `pending` (“Verifying”) → `approved` → `invited` when Supabase accepts the invite → `completed` after password setup. The owner uses `/admin.html` to review requests and send invitations; the route is intentionally absent from public navigation, and every private API action requires server-side owner authorization. Published page text is limited to elements mapped with `data-cms-key` in the HTML; the editor cannot alter layout or markup. Published announcements and mapped text are read by `netlify/functions/public-content.js`. New discussion posts are shared with signed-in members and can be moderated in the dashboard. Existing browser-only posts are not migrated.

## Tests

Run the dependency-free checks with:

```powershell
node --test tests/*.test.cjs
node --check js/script.js
node --check js/backend.js
node --check js/admin.js
node --check netlify/functions/admin.js
node --check netlify/functions/public-content.js
```

See [APP_README.md](APP_README.md) for user-facing behavior, setup details, and release checks. Signed-in members can configure the system/light/dark appearance, install or update Skillex, change their password, and import or export account-bound learning data from `settings.html`. New visitors can request access at `signup.html`; that request is not an account creation.

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
