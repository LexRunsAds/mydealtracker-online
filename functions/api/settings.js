import { json, readJson, requireUser, withErrorHandling, applyRateLimit, apiError } from "./_utils.js";

export async function onRequestGet(context) {
  return withErrorHandling(context, async () => {
    const { user, response } = await requireUser(context);
    if (response) return response;

    let settings = await context.env.DB.prepare(
      "SELECT monthly_goal FROM user_settings WHERE user_id = ?"
    ).bind(user.id).first();

    if (!settings) {
      await context.env.DB.prepare("INSERT INTO user_settings (user_id, monthly_goal) VALUES (?, ?)").bind(user.id, 15).run();
      settings = { monthly_goal: 15 };
    }

    return json({ monthlyGoal: Number(settings.monthly_goal) || 15 });
  });
}

export async function onRequestPut(context) {
  return withErrorHandling(context, async () => {
    const { user, response } = await requireUser(context);
    if (response) return response;

    await applyRateLimit(context, {
      action: "settings_update_user",
      identifier: user.id,
      max: 30,
      windowMinutes: 15,
      message: "Too many settings updates. Please wait and try again.",
      userId: user.id
    });

    const body = await readJson(context.request, 10000);
    const monthlyGoal = Math.max(Number(body.monthlyGoal) || 1, 1);
    if (monthlyGoal > 100) throw apiError("Monthly goal must be 100 or less.", 400);

    await context.env.DB.prepare(
      `INSERT INTO user_settings (user_id, monthly_goal, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET monthly_goal = excluded.monthly_goal, updated_at = excluded.updated_at`
    ).bind(user.id, monthlyGoal, new Date().toISOString()).run();

    return json({ monthlyGoal });
  });
}
