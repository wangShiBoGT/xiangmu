# 部署指南

## GitHub Pages 部署步骤

### 1. 推送代码到 GitHub

```bash
git push origin master
```

### 2. 在 GitHub 仓库中配置 Pages

1. 进入仓库的 **Settings** → **Pages**
2. 在 **Source** 部分选择 **GitHub Actions**
3. 保存配置

### 3. 触发部署

部署会在以下情况自动触发：
- 推送代码到 `master` 分支
- 手动触发：进入 **Actions** 标签页，选择 "Deploy to GitHub Pages" 工作流，点击 **Run workflow**

### 4. 访问部署的站点

部署完成后，站点将在以下地址可用：
```
https://<你的用户名>.github.io/<仓库名>/
```

例如：`https://wangshibo.github.io/webgpu-llm-chat/`

## 部署状态检查

- 在 **Actions** 标签页可以查看部署进度和日志
- 部署时间约 2-3 分钟
- 如果部署失败，检查 Actions 日志中的错误信息

## 已完成的部署准备

✅ TypeScript 构建错误已修复
✅ 生产构建测试通过 (`npm run build`)
✅ GitHub Actions 工作流已配置 (`.github/workflows/deploy.yml`)
✅ UI 样式问题已修复（深色主题集成）
✅ 3D 可视化文本标签已优化

## 技术细节

- 构建输出目录：`dist/`
- 构建命令：`npm run build`
- Node.js 版本：20
- 部署方式：GitHub Actions + GitHub Pages

## 注意事项

- 首次部署需要在 GitHub 仓库设置中启用 Pages 并选择 GitHub Actions 作为源
- WebGPU 功能需要 HTTPS 环境，GitHub Pages 自动提供
- 大型 WASM 文件 (23MB) 已包含在构建中，首次加载可能较慢
