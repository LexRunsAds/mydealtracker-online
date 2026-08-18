const COOKIE_NAME = "mdt_session";
const SESSION_DAYS = 30;

const MAX_JSON_BYTES_DEFAULT = 30000;

export class ApiError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.publicMessage = message;
  }
}

export function apiError(message, status = 400) {
  return new ApiError(message, status);
}

export async function withErrorHandling(context, handler) {
  try {
    return await handler(context);
  } catch (error) {
    console.error(error);
    if (error instanceof ApiError || error.publicMessage) {
      return json({ error: error.publicMessage || error.message }, error.status || 400);
    }
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
}

export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...extraHeaders
    }
  });
}

export async function readJson(request, maxBytes = MAX_JSON_BYTES_DEFAULT) {
  const length = Number(request.headers.get("content-length") || 0);
  if (length && length > maxBytes) {
    throw apiError("Request is too large.", 413);
  }

  try {
    return await request.json();
  } catch {
    return {};
  }
}

export function newId() {
  return crypto.randomUUID();
}

function bytesToBase64(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iterations = 100000;
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    keyMaterial,
    256
  );

  return `pbkdf2$${iterations}$${bytesToBase64(salt)}$${bytesToBase64(new Uint8Array(bits))}`;
}

export async function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.startsWith("pbkdf2$")) return false;

  const [, iterationText, saltBase64, hashBase64] = storedHash.split("$");
  const iterations = Number(iterationText);
  const salt = base64ToBytes(saltBase64);
  const expected = base64ToBytes(hashBase64);

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    keyMaterial,
    expected.byteLength * 8
  );

  const actual = new Uint8Array(bits);
  if (actual.byteLength !== expected.byteLength) return false;

  let diff = 0;
  for (let i = 0; i < actual.byteLength; i++) diff |= actual[i] ^ expected[i];
  return diff === 0;
}

export function getCookie(request, name = COOKIE_NAME) {
  const cookie = request.headers.get("cookie") || "";
  const parts = cookie.split(";").map(v => v.trim());
  for (const part of parts) {
    const [key, ...valueParts] = part.split("=");
    if (key === name) return valueParts.join("=");
  }
  return "";
}

export function sessionCookie(sessionId) {
  const maxAge = SESSION_DAYS * 24 * 60 * 60;
  return `${COOKIE_NAME}=${sessionId}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export function sessionExpirationIso() {
  const d = new Date();
  d.setDate(d.getDate() + SESSION_DAYS);
  return d.toISOString();
}

export function clientIp(request) {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

export function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

export function isValidEmail(email) {
  if (!email || email.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function cleanText(value, max, fieldName, options = {}) {
  const text = String(value ?? "").trim();
  if (text.length > max) throw apiError(`${fieldName} is too long.`, 400);
  if (options.required && !text) throw apiError(`${fieldName} is required.`, 400);
  return text;
}

export function cleanDate(value, fieldName) {
  const text = String(value || "").trim();
  if (!text) return "";

  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw apiError(`${fieldName} must be a valid date.`, 400);
  }

  const date = new Date(`${text}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== text) {
    throw apiError(`${fieldName} must be a valid date.`, 400);
  }

  return text;
}

export async function ensureSecurityTables(env) {
  if (!env?.DB) throw apiError("Database binding is missing.", 500);

  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS security_events (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      identifier TEXT NOT NULL,
      ip TEXT,
      user_id TEXT,
      details TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`
  ).run();

  await env.DB.prepare(
    `CREATE INDEX IF NOT EXISTS idx_security_events_action_identifier_created
     ON security_events (action, identifier, created_at)`
  ).run();

  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS account_lockouts (
      scope TEXT NOT NULL,
      identifier TEXT NOT NULL,
      locked_until TEXT NOT NULL,
      reason TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT,
      PRIMARY KEY (scope, identifier)
    )`
  ).run();
}

