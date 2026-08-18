import {
  json,
  readJson,
  newId,
  hashPassword,
  sessionCookie,
  sessionExpirationIso,
  withErrorHandling,
  apiError,
  normalizeEmail,
  isValidEmail,
  cleanText,
  clientIp,
  applyRateLimit,
  recordSecurityEvent,
  cleanupOldSecurityEvents
} from "../_utils.js";

export async function onRequestPost(context) {
  return withErrorHandling(context, async () => {
    await cleanupOldSecurityEvents(context);

    const body = await readJson(context.request, 10000);
    const email = normalizeEmail(body.email);
    const name = cleanText(body.name || "", 80, "Name");
    const password = String(body.password || "");

    const ip = clientIp(context.request);

    await applyRateLimit(context, {
      action: "register_attempt_ip",
      identifier: ip,
      max: 6,
      windowMinutes: 60,
      message: "Too many account creation attempts. Please wait and try again."
    });

    await applyRateLimit(context, {
      action: "register_attempt_email",
      identifier: email || "unknown",
      max: 3,
      windowMinutes: 60,
      message: "Too many account creation attempts. Please wait and try again."
    });

    if (!isValidEmail(email)) return json({ error: "Enter a valid email address." }, 400);
    if (password.length < 8) return json({ error: "Password must be at least 8 characters." }, 400);
    if (password.length > 128) return json({ error: "Password is too long." }, 400);

    const existing = await context.env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
    if (existing) {
      await recordSecurityEvent(context, "register_existing_email", email, "register-existing-email");
      return json({ error: "Unable to create account with those details. Try logging in instead." }, 409);
    }

    const userId = newId();
    const passwordHash = await hashPassword(password);

    await context.env.DB.prepare(
      "INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)"
    ).bind(userId, email, name, passwordHash).run();

    await context.env.DB.prepare(
      "INSERT INTO user_settings (user_id, monthly_goal) VALUES (?, ?)"
    ).bind(userId, 15).run();

    await recordSecurityEvent(context, "successful_register", email, "register-success", userId);

    const sessionId = newId();
    await context.env.DB.prepare(
      "INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)"
    ).bind(sessionId, userId, sessionExpirationIso()).run();

    return json({ user: { id: userId, email, name } }, 200, { "set-cookie": sessionCookie(sessionId) });
  });
}
