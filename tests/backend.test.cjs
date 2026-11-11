const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const backendSource = fs.readFileSync(path.join(__dirname, "..", "js", "backend.js"), "utf8");

function createBackend(client) {
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
    crypto: { randomUUID: () => "avatar-test-id" }
  };
  vm.runInNewContext(backendSource, context, { filename: "backend.js" });
  return context.window.SkillexBackend;
}

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
  assert.match(requestPage, /name="account-access-request" method="POST" data-netlify="true"/);
  assert.match(requestPage, /name="privacy-consent" value="accepted" required/);
  assert.match(requestPage, /name="terms-consent" value="accepted" required/);
  assert.match(requestPage, /href="terms\.html"/);
  assert.match(app, /function handleAccessRequestSubmit\(event\)/);
  assert.doesNotMatch(app, /backend\.signUp/);
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
  const pages = fs.readdirSync(root).filter((file) => file.endsWith(".html"));
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
  }

  const homepage = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.match(homepage, /name="google-site-verification" content="KygdRzP9SjeJACyAkETodHC9Zl6L5okWZuWyTA2SWU0"/);
  assert.doesNotMatch(homepage, /1\.2k\+|4\.2\/5|student rating|100\+ student-led skills/i);
  assert.doesNotMatch(homepage, /trading every day|students nearby|Book sessions/i);
  assert.match(homepage, /href="signup\.html" class="btn">Request access/);

  const contact = fs.readFileSync(path.join(root, "contact.html"), "utf8");
  assert.match(contact, /name="contact"/);
  assert.doesNotMatch(contact, /aliyujaxuli@gmail\.com|hydeveco@gmail\.com|mailto:/);

  const app = fs.readFileSync(path.join(root, "js", "script.js"), "utf8");
  assert.match(app, /function showToast\(/);
  assert.match(app, /savePendingToast\("Welcome back\. You are now signed in\."/);
  assert.match(app, /backend\.rankMatches\(entries, learnSkillId, teachSkillId\)/);
  assert.match(app, /No users yet\. Start your own group/);
  assert.match(app, /This post is not shared with other members yet/);
  assert.match(app, /link\.style\.display = isLoggedIn \|\| currentPage === "login\.html" \? "none" : ""/);
  assert.match(app, /function setThemePreference\(preference\)/);
  assert.match(app, /function exportUserData\(\)/);
  assert.match(app, /function validateUserBackup\(backup, user\)/);
  assert.match(app, /function submitNetlifyForm\(form, status, successMessage\)/);
  assert.match(app, /function attachFormDrafts\(\)/);
  assert.match(app, /sessionStorage\.setItem\(getFormDraftKey\(form\)/);
  assert.match(app, /function initializeSwapNotifications\(\)/);
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
  assert.match(settings, /<option value="system">Follow system<\/option>/);
  assert.match(settings, /id="export-data"/);
  assert.match(settings, /id="import-data"/);
  assert.match(settings, /id="password-change-form"/);
  assert.match(settings, /id="settings-reset-password"/);

  const privacy = fs.readFileSync(path.join(root, "privacy.html"), "utf8");
  assert.match(privacy, /Privacy Policy/);
  assert.match(privacy, /Netlify/);
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
  assert.match(app, /follow up if access is available/);

  assert.match(backend, /async function sendPasswordReset\(email, redirectTo\)/);
  assert.match(backend, /async function updatePassword\(password\)/);

  const navigation = fs.readFileSync(path.join(root, "js", "navigation.js"), "utf8");
  assert.match(navigation, /history\.pushState\(\{ skillexRoute: routePath \}, "", window\.location\.origin\)/);
  assert.match(navigation, /document\.addEventListener\("click"/);
  assert.match(navigation, /const appPages = new Set/);
  assert.match(navigation, /return new URL\(`\/\$\{filename\}\.html\$\{url\.search\}\$\{url\.hash\}`, url\.origin\)/);
  assert.match(navigation, /resolveRoute\(new URL\(anchor\.href, window\.location\.href\)\)/);
  assert.match(navigation, /const quickNavigation = document\.querySelector\("\.quick-nav"\)/);
  assert.match(navigation, /href="settings\.html" data-auth="settings" hidden/);
  assert.match(app, /const isQuickNavLink = Boolean\(link\.closest\("\.quick-nav__links"\)\)/);
  assert.match(app, /if \(isQuickNavLink\) link\.hidden = !isLoggedIn/);
  const styles = fs.readFileSync(path.join(root, "css", "style.css"), "utf8");
  assert.match(styles, /html\.dark \.quick-nav\s*,\s*body\.dark \.quick-nav\s*\{\s*border: 0;\s*background: transparent;\s*box-shadow: none;/);
  assert.match(styles, /html\.dark \.quick-nav__links/);

  const themeInit = fs.readFileSync(path.join(root, "js", "theme-init.js"), "utf8");
  assert.match(themeInit, /document\.documentElement\.classList\.toggle\("dark", useDarkTheme\)/);
});

test("page navigation keeps stylesheets active and shows a loading screen", () => {
  const root = path.join(__dirname, "..");
  const navigation = fs.readFileSync(path.join(root, "js", "navigation.js"), "utf8");
  const styles = fs.readFileSync(path.join(root, "css", "style.css"), "utf8");

  assert.match(navigation, /className = "navigation-loader"/);
  assert.match(navigation, /async function replaceHead\(nextDocument\)/);
  assert.match(navigation, /const existingStylesheets = new Map/);
  assert.match(navigation, /document\.body\.replaceChildren\(\.\.\.bodyNodes, navigationLoader\)/);
  assert.match(navigation, /finally \{\s*if \(sequence === navigationSequence\) setNavigationLoading\(false\)/);
  assert.match(styles, /\.navigation-loader\[data-visible="true"\]/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
});