export async function recordSecurityEvent(context, action, identifier, details = "", userId = "") {
  await ensureSecurityTables(context.env);
  const ip = clientIp(context.request);
  await context.env.DB.prepare(
    `INSERT INTO security_events (id, action, identifier, ip, user_id, details)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(newId(), action, String(identifier || "unknown").slice(0, 254), ip, userId || "", String(details || "").slice(0, 500)).run();
}

async function eventCount(env, action, identifier, windowMinutes) {
  const row = await env.DB.prepare(
    `SELECT COUNT(*) AS count
     FROM security_events
     WHERE action = ? AND identifier = ? AND created_at > datetime('now', ?)`
  ).bind(action, String(identifier || "unknown").slice(0, 254), `-${Number(windowMinutes) || 15} minutes`).first();

  return Number(row?.count || 0);
}

export async function applyRateLimit(context, { action, identifier, max, windowMinutes = 15, message, userId = "" }) {
  await ensureSecurityTables(context.env);
  const key = String(identifier || "unknown").slice(0, 254);
  const count = await eventCount(context.env, action, key, windowMinutes);

  if (count >= max) {
    throw apiError(message || "Too many attempts. Please wait and try again.", 429);
  }

  await recordSecurityEvent(context, action, key, "rate-limit-event", userId);
}

async function setLockout(env, scope, identifier, minutes, reason) {
  const lockedUntil = new Date(Date.now() + minutes * 60 * 1000).toISOString();
  await env.DB.prepare(
    `INSERT INTO account_lockouts (scope, identifier, locked_until, reason, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(scope, identifier) DO UPDATE SET
       locked_until = excluded.locked_until,
       reason = excluded.reason,
       updated_at = excluded.updated_at`
  ).bind(scope, String(identifier || "unknown").slice(0, 254), lockedUntil, reason, new Date().toISOString()).run();
  return lockedUntil;
}

async function getActiveLockout(env, scope, identifier) {
  const key = String(identifier || "unknown").slice(0, 254);
  const row = await env.DB.prepare(
    `SELECT locked_until, reason FROM account_lockouts WHERE scope = ? AND identifier = ?`
  ).bind(scope, key).first();

  if (!row) return null;

  const until = Date.parse(row.locked_until);
  if (Number.isFinite(until) && until > Date.now()) {
    return { lockedUntil: row.locked_until, reason: row.reason || "" };
  }

  await env.DB.prepare("DELETE FROM account_lockouts WHERE scope = ? AND identifier = ?").bind(scope, key).run();
  return null;
}

function waitMessage(lockout) {
  const ms = Date.parse(lockout.lockedUntil) - Date.now();
  const minutes = Math.max(1, Math.ceil(ms / 60000));
  return `Too many failed login attempts. Please wait about ${minutes} minute${minutes === 1 ? "" : "s"} and try again.`;
}

export async function checkLoginLockout(context, email) {
  await ensureSecurityTables(context.env);
  const ip = clientIp(context.request);
  const emailLock = await getActiveLockout(context.env, "login_email", email);
  if (emailLock) throw apiError(waitMessage(emailLock), 429);

  const ipLock = await getActiveLockout(context.env, "login_ip", ip);
  if (ipLock) throw apiError(waitMessage(ipLock), 429);
}

export async function recordFailedLogin(context, email) {
  await ensureSecurityTables(context.env);
  const ip = clientIp(context.request);

  await recordSecurityEvent(context, "failed_login_email", email, "failed-login");
  await recordSecurityEvent(context, "failed_login_ip", ip, "failed-login");

  const emailCount = await eventCount(context.env, "failed_login_email", email, 15);
  const ipCount = await eventCount(context.env, "failed_login_ip", ip, 15);

  if (emailCount >= 5) {
    const lockedUntil = await setLockout(context.env, "login_email", email, 15, "too-many-failed-passwords");
    throw apiError(waitMessage({ lockedUntil }), 429);
  }

  if (ipCount >= 20) {
    const lockedUntil = await setLockout(context.env, "login_ip", ip, 30, "too-many-failed-passwords-from-ip");
    throw apiError(waitMessage({ lockedUntil }), 429);
  }
}

export async function clearFailedLogin(context, email, userId = "") {
  await ensureSecurityTables(context.env);
  const ip = clientIp(context.request);
  await context.env.DB.prepare(
    `DELETE FROM security_events
     WHERE (action = 'failed_login_email' AND identifier = ?)
        OR (action = 'failed_login_ip' AND identifier = ?)`
  ).bind(email, ip).run();

  await context.env.DB.prepare(
    `DELETE FROM account_lockouts
     WHERE (scope = 'login_email' AND identifier = ?)
        OR (scope = 'login_ip' AND identifier = ?)`
  ).bind(email, ip).run();

  await recordSecurityEvent(context, "successful_login", email, "login-success", userId);
}

export async function cleanupOldSecurityEvents(context) {
  await ensureSecurityTables(context.env);
  await context.env.DB.prepare(
    `DELETE FROM security_events WHERE created_at < datetime('now', '-2 days')`
  ).run();
}

export async function getCurrentUser(context) {
  const sessionId = getCookie(context.request);
  if (!sessionId) return null;

  return await context.env.DB.prepare(
    `SELECT users.id, users.email, users.name
     FROM sessions
     JOIN users ON users.id = sessions.user_id
     WHERE sessions.id = ? AND sessions.expires_at > datetime('now')`
  ).bind(sessionId).first();
}

export async function requireUser(context) {
  const user = await getCurrentUser(context);
  if (!user) return { user: null, response: json({ error: "Not logged in" }, 401) };
  return { user, response: null };
}

const VALID_VEHICLE_TYPES = new Set(["New", "Pre-Owned"]);
const VALID_STATUSES = new Set(["Pending Delivery", "Delivered", "Holding", "Issue / Needs Attention"]);

export function normalizeDeal(input = {}, userId) {
  const inputStatus = String(input.status || "").trim();
  const isDelivered = Boolean(input.delivered) || inputStatus === "Delivered";

  const saleDate = cleanDate(input.saleDate || input.sale_date || "", "Sale date");
  const deliveryDate = cleanDate(input.deliveryDate || input.delivery_date || "", "Delivery date");

  const stockNumber = cleanText(input.stockNumber || input.stock_number || input.stock || "", 40, "Stock number");
  const customerName = cleanText(input.customerName || input.customer_name || input.customer || "", 120, "Customer name", { required: true });
  const notes = cleanText(input.notes || "", 1000, "Notes");

  const vehicleType = String(input.vehicleType || input.vehicle_type || input.type || "New").trim();
  if (!VALID_VEHICLE_TYPES.has(vehicleType)) throw apiError("Invalid vehicle type.", 400);

  let status = inputStatus || (isDelivered ? "Delivered" : "Pending Delivery");
  if (!VALID_STATUSES.has(status)) throw apiError("Invalid deal status.", 400);
  if (isDelivered) status = "Delivered";

  return {
    id: cleanText(input.id || newId(), 80, "Deal ID"),
    user_id: userId,
    sale_date: saleDate,
    stock_number: stockNumber,
    vehicle_type: vehicleType,
    customer_name: customerName,
    insurance: input.insurance ? 1 : 0,
    gas: input.gas ? 1 : 0,
    registration: input.registration ? 1 : 0,
    inspection_sticker: input.inspectionSticker || input.inspection_sticker || input.inspection ? 1 : 0,
    detail: input.detail ? 1 : 0,
    delivered: isDelivered ? 1 : 0,
    paid: input.paid ? 1 : 0,
    delivery_date: deliveryDate,
    status,
    notes,
    updated_at: new Date().toISOString()
  };
}

export function dealRowToClient(row) {
  return {
    id: row.id,
    saleDate: row.sale_date || "",
    stockNumber: row.stock_number || "",
    vehicleType: row.vehicle_type || "New",
    customerName: row.customer_name || "",
    insurance: Boolean(row.insurance),
    gas: Boolean(row.gas),
    registration: Boolean(row.registration),
    inspectionSticker: Boolean(row.inspection_sticker),
    detail: Boolean(row.detail),
    delivered: Boolean(row.delivered),
    paid: Boolean(row.paid),
    deliveryDate: row.delivery_date || "",
    status: row.status || "Pending Delivery",
    notes: row.notes || "",
    createdAt: row.created_at || "",
    updatedAt: row.updated_at || ""
  };
}
