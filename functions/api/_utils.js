const COOKIE_NAME = "mdt_session";
const SESSION_DAYS = 30;

export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...extraHeaders
    }
  });
}

export async function readJson(request) {
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

export function normalizeDeal(input = {}, userId) {
  const isDelivered = Boolean(input.delivered) || input.status === "Delivered";

  return {
    id: input.id || newId(),
    user_id: userId,
    sale_date: input.saleDate || input.sale_date || "",
    stock_number: input.stockNumber || input.stock_number || input.stock || "",
    vehicle_type: input.vehicleType || input.vehicle_type || input.type || "New",
    customer_name: input.customerName || input.customer_name || input.customer || "",
    insurance: input.insurance ? 1 : 0,
    gas: input.gas ? 1 : 0,
    registration: input.registration ? 1 : 0,
    inspection_sticker: input.inspectionSticker || input.inspection_sticker || input.inspection ? 1 : 0,
    detail: input.detail ? 1 : 0,
    delivered: isDelivered ? 1 : 0,
    paid: input.paid ? 1 : 0,
    delivery_date: input.deliveryDate || input.delivery_date || "",
    status: input.status || (isDelivered ? "Delivered" : "Pending Delivery"),
    notes: input.notes || "",
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
