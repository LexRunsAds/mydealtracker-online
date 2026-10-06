-- ezDealTrack v2 Daily Command Center
-- ADDITIVE ONLY. Existing tables and data are not altered.

CREATE TABLE IF NOT EXISTS daily_tasks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  task_date TEXT NOT NULL,
  task_text TEXT NOT NULL,
  completed INTEGER DEFAULT 0,
  position INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_daily_tasks_user_date
ON daily_tasks (user_id, task_date, position, created_at);
