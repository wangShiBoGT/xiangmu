/**
 * 配额管理 - D1 数据库操作
 */

import type { Env, QuotaResponse } from '../types';

// ============================================================================
// 数据库初始化 SQL
// ============================================================================

export const INIT_SQL = `
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

CREATE INDEX IF NOT EXISTS idx_reset_at ON quotas(reset_at);
`;

// ============================================================================
// 配额操作
// ============================================================================

/**
 * 获取用户配额
 */
export async function getQuota(userId: string, env: Env): Promise<QuotaResponse['data']> {
  // 查询用户配额
  const result = await env.DB.prepare(
    'SELECT * FROM quotas WHERE user_id = ?'
  ).bind(userId).first<{
    user_id: string;
    daily_used: number;
    daily_limit: number;
    reset_at: string;
    total_cost: number;
    month_cost: number;
  }>();

  // 如果用户不存在，创建默认配额
  if (!result) {
    const resetAt = getNextResetTime();
    await env.DB.prepare(`
      INSERT INTO quotas (user_id, daily_used, daily_limit, reset_at, total_cost, month_cost)
      VALUES (?, 0, 100, ?, 0.0, 0.0)
    `).bind(userId, resetAt).run();

    return {
      userId,
      quota: {
        daily: {
          limit: 100,
          used: 0,
          remaining: 100,
          resetAt
        },
        cost: {
          total: 0.0,
          thisMonth: 0.0
        }
      }
    };
  }

  // 检查是否需要重置每日配额
  const now = new Date();
  const resetTime = new Date(result.reset_at);

  if (now >= resetTime) {
    // 重置每日配额
    const newResetAt = getNextResetTime();
    await env.DB.prepare(`
      UPDATE quotas
      SET daily_used = 0, reset_at = ?, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `).bind(newResetAt, userId).run();

    result.daily_used = 0;
    result.reset_at = newResetAt;
  }

  return {
    userId,
    quota: {
      daily: {
        limit: result.daily_limit,
        used: result.daily_used,
        remaining: result.daily_limit - result.daily_used,
        resetAt: result.reset_at
      },
      cost: {
        total: result.total_cost,
        thisMonth: result.month_cost
      }
    }
  };
}

/**
 * 消耗配额
 */
export async function consumeQuota(
  userId: string,
  cost: number,
  env: Env
): Promise<{ success: boolean; remaining: number }> {
  // 获取当前配额
  const quota = await getQuota(userId, env);

  // 检查是否超出配额
  if (quota.quota.daily.remaining <= 0) {
    return {
      success: false,
      remaining: 0
    };
  }

  // 更新配额
  await env.DB.prepare(`
    UPDATE quotas
    SET
      daily_used = daily_used + 1,
      total_cost = total_cost + ?,
      month_cost = month_cost + ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ?
  `).bind(cost, cost, userId).run();

  return {
    success: true,
    remaining: quota.quota.daily.remaining - 1
  };
}

/**
 * 重置月度成本（每月 1 号运行）
 */
export async function resetMonthlyCost(env: Env): Promise<void> {
  await env.DB.prepare(`
    UPDATE quotas
    SET month_cost = 0.0, updated_at = CURRENT_TIMESTAMP
  `).run();
}

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 获取下次重置时间（明天 00:00 UTC）
 */
function getNextResetTime(): string {
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  return tomorrow.toISOString();
}
