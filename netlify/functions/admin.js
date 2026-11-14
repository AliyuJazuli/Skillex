const response = (statusCode, body) => ({
  statusCode,
  headers: {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8"
  },
  body: JSON.stringify(body)
});

function getConfig() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const siteUrl = process.env.PUBLIC_SITE_URL;
  if (!url || !serviceRoleKey || !publishableKey || !adminEmail || !siteUrl) {
    throw new Error("The owner dashboard is missing required server environment variables.");
  }
  const parsedSiteUrl = new URL(siteUrl);
  if (!["https:", "http:"].includes(parsedSiteUrl.protocol)
    || (parsedSiteUrl.protocol === "http:" && !["localhost", "127.0.0.1"].includes(parsedSiteUrl.hostname))) {
    throw new Error("PUBLIC_SITE_URL must use HTTPS except for localhost development.");
  }
  return {
    url: url.replace(/\/+$/, ""),
    serviceRoleKey,
    publishableKey,
    adminEmail,
    siteUrl: parsedSiteUrl.origin
  };
}

function getBearerToken(event) {
  const authorization = event.headers?.authorization || event.headers?.Authorization || "";
  return authorization.replace(/^Bearer\s+/i, "");
}

async function authenticateAdmin(event, config) {
  const accessToken = getBearerToken(event);
  if (!accessToken) return { error: response(401, { error: "Sign in with the owner account to continue." }) };
  const result = await fetch(`${config.url}/auth/v1/user`, {
    headers: {
      apikey: config.publishableKey,
      Authorization: `Bearer ${accessToken}`
    }
  });
  if (!result.ok) return { error: response(401, { error: "Your session has expired. Sign in again." }) };
  const user = await result.json();
  const email = typeof user.email === "string" ? user.email.trim().toLowerCase() : "";
  if (!email || email !== config.adminEmail) {
    return { error: response(403, { error: "This account is not authorized to use the owner dashboard." }) };
  }
  if (!user.email_confirmed_at && !user.confirmed_at) {
    return { error: response(403, { error: "Confirm the owner account email before using the dashboard." }) };
  }
  return { user };
}

async function supabaseRequest(config, pathname, options = {}) {
  const result = await fetch(`${config.url}${pathname}`, {
    ...options,
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      "Content-Type": "application/json",
      ...options.headers
    }
  });
  const text = await result.text();
  if (!result.ok) {
    console.error("Owner dashboard Supabase operation failed:", result.status);
    throw new Error("The owner dashboard could not complete this operation.");
  }
  return text ? JSON.parse(text) : null;
}

async function authAdminRequest(config, pathname, options = {}) {
  const result = await fetch(`${config.url}${pathname}`, {
    ...options,
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      "Content-Type": "application/json",
      ...options.headers
    }
  });
  const text = await result.text();
  if (!result.ok) {
    console.error("Owner dashboard Auth operation failed:", result.status);
    throw new Error("Supabase could not complete the account operation.");
  }
  return text ? JSON.parse(text) : null;
}

function parseBody(event) {
  try {
    return JSON.parse(event.body || "");
  } catch {
    return null;
  }
}

function isUuid(value) {
  return typeof value === "string"
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function isValidContentDocument(content) {
  return content && typeof content === "object" && !Array.isArray(content)
    && Object.keys(content).length <= 100
    && Object.entries(content).every(([key, value]) =>
      /^[a-z0-9-]{1,80}$/.test(key) && typeof value === "string" && value.length <= 4000);
}

async function listRequests(config) {
  const query = new URLSearchParams({
    select: "id,name,email,interests,status,created_at,updated_at",
    order: "created_at.desc",
    limit: "200"
  });
  return await supabaseRequest(config, `/rest/v1/access_requests?${query}`);
}

async function countRows(config, table, column, filters = {}) {
  const query = new URLSearchParams({
    select: column,
    limit: "1",
    ...filters
  });
  const result = await fetch(`${config.url}/rest/v1/${table}?${query}`, {
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      Prefer: "count=exact",
      Range: "0-0"
    }
  });
  if (!result.ok) {
    console.error(`Owner dashboard count failed for ${table}:`, result.status);
    throw new Error("Dashboard statistics could not be loaded.");
  }
  await result.text();
  const contentRange = result.headers.get("content-range") || "";
  const match = contentRange.match(/\/(\d+)$/);
  if (!match) {
    console.error(`Supabase did not return an exact count for ${table}.`);
    throw new Error("Dashboard statistics could not be loaded.");
  }
  return Number(match[1]);
}

