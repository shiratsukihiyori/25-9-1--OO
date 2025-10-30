-- 创建留言表（包含管理员回复列）
CREATE TABLE IF NOT EXISTS guestbook_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT,
  message TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'global',
  created_at TEXT DEFAULT (datetime('now', 'localtime')) NOT NULL,
  parent_id INTEGER,
  is_admin_reply BOOLEAN DEFAULT FALSE,
  admin_reply TEXT,
  admin_reply_at TEXT,
  updated_at TEXT DEFAULT (datetime('now', 'localtime')) NOT NULL,
  status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
  FOREIGN KEY (parent_id) REFERENCES guestbook_messages(id) ON DELETE CASCADE
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_guestbook_messages_created_at ON guestbook_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_guestbook_messages_parent_id ON guestbook_messages(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_guestbook_messages_status ON guestbook_messages(status);

-- 创建更新时间触发器
CREATE TRIGGER IF NOT EXISTS set_guestbook_messages_updated_at
AFTER UPDATE ON guestbook_messages
BEGIN
  UPDATE guestbook_messages 
  SET updated_at = datetime('now', 'localtime') 
  WHERE id = NEW.id;
END;
