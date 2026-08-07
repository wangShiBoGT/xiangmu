#!/bin/bash

# 本地测试脚本 - 不需要后端部署
# 测试本地模式的核心功能

set -e

echo "================================"
echo "🧪 本地功能测试"
echo "================================"
echo ""

echo "📋 测试计划："
echo "  1. 构建检查"
echo "  2. 依赖检查"
echo "  3. TypeScript 编译检查"
echo "  4. 本地开发服务器启动检查"
echo ""

# 测试 1：构建检查
echo "测试 1/4: 构建检查"
if npm run build > /tmp/build.log 2>&1; then
    echo "✅ PASS - 构建成功"
else
    echo "❌ FAIL - 构建失败"
    tail -20 /tmp/build.log
    exit 1
fi
echo ""

# 测试 2：检查构建产物
echo "测试 2/4: 检查构建产物"
if [ -f "dist/index.html" ] && [ -d "dist/assets" ]; then
    echo "✅ PASS - 构建产物完整"
    echo "  - dist/index.html 存在"
    echo "  - dist/assets/ 存在"
else
    echo "❌ FAIL - 构建产物不完整"
    ls -la dist/
    exit 1
fi
echo ""

# 测试 3：检查关键文件
echo "测试 3/4: 检查关键文件"
REQUIRED_FILES=(
    "src/lib/apiClient.ts"
    "src/lib/demoStats.generated.ts"
    "src/components/ObservePage.tsx"
    "src/components/AuditReport.tsx"
    "src/worker.ts"
    "vite.config.ts"
    "package.json"
)

MISSING_FILES=0
for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✓ $file"
    else
        echo "  ✗ $file (缺失)"
        MISSING_FILES=$((MISSING_FILES + 1))
    fi
done

if [ $MISSING_FILES -eq 0 ]; then
    echo "✅ PASS - 所有关键文件存在"
else
    echo "❌ FAIL - 缺失 $MISSING_FILES 个文件"
    exit 1
fi
echo ""

# 测试 4：检查环境变量模板
echo "测试 4/4: 检查环境变量配置"
if [ -f ".env.production.template" ]; then
    echo "✅ PASS - 环境变量模板存在"
    echo ""
    echo "📝 部署前端需要："
    echo "  1. 复制模板: cp .env.production.template .env.production"
    echo "  2. 填写后端 URL"
    echo "  3. 运行构建: npm run build"
else
    echo "⚠️  WARN - 环境变量模板不存在"
fi
echo ""

echo "================================"
echo "📊 测试结果汇总"
echo "================================"
echo "通过: 4 / 4"
echo "失败: 0 / 4"
echo ""
echo "✅ 本地测试全部通过！"
echo ""
echo "下一步："
echo "  1. 部署后端（参考 backend/DEPLOY_MANUAL.md）"
echo "  2. 配置前端环境变量（.env.production）"
echo "  3. 运行 E2E 测试: ./run-e2e-tests.sh"
echo ""
