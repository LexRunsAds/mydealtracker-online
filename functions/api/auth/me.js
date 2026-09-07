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

    if (user && sessionId) {
      await context.env.DB.prepare(
        "UPDATE sessions SET expires_at = ? WHERE id = ? AND user_id = ?"
      ).bind(sessionExpirationIso(), sessionId, user.id).run();

      return json(
        { user: { id: user.id, email: user.email, name: user.name } },
        200,
        { "set-cookie": sessionCookie(sessionId) }
      );
    }

    return json({ user: null });
  });
}
