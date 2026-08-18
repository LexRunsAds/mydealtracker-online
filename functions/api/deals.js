import { json, readJson, requireUser, normalizeDeal, dealRowToClient } from "./_utils.js";

export async function onRequestGet(context) {
  const { user, response } = await requireUser(context);
  if (response) return response;

  const result = await context.env.DB.prepare(
    "SELECT * FROM deals WHERE user_id = ? ORDER BY sale_date DESC, created_at DESC"
  ).bind(user.id).all();

  return json({ deals: (result.results || []).map(dealRowToClient) });
}

export async function onRequestPost(context) {
  const { user, response } = await requireUser(context);
  if (response) return response;

  const body = await readJson(context.request);
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
}

export async function onRequestPut(context) {
  const { user, response } = await requireUser(context);
  if (response) return response;

  const body = await readJson(context.request);
  if (!body.id) return json({ error: "Missing deal ID." }, 400);

  const deal = normalizeDeal(body, user.id);

  await context.env.DB.prepare(
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
}

export async function onRequestDelete(context) {
  const { user, response } = await requireUser(context);
  if (response) return response;

  const url = new URL(context.request.url);
  const id = url.searchParams.get("id");
  if (!id) return json({ error: "Missing deal ID." }, 400);

  await context.env.DB.prepare("DELETE FROM deals WHERE id = ? AND user_id = ?").bind(id, user.id).run();
  return json({ ok: true });
}
