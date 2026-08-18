import { json, getCurrentUser, withErrorHandling } from "../_utils.js";

export async function onRequestGet(context) {
  return withErrorHandling(context, async () => {
    const user = await getCurrentUser(context);
    return json({ user: user ? { id: user.id, email: user.email, name: user.name } : null });
  });
}