async function listMembers(config, event) {
  const page = Math.max(1, Number.parseInt(event.queryStringParameters?.page || "1", 10) || 1);
  const perPage = 50;
  const userResult = await authAdminRequest(config, `/auth/v1/admin/users?page=${page}&per_page=${perPage}`);
  const users = Array.isArray(userResult?.users) ? userResult.users : [];
  if (!users.length) return { members: [], page, hasMore: false };

  const ids = users.map((user) => user.id).filter(isUuid);
  const profileQuery = new URLSearchParams({
    select: "id,display_name,bio,created_at",
    id: `in.(${ids.join(",")})`
  });
  const profiles = await supabaseRequest(config, `/rest/v1/profiles?${profileQuery}`);
  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));
  return {
    members: users.map((user) => {
      const profile = profilesById.get(user.id);
      return {
        id: user.id,
        email: user.email || "",
        name: profile?.display_name || user.user_metadata?.display_name || "",
        bio: profile?.bio || "",
        createdAt: user.created_at || null,
        emailConfirmed: Boolean(user.email_confirmed_at || user.confirmed_at),
        bannedUntil: user.banned_until || null
      };
    }),
    page,
    hasMore: users.length === perPage
  };
}

async function listModerationItems(config) {
  const query = new URLSearchParams({
    select: "id,user_id,skill_id,body,status,created_at,updated_at",
    status: "neq.removed",
    order: "created_at.desc",
    limit: "200"
  });
  const posts = await supabaseRequest(config, `/rest/v1/community_posts?${query}`);
  const userIds = [...new Set(posts.map((post) => post.user_id).filter(isUuid))];
  if (!userIds.length) return { posts: [] };
  const profileQuery = new URLSearchParams({
    select: "id,display_name",
    id: `in.(${userIds.join(",")})`
  });
  const profiles = await supabaseRequest(config, `/rest/v1/profiles?${profileQuery}`);
  const names = new Map(profiles.map((profile) => [profile.id, profile.display_name]));
  return {
    posts: posts.map((post) => ({
      ...post,
      author: names.get(post.user_id) || "Skillex member"
    }))
  };
}

async function getDashboardData(config, event) {
  const resource = event.queryStringParameters?.resource || "overview";
  if (resource === "requests") return { requests: await listRequests(config) };
  if (resource === "members") return await listMembers(config, event);
  if (resource === "moderation") return await listModerationItems(config);
  if (resource === "pages") {
    const pages = await supabaseRequest(config, "/rest/v1/site_pages?select=page_key,title,content,draft_content,published_at,updated_at&order=page_key.asc");
    return { pages };
  }
  if (resource === "announcements") {
    const announcements = await supabaseRequest(config, "/rest/v1/site_announcements?select=id,title,body,status,published_at,created_at,updated_at&order=created_at.desc");
    return { announcements };
  }
  if (resource !== "overview") return null;

  const requestStatuses = ["pending", "approved", "invited", "completed", "declined"];
  const postStatuses = ["published", "hidden", "removed"];
  const [requestCounts, members, postCounts, sitePages, publishedPages, announcementCounts] = await Promise.all([
    Promise.all(requestStatuses.map((status) =>
      countRows(config, "access_requests", "id", { status: `eq.${status}` }))),
    countRows(config, "profiles", "id"),
    Promise.all(postStatuses.map((status) =>
      countRows(config, "community_posts", "id", { status: `eq.${status}` }))),
    countRows(config, "site_pages", "page_key"),
    countRows(config, "site_pages", "page_key", { published_at: "not.is.null" }),
    Promise.all(["draft", "published"].map((status) =>
      countRows(config, "site_announcements", "id", { status: `eq.${status}` })))
  ]);
  const [pendingRequests, approvedRequests, invitedRequests, completedRequests, declinedRequests] = requestCounts;
  const [publishedPosts, hiddenPosts, removedPosts] = postCounts;
  const [draftAnnouncements, publishedAnnouncements] = announcementCounts;
  const totalRequests = requestCounts.reduce((total, count) => total + count, 0);
  const communityPosts = postCounts.reduce((total, count) => total + count, 0);
  return {
    metrics: {
      totalRequests,
      pendingRequests,
      approvedRequests,
      invitedRequests,
      completedRequests,
      declinedRequests,
      members,
      communityPosts,
      publishedPosts,
      hiddenPosts,
      removedPosts,
      sitePages,
      publishedPages,
      announcements: draftAnnouncements + publishedAnnouncements,
      draftAnnouncements,
      publishedAnnouncements
    }
  };
}

