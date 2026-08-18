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
