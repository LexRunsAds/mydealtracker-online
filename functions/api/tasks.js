import {
  json,
  readJson,
  requireUser,
  withErrorHandling,
  apiError,
  applyRateLimit,
  cleanDate,
  cleanText,
  newId,
  recordAnalyticsEvent
} from "./_utils.js";

async function ensureTasksTable(env) {
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS daily_tasks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      task_date TEXT NOT NULL,
      task_text TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      position INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`
  ).run();

  await env.DB.prepare(
    `CREATE INDEX IF NOT EXISTS idx_daily_tasks_user_date
     ON daily_tasks (user_id, task_date, position, created_at)`
  ).run();
}

function rowToClient(row) {
  return {
    id: row.id,
    taskDate: row.task_date,
    text: row.task_text,
    completed: Boolean(row.completed),
    position: Number(row.position || 0),
    createdAt: row.created_at || "",
    updatedAt: row.updated_at || ""
  };
}

export async function onRequestGet(context) {
  return withErrorHandling(context, async () => {
    const { user, response } = await requireUser(context);
    if (response) return response;
    await ensureTasksTable(context.env);

    const url = new URL(context.request.url);
    const date = cleanDate(url.searchParams.get("date") || "", "Task date");
    if (!date) throw apiError("Task date is required.", 400);

    const result = await context.env.DB.prepare(
      `SELECT * FROM daily_tasks
       WHERE user_id = ? AND task_date = ?
       ORDER BY completed ASC, position ASC, created_at ASC`
    ).bind(user.id, date).all();

    return json({ tasks: (result.results || []).map(rowToClient) });
  });
}

export async function onRequestPost(context) {
  return withErrorHandling(context, async () => {
    const { user, response } = await requireUser(context);
    if (response) return response;
    await ensureTasksTable(context.env);

    await applyRateLimit(context, {
      action: "task_write_user",
      identifier: user.id,
      max: 120,
      windowMinutes: 15,
      message: "Too many task updates. Please wait and try again.",
      userId: user.id
    });

    const body = await readJson(context.request, 10000);
    const taskDate = cleanDate(body.taskDate || body.task_date || "", "Task date");
    const taskText = cleanText(body.text || body.taskText || body.task_text || "", 240, "Task", { required: true });
    const id = cleanText(body.id || newId(), 80, "Task ID");

    const maxRow = await context.env.DB.prepare(
      `SELECT COALESCE(MAX(position), -1) AS max_position
       FROM daily_tasks WHERE user_id = ? AND task_date = ?`
    ).bind(user.id, taskDate).first();
    const position = Number(maxRow?.max_position ?? -1) + 1;

    await context.env.DB.prepare(
      `INSERT INTO daily_tasks (id, user_id, task_date, task_text, completed, position, updated_at)
       VALUES (?, ?, ?, ?, 0, ?, ?)`
    ).bind(id, user.id, taskDate, taskText, position, new Date().toISOString()).run();

    await recordAnalyticsEvent(context, "task_created", user.id, id);
    return json({ ok: true, task: { id, taskDate, text: taskText, completed: false, position } });
  });
}

export async function onRequestPut(context) {
  return withErrorHandling(context, async () => {
    const { user, response } = await requireUser(context);
    if (response) return response;
    await ensureTasksTable(context.env);

    await applyRateLimit(context, {
      action: "task_write_user",
      identifier: user.id,
      max: 120,
      windowMinutes: 15,
      message: "Too many task updates. Please wait and try again.",
      userId: user.id
    });

    const body = await readJson(context.request, 10000);
    const id = cleanText(body.id || "", 80, "Task ID", { required: true });
    const existing = await context.env.DB.prepare(
      `SELECT * FROM daily_tasks WHERE id = ? AND user_id = ?`
    ).bind(id, user.id).first();
    if (!existing) throw apiError("Task not found.", 404);

    const taskText = body.text !== undefined
      ? cleanText(body.text, 240, "Task", { required: true })
      : existing.task_text;
    const completed = body.completed !== undefined ? (body.completed ? 1 : 0) : Number(existing.completed || 0);

    await context.env.DB.prepare(
      `UPDATE daily_tasks SET task_text = ?, completed = ?, updated_at = ?
       WHERE id = ? AND user_id = ?`
    ).bind(taskText, completed, new Date().toISOString(), id, user.id).run();

    if (Number(existing.completed || 0) !== completed) {
      await recordAnalyticsEvent(context, completed ? "task_completed" : "task_reopened", user.id, id);
    }
    return json({ ok: true });
  });
}

export async function onRequestDelete(context) {
  return withErrorHandling(context, async () => {
    const { user, response } = await requireUser(context);
    if (response) return response;
    await ensureTasksTable(context.env);

    await applyRateLimit(context, {
      action: "task_delete_user",
      identifier: user.id,
      max: 60,
      windowMinutes: 15,
      message: "Too many task deletes. Please wait and try again.",
      userId: user.id
    });

    const url = new URL(context.request.url);
    const id = cleanText(url.searchParams.get("id") || "", 80, "Task ID", { required: true });
    await context.env.DB.prepare("DELETE FROM daily_tasks WHERE id = ? AND user_id = ?").bind(id, user.id).run();
    await recordAnalyticsEvent(context, "task_deleted", user.id, id);
    return json({ ok: true });
  });
}
