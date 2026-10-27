CREATE TABLE IF NOT EXISTS reply_audit (
  network TEXT NOT NULL CHECK (network IN ('threads','facebook')),
  comment_id TEXT NOT NULL,
  post_id TEXT NOT NULL,
  content TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('sending','published','needs_reconciliation')),
  remote_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY(network, comment_id)
);
CREATE INDEX IF NOT EXISTS reply_audit_latest ON reply_audit(created_at DESC);

CREATE TABLE IF NOT EXISTS post_audit (
  request_id TEXT NOT NULL PRIMARY KEY,
  network TEXT NOT NULL CHECK (network IN ('threads','facebook')),
  content TEXT NOT NULL,
  image_url TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL CHECK (state IN ('sending','published','needs_reconciliation')),
  remote_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS post_audit_latest ON post_audit(created_at DESC);