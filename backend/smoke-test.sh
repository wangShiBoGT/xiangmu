#!/bin/bash

# 自动化测试脚本 - 后端冒烟测试
# 用法：./smoke-test.sh <backend-url>

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查参数
if [ -z "$1" ]; then
    echo -e "${RED}错误：请提供后端 URL${NC}"
    echo "用法：./smoke-test.sh https://your-backend-url.workers.dev"
    exit 1
fi

BACKEND_URL=$1
PASS_COUNT=0
FAIL_COUNT=0
TOTAL_TESTS=5

echo "================================"
echo "🔥 后端冒烟测试"
echo "================================"
echo "后端 URL: $BACKEND_URL"
echo ""

# 测试 1：健康检查
echo "测试 1/5: 健康检查"
RESPONSE=$(curl -s -w "\n%{http_code}" $BACKEND_URL/health)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
    if echo "$BODY" | grep -q '"status":"ok"'; then
        echo -e "${GREEN}✅ PASS${NC} - 健康检查正常"
        PASS_COUNT=$((PASS_COUNT + 1))
    else
        echo -e "${RED}❌ FAIL${NC} - 响应格式错误: $BODY"
        FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
else
    echo -e "${RED}❌ FAIL${NC} - HTTP 状态码: $HTTP_CODE"
    FAIL_COUNT=$((FAIL_COUNT + 1))
fi
echo ""

# 测试 2：配额查询
echo "测试 2/5: 配额查询"
RESPONSE=$(curl -s -w "\n%{http_code}" $BACKEND_URL/api/quota)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
    if echo "$BODY" | grep -q '"success":true'; then
        if echo "$BODY" | grep -q '"daily"'; then
            echo -e "${GREEN}✅ PASS${NC} - 配额查询正常"
            PASS_COUNT=$((PASS_COUNT + 1))
        else
            echo -e "${RED}❌ FAIL${NC} - 缺少 daily 字段"
            FAIL_COUNT=$((FAIL_COUNT + 1))
        fi
    else
        echo -e "${RED}❌ FAIL${NC} - success 字段不为 true"
        FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
else
    echo -e "${RED}❌ FAIL${NC} - HTTP 状态码: $HTTP_CODE"
    FAIL_COUNT=$((FAIL_COUNT + 1))
fi
echo ""

# 测试 3：HMAC 签名验证（应该失败）
echo "测试 3/5: HMAC 签名验证"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST $BACKEND_URL/api/audit \
    -H "Content-Type: application/json" \
    -d '{"traces":[]}')
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 403 ] || [ "$HTTP_CODE" -eq 400 ]; then
    if echo "$BODY" | grep -q '"code":"INVALID_SIGNATURE"'; then
        echo -e "${GREEN}✅ PASS${NC} - 签名验证正常工作（拒绝无签名请求）"
        PASS_COUNT=$((PASS_COUNT + 1))
    else
        echo -e "${YELLOW}⚠️  WARN${NC} - 返回了错误但不是 INVALID_SIGNATURE"
        PASS_COUNT=$((PASS_COUNT + 1))
    fi
else
    echo -e "${RED}❌ FAIL${NC} - 应该返回 403，实际: $HTTP_CODE"
    FAIL_COUNT=$((FAIL_COUNT + 1))
fi
echo ""

# 测试 4：响应时间
echo "测试 4/5: 响应时间"
START_TIME=$(date +%s%3N)
curl -s $BACKEND_URL/health > /dev/null
END_TIME=$(date +%s%3N)
RESPONSE_TIME=$((END_TIME - START_TIME))

if [ "$RESPONSE_TIME" -lt 2000 ]; then
    echo -e "${GREEN}✅ PASS${NC} - 响应时间: ${RESPONSE_TIME}ms (< 2000ms)"
    PASS_COUNT=$((PASS_COUNT + 1))
else
    echo -e "${RED}❌ FAIL${NC} - 响应时间: ${RESPONSE_TIME}ms (>= 2000ms)"
    FAIL_COUNT=$((FAIL_COUNT + 1))
fi
echo ""

# 测试 5：连续可用性
echo "测试 5/5: 连续可用性（5 次请求）"
CONSECUTIVE_PASS=0
for i in {1..5}; do
    RESPONSE=$(curl -s -w "\n%{http_code}" $BACKEND_URL/health)
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

    if [ "$HTTP_CODE" -eq 200 ]; then
        CONSECUTIVE_PASS=$((CONSECUTIVE_PASS + 1))
    fi
    sleep 0.5
done

if [ "$CONSECUTIVE_PASS" -eq 5 ]; then
    echo -e "${GREEN}✅ PASS${NC} - 5/5 请求成功"
    PASS_COUNT=$((PASS_COUNT + 1))
else
    echo -e "${RED}❌ FAIL${NC} - 仅 $CONSECUTIVE_PASS/5 请求成功"
    FAIL_COUNT=$((FAIL_COUNT + 1))
fi
echo ""

# 汇总
echo "================================"
echo "📊 测试结果汇总"
echo "================================"
echo -e "通过: ${GREEN}$PASS_COUNT${NC} / $TOTAL_TESTS"
echo -e "失败: ${RED}$FAIL_COUNT${NC} / $TOTAL_TESTS"
echo ""

if [ "$FAIL_COUNT" -eq 0 ]; then
    echo -e "${GREEN}🎉 所有测试通过！后端工作正常。${NC}"
    exit 0
else
    echo -e "${RED}❌ 有 $FAIL_COUNT 个测试失败。请检查后端配置。${NC}"
    exit 1
fi