async function updateRequestStatus(config, requestId, allowedStatuses, nextStatus) {
  if (!isUuid(requestId)) return response(400, { error: "Choose a valid access request." });
  const lookup = new URLSearchParams({
    select: "id,status",
    id: `eq.${requestId}`,
    limit: "1"
  });
  const [request] = await supabaseRequest(config, `/rest/v1/access_requests?${lookup}`);
  if (!request) return response(404, { error: "That access request was not found." });
  if (!allowedStatuses.includes(request.status)) {
    return response(409, { error: `This request is ${request.status} and cannot be changed by this action.` });
  }
  const update = new URLSearchParams({
    select: "id,status,updated_at",
    id: `eq.${requestId}`,
    status: `eq.${request.status}`
  });
  const [updated] = await supabaseRequest(config, `/rest/v1/access_requests?${update}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ status: nextStatus })
  });
  if (!updated) return response(409, { error: "This request changed in another session. Refresh and try again." });
  return response(200, updated);
}

async function inviteRequest(config, requestId) {
  if (!isUuid(requestId)) return response(400, { error: "Choose a valid access request." });
  const query = new URLSearchParams({
    select: "id,name,email,status",
    id: `eq.${requestId}`,
    limit: "1"
  });
  const [request] = await supabaseRequest(config, `/rest/v1/access_requests?${query}`);
  if (!request) return response(404, { error: "That access request was not found." });
  if (request.status !== "approved") {
    return response(409, { error: "Approve this request before sending its invitation." });
  }

  const redirectUrl = new URL("/complete-profile.html", config.siteUrl);
  redirectUrl.searchParams.set("requestId", request.id);
  await authAdminRequest(config, `/auth/v1/invite?redirect_to=${encodeURIComponent(redirectUrl.href)}`, {
    method: "POST",
    body: JSON.stringify({
      email: request.email,
      data: {
        display_name: request.name,
        access_request_id: request.id
      }
    })
  });

  const update = new URLSearchParams({
    select: "id,status,updated_at",
    id: `eq.${request.id}`,
    status: "eq.approved"
  });
  const [updated] = await supabaseRequest(config, `/rest/v1/access_requests?${update}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ status: "invited" })
  });
  if (!updated) {
    console.error("Supabase sent an invitation but the access request status could not be updated.");
    return response(503, {
      error: "Supabase sent the invitation, but its request status could not be updated. Refresh the dashboard before retrying."
    });
  }
  return response(200, updated);
}

