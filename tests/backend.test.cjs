const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const backendSource = fs.readFileSync(path.join(__dirname, "..", "js", "backend.js"), "utf8");

function createBackend(client, fetchImpl = global.fetch) {
  const context = {
    window: {
      SKILLEX_SUPABASE_CONFIG: {
        url: "https://example.supabase.co",
        publishableKey: "sb_publishable_test"
      },
      supabase: {
        createClient(url, key) {
          assert.equal(url, "https://example.supabase.co");
          assert.equal(key, "sb_publishable_test");
          return client;
        }
      }
    },
    fetch: fetchImpl,
    crypto: { randomUUID: () => "avatar-test-id" }
  };
  vm.runInNewContext(backendSource, context, { filename: "backend.js" });
  return context.window.SkillexBackend;
}

test("account deletion reauthenticates, calls the protected function, and clears the local session", async () => {
  const userId = "11111111-1111-4111-8111-111111111111";
  const calls = [];
  const client = {
    auth: {
      async getSession() {
        return { data: { session: { user: { id: userId, email: "member@example.com" } } }, error: null };
      },
      async signInWithPassword(credentials) {
        calls.push({ operation: "reauthenticate", credentials });
        return {
          data: { user: { id: userId }, session: { access_token: "fresh-member-token" } },
          error: null
        };
      },
      async signOut(options) {
        calls.push({ operation: "signOut", options });
        return { data: null, error: null };
      }
    }
  };
  const backend = createBackend(client, async (url, options) => {
    calls.push({ operation: "delete", url, options });
    return { ok: true, json: async () => ({ deleted: true, warnings: [] }) };
  });

  const result = await backend.deleteAccount("current-password", userId);

  assert.deepEqual(JSON.parse(JSON.stringify(result)), { deleted: true, warnings: [] });
  assert.deepEqual(calls.map(({ operation }) => operation), ["reauthenticate", "delete", "signOut"]);
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0].credentials)), {
    email: "member@example.com",
    password: "current-password"
  });
  assert.equal(calls[1].url, "/.netlify/functions/delete-account");
  assert.equal(calls[1].options.method, "POST");
  assert.equal(calls[1].options.headers.Authorization, "Bearer fresh-member-token");
  assert.equal(calls[1].options.body, undefined);
  assert.deepEqual(JSON.parse(JSON.stringify(calls[2].options)), { scope: "local" });
});

function createQueryClient(responses = {}) {
  const calls = [];
  const client = {
    auth: {},
    from(table) {
      const query = {
        table,
        operation: "select",
        filters: [],
        select(columns) {
          calls.push({ table, operation: "select", columns });
          return this;
        },
        eq(column, value) {
          this.filters.push(["eq", column, value]);
          return this;
        },
        in(column, values) {
          this.filters.push(["in", column, values]);
          return this;
        },
        limit(count) {
          this.limitCount = count;
          return this;
        },
        or(expression) {
          this.filters.push(["or", expression]);
          return this;
        },
        order(column, options) {
          this.orderBy = [column, options];
          return this;
        },
        delete() {
          this.operation = "delete";
          return this;
        },
        insert(values) {
          this.operation = "insert";
          this.values = values;
          return this;
        },
        upsert(values) {
          this.operation = "upsert";
          this.values = values;
          return this;
        },
        then(resolve, reject) {
          calls.push({
            table,
            operation: this.operation,
            filters: this.filters,
            values: this.values
          });
          const response = responses[table]?.[this.operation] || { data: [], error: null };
          return Promise.resolve(response).then(resolve, reject);
        }
      };
      return query;
    }
  };
  return { client, calls };
}

