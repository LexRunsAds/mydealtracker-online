import {
  json,
  readJson,
  requireUser,
  normalizeDeal,
  dealRowToClient,
  withErrorHandling,
  apiError,
  applyRateLimit,
  clientIp
} from "./_utils.js";

export async function onRequestGet(context) {
  return withErrorHandling(context, async () => {
    const { user, response } = await requireUser(context);
    if (response) return response;

    const result = await context.env.DB.prepare(
      "SELECT * FROM deals WHERE user_id = ? ORDER BY sale_date DESC, created_at DESC"
    ).bind(user.id).all();

    return json({ deals: (result.results || []).map(dealRowToClient) });
  });
}

export async function onRequestPost(context) {
  return withErrorHandling(context, async () => {
    const { user, response } = await requireUser(context);
    if (response) return response;

    await applyRateLimit(context, {
      action: "deal_write_user",
      identifier: user.id,
      max: 120,
      windowMinutes: 15,
      message: "Too many deal updates. Please wait and try again.",
      userId: user.id
    });

    await applyRateLimit(context, {
      action: "deal_write_ip",
      identifier: clientIp(context.request),
      max: 200,
      windowMinutes: 15,
      message: "Too many deal updates. Please wait and try again.",
      userId: user.id
    });

    const body = await readJson(context.request, 25000);
    const deal = normalizeDeal(body, user.id);

    await context.env.DB.prepare(
      `INSERT INTO deals (
        id, user_id, sale_date, stock_number, vehicle_type, customer_name,
        insurance, gas, registration, inspection_sticker, detail, delivered, paid,
        delivery_date, status, notes, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      deal.id, deal.user_id, deal.sale_date, deal.stock_number, deal.vehicle_type, deal.customer_name,
      deal.insurance, deal.gas, deal.registration, deal.inspection_sticker, deal.detail, deal.delivered, deal.paid,
      deal.delivery_date, deal.status, deal.notes, deal.updated_at
    ).run();

    return json({ ok: true, deal });
  });
}

export async function onRequestPut(context) {
  return withErrorHandling(context, async () => {
    const { user, response } = await requireUser(context);
    if (response) return response;

    await applyRateLimit(context, {
      action: "deal_write_user",
      identifier: user.id,
      max: 120,
      windowMinutes: 15,
      message: "Too many deal updates. Please wait and try again.",
      userId: user.id
    });

    const body = await readJson(context.request, 25000);
    if (!body.id) return json({ error: "Missing deal ID." }, 400);

    const deal = normalizeDeal(body, user.id);

    const result = await context.env.DB.prepare(
      `UPDATE deals
       SET sale_date = ?, stock_number = ?, vehicle_type = ?, customer_name = ?,
           insurance = ?, gas = ?, registration = ?, inspection_sticker = ?, detail = ?,
           delivered = ?, paid = ?, delivery_date = ?, status = ?, notes = ?, updated_at = ?
       WHERE id = ? AND user_id = ?`
    ).bind(
      deal.sale_date, deal.stock_number, deal.vehicle_type, deal.customer_name,
      deal.insurance, deal.gas, deal.registration, deal.inspection_sticker, deal.detail,
      deal.delivered, deal.paid, deal.delivery_date, deal.status, deal.notes, deal.updated_at,
      deal.id, user.id
    ).run();

    return json({ ok: true });
  });
}

export async function onRequestDelete(context) {
  return withErrorHandling(context, async () => {
    const { user, response } = await requireUser(context);
    if (response) return response;

    await applyRateLimit(context, {
      action: "deal_delete_user",
      identifier: user.id,
      max: 60,
      windowMinutes: 15,
      message: "Too many delete attempts. Please wait and try again.",
      userId: user.id
    });

    const url = new URL(context.request.url);
    const id = String(url.searchParams.get("id") || "").trim();
    if (!id || id.length > 80) return json({ error: "Missing deal ID." }, 400);

    await context.env.DB.prepare("DELETE FROM deals WHERE id = ? AND user_id = ?").bind(id, user.id).run();
    return json({ ok: true });
  });
}
