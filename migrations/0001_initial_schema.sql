-- 创建留言表
CREATE TABLE IF NOT EXISTS guestbook_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT,
  message TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now', 'localtime')) NOT NULL,
  updated_at TEXT DEFAULT (datetime('now', 'localtime')) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  ip_address TEXT,
  user_agent TEXT
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_guestbook_created_at ON guestbook_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_guestbook_status ON guestbook_entries(status);
