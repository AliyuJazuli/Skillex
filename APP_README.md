# Skillex application guide

Skillex helps people teach what they know, learn from others, and make progress through guided, practical lessons.

**Live app:** [skillex-hydev.netlify.app](https://skillex-hydev.netlify.app)

## Using the application

- **Browse** to explore courses and select a skill.
- **Learn** one lesson at a time through focused Learn, Explore, Practice, Check, and Finish steps. Course and lesson progress are visible, and you can return to the course outline at any time.
- **Save** skills and individual lessons to return to them later.
- **Request account access**; account creation is currently managed by the Skillex team.
- The team reviews access requests. After submitting, the app opens a selectable request-status page beside Home in the navigation. It shows pending, approved, invited, and completed states; applicants can update their email or start another request. Approved users receive a Supabase invitation and set a password before entering the app.
- **Forgot password?** on Login sends a secure reset link. Signed-in users can change a password after confirming the current password or request a reset email from Settings.
- **Create a profile** with your learning and teaching goals to discover peers after access is granted.
- **Request an exchange** with a member and manage the request from the exchange area.
- **Settings** lets signed-in members follow the system appearance or choose light/dark mode, and export/import account-bound learning data.

An account is required for profiles, saved items, cross-device progress, and peer exchanges. Public course information remains available to visitors.

The lesson screen deliberately shows one learning step at a time instead of a long article. Use the step controls to move between the explanation, examples, practice, knowledge check, and wrap-up; the course outline shows completed lessons and the current lesson. Notes save to the course progress record. Completing the last step marks the lesson complete and advances to the next lesson.

Page-to-page navigation keeps the browser address at the Skillex homepage while loading the selected page in place. Route-specific skeletons reflect the page being opened, then the page content enters with a short transition. Initial page loading and route changes both keep the content hidden until its styles and app initialization are ready, avoiding the previous unstyled flash. Direct page links remain available for sharing and indexing. Privacy and Terms pages include a back link that returns to the previous page when possible.

## Data and account behavior

- Supabase Auth manages account sessions and confirmation links.
- Profiles, goals, saved skills, lesson progress, and exchange requests are stored in Postgres.
- Avatar files are stored in a private bucket and served with expiring signed URLs.
- Lesson curriculum is loaded from the `skills.course_content` records. The migration set includes both the full skill seed and curated authored lessons.
- The browser keeps an application cache for responsive startup. Authenticated startup replaces private learning data with the signed-in account's server copy.
- Public sign-up is disabled in the dedicated Skillex Supabase project. The access-request page stores its request in the private Supabase table and never creates an account. The owner reviews and invites approved users from the unlinked `/admin.html` dashboard; invitees complete setup at `complete-profile.html`.
- Password reset and invitation links return to `reset-password.html` and `complete-profile.html`; both redirect URLs must be allowed in Supabase Auth.
- Access-request records and statuses are stored in the private Supabase `access_requests` table by `netlify/functions/access-requests.js`. A browser token can remember the applicant's status view, but Supabase is authoritative. Server-side variables include `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_EMAIL`, and `PUBLIC_SITE_URL`. Never expose the service-role key.
- The request lifecycle is `pending` (“Verifying”) → `approved` → `invited` after Supabase accepts an invite → `completed` after the user sets a password. The owner reviews and sends invitations in `/admin.html`; dashboard APIs verify the signed-in owner's identity server-side. The dashboard has no public navigation link.
- Contact messages are sent to the configured recipient through Gmail API and are not stored in the owner dashboard. Set `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`, `GMAIL_SENDER_EMAIL`, and `CONTACT_RECIPIENT_EMAIL` privately for the Contact Function.
- The owner can create announcements and edit mapped page text in the dashboard. Only text elements marked with `data-cms-key` are editable; HTML, styles, and layout stay in code. Published text and announcements are served by `netlify/functions/public-content.js`.
- Supabase's default SMTP is restricted to team-authorized recipients and has low rate limits. In the dedicated Skillex project, configure a provider-issued host, port, username, and password under **Authentication → Emails → SMTP Settings**. Verify the sender identity and required DNS records with the provider first, save, then test invitation and reset messages. Use `hydeveco@gmail.com` as the sender only if authorized by the provider; never store SMTP credentials in client code or the repository.
- New community discussion posts are shared with signed-in members and can be moderated in the dashboard. Existing browser-only posts are not uploaded or deleted.
- Email address changes may require confirmation, depending on the project Auth settings.

## Release checklist

1. Apply all SQL migrations in filename order to the dedicated Skillex project only, including `20261113221400_admin_dashboard.sql`.
2. Verify the app's public Supabase URL and publishable key match that project.
3. Set the Supabase Auth Site URL to `https://skillex-hydev.netlify.app` and allow that origin plus `/complete-profile.html` and `/reset-password.html` as redirect URLs.
4. Keep public sign-up disabled and email confirmation enabled. Configure custom SMTP and branded invite/reset templates. Verify an owner-issued invitation, account completion, sign-in, password recovery, password change, and sign-out.
5. Set the server-side Supabase and owner environment variables. Configure Gmail OAuth variables for Contact. Deploy and verify the `access-requests`, `admin`, `contact`, and `public-content` Functions without exposing secrets.
6. Test profile edits, skill goals, avatar upload, settings, data backup import/export, saved content, learning progress, and exchange-request status changes with controlled accounts.
7. Run `node --test tests/*.test.cjs` and the syntax checks in the root [README](README.md). Check skeletons, route transitions, legal-page back links, and responsive layouts at mobile and desktop widths.
8. Deploy only after the backend checks pass, then verify the hosted origin, page metadata, icons, and responsive layouts.
9. Verify the site in Google Search Console, submit `https://skillex-hydev.netlify.app/sitemap.xml`, and request indexing for the homepage and privacy policy.

Search engines and social platforms decide how and when indexed pages appear; a correct favicon and structured metadata improve readiness but cannot guarantee a particular search-result treatment.
