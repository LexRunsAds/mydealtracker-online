import {
  json,
  readJson,
  withErrorHandling,
  ensureAnalyticsTables,
  getCurrentUser,
  newId,
  cleanText
} from "./_utils.js";

export async function onRequestPost(context) {
  return withErrorHandling(context, async () => {
    await ensureAnalyticsTables(context.env);

    const body = await readJson(context.request, 10000);
    const visitorId = cleanText(body.visitorId || "", 100, "Visitor ID", { required: true });
    let path = cleanText(body.path || "/", 200, "Path");

    if (!path.startsWith("/")) path = `/${path}`;
    if (path.startsWith("/admin")) return json({ ok: true, tracked: false });

    const user = await getCurrentUser(context);

    // Avoid obvious duplicate reload spam within a very short window.
    const recent = await context.env.DB.prepare(
      `SELECT id FROM page_views
       WHERE visitor_id = ? AND path = ? AND created_at > datetime('now', '-5 seconds')
       LIMIT 1`
    ).bind(visitorId, path).first();

    if (!recent) {
      await context.env.DB.prepare(
        `INSERT INTO page_views (id, visitor_id, user_id, path)
         VALUES (?, ?, ?, ?)`
      ).bind(newId(), visitorId, user?.id || "", path).run();
    }

    return json({ ok: true, tracked: !recent });
  });
}
