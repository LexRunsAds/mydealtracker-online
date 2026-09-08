-- ezDealTrack Admin Analytics v1
-- ADDITIVE ONLY: does not alter or delete existing users, deals, sessions, settings, or security data.

CREATE TABLE IF NOT EXISTS analytics_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  user_id TEXT,
  details TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_type_created
ON analytics_events (event_type, created_at);

CREATE INDEX IF NOT EXISTS idx_analytics_events_user_created
ON analytics_events (user_id, created_at);

CREATE TABLE IF NOT EXISTS page_views (
  id TEXT PRIMARY KEY,
  visitor_id TEXT NOT NULL,
  user_id TEXT,
  path TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_page_views_created
ON page_views (created_at);

CREATE INDEX IF NOT EXISTS idx_page_views_visitor_created
ON page_views (visitor_id, created_at);

CREATE INDEX IF NOT EXISTS idx_page_views_path_created
ON page_views (path, created_at);
