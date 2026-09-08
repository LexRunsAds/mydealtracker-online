import {
  json,
  readJson,
  newId,
  verifyPassword,
  sessionCookie,
  sessionExpirationIso,
  withErrorHandling,
  apiError,
  normalizeEmail,
  isValidEmail,
  clientIp,
  checkLoginLockout,
  recordFailedLogin,
  clearFailedLogin,
  applyRateLimit,
  cleanupOldSecurityEvents,
  recordAnalyticsEvent,
  isAdminEmail
} from "../_utils.js";

export async function onRequestPost(context) {
  return withErrorHandling(context, async () => {
    await cleanupOldSecurityEvents(context);

    const body = await readJson(context.request, 10000);
    const email = normalizeEmail(body.email);
    const password = String(body.password || "");

    if (!isValidEmail(email) || !password || password.length > 128) {
      return json({ error: "Invalid email or password." }, 401);
    }

    await checkLoginLockout(context, email);

    const ip = clientIp(context.request);
    await applyRateLimit(context, {
      action: "login_attempt_ip",
      identifier: ip,
      max: 30,
      windowMinutes: 15,
      message: "Too many login attempts. Please wait and try again."
    });

    await applyRateLimit(context, {
      action: "login_attempt_email",
      identifier: email,
      max: 12,
      windowMinutes: 15,
      message: "Too many login attempts. Please wait and try again."
    });

    const user = await context.env.DB.prepare(
      "SELECT id, email, name, password_hash FROM users WHERE email = ?"
    ).bind(email).first();

    if (!user) {
      await recordAnalyticsEvent(context, "failed_login", "", "unknown-account");
      await recordFailedLogin(context, email);
      return json({ error: "Invalid email or password." }, 401);
    }

    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) {
      await recordAnalyticsEvent(context, "failed_login", user.id, "bad-password");
      await recordFailedLogin(context, email);
      return json({ error: "Invalid email or password." }, 401);
    }

    await clearFailedLogin(context, email, user.id);
    await recordAnalyticsEvent(context, "successful_login", user.id, "password-login");

    const sessionId = newId();
    await context.env.DB.prepare(
      "INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)"
    ).bind(sessionId, user.id, sessionExpirationIso()).run();

    return json(
      { user: { id: user.id, email: user.email, name: user.name, isAdmin: isAdminEmail(user.email) } },
      200,
      { "Set-Cookie": sessionCookie(sessionId) }
    );
  });
}