async function handlePost(event, config, adminUser) {
  const body = parseBody(event);
  if (!body || typeof body.action !== "string") {
    return response(400, { error: "Choose a valid dashboard action." });
  }
  if (body.action === "approve-request") {
    return await updateRequestStatus(config, body.requestId, ["pending"], "approved");
  }
  if (body.action === "decline-request") {
    return await updateRequestStatus(config, body.requestId, ["pending", "approved"], "declined");
  }
  if (body.action === "invite-request") {
    return await inviteRequest(config, body.requestId);
  }
  if (body.action === "set-member-access") {
    if (!isUuid(body.userId) || typeof body.suspended !== "boolean") {
      return response(400, { error: "Choose a valid member and access action." });
    }
    if (body.userId === adminUser.id) return response(400, { error: "You cannot suspend the owner account." });
    const duration = body.suspended ? "876000h" : "none";
    await authAdminRequest(config, `/auth/v1/admin/users/${encodeURIComponent(body.userId)}`, {
      method: "PUT",
      body: JSON.stringify({ ban_duration: duration })
    });
    return response(200, { userId: body.userId, suspended: body.suspended });
  }
  if (body.action === "moderate-post") {
    if (!isUuid(body.postId) || !["published", "hidden", "removed"].includes(body.status)) {
      return response(400, { error: "Choose a valid community post and moderation status." });
    }
    const query = new URLSearchParams({
      select: "id,status,updated_at",
      id: `eq.${body.postId}`
    });
    const [post] = await supabaseRequest(config, `/rest/v1/community_posts?${query}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ status: body.status })
    });
    if (!post) return response(404, { error: "That community post was not found." });
    return response(200, post);
  }
  if (body.action === "save-page") {
    if (typeof body.pageKey !== "string" || !/^[a-z0-9-]{1,60}$/.test(body.pageKey)
      || typeof body.title !== "string" || !body.title.trim() || body.title.length > 120
      || !isValidContentDocument(body.content)) {
      return response(400, { error: "Enter a valid page title and content document." });
    }
    const [page] = await supabaseRequest(config, "/rest/v1/site_pages?on_conflict=page_key", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({
        page_key: body.pageKey,
        title: body.title.trim(),
        draft_content: body.content,
        updated_by: adminUser.id
      })
    });
    return response(200, page);
  }
  if (body.action === "publish-page") {
    if (typeof body.pageKey !== "string" || !/^[a-z0-9-]{1,60}$/.test(body.pageKey)) {
      return response(400, { error: "Choose a valid page." });
    }
    const query = new URLSearchParams({
      select: "page_key,draft_content",
      page_key: `eq.${body.pageKey}`
    });
    const [draft] = await supabaseRequest(config, `/rest/v1/site_pages?${query}`);
    if (!draft) return response(404, { error: "Save this page before publishing it." });
    if (!isValidContentDocument(draft.draft_content)) {
      return response(400, { error: "Save a valid page draft before publishing it." });
    }
    const updateQuery = new URLSearchParams({
      select: "page_key,title,content,draft_content,updated_at",
      page_key: `eq.${body.pageKey}`
    });
    const [page] = await supabaseRequest(config, `/rest/v1/site_pages?${updateQuery}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        content: draft.draft_content,
        published_at: new Date().toISOString(),
        updated_by: adminUser.id
      })
    });
    if (!page) return response(404, { error: "The saved page draft could not be published." });
    return response(200, page);
  }
  if (body.action === "save-announcement") {
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const text = typeof body.body === "string" ? body.body.trim() : "";
    const status = body.status === "published" ? "published" : "draft";
    if (!title || title.length > 120 || !text || text.length > 2000) {
      return response(400, { error: "Enter an announcement title and message within the length limits." });
    }
    const values = {
      title,
      body: text,
      status,
      published_at: status === "published" ? new Date().toISOString() : null,
      updated_by: adminUser.id
    };
    if (body.id && !isUuid(body.id)) return response(400, { error: "Choose a valid announcement." });
    const url = body.id
      ? `/rest/v1/site_announcements?id=eq.${encodeURIComponent(body.id)}`
      : "/rest/v1/site_announcements";
    const [announcement] = await supabaseRequest(config, url, {
      method: body.id ? "PATCH" : "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(values)
    });
    if (!announcement) return response(404, { error: "That announcement was not found." });
    return response(200, announcement);
  }
  if (body.action === "delete-announcement") {
    if (!isUuid(body.id)) return response(400, { error: "Choose a valid announcement." });
    await supabaseRequest(config, `/rest/v1/site_announcements?id=eq.${encodeURIComponent(body.id)}`, { method: "DELETE" });
    return response(200, { deleted: true });
  }
  return response(400, { error: "That dashboard action is not supported." });
}

exports.handler = async (event) => {
  if (!["GET", "POST"].includes(event.httpMethod)) {
    return response(405, { error: "Use GET to load dashboard data or POST to update it." });
  }
  try {
    const config = getConfig();
    const { user, error } = await authenticateAdmin(event, config);
    if (error) return error;
    if (event.httpMethod === "GET") {
      const result = await getDashboardData(config, event);
      return result ? response(200, result) : response(404, { error: "That dashboard resource was not found." });
    }
    return await handlePost(event, config, user);
  } catch (error) {
    console.error("Owner dashboard function failed:", error);
    return response(503, { error: "The owner dashboard is temporarily unavailable. Try again shortly." });
  }
};
