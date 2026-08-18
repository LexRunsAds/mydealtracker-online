import {
  json,
  readJson,
  requireUser,
  normalizeDeal,
  withErrorHandling,
  apiError,
  applyRateLimit,
  clientIp
} from "./_utils.js";

const MAX_IMPORT_DEALS = 500;

export async function onRequestPost(context) {
  return withErrorHandling(context, async () => {
    const { user, response } = await requireUser(context);
    if (response) return response;

    await applyRateLimit(context, {
      action: "import_user",
      identifier: user.id,
      max: 5,
      windowMinutes: 15,
      message: "Too many import attempts. Please wait and try again.",
      userId: user.id
    });

    await applyRateLimit(context, {
      action: "import_ip",
      identifier: clientIp(context.request),
      max: 10,
      windowMinutes: 15,
      message: "Too many import attempts. Please wait and try again.",
      userId: user.id
    });

    const body = await readJson(context.request, 250000);
    const incoming = body.data || body;
    const deals = Array.isArray(incoming.deals) ? incoming.deals : [];

    if (!deals.length) return json({ error: "No deals found in this backup." }, 400);
    if (deals.length > MAX_IMPORT_DEALS) {
      throw apiError(`This backup has too many deals. Maximum import is ${MAX_IMPORT_DEALS} deals at a time.`, 413);
    }

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
      const safeGoal = Math.min(goal, 100);
      await context.env.DB.prepare(
        `INSERT INTO user_settings (user_id, monthly_goal, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET monthly_goal = excluded.monthly_goal, updated_at = excluded.updated_at`
      ).bind(user.id, safeGoal, new Date().toISOString()).run();
    }

    return json({ imported });
  });
}
