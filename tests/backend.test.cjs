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
        delete() {
          this.operation = "delete";
          return this;
        },
        insert(values) {
          this.operation = "insert";
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

test("sign-up sends the expected profile metadata and production redirect", async () => {
  let received;
  const client = {
    auth: {
      signUp: async (options) => {
        received = options;
        return { data: { user: { id: "member-1" }, session: null }, error: null };
      }
    }
  };
  const backend = createBackend(client);

  const result = await backend.signUp({
    name: "Learner",
    email: "learner@example.com",
    password: "example-password",
    bio: "Learning together",
    learnGoals: "Python",
    teachGoals: "Design",
    role: "Both"
  });

  assert.equal(result.user.id, "member-1");
  assert.equal(received.options.emailRedirectTo, "https://skillex-hydev.netlify.app");
  assert.equal(JSON.stringify(received.options.data), JSON.stringify({
    display_name: "Learner",
    bio: "Learning together",
    learn_goals: "Python",
    teach_goals: "Design",
    role: "Both"
  }));
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
    assert.match(html, /https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@2/ , page);
    assert.match(html, /js\/supabase-config\.js/ , page);
    assert.match(html, /js\/backend\.js/ , page);
    assert.match(html, /rel="canonical" href="https:\/\/skillex-hydev\.netlify\.app/ , page);
  }
});
