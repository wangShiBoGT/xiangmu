#!/bin/bash

# 自动化部署脚本 - Wrangler 4.x 版本
# 用法：./deploy-v4.sh

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "================================"
echo "🚀 开始部署 WebGPU LLM Chat 后端"
echo "================================"
echo ""

# 检查 wrangler
if ! command -v wrangler &> /dev/null; then
    echo -e "${RED}❌ 错误：wrangler 未安装${NC}"
    echo "请运行：npm install -g wrangler"
    exit 1
fi

echo -e "${GREEN}✅ wrangler 已安装${NC}"
echo ""

# 检查登录状态
echo "🔐 检查登录状态..."
if ! wrangler whoami &> /dev/null; then
    echo -e "${YELLOW}⚠️  未登录，请先运行：${NC}"
    echo "wrangler login"
    echo ""
    echo "然后重新运行此脚本"
    exit 1
fi

echo -e "${GREEN}✅ 已登录 Cloudflare${NC}"
echo ""

# 安装依赖
echo "📦 安装依赖..."
npm install
echo -e "${GREEN}✅ 依赖安装完成${NC}"
echo ""

# 创建 KV 命名空间
echo "🗄️ 创建 KV 命名空间..."
KV_OUTPUT=$(wrangler kv namespace create "CACHE" 2>&1 || echo "exists")

if echo "$KV_OUTPUT" | grep -q "id"; then
    KV_ID=$(echo "$KV_OUTPUT" | grep -oP 'id = "\K[^"]+')
    echo -e "${GREEN}✅ KV 命名空间已创建：$KV_ID${NC}"
    echo ""
    echo -e "${YELLOW}请手动更新 wrangler.toml 中的 KV ID：${NC}"
    echo "[[kv_namespaces]]"
    echo "binding = \"CACHE\""
    echo "id = \"$KV_ID\""
    echo ""
else
    echo -e "${BLUE}ℹ️  KV 命名空间可能已存在${NC}"
fi
echo ""

# 创建 KV 预览命名空间
echo "🗄️ 创建 KV 预览命名空间..."
KV_PREVIEW_OUTPUT=$(wrangler kv namespace create "CACHE" --preview 2>&1 || echo "exists")

if echo "$KV_PREVIEW_OUTPUT" | grep -q "id"; then
    KV_PREVIEW_ID=$(echo "$KV_PREVIEW_OUTPUT" | grep -oP 'id = "\K[^"]+')
    echo -e "${GREEN}✅ KV 预览命名空间已创建：$KV_PREVIEW_ID${NC}"
    echo ""
    echo -e "${YELLOW}请手动更新 wrangler.toml 中的预览 ID：${NC}"
    echo "preview_id = \"$KV_PREVIEW_ID\""
    echo ""
else
    echo -e "${BLUE}ℹ️  KV 预览命名空间可能已存在${NC}"
fi
echo ""

# 创建 D1 数据库
echo "💾 创建 D1 数据库..."
D1_OUTPUT=$(wrangler d1 create llm-chat-quota 2>&1 || echo "exists")

if echo "$D1_OUTPUT" | grep -q "database_id"; then
    D1_ID=$(echo "$D1_OUTPUT" | grep -oP 'database_id = "\K[^"]+')
    echo -e "${GREEN}✅ D1 数据库已创建：$D1_ID${NC}"
    echo ""
    echo -e "${YELLOW}请手动更新 wrangler.toml 中的 D1 ID：${NC}"
    echo "[[d1_databases]]"
    echo "binding = \"DB\""
    echo "database_name = \"llm-chat-quota\""
    echo "database_id = \"$D1_ID\""
    echo ""
else
    echo -e "${BLUE}ℹ️  D1 数据库可能已存在${NC}"
fi
echo ""

# 初始化数据库表（远程）
echo "🗃️ 初始化数据库表（远程）..."
if wrangler d1 execute llm-chat-quota --file=./schema.sql --remote 2>&1; then
    echo -e "${GREEN}✅ 数据库表初始化完成（远程）${NC}"
else
    echo -e "${BLUE}ℹ️  数据库表可能已存在${NC}"
fi
echo ""

# 检查环境变量
echo "🔐 检查环境变量..."
if grep -q "your-encryption-secret-change-this" wrangler.toml; then
    echo -e "${RED}⚠️  警告：ENCRYPTION_SECRET 未修改${NC}"
    echo "已自动生成新密钥"
else
    echo -e "${GREEN}✅ ENCRYPTION_SECRET 已配置${NC}"
fi

if grep -q "your-hmac-secret-change-this" wrangler.toml; then
    echo -e "${RED}⚠️  警告：HMAC_SECRET 未修改${NC}"
    echo "已自动生成新密钥"
else
    echo -e "${GREEN}✅ HMAC_SECRET 已配置${NC}"
fi
echo ""

# 检查 wrangler.toml 配置
echo "📝 检查 wrangler.toml 配置..."
if grep -q "your-kv-namespace-id" wrangler.toml || grep -q "your-d1-database-id" wrangler.toml; then
    echo -e "${YELLOW}⚠️  警告：wrangler.toml 中仍有占位符${NC}"
    echo ""
    echo "请按照上面的提示更新："
    echo "  - KV namespace ID"
    echo "  - KV preview ID"
    echo "  - D1 database ID"
    echo ""
    echo "然后运行："
    echo "  wrangler deploy"
    echo ""
    exit 0
fi

# 部署到 Cloudflare Workers
echo "🚀 部署到 Cloudflare Workers..."
wrangler deploy

echo ""
echo "================================"
echo -e "${GREEN}🎉 部署完成！${NC}"
echo "================================"
echo ""
echo "后端 URL 已显示在上方输出中"
echo ""
echo "下一步："
echo "1. 记录后端 URL"
echo "2. 运行冒烟测试：./smoke-test.sh https://your-url.workers.dev"
echo "3. 配置前端环境变量"
echo ""
