import { json, clearSessionCookie, getCookie, withErrorHandling } from "../_utils.js";

export async function onRequestPost(context) {
  return withErrorHandling(context, async () => {
    const sessionId = getCookie(context.request);

    if (sessionId) {
      await context.env.DB.prepare("DELETE FROM sessions WHERE id = ?").bind(sessionId).run();
    }

    return json({ ok: true }, 200, { "set-cookie": clearSessionCookie() });
  });
}
