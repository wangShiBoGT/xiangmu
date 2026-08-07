#!/bin/bash

# 后端快速部署脚本
# 用法：cd backend && ./deploy.sh

set -e

echo "🚀 开始部署 WebGPU LLM Chat 后端"
echo ""

# 检查 wrangler 是否安装
if ! command -v wrangler &> /dev/null; then
    echo "❌ 错误：wrangler 未安装"
    echo "请运行：npm install -g wrangler"
    exit 1
fi

# 检查是否已登录
if ! wrangler whoami &> /dev/null; then
    echo "❌ 错误：未登录 Cloudflare"
    echo "请运行：wrangler login"
    exit 1
fi

echo "✅ wrangler 已安装并已登录"
echo ""

# 1. 安装依赖
echo "📦 安装依赖..."
npm install
echo "✅ 依赖安装完成"
echo ""

# 2. 创建 KV 命名空间（如果不存在）
echo "🗄️ 创建 KV 命名空间..."
KV_OUTPUT=$(wrangler kv:namespace create "CACHE" 2>&1 || true)
echo "$KV_OUTPUT"

if echo "$KV_OUTPUT" | grep -q "id ="; then
    KV_ID=$(echo "$KV_OUTPUT" | grep "id =" | sed 's/.*id = "\(.*\)".*/\1/')
    echo "✅ KV 命名空间已创建，ID: $KV_ID"
    echo ""
    echo "⚠️  请手动更新 wrangler.toml 中的 kv_namespaces.id"
else
    echo "ℹ️  KV 命名空间可能已存在"
fi
echo ""

# 3. 创建 D1 数据库（如果不存在）
echo "💾 创建 D1 数据库..."
D1_OUTPUT=$(wrangler d1 create llm-chat-quota 2>&1 || true)
echo "$D1_OUTPUT"

if echo "$D1_OUTPUT" | grep -q "database_id ="; then
    D1_ID=$(echo "$D1_OUTPUT" | grep "database_id =" | sed 's/.*database_id = "\(.*\)".*/\1/')
    echo "✅ D1 数据库已创建，ID: $D1_ID"
    echo ""
    echo "⚠️  请手动更新 wrangler.toml 中的 d1_databases.database_id"
else
    echo "ℹ️  D1 数据库可能已存在"
fi
echo ""

# 4. 初始化数据库表
echo "🗃️ 初始化数据库表..."
if [ -f "schema.sql" ]; then
    wrangler d1 execute llm-chat-quota --file=./schema.sql
    echo "✅ 数据库表初始化完成"
else
    echo "⚠️  schema.sql 未找到，跳过数据库初始化"
fi
echo ""

# 5. 检查环境变量
echo "🔐 检查环境变量..."
if grep -q "your-encryption-secret-change-this" wrangler.toml; then
    echo "⚠️  警告：ENCRYPTION_SECRET 未修改"
    echo "请运行：node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    echo "并更新 wrangler.toml 中的 ENCRYPTION_SECRET"
    echo ""
fi

if grep -q "your-hmac-secret-change-this" wrangler.toml; then
    echo "⚠️  警告：HMAC_SECRET 未修改"
    echo "请运行：node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    echo "并更新 wrangler.toml 中的 HMAC_SECRET"
    echo ""
fi

# 6. 部署
echo "🚀 部署到 Cloudflare Workers..."
wrangler deploy

echo ""
echo "✅ 部署完成！"
echo ""
echo "📋 下一步："
echo "1. 复制部署 URL"
echo "2. 更新前端 .env.production 中的 VITE_API_BASE_URL"
echo "3. 测试健康检查：curl <your-url>/health"
echo ""
echo "📚 文档："
echo "- API 文档：backend/README.md"
echo "- 部署指南：backend/DEPLOYMENT.md"
echo "- 对接清单：docs/INTEGRATION_CHECKLIST.md"
