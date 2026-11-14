const response = (statusCode, body) => ({
  statusCode,
  headers: {
    "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
    "Content-Type": "application/json; charset=utf-8"
  },
  body: JSON.stringify(body)
});

async function supabaseRequest(config, pathname) {
  const result = await fetch(`${config.url}${pathname}`, {
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`
    }
  });
  if (!result.ok) {
    console.error("Public site content Supabase read failed:", result.status);
    throw new Error("Published site content could not be loaded.");
  }
  return await result.json();
}

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return response(405, { error: "Use GET to load published site content." });
  }
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    console.error("Published site content function is missing Supabase server configuration.");
    return response(503, { error: "Published site content is temporarily unavailable." });
  }
  try {
    const config = { url: url.replace(/\/+$/, ""), serviceRoleKey };
    const resource = event.queryStringParameters?.resource || "announcements";
    if (resource === "page") {
      const pageKey = event.queryStringParameters?.page || "";
      if (!/^[a-z0-9-]{1,60}$/.test(pageKey)) {
        return response(400, { error: "Choose a valid page." });
      }
      const query = new URLSearchParams({
        select: "page_key,title,content,published_at,updated_at",
        page_key: `eq.${pageKey}`,
        published_at: "not.is.null",
        limit: "1"
      });
      const [page] = await supabaseRequest(config, `/rest/v1/site_pages?${query}`);
      if (!page) return response(404, { error: "No published content was found for this page." });
      return response(200, { page });
    }
    if (resource === "announcements") {
      const query = new URLSearchParams({
        select: "id,title,body,published_at",
        status: "eq.published",
        published_at: "not.is.null",
        order: "published_at.desc",
        limit: "20"
      });
      return response(200, { announcements: await supabaseRequest(config, `/rest/v1/site_announcements?${query}`) });
    }
    return response(404, { error: "That public content resource was not found." });
  } catch (error) {
    console.error("Public site content function failed:", error);
    return response(503, { error: "Published site content is temporarily unavailable." });
  }
};
