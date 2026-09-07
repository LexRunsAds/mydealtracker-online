import {
  json,
  getCurrentUser,
  withErrorHandling,
  getCookie,
  sessionCookie,
  sessionExpirationIso
} from "../_utils.js";

export async function onRequestGet(context) {
  return withErrorHandling(context, async () => {
    const user = await getCurrentUser(context);
    const sessionId = getCookie(context.request);

    if (!user || !sessionId) {
      return json({ user: null });
    }

    await context.env.DB.prepare(
      "UPDATE sessions SET expires_at = ? WHERE id = ?"
    ).bind(sessionExpirationIso(), sessionId).run();

    return json(
      { user: { id: user.id, email: user.email, name: user.name } },
      200,
      { "Set-Cookie": sessionCookie(sessionId) }
    );
  });
}
