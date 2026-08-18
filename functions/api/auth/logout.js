import { json, getCookie, clearSessionCookie } from "../_utils.js";

export async function onRequestPost(context) {
  const sessionId = getCookie(context.request);
  if (sessionId) await context.env.DB.prepare("DELETE FROM sessions WHERE id = ?").bind(sessionId).run();
  return json({ ok: true }, 200, { "set-cookie": clearSessionCookie() });
}
