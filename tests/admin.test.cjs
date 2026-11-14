const assert = require("node:assert/strict");
const test = require("node:test");

const adminFunction = require("../netlify/functions/admin.js");
const accessRequestFunction = require("../netlify/functions/access-requests.js");
const contactFunction = require("../netlify/functions/contact.js");
const publicContentFunction = require("../netlify/functions/public-content.js");
const deleteAccountFunction = require("../netlify/functions/delete-account.js");

const ownerId = "11111111-1111-4111-8111-111111111111";
const requestId = "22222222-2222-4222-8222-222222222222";

test("account deletion authenticates the member and removes linked data", async () => {
  await withEnvironment({
    SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "service-role-test",
    SUPABASE_PUBLISHABLE_KEY: "publishable-test"
  }, async () => {
    const previousFetch = global.fetch;
    const calls = [];
    global.fetch = async (url, options = {}) => {
      const requestUrl = new URL(String(url));
      calls.push({ requestUrl, options });
      if (requestUrl.pathname.endsWith("/auth/v1/user")) {
        return jsonResponse(200, { id: ownerId, email: "member@example.com" });
      }
      if (requestUrl.pathname === "/rest/v1/profiles") {
        return { ok: true, status: 200, text: async () => JSON.stringify([{ avatar_path: `${ownerId}/avatar.webp` }]) };
      }
      return { ok: true, status: 200, text: async () => "" };
    };
    try {
      const anonymous = await deleteAccountFunction.handler({ httpMethod: "POST", headers: {} });
      assert.equal(anonymous.statusCode, 401);
      assert.equal(calls.length, 0);

      const deleted = await deleteAccountFunction.handler({
        httpMethod: "POST",
        headers: { authorization: "Bearer member-token" }
      });
      assert.equal(deleted.statusCode, 200);
      assert.deepEqual(JSON.parse(deleted.body), { deleted: true, warnings: [] });
      assert.deepEqual(calls.map(({ requestUrl }) => requestUrl.pathname), [
        "/auth/v1/user",
        "/rest/v1/profiles",
        `/auth/v1/admin/users/${ownerId}`,
        "/storage/v1/object/avatars",
        "/rest/v1/access_requests"
      ]);
      assert.equal(calls[2].options.method, "DELETE");
      assert.equal(calls[3].options.method, "DELETE");
      assert.deepEqual(JSON.parse(calls[3].options.body), { prefixes: [`${ownerId}/avatar.webp`] });
      assert.equal(calls[4].options.method, "DELETE");
      assert.equal(calls[4].requestUrl.searchParams.get("email"), "eq.member@example.com");
      assert.ok(calls.slice(1).every(({ options }) => options.headers.apikey === "service-role-test"));
    } finally {
      global.fetch = previousFetch;
    }
  });
});

function jsonResponse(status, value) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => value,
    text: async () => JSON.stringify(value)
  };
}

