import { json, readJson, requireUser, normalizeDeal } from "./_utils.js";

export async function onRequestPost(context) {
  const { user, response } = await requireUser(context);
  if (response) return response;

  const body = await readJson(context.request);
  const incoming = body.data || body;
  const deals = Array.isArray(incoming.deals) ? incoming.deals : [];

  if (!deals.length) return json({ error: "No deals found in this backup." }, 400);

  let imported = 0;

  for (const item of deals) {
    const deal = normalizeDeal(item, user.id);

    await context.env.DB.prepare(
      `INSERT INTO deals (
        id, user_id, sale_date, stock_number, vehicle_type, customer_name,
        insurance, gas, registration, inspection_sticker, detail, delivered, paid,
        delivery_date, status, notes, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        sale_date = excluded.sale_date,
        stock_number = excluded.stock_number,
        vehicle_type = excluded.vehicle_type,
        customer_name = excluded.customer_name,
        insurance = excluded.insurance,
        gas = excluded.gas,
        registration = excluded.registration,
        inspection_sticker = excluded.inspection_sticker,
        detail = excluded.detail,
        delivered = excluded.delivered,
        paid = excluded.paid,
        delivery_date = excluded.delivery_date,
        status = excluded.status,
        notes = excluded.notes,
        updated_at = excluded.updated_at`
    ).bind(
      deal.id, deal.user_id, deal.sale_date, deal.stock_number, deal.vehicle_type, deal.customer_name,
      deal.insurance, deal.gas, deal.registration, deal.inspection_sticker, deal.detail, deal.delivered, deal.paid,
      deal.delivery_date, deal.status, deal.notes, deal.updated_at
    ).run();

    imported++;
  }

  if (incoming.goal || incoming.monthlyGoal) {
    const goal = Math.max(Number(incoming.goal || incoming.monthlyGoal) || 15, 1);
    await context.env.DB.prepare(
      `INSERT INTO user_settings (user_id, monthly_goal, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET monthly_goal = excluded.monthly_goal, updated_at = excluded.updated_at`
    ).bind(user.id, goal, new Date().toISOString()).run();
  }

  return json({ imported });
}
