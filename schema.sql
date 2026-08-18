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