async function withEnvironment(values, callback) {
  const previous = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]));
  for (const [key, value] of Object.entries(values)) process.env[key] = value;
  try {
    return await callback();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("owner dashboard rejects anonymous and non-owner users before reading private data", async () => {
  await withEnvironment({
    SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "service-role-test",
    SUPABASE_PUBLISHABLE_KEY: "publishable-test",
    ADMIN_EMAIL: "owner@example.com",
    PUBLIC_SITE_URL: "https://skillex.example"
  }, async () => {
    const previousFetch = global.fetch;
    const calls = [];
    global.fetch = async (url, options) => {
      calls.push({ url: String(url), options });
      return jsonResponse(200, {
        id: "33333333-3333-4333-8333-333333333333",
        email: "member@example.com",
        email_confirmed_at: "2026-01-01T00:00:00Z"
      });
    };
    try {
      const anonymous = await adminFunction.handler({ httpMethod: "GET", headers: {} });
      assert.equal(anonymous.statusCode, 401);
      assert.equal(calls.length, 0);

      const member = await adminFunction.handler({
        httpMethod: "GET",
        headers: { authorization: "Bearer member-token" }
      });
      assert.equal(member.statusCode, 403);
      assert.equal(calls.length, 1);
      assert.match(calls[0].url, /\/auth\/v1\/user$/);
    } finally {
      global.fetch = previousFetch;
    }
  });
});

test("owner overview reports exact request, community, and publishing counts", async () => {
  await withEnvironment({
    SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "service-role-test",
    SUPABASE_PUBLISHABLE_KEY: "publishable-test",
    ADMIN_EMAIL: "owner@example.com",
    PUBLIC_SITE_URL: "https://skillex.example"
  }, async () => {
    const previousFetch = global.fetch;
    const calls = [];
    const counts = {
      access_requests: { pending: 3, approved: 2, invited: 1, completed: 4, declined: 1 },
      profiles: { all: 8 },
      community_posts: { published: 7, hidden: 2, removed: 1 },
      site_pages: { all: 15, published: 12 },
      site_announcements: { draft: 2, published: 4 }
    };
    global.fetch = async (url, options = {}) => {
      const requestUrl = new URL(String(url));
      calls.push({ requestUrl, options });
      if (requestUrl.pathname.endsWith("/auth/v1/user")) {
        return jsonResponse(200, {
          id: ownerId,
          email: "owner@example.com",
          email_confirmed_at: "2026-01-01T00:00:00Z"
        });
      }
      const table = requestUrl.pathname.split("/").pop();
      const status = requestUrl.searchParams.get("status")?.replace("eq.", "");
      const published = requestUrl.searchParams.get("published_at") === "not.is.null";
      const count = counts[table]?.[status || (published ? "published" : "all")];
      assert.notEqual(count, undefined, `unexpected count request: ${requestUrl}`);
      return {
        ok: true,
        status: 200,
        headers: { get: (name) => name.toLowerCase() === "content-range" ? `0-0/${count}` : null },
        json: async () => [],
        text: async () => "[]"
      };
    };
    try {
      const result = await adminFunction.handler({
        httpMethod: "GET",
        headers: { authorization: "Bearer owner-token" },
        queryStringParameters: { resource: "overview" }
      });
      assert.equal(result.statusCode, 200);
      assert.deepEqual(JSON.parse(result.body).metrics, {
        totalRequests: 11,
        pendingRequests: 3,
        approvedRequests: 2,
        invitedRequests: 1,
        completedRequests: 4,
        declinedRequests: 1,
        members: 8,
        communityPosts: 10,
        publishedPosts: 7,
        hiddenPosts: 2,
        removedPosts: 1,
        sitePages: 15,
        publishedPages: 12,
        announcements: 6,
        draftAnnouncements: 2,
        publishedAnnouncements: 4
      });
      const countCalls = calls.filter(({ requestUrl }) => requestUrl.pathname.includes("/rest/v1/"));
      assert.equal(countCalls.length, 13);
      assert.ok(countCalls.every(({ options }) =>
        options.headers.Prefer === "count=exact" && options.headers.Range === "0-0"));
    } finally {
      global.fetch = previousFetch;
    }
  });
});

test("owner page list includes publication timestamps for draft status", async () => {
  await withEnvironment({
    SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "service-role-test",
    SUPABASE_PUBLISHABLE_KEY: "publishable-test",
    ADMIN_EMAIL: "owner@example.com",
    PUBLIC_SITE_URL: "https://skillex.example"
  }, async () => {
    const previousFetch = global.fetch;
    let pagesUrl;
    global.fetch = async (url) => {
      const requestUrl = new URL(String(url));
      if (requestUrl.pathname.endsWith("/auth/v1/user")) {
        return jsonResponse(200, {
          id: ownerId,
          email: "owner@example.com",
          email_confirmed_at: "2026-01-01T00:00:00Z"
        });
      }
      pagesUrl = requestUrl;
      return jsonResponse(200, [{
        page_key: "about",
        title: "About",
        content: {},
        draft_content: {},
        published_at: "2026-11-13T21:00:00Z",
        updated_at: "2026-11-13T21:00:00Z"
      }]);
    };
    try {
      const result = await adminFunction.handler({
        httpMethod: "GET",
        headers: { authorization: "Bearer owner-token" },
        queryStringParameters: { resource: "pages" }
      });
      assert.equal(result.statusCode, 200);
      assert.equal(pagesUrl.searchParams.get("select"),
        "page_key,title,content,draft_content,published_at,updated_at");
      assert.equal(JSON.parse(result.body).pages[0].published_at, "2026-11-13T21:00:00Z");
    } finally {
      global.fetch = previousFetch;
    }
  });
});

test("owner approval sends a Supabase invite before advancing the request to invited", async () => {
  await withEnvironment({
    SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "service-role-test",
    SUPABASE_PUBLISHABLE_KEY: "publishable-test",
    ADMIN_EMAIL: "owner@example.com",
    PUBLIC_SITE_URL: "https://skillex.example/"
  }, async () => {
    const previousFetch = global.fetch;
    const calls = [];
    global.fetch = async (url, options = {}) => {
      const urlText = String(url);
      calls.push({ url: urlText, options });
      if (urlText.endsWith("/auth/v1/user")) {
        return jsonResponse(200, {
          id: ownerId,
          email: "OWNER@example.com",
          email_confirmed_at: "2026-01-01T00:00:00Z"
        });
      }
      if (urlText.includes("/auth/v1/invite?")) return jsonResponse(200, { id: "invited-user-id" });
      if (urlText.includes("/rest/v1/access_requests") && options.method === "PATCH") {
        return jsonResponse(200, [{ id: requestId, status: "invited", updated_at: "2026-11-13T21:00:00Z" }]);
      }
      if (urlText.includes("/rest/v1/access_requests")) {
        return jsonResponse(200, [{
          id: requestId,
          name: "Test User",
          email: "invitee@example.com",
          status: "approved"
        }]);
      }
      throw new Error(`Unexpected request: ${urlText}`);
    };
    try {
      const result = await adminFunction.handler({
        httpMethod: "POST",
        headers: { authorization: "Bearer owner-token" },
        body: JSON.stringify({ action: "invite-request", requestId })
      });
      assert.equal(result.statusCode, 200);
      assert.equal(JSON.parse(result.body).status, "invited");

      const inviteCall = calls.find(({ url }) => url.includes("/auth/v1/invite?"));
      assert.ok(inviteCall);
      assert.equal(JSON.parse(inviteCall.options.body).email, "invitee@example.com");
      assert.equal(JSON.parse(inviteCall.options.body).data.access_request_id, requestId);
      const inviteUrl = new URL(inviteCall.url);
      const redirectTo = new URL(inviteUrl.searchParams.get("redirect_to"));
      assert.equal(redirectTo.pathname, "/complete-profile.html");
      assert.equal(redirectTo.searchParams.get("requestId"), requestId);
      const statusUpdate = calls.find(({ url, options }) => url.includes("/rest/v1/access_requests") && options.method === "PATCH");
      assert.equal(JSON.parse(statusUpdate.options.body).status, "invited");
    } finally {
      global.fetch = previousFetch;
    }
  });
});

test("failed Supabase invitation leaves the approved request unchanged", async () => {
  await withEnvironment({
    SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "service-role-test",
    SUPABASE_PUBLISHABLE_KEY: "publishable-test",
    ADMIN_EMAIL: "owner@example.com",
    PUBLIC_SITE_URL: "https://skillex.example"
  }, async () => {
    const previousFetch = global.fetch;
    const calls = [];
    global.fetch = async (url) => {
      const urlText = String(url);
      calls.push(urlText);
      if (urlText.endsWith("/auth/v1/user")) {
        return jsonResponse(200, { id: ownerId, email: "owner@example.com", confirmed_at: "2026-01-01T00:00:00Z" });
      }
      if (urlText.includes("/auth/v1/invite?")) return jsonResponse(422, { message: "invite failed" });
      if (urlText.includes("/rest/v1/access_requests")) {
        return jsonResponse(200, [{ id: requestId, name: "Test User", email: "invitee@example.com", status: "approved" }]);
      }
      throw new Error(`Unexpected request: ${urlText}`);
    };
    try {
      const result = await adminFunction.handler({
        httpMethod: "POST",
        headers: { authorization: "Bearer owner-token" },
        body: JSON.stringify({ action: "invite-request", requestId })
      });
      assert.equal(result.statusCode, 503);
      assert.equal(calls.some((url) => url.includes("/rest/v1/access_requests") && url.includes("PATCH")), false);
    } finally {
      global.fetch = previousFetch;
    }
  });
});

test("page publishing uses the saved draft rather than unsaved browser content", async () => {
  await withEnvironment({
    SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "service-role-test",
    SUPABASE_PUBLISHABLE_KEY: "publishable-test",
    ADMIN_EMAIL: "owner@example.com",
    PUBLIC_SITE_URL: "https://skillex.example"
  }, async () => {
    const previousFetch = global.fetch;
    const savedContent = { "hero-title": "Saved page heading" };
    const calls = [];
    global.fetch = async (url, options = {}) => {
      const urlText = String(url);
      calls.push({ url: urlText, options });
      if (urlText.endsWith("/auth/v1/user")) {
        return jsonResponse(200, { id: ownerId, email: "owner@example.com", email_confirmed_at: "2026-01-01T00:00:00Z" });
      }
      if (urlText.includes("/rest/v1/site_pages") && options.method === "PATCH") {
        return jsonResponse(200, [{
          page_key: "about",
          title: "About Skillex",
          content: savedContent,
          draft_content: savedContent
        }]);
      }
      if (urlText.includes("/rest/v1/site_pages")) {
        return jsonResponse(200, [{ page_key: "about", draft_content: savedContent }]);
      }
      throw new Error(`Unexpected request: ${urlText}`);
    };
    try {
      const result = await adminFunction.handler({
        httpMethod: "POST",
        headers: { authorization: "Bearer owner-token" },
        body: JSON.stringify({
          action: "publish-page",
          pageKey: "about",
          content: { "hero-title": "Unsaved browser change" }
        })
      });
      assert.equal(result.statusCode, 200);
      const pagePatch = calls.find(({ url, options }) => url.includes("/rest/v1/site_pages") && options.method === "PATCH");
      assert.deepEqual(JSON.parse(pagePatch.options.body).content, savedContent);
    } finally {
      global.fetch = previousFetch;
    }
  });
});

test("contact messages go only through Gmail API and never enter an admin inbox store", async () => {
  await withEnvironment({
    GMAIL_CLIENT_ID: "client-id",
    GMAIL_CLIENT_SECRET: "client-secret",
    GMAIL_REFRESH_TOKEN: "refresh-token",
    GMAIL_SENDER_EMAIL: "owner@example.com",
    CONTACT_RECIPIENT_EMAIL: "owner@example.com"
  }, async () => {
    const previousFetch = global.fetch;
    const calls = [];
    global.fetch = async (url, options) => {
      calls.push({ url: String(url), options });
      if (String(url).includes("oauth2.googleapis.com/token")) return jsonResponse(200, { access_token: "access-token" });
      if (String(url).includes("gmail.googleapis.com/gmail/v1/users/me/messages/send")) return jsonResponse(200, { id: "message-id" });
      throw new Error(`Unexpected request: ${url}`);
    };
    try {
      const invalid = await contactFunction.handler({
        httpMethod: "POST",
        body: JSON.stringify({ name: "Test", email: "not-an-email", message: "Hello" })
      });
      assert.equal(invalid.statusCode, 400);
      assert.equal(calls.length, 0);

      const sent = await contactFunction.handler({
        httpMethod: "POST",
        body: JSON.stringify({ name: "Test User", email: "reply@example.com", message: "Please reply." })
      });
      assert.equal(sent.statusCode, 200);
      assert.equal(JSON.parse(sent.body).sent, true);
      assert.equal(calls.length, 2);
      const gmailCall = calls.find(({ url }) => url.includes("gmail.googleapis.com"));
      const raw = JSON.parse(gmailCall.options.body).raw.replace(/-/g, "+").replace(/_/g, "/");
      const message = Buffer.from(raw, "base64").toString("utf8");
      const encodedBody = message.split("\r\n\r\n").at(-1);
      const messageBody = Buffer.from(encodedBody, "base64").toString("utf8");
      assert.match(message, /To: owner@example\.com/);
      assert.match(message, /Reply-To: reply@example\.com/);
      assert.match(messageBody, /Test User/);
      assert.match(messageBody, /Please reply\./);
      assert.doesNotMatch(calls.map(({ url }) => url).join(" "), /supabase|netlify/i);
    } finally {
      global.fetch = previousFetch;
    }
  });
});

test("invitation completion updates only the invited request matching its ID and email", async () => {
  await withEnvironment({
    SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "service-role-test",
    SUPABASE_PUBLISHABLE_KEY: "publishable-test"
  }, async () => {
    const previousFetch = global.fetch;
    const calls = [];
    global.fetch = async (url, options = {}) => {
      const urlText = String(url);
      calls.push({ url: urlText, options });
      if (urlText.endsWith("/auth/v1/user")) return jsonResponse(200, { email: "invitee@example.com" });
      if (urlText.includes("/rest/v1/access_requests")) {
        return jsonResponse(200, [{ id: requestId, status: "completed" }]);
      }
      throw new Error(`Unexpected request: ${urlText}`);
    };
    try {
      const result = await accessRequestFunction.handler({
        httpMethod: "POST",
        headers: { authorization: "Bearer invitee-token" },
        body: JSON.stringify({ action: "complete", requestId })
      });
      assert.equal(result.statusCode, 200);
      const update = calls.find(({ url, options }) => url.includes("/rest/v1/access_requests") && options.method === "PATCH");
      const filters = new URL(update.url).searchParams;
      assert.equal(filters.get("id"), `eq.${requestId}`);
      assert.equal(filters.get("email"), "eq.invitee@example.com");
      assert.equal(filters.get("status"), "in.(invited,completed)");
    } finally {
      global.fetch = previousFetch;
    }
  });
});

test("public content endpoint reads only published owner-managed content", async () => {
  await withEnvironment({
    SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "service-role-test"
  }, async () => {
    const previousFetch = global.fetch;
    const calls = [];
    global.fetch = async (url, options) => {
      const requestUrl = new URL(String(url));
      calls.push({ requestUrl, options });
      if (requestUrl.pathname.endsWith("/site_pages")) {
        return jsonResponse(200, [{
          page_key: "about",
          title: "About Skillex",
          content: { "hero-title": "A community of learners" },
          published_at: "2026-11-13T21:00:00Z"
        }]);
      }
      if (requestUrl.pathname.endsWith("/site_announcements")) {
        return jsonResponse(200, [{
          id: "announcement-id",
          title: "New feature",
          body: "Community discussions are available.",
          published_at: "2026-11-13T21:00:00Z"
        }]);
      }
      throw new Error(`Unexpected request: ${requestUrl}`);
    };
    try {
      const invalid = await publicContentFunction.handler({
        httpMethod: "GET",
        queryStringParameters: { resource: "page", page: "../admin" }
      });
      assert.equal(invalid.statusCode, 400);
      assert.equal(calls.length, 0);

      const pageResponse = await publicContentFunction.handler({
        httpMethod: "GET",
        queryStringParameters: { resource: "page", page: "about" }
      });
      assert.equal(pageResponse.statusCode, 200);
      assert.equal(JSON.parse(pageResponse.body).page.content["hero-title"], "A community of learners");
      assert.equal(calls[0].requestUrl.searchParams.get("published_at"), "not.is.null");
      assert.equal(calls[0].options.headers.Authorization, "Bearer service-role-test");

      const announcementResponse = await publicContentFunction.handler({
        httpMethod: "GET",
        queryStringParameters: { resource: "announcements" }
      });
      assert.equal(announcementResponse.statusCode, 200);
      assert.equal(JSON.parse(announcementResponse.body).announcements.length, 1);
      assert.equal(calls[1].requestUrl.searchParams.get("status"), "eq.published");
      assert.equal(calls[1].requestUrl.searchParams.get("published_at"), "not.is.null");
    } finally {
      global.fetch = previousFetch;
    }
  });
});
