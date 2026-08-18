import { json, readJson, newId, hashPassword, sessionCookie, sessionExpirationIso } from "../_utils.js";

export async function onRequestPost(context) {
  const body = await readJson(context.request);
  const email = String(body.email || "").trim().toLowerCase();
  const name = String(body.name || "").trim();
  const password = String(body.password || "");

  if (!email || !email.includes("@")) return json({ error: "Enter a valid email address." }, 400);
  if (password.length < 8) return json({ error: "Password must be at least 8 characters." }, 400);

  const existing = await context.env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
  if (existing) return json({ error: "An account with this email already exists." }, 409);

  const userId = newId();
  const passwordHash = await hashPassword(password);

  await context.env.DB.prepare(
    "INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)"
  ).bind(userId, email, name, passwordHash).run();

  await context.env.DB.prepare(
    "INSERT INTO user_settings (user_id, monthly_goal) VALUES (?, ?)"
  ).bind(userId, 15).run();

  const sessionId = newId();
  await context.env.DB.prepare(
    "INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)"
  ).bind(sessionId, userId, sessionExpirationIso()).run();

  return json({ user: { id: userId, email, name } }, 200, { "set-cookie": sessionCookie(sessionId) });
}
