-- D1 数据库初始化 SQL

-- 用户配额表
CREATE TABLE IF NOT EXISTS quotas (
  user_id TEXT PRIMARY KEY,
  daily_used INTEGER DEFAULT 0,
  daily_limit INTEGER DEFAULT 100,
  reset_at TEXT NOT NULL,
  total_cost REAL DEFAULT 0.0,
  month_cost REAL DEFAULT 0.0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_reset_at ON quotas(reset_at);
CREATE INDEX IF NOT EXISTS idx_updated_at ON quotas(updated_at);

-- 插入测试数据（可选）
INSERT OR IGNORE INTO quotas (user_id, daily_used, daily_limit, reset_at, total_cost, month_cost)
VALUES ('test-user', 0, 100, datetime('now', '+1 day'), 0.0, 0.0);
