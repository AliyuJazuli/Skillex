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
  if (!url || !serviceRoleKey || !publishableKey) {
    throw new Error("Account deletion is missing required Supabase environment variables.");
  }
  return { url: url.replace(/\/+$/, ""), serviceRoleKey, publishableKey };
}

function getBearerToken(event) {
  const authorization = event.headers?.authorization || event.headers?.Authorization || "";
  return authorization.replace(/^Bearer\s+/i, "");
}

async function getAccount(event, config) {
  const accessToken = getBearerToken(event);
  if (!accessToken) return { error: response(401, { error: "Log in again before deleting your account." }) };

  const result = await fetch(`${config.url}/auth/v1/user`, {
    headers: {
      apikey: config.publishableKey,
      Authorization: `Bearer ${accessToken}`
    }
  });
  if (!result.ok) return { error: response(401, { error: "Your session has expired. Log in again before deleting your account." }) };

  const user = await result.json();
  if (typeof user.id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id)
    || typeof user.email !== "string" || !user.email.trim()) {
    return { error: response(401, { error: "The signed-in account could not be verified." }) };
  }
  return { user };
}

async function serviceRequest(config, pathname, options = {}) {
  const result = await fetch(`${config.url}${pathname}`, {
    ...options,
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      "Content-Type": "application/json",
      ...options.headers
    }
  });
  const body = await result.text();
  if (!result.ok) {
    console.error("Account deletion Supabase operation failed:", result.status);
    throw new Error("Supabase could not complete the account deletion.");
  }
  if (!body) return null;
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}

async function getAvatarPath(userId, config) {
  const query = new URLSearchParams({ select: "avatar_path", id: `eq.${userId}`, limit: "1" });
  const [profile] = await serviceRequest(config, `/rest/v1/profiles?${query}`);
  if (!profile?.avatar_path) return null;
  if (typeof profile.avatar_path !== "string" || !profile.avatar_path.startsWith(`${userId}/`)) {
    throw new Error("The profile avatar path could not be safely verified.");
  }
  return profile.avatar_path;
}

async function deleteAvatar(avatarPath, config) {
  if (!avatarPath) return;
  await serviceRequest(config, "/storage/v1/object/avatars", {
    method: "DELETE",
    body: JSON.stringify({ prefixes: [avatarPath] })
  });
}

async function deleteAccessRequests(email, config) {
  const query = new URLSearchParams({ email: `eq.${email.trim().toLowerCase()}` });
  await serviceRequest(config, `/rest/v1/access_requests?${query}`, { method: "DELETE" });
}

async function deleteAuthUser(userId, config) {
  await serviceRequest(config, `/auth/v1/admin/users/${encodeURIComponent(userId)}`, { method: "DELETE" });
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return response(405, { error: "Use POST to delete your account." });
  }

  try {
    const config = getConfig();
    const { user, error } = await getAccount(event, config);
    if (error) return error;

    const avatarPath = await getAvatarPath(user.id, config);
    await deleteAuthUser(user.id, config);

    const warnings = [];
    for (const [label, cleanup] of [
      ["profile photo", () => deleteAvatar(avatarPath, config)],
      ["access request data", () => deleteAccessRequests(user.email, config)]
    ]) {
      try {
        await cleanup();
      } catch (error) {
        console.error(`Account deletion could not remove ${label}:`, error);
        warnings.push(label);
      }
    }

    return response(200, { deleted: true, warnings });
  } catch (error) {
    console.error("Account deletion function failed:", error);
    return response(503, { error: "The account deletion service is temporarily unavailable. Your account was not deleted; try again shortly." });
  }
};
