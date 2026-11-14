const { createHash } = require("node:crypto");

class RequestValidationError extends Error {}

const response = (statusCode, body) => ({
  statusCode,
  headers: {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8"
  },
  body: JSON.stringify(body)
});

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !serviceRoleKey || !publishableKey) {
    throw new Error("Access request functions are missing required Supabase environment variables.");
  }
  return { url: url.replace(/\/+$/, ""), serviceRoleKey, publishableKey };
}

function tokenHash(token) {
  return createHash("sha256").update(token).digest("hex");
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
  const body = await result.text();
  if (!result.ok) {
    console.error("Access request Supabase operation failed:", result.status);
    throw new Error("The access request service could not complete this operation.");
  }
  return body ? JSON.parse(body) : null;
}

function parseBody(event) {
  try {
    return JSON.parse(event.body || "");
  } catch {
    throw new RequestValidationError("Enter valid request details and try again.");
  }
}

function validRequestToken(token) {
  return typeof token === "string" && /^[A-Za-z0-9_-]{43}$/.test(token);
}

async function createRequest(body, config) {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const requestToken = typeof body.requestToken === "string" ? body.requestToken : "";

  if (!name || name.length > 80 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254
    || !validRequestToken(requestToken) || body.consent !== true || body.company || body.botField) {
    return response(400, { error: "Complete the required fields and consent before sending your request." });
  }

  const requestTokenHash = tokenHash(requestToken);
  await supabaseRequest(config, "/rest/v1/access_requests?on_conflict=request_token_hash", {
    method: "POST",
    headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
    body: JSON.stringify({
      name,
      email,
      interests: "",
      request_token_hash: requestTokenHash,
      status: "pending"
    })
  });

  const query = new URLSearchParams({
    select: "name,email,status,created_at",
    request_token_hash: `eq.${requestTokenHash}`,
    limit: "1"
  });
  const [request] = await supabaseRequest(config, `/rest/v1/access_requests?${query}`);
  if (!request) throw new Error("The access request was not saved.");
  return response(201, {
    name: request.name,
    email: request.email,
    status: request.status,
    createdAt: request.created_at
  });
}

async function updateRequestEmail(body, config) {
  const requestToken = typeof body.requestToken === "string" ? body.requestToken : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!validRequestToken(requestToken) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return response(400, { error: "Enter a valid email address and try again." });
  }

  const requestTokenHash = tokenHash(requestToken);
  const lookup = new URLSearchParams({
    select: "id,name,email,status",
    request_token_hash: `eq.${requestTokenHash}`,
    limit: "1"
  });
  const [existing] = await supabaseRequest(config, `/rest/v1/access_requests?${lookup}`);
  if (!existing || !["pending", "approved"].includes(existing.status)) {
    return response(409, { error: "This request can no longer be updated. Submit a new request to continue." });
  }

  const update = new URLSearchParams({
    select: "name,email,status",
    request_token_hash: `eq.${requestTokenHash}`,
    status: `eq.${existing.status}`
  });
  const [request] = await supabaseRequest(config, `/rest/v1/access_requests?${update}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ email, status: "pending" })
  });
  if (!request) return response(409, { error: "This request changed while being updated. Refresh and try again." });
  return response(200, request);
}

async function readStatus(event, config) {
  const token = event.queryStringParameters?.token || "";
  if (!validRequestToken(token)) {
    return response(400, { error: "This request status link is invalid." });
  }
  const query = new URLSearchParams({
    select: "name,email,status,created_at,updated_at",
    request_token_hash: `eq.${tokenHash(token)}`,
    limit: "1"
  });
  const [request] = await supabaseRequest(config, `/rest/v1/access_requests?${query}`);
  if (!request) return response(404, { error: "No access request was found for this status link." });
  return response(200, {
    name: request.name,
    email: request.email,
    status: request.status,
    createdAt: request.created_at,
    updatedAt: request.updated_at
  });
}

async function markInvitationComplete(event, body, config) {
  const authorization = event.headers?.authorization || event.headers?.Authorization || "";
  const accessToken = authorization.replace(/^Bearer\s+/i, "");
  const requestId = typeof body.requestId === "string" ? body.requestId : "";
  if (!accessToken) return response(401, { error: "Sign in from your Skillex invitation before continuing." });
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestId)) {
    return response(400, { error: "This invitation link is missing its request reference." });
  }

  const authResponse = await fetch(`${config.url}/auth/v1/user`, {
    headers: {
      apikey: config.publishableKey,
      Authorization: `Bearer ${accessToken}`
    }
  });
  if (!authResponse.ok) {
    return response(401, { error: "Your Skillex invitation session is not valid. Open the latest invite email again." });
  }
  const user = await authResponse.json();
  const email = typeof user.email === "string" ? user.email.trim().toLowerCase() : "";
  if (!email) return response(400, { error: "The invited account has no email address." });

  const query = new URLSearchParams({
    select: "id,status",
    id: `eq.${requestId}`,
    email: `eq.${email}`,
    status: "in.(invited,completed)"
  });
  const [request] = await supabaseRequest(config, `/rest/v1/access_requests?${query}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ status: "completed" })
  });
  if (!request) return response(409, { error: "This invitation does not match an active Skillex access request." });
  return response(200, { status: "completed" });
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return response(204, {});
  if (!["GET", "POST"].includes(event.httpMethod)) {
    return response(405, { error: "Use GET to check request status or POST to submit a request." });
  }

  try {
    const config = getSupabaseConfig();
    if (event.httpMethod === "GET") return await readStatus(event, config);
    const body = parseBody(event);
    if (body.action === "complete") return await markInvitationComplete(event, body, config);
    if (body.action === "update-email") return await updateRequestEmail(body, config);
    return await createRequest(body, config);
  } catch (error) {
    if (error instanceof RequestValidationError) return response(400, { error: error.message });
    console.error("Access request function failed:", error);
    return response(503, { error: "The invitation service is temporarily unavailable. Please try again later." });
  }
};