test("public onboarding requests access instead of creating an account", () => {
  const backend = createBackend({ auth: { signUp: () => assert.fail("public sign-up must not be called") } });
  assert.equal(backend.signUp, undefined);
  const root = path.join(__dirname, "..");
  const requestPage = fs.readFileSync(path.join(root, "signup.html"), "utf8");
  const app = fs.readFileSync(path.join(root, "js", "script.js"), "utf8");
  const navigation = fs.readFileSync(path.join(root, "js", "navigation.js"), "utf8");
  const accessRequests = fs.readFileSync(path.join(root, "netlify", "functions", "access-requests.js"), "utf8");
  const contactPage = fs.readFileSync(path.join(root, "contact.html"), "utf8");
  assert.match(requestPage, /id="access-request-form" name="account-access-request"/);
  assert.doesNotMatch(requestPage, /data-netlify|form-name/);
  assert.match(requestPage, /name="privacy-and-terms-consent" value="accepted" required/);
  assert.doesNotMatch(requestPage, /name="interests"/);
  assert.match(requestPage, /href="privacy\.html" target="_blank"/);
  assert.match(requestPage, /href="terms\.html" target="_blank"/);
  assert.match(requestPage, /id="access-request-state"/);
  assert.match(requestPage, /id="access-request-share-link"/);
  assert.match(requestPage, /id="copy-access-request-link"/);
  assert.match(requestPage, /<details class="access-request-manage">/);
  assert.match(requestPage, /id="refresh-access-request" type="button">Refresh status/);
  assert.match(requestPage, /id="access-request-email-form"/);
  assert.match(requestPage, /id="start-another-access-request"/);
  assert.match(app, /function createAccessRequestToken\(\)/);
  assert.match(accessRequests, /request_token_hash/);
  assert.match(app, /function updateAccessRequestNavigation\(/);
  assert.match(app, /if \(!request\?\.token \|\| request\.status === "sending"\)/);
  assert.match(app, /link\.hidden = isLoggedIn \|\| Boolean\(accessRequest\?\.token\)/);
  assert.match(app, /function refreshAccessRequestStatus\(/);
  assert.match(app, /navigator\.clipboard\.writeText\(linkInput\.value\)/);
  assert.match(app, /function callAccessRequestFunction\(/);
  assert.match(app, /action: "update-email"/);
  assert.match(app, /navigateTo\(`signup\.html#request=/);
  assert.match(app, /insertBefore\(link, nav\.children\[1\] \|\| null\)/);
  assert.match(app, /link\.textContent = request\.status === "pending" \? "Verifying" : statusLabel/);
  assert.match(app, /link\.setAttribute\("aria-label", `Access request status: \$\{statusLabel\}`\)/);
  assert.match(navigation, /"skill\.html": "browse\.html"/);
  assert.match(navigation, /"privacy\.html": "signup\.html"/);
  assert.match(navigation, /"terms\.html": "signup\.html"/);
  assert.match(navigation, /window\.scrollTo\(0, 0\)/);
  assert.match(app, /function handleAccessRequestSubmit\(event\)/);
  assert.match(accessRequests, /requestId/);
  assert.match(accessRequests, /status: "in\.\(invited,completed\)"/);
  assert.doesNotMatch(app, /submitAccessRequestNotification|Netlify team notification/);
  assert.doesNotMatch(contactPage, /name="subject"|contact-subject/);
  assert.doesNotMatch(contactPage, /privacy\.html|data-netlify/);
  const aboutPage = fs.readFileSync(path.join(root, "about.html"), "utf8");
  assert.doesNotMatch(aboutPage, />Join Now</);
  assert.doesNotMatch(app, /backend\.signUp/);
});

test("access request endpoint validates consent and stores only a hashed status token", async () => {
  const { handler } = require("../netlify/functions/access-requests.js");
  const previousEnvironment = {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY
  };
  const previousFetch = global.fetch;
  const databaseCalls = [];
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-test";
  process.env.SUPABASE_PUBLISHABLE_KEY = "publishable-test";
  global.fetch = async (url, options) => {
    databaseCalls.push({ url: String(url), options });
    if (options.method === "PATCH") {
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify([{ name: "Test User", email: "updated@example.com", status: "pending" }])
      };
    }
    const urlText = String(url);
    const isEmailLookup = urlText.includes("select=id%2Cname%2Cemail%2Cstatus");
    const isRequestLookup = urlText.includes("select=name%2Cemail%2Cstatus%2Ccreated_at");
    const payload = isEmailLookup
      ? [{ id: "request-id", name: "Test User", email: "test@example.com", status: "pending" }]
      : isRequestLookup
        ? [{ name: "Test User", email: "test@example.com", status: "pending", created_at: "2026-01-01T00:00:00Z" }]
        : "";
    return { ok: true, status: isEmailLookup || isRequestLookup ? 200 : 201, text: async () => JSON.stringify(payload) };
  };
  try {
    const invalid = await handler({
      httpMethod: "POST",
      body: JSON.stringify({
        name: "Test User",
        email: "test@example.com",
        interests: "Learn design",
        consent: false,
        requestToken: "a".repeat(43)
      })
    });
    assert.equal(invalid.statusCode, 400);
    assert.equal(databaseCalls.length, 0);

    const accepted = await handler({
      httpMethod: "POST",
      body: JSON.stringify({
        name: "Test User",
        email: "test@example.com",
        interests: "Learn design",
        consent: true,
        requestToken: "a".repeat(43)
      })
    });
    assert.equal(accepted.statusCode, 201);
    assert.equal(JSON.parse(accepted.body).status, "pending");
    const inserted = JSON.parse(databaseCalls[0].options.body);
    assert.equal(inserted.request_token_hash, require("node:crypto").createHash("sha256").update("a".repeat(43)).digest("hex"));
    assert.equal(inserted.request_token_hash.includes("a".repeat(43)), false);
    assert.match(databaseCalls[0].options.headers.Prefer, /resolution=ignore-duplicates/);

    const updated = await handler({
      httpMethod: "POST",
      body: JSON.stringify({
        action: "update-email",
        requestToken: "a".repeat(43),
        email: "updated@example.com"
      })
    });
    assert.equal(updated.statusCode, 200);
    assert.equal(JSON.parse(updated.body).email, "updated@example.com");
    assert.equal(databaseCalls.at(-1).options.method, "PATCH");

    const spam = await handler({
      httpMethod: "POST",
      body: JSON.stringify({
        name: "Test User",
        email: "test@example.com",
        interests: "Learn design",
        consent: true,
        botField: "spam",
        requestToken: "b".repeat(43)
      })
    });
    assert.equal(spam.statusCode, 400);
    assert.equal(databaseCalls.length, 4);
  } finally {
    global.fetch = previousFetch;
    for (const [key, value] of Object.entries(previousEnvironment)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("match ranking includes any shared selected skill and prioritizes reciprocal exchanges", () => {
  const backend = createBackend({ auth: {} });
  const entries = [
    { user_id: "reciprocal", name: "Riley", bio: "", skill_id: "python", intent: "teach" },
    { user_id: "reciprocal", name: "Riley", bio: "", skill_id: "design", intent: "learn" },
    { user_id: "one-way", name: "Alex", bio: "", skill_id: "python", intent: "teach" },
    { user_id: "shared-only", name: "Sam", bio: "", skill_id: "python", intent: "learn" },
    { user_id: "unrelated", name: "Taylor", bio: "", skill_id: "photography", intent: "teach" }
  ];

  const matches = JSON.parse(JSON.stringify(backend.rankMatches(entries, "python", "design")));

  assert.deepEqual(matches.map(({ id, score, matchedSkills }) => ({ id, score, matchedSkills })), [
    { id: "reciprocal", score: 3, matchedSkills: ["python", "design"] },
    { id: "one-way", score: 2, matchedSkills: ["python"] },
    { id: "shared-only", score: 1, matchedSkills: ["python"] }
  ]);
});

test("exchange request notifications load only the signed-in member's requests and peer names", async () => {
  const { client, calls } = createQueryClient({
    swap_requests: {
      select: {
        data: [{
          id: "request-1",
          requester_id: "member-1",
          receiver_id: "peer-1",
          learn_skill_id: "python",
          teach_skill_id: "design",
          message: "Let's exchange.",
          status: "requested",
          created_at: "2026-11-11T12:00:00Z"
        }],
        error: null
      }
    },
    profiles: { select: { data: [{ id: "peer-1", display_name: "Rae" }], error: null } }
  });
  const backend = createBackend(client);

  const requests = await backend.loadSwapRequests("member-1", [
    { id: "python", title: "Python" },
    { id: "design", title: "Design" }
  ]);

  assert.deepEqual(JSON.parse(JSON.stringify(requests)), [{
    id: "request-1",
    requesterId: "member-1",
    receiverId: "peer-1",
    peerId: "peer-1",
    peerName: "Rae",
    learnSkill: "Python",
    teachSkill: "Design",
    learnSkillId: "python",
    teachSkillId: "design",
    message: "Let's exchange.",
    status: "requested",
    createdAt: "2026-11-11T12:00:00Z"
  }]);
  assert.ok(calls.some((call) => call.table === "swap_requests"
    && call.filters?.some(([, expression]) => expression === "requester_id.eq.member-1,receiver_id.eq.member-1")));
});

test("backend operations surface Supabase errors", async () => {
  const failure = new Error("request rejected");
  const backend = createBackend({
    auth: {
      signInWithPassword: async () => ({ data: null, error: failure })
    }
  });

  await assert.rejects(backend.signIn("learner@example.com", "password"), failure);
});

test("backend sends password reset links and updates passwords", async () => {
  const calls = [];
  const backend = createBackend({
    auth: {
      resetPasswordForEmail: async (email, options) => {
        calls.push({ operation: "reset", email, options });
        return { data: {}, error: null };
      },
      updateUser: async (values) => {
        calls.push({ operation: "update", values });
        return { data: { user: { id: "member-1" } }, error: null };
      }
    }
  });

  await backend.sendPasswordReset("learner@example.com", "https://skillex-hydev.netlify.app/reset-password.html");
  await backend.updatePassword("a-strong-password");

  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [
    {
      operation: "reset",
      email: "learner@example.com",
      options: { redirectTo: "https://skillex-hydev.netlify.app/reset-password.html" }
    },
    { operation: "update", values: { password: "a-strong-password" } }
  ]);
});

test("saved skills sync only the additions and removals", async () => {
  const { client, calls } = createQueryClient({
    saved_skills: { select: { data: [{ skill_id: "keep" }, { skill_id: "remove" }], error: null } }
  });
  const backend = createBackend(client);

  await backend.replaceSavedSkills("member-1", ["keep", "add"]);

  assert.ok(calls.some((call) => call.table === "saved_skills"
    && call.operation === "delete"
    && call.filters.some(([, column, values]) => column === "skill_id" && values.includes("remove"))));
  assert.ok(calls.some((call) => call.table === "saved_skills"
    && call.operation === "insert"
    && call.values.some((row) => row.user_id === "member-1" && row.skill_id === "add")));
});

test("imported learning progress replaces existing server progress", async () => {
  const { client, calls } = createQueryClient({
    learning_progress: {
      select: { data: [{ skill_id: "keep" }, { skill_id: "remove" }], error: null },
      delete: { data: [], error: null },
      upsert: { data: [], error: null }
    }
  });
  const backend = createBackend(client);
  await backend.replaceLearningProgress("member-1", {
    keep: { completedLessons: ["Lesson"], activeLesson: "Lesson", notes: "note" }
  });

  assert.ok(calls.some((call) => call.table === "learning_progress"
    && call.operation === "delete"
    && call.filters.some(([, column, values]) => column === "skill_id" && values.includes("remove"))));
  assert.ok(calls.some((call) => call.table === "learning_progress"
    && call.operation === "upsert"
    && call.values.user_id === "member-1"
    && call.values.skill_id === "keep"));
});

test("curated SQL migration preserves authored course lessons", async () => {
  const { skillCatalog } = await import("../js/data.js");
  const sql = fs.readFileSync(path.join(__dirname, "..", "supabase", "migrations", "20261110230000_curated_course_content.sql"), "utf8");
  const values = sql.match(/from \(values\n([\s\S]*?)\n\) as course/)?.[1];
  assert.ok(values, "expected the migration to contain a course values list");
  const rows = [...values.matchAll(/^\s*\('([^']+)', '((?:''|[^'])*)'::jsonb\),?$/gm)];
  assert.equal(rows.length, skillCatalog.length);

  for (const [, id, escapedJson] of rows) {
    const source = skillCatalog.find((skill) => skill.id === id);
    assert.ok(source, `unexpected course ${id}`);
    const { id: _id, title: _title, category: _category, description: _description, ...expectedContent } = source;
    assert.deepEqual(JSON.parse(escapedJson.replaceAll("''", "'")), expectedContent);
    assert.ok(expectedContent.lessonDetails.length >= 7, `${id} should retain its detailed lesson content`);
  }
});

test("site pages consistently load the backend and use the Skillex origin", () => {
  const root = path.join(__dirname, "..");
  const pages = fs.readdirSync(root).filter((file) => file.endsWith(".html") && file !== "admin.html");
  assert.ok(pages.length > 0);

  for (const page of pages) {
    const html = fs.readFileSync(path.join(root, page), "utf8");
    assert.match(html, /href="css\/style\.css"/, page);
    assert.match(html, /https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@2/ , page);
    assert.match(html, /js\/supabase-config\.js/ , page);
    assert.match(html, /js\/backend\.js/ , page);
    assert.match(html, /js\/theme-init\.js/ , page);
    assert.match(html, /js\/navigation\.js/ , page);
    assert.match(html, /rel="canonical" href="https:\/\/skillex-hydev\.netlify\.app/ , page);
    const cmsKeys = [...html.matchAll(/data-cms-key="([^"]+)"/g)].map(([, key]) => key);
    assert.equal(new Set(cmsKeys).size, cmsKeys.length, `${page} must use unique CMS field keys`);
  }

  const homepage = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.match(homepage, /name="google-site-verification" content="KygdRzP9SjeJACyAkETodHC9Zl6L5okWZuWyTA2SWU0"/);
  assert.doesNotMatch(homepage, /1\.2k\+|4\.2\/5|student rating|100\+ student-led skills/i);
  assert.doesNotMatch(homepage, /trading every day|students nearby|Book sessions/i);
  assert.match(homepage, /href="signup\.html" class="btn"[^>]*>Request access<\/a>/);

  const contact = fs.readFileSync(path.join(root, "contact.html"), "utf8");
  assert.match(contact, /name="contact"/);
  assert.doesNotMatch(contact, /privacy\.html|data-netlify/);
  assert.doesNotMatch(contact, /aliyujaxuli@gmail\.com|hydeveco@gmail\.com|mailto:/);
  const adminPage = fs.readFileSync(path.join(root, "admin.html"), "utf8");
  assert.match(adminPage, /name="robots" content="noindex, nofollow"/);
  assert.doesNotMatch(adminPage, /js\/navigation\.js|js\/script\.js/);
  assert.doesNotMatch(pages.map((file) => fs.readFileSync(path.join(root, file), "utf8")).join("\n"), /admin\.html/);

  const app = fs.readFileSync(path.join(root, "js", "script.js"), "utf8");
  assert.match(app, /function showToast\(/);
  assert.match(app, /savePendingToast\("Welcome back\. You are now signed in\."/);
  assert.match(app, /backend\.rankMatches\(entries, learnSkillId, teachSkillId\)/);
  assert.match(app, /No users yet\. Start your own group/);
  assert.match(app, /Your post was shared with the community/);
  assert.match(app, /link\.style\.display = isLoggedIn \|\| currentPage === "login\.html" \? "none" : ""/);
  assert.match(app, /function setThemePreference\(preference\)/);
  assert.match(app, /function exportUserData\(\)/);
  assert.match(app, /function validateUserBackup\(backup, user\)/);
  assert.match(app, /fetch\("\/\.netlify\/functions\/contact"/);
  assert.match(app, /function attachFormDrafts\(\)/);
  assert.match(app, /sessionStorage\.setItem\(getFormDraftKey\(form\)/);
  assert.match(app, /function initializeSwapNotifications\(enabled = true\)/);
  assert.match(app, /setInterval\(refreshSwapNotifications, 60000\)/);
  assert.match(app, /function updateSwapRequestBadge\(requests\)/);
  assert.match(app, /window\.__SKILLEX_USER_DATA_CACHE/);
  assert.doesNotMatch(app, /name: "Aliyu", skill: "HTML & CSS"/);
  assert.doesNotMatch(app, /name: "Mina", skill: "JavaScript"/);
  assert.doesNotMatch(app, /name: "Sara", skill: "UI\/UX Design"/);
  assert.doesNotMatch(app, /Matching mentors/);
  assert.match(app, /Use your profile skills to connect with real Skillex members/);

  const backend = fs.readFileSync(path.join(root, "js", "backend.js"), "utf8");
  assert.match(backend, /window\.__SKILLEX_COURSES_CACHE/);
  assert.match(backend, /window\.__SKILLEX_PROFILE_CACHE/);

  const settings = fs.readFileSync(path.join(root, "settings.html"), "utf8");
  assert.match(settings, /id="export-data"/);
  assert.match(settings, /id="import-data"/);
  assert.match(settings, /id="password-change-form"/);
  assert.match(settings, /id="settings-reset-password"/);
  assert.match(settings, /id="theme-preference"[^>]*type="range"[^>]*min="0"[^>]*max="2"[^>]*step="1"/);
  assert.match(settings, /id="theme-current-value"/);
  assert.match(settings, /id="swap-notifications"/);
  assert.match(settings, /id="reduce-motion"/);
  assert.match(settings, /id="install-app"/);
  assert.match(settings, /id="app-install-status" role="status"/);
  assert.match(settings, /id="check-app-update"/);
  assert.match(settings, /id="app-update-status" role="status"/);
  assert.match(settings, /id="app-update-dialog"/);
  assert.match(settings, /id="keep-current-version"/);
  assert.match(settings, /id="apply-app-update"/);
  assert.match(settings, /id="delete-account-dialog"/);
  assert.match(settings, /id="delete-account-form"/);
  assert.match(settings, /pattern="DELETE"/);
  const lifecycle = fs.readFileSync(path.join(root, "js", "app-lifecycle.js"), "utf8");
  assert.match(lifecycle, /beforeinstallprompt/);
  assert.match(lifecycle, /No updates available/);
  assert.match(lifecycle, /registration\.update\(\)/);
  const serviceWorker = fs.readFileSync(path.join(root, "service-worker.js"), "utf8");
  assert.match(serviceWorker, /SKIP_WAITING/);
  assert.match(serviceWorker, /js\/app-version\.js/);
  const manifest = fs.readFileSync(path.join(root, "site.webmanifest"), "utf8");
  assert.match(manifest, /"start_url": "\.\/index\.html"/);
  assert.match(manifest, /"scope": "\.\/"/);
  assert.match(app, /async function handleDeleteAccountSubmit\(event\)/);
  assert.match(app, /backend\.deleteAccount\(password, user\.id\)/);
  const home = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.match(home, /data-auth="request-access"[^>]*>Request access<\/a>/);
  assert.match(home, /class="section cta-section" data-auth="guest-home-cta"/);
  assert.match(app, /document\.querySelectorAll\('\[data-auth="guest-home-cta"\]'\)\.forEach\(\(section\) => \{\s*section\.hidden = isLoggedIn;/);
  const authStyles = fs.readFileSync(path.join(root, "css", "style.css"), "utf8");
  assert.match(authStyles, /\[data-auth="request-access"\]\[hidden\]/);
  assert.match(authStyles, /\[data-auth="guest-home-cta"\]\[hidden\]/);

  const privacy = fs.readFileSync(path.join(root, "privacy.html"), "utf8");
  assert.match(privacy, /Privacy Policy/);
  assert.match(privacy, /private Supabase table/);
  assert.match(privacy, /Gmail/);
  assert.doesNotMatch(privacy, /Netlify Forms/);
  assert.doesNotMatch(privacy, /aliyujaxuli@gmail\.com|hydeveco@gmail\.com|mailto:/);
  const terms = fs.readFileSync(path.join(root, "terms.html"), "utf8");
  assert.match(terms, /Terms and Conditions/);
  assert.match(terms, /invitation-only/);
  assert.match(terms, /href="privacy\.html"/);

  const login = fs.readFileSync(path.join(root, "login.html"), "utf8");
  assert.match(login, /href="forgot-password\.html"/);
  for (const [page, form] of [
    ["forgot-password.html", "forgot-password-form"],
    ["reset-password.html", "reset-password-form"],
    ["complete-profile.html", "complete-invitation-form"]
  ]) {
    assert.match(fs.readFileSync(path.join(root, page), "utf8"), new RegExp(`id="${form}"`));
  }

  assert.match(app, /function handleForgotPasswordSubmit\(event\)/);
  assert.match(app, /function handleResetPasswordSubmit\(event\)/);
  assert.match(app, /function handleInvitationCompleteSubmit\(event\)/);
  assert.match(app, /function handleSettingsPasswordSubmit\(event\)/);
  assert.match(app, /If an account exists for that email, a secure reset link is on its way/);
  assert.match(app, /Open the latest Skillex invitation link first/);

  assert.match(backend, /async function sendPasswordReset\(email, redirectTo\)/);
  assert.match(backend, /async function updatePassword\(password\)/);

  const navigation = fs.readFileSync(path.join(root, "js", "navigation.js"), "utf8");
  assert.match(navigation, /history\.pushState\(\{ skillexRoute: routePath \}, "", window\.location\.origin\)/);
  assert.match(navigation, /document\.addEventListener\("click"/);
  assert.match(navigation, /const appPages = new Set/);
  assert.doesNotMatch(navigation, /"admin\.html"/);
  assert.match(navigation, /return new URL\(`\/\$\{filename\}\.html\$\{url\.search\}\$\{url\.hash\}`, url\.origin\)/);
  assert.match(navigation, /parentPages\[currentPage\] \|\| \(appPages\.has\(currentPage\) \? currentPage : "index\.html"\)/);
  assert.match(navigation, /resolveRoute\(new URL\(anchor\.href, window\.location\.href\)\)/);
  assert.match(navigation, /const quickNavigation = document\.querySelector\("\.quick-nav"\)/);
  assert.match(navigation, /href="settings\.html" data-auth="settings" hidden/);
  assert.match(app, /const isQuickNavLink = Boolean\(link\.closest\("\.quick-nav__links"\)\)/);
  assert.match(app, /if \(isQuickNavLink\) link\.hidden = !isLoggedIn/);
  const styles = fs.readFileSync(path.join(root, "css", "style.css"), "utf8");
  assert.match(styles, /\.quick-nav__links\s*\{\s*display:\s*flex;\s*justify-content:\s*flex-start;\s*align-items:\s*center;\s*width:\s*max-content;/);
  assert.match(styles, /html\.dark \.quick-nav\s*,\s*body\.dark \.quick-nav\s*\{\s*border: 0;\s*background: transparent;\s*box-shadow: none;/);
  assert.match(styles, /html\.dark \.quick-nav__links/);
  assert.match(navigation, /linksViewport\.scrollLeft = Math\.max\(/);
  assert.match(app, /link\.getAttribute\("aria-current"\) === "page"/);
  assert.match(styles, /html\.dark \.policy-card,\s*body\.dark \.policy-card\s*\{\s*border-color: var\(--border\);\s*background: var\(--surface\);\s*color: var\(--text\);/);

  const themeInit = fs.readFileSync(path.join(root, "js", "theme-init.js"), "utf8");
  assert.match(themeInit, /document\.documentElement\.classList\.toggle\("dark", useDarkTheme\)/);
});

test("public page footers contain only branding and link the HYDEV logo to its owner", () => {
  const root = path.join(__dirname, "..");
  const pages = fs.readdirSync(root).filter((file) => file.endsWith(".html") && file !== "admin.html");

  for (const page of pages) {
    const html = fs.readFileSync(path.join(root, page), "utf8");
    const footer = html.match(/<footer class="site-footer">([\s\S]*?)<\/footer>/)?.[1];
    assert.ok(footer, `${page} should have a site footer`);
    assert.match(footer, /<p class="footer-copyright">&copy; 2026 Skillex\. All rights reserved\.<\/p>/, page);
    assert.match(footer, /<a class="footer-hydev" href="https:\/\/aliyujazuli\.netlify\.app\/" aria-label="Visit Aliyu Muhammad Jazuli's website">[\s\S]*?<img src="assets\/hydev-logo-tile\.png" alt="" width="116" height="90"/, page);
    assert.match(footer, /footer-copyright[\s\S]*?footer-hydev[\s\S]*?footer-attribution/, page);
    assert.equal([...footer.matchAll(/<a\b/g)].length, 1, `${page} footer should only link the logo`);
  }
});

test("page navigation keeps stylesheets active and shows page-specific skeletons", () => {
  const root = path.join(__dirname, "..");
  const navigation = fs.readFileSync(path.join(root, "js", "navigation.js"), "utf8");
  const styles = fs.readFileSync(path.join(root, "css", "style.css"), "utf8");

  assert.match(navigation, /const pageSkeleton = window\.SkillexPageSkeleton/);
  assert.match(navigation, /async function replaceHead\(nextDocument\)/);
  assert.match(navigation, /const existingStylesheets = new Map/);
  assert.match(navigation, /document\.body\.replaceChildren\(\.\.\.bodyNodes, pageSkeleton\.element\)/);
  assert.match(navigation, /resolve\(window\.SkillexAppReady\)/);
  assert.match(navigation, /if \(initialized && sequence === navigationSequence\) \{\s*pageSkeleton\?\.hide\(\);\s*window\.scrollTo\(0, 0\);/);
  assert.match(navigation, /pageSkeleton\?\.hide\(\)/);
  assert.match(styles, /\.page-skeleton\[data-visible="false"\]/);
  assert.match(styles, /page-skeleton-shimmer/);
  assert.match(styles, /\.page-skeleton__metrics,\s*\.page-skeleton__saved/);
  assert.match(styles, /\.page-skeleton__course-lessons/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);

  const skeleton = fs.readFileSync(path.join(root, "js", "page-skeleton.js"), "utf8");
  assert.match(skeleton, /const pageContent = \(page\) =>/);
  assert.match(skeleton, /page-skeleton__hero/);
  assert.match(skeleton, /page-skeleton__form/);
  assert.match(skeleton, /page-skeleton__settings/);
  assert.match(skeleton, /page-skeleton__course/);
  assert.match(skeleton, /window\.SkillexPageSkeleton = \{ element: skeleton, show, hide \}/);
  const app = fs.readFileSync(path.join(root, "js", "script.js"), "utf8");
  assert.match(app, /window\.SkillexAppReady = initializeApp\(\)/);
  assert.match(app, /window\.SkillexPageSkeleton\?\.hide\(\)/);
  for (const page of fs.readdirSync(root).filter((file) => file.endsWith(".html") && file !== "admin.html")) {
    const html = fs.readFileSync(path.join(root, page), "utf8");
    assert.match(html, /<script src="js\/page-skeleton\.js"><\/script>/, page);
    assert.match(html, /<script src="js\/app-version\.js"><\/script>/, page);
    assert.match(html, /<script src="js\/app-lifecycle\.js"><\/script>/, page);
    assert.ok(
      html.indexOf("js/app-version.js") < html.indexOf("js/app-lifecycle.js")
        && html.indexOf("js/app-lifecycle.js") < html.indexOf("js/script.js"),
      `${page} should load the app version and lifecycle before the main script`
    );
    assert.match(html, /body\[data-page-loading="true"\] > :not\(\.page-skeleton\)/, page);
    if (html.includes("og:image")) {
      assert.match(html, /assets\/skillex-icon-512\.png/, page);
      assert.match(html, /name="twitter:card" content="summary"/, page);
    }
    const adminPage = fs.readFileSync(path.join(root, "admin.html"), "utf8");
    assert.match(adminPage, /name="robots" content="noindex, nofollow"/);
    assert.doesNotMatch(adminPage, /js\/navigation\.js|js\/script\.js/);
    assert.doesNotMatch(html, /assets\/skillex-social\.png/, page);
  }

  for (const page of ["privacy.html", "terms.html"]) {
    const html = fs.readFileSync(path.join(root, page), "utf8");
    assert.match(html, /href="signup\.html#new-request">← Back to request invitation/);
  }
});
