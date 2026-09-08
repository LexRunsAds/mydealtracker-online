CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  password_hash TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS deals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  sale_date TEXT,
  stock_number TEXT,
  vehicle_type TEXT DEFAULT 'New',
  customer_name TEXT,
  insurance INTEGER DEFAULT 0,
  gas INTEGER DEFAULT 0,
  registration INTEGER DEFAULT 0,
  inspection_sticker INTEGER DEFAULT 0,
  detail INTEGER DEFAULT 0,
  delivered INTEGER DEFAULT 0,
  paid INTEGER DEFAULT 0,
  delivery_date TEXT,
  status TEXT DEFAULT 'Pending Delivery',
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS user_settings (
  user_id TEXT PRIMARY KEY,
  monthly_goal INTEGER DEFAULT 15,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);


CREATE TABLE IF NOT EXISTS security_events (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  identifier TEXT NOT NULL,
  ip TEXT,
  user_id TEXT,
  details TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_security_events_action_identifier_created
ON security_events (action, identifier, created_at);

CREATE TABLE IF NOT EXISTS account_lockouts (
  scope TEXT NOT NULL,
  identifier TEXT NOT NULL,
  locked_until TEXT NOT NULL,
  reason TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT,
  PRIMARY KEY (scope, identifier)
);


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
