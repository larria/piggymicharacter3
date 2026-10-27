# 咪猪头识字成长册

面向孩子的单设备本地汉字学习应用，使用 React、TypeScript 与 Vite 构建。通过识字探险、跨天复习、原创猪头段位和收藏墙，记录真实学习与成长；没有账号、云同步、广告或付费功能。

## 快速启动

```sh
npm install
npm run dev
```

开发地址以 Vite 输出为准，默认 http://localhost:5173。

```sh
# 自动化测试与生产构建
npm test
npm run build
# 预览生产构建
npx vite preview --host 0.0.0.0 --port 4173
# 部署到 GitHub Pages（自动先构建，发布 dist/ 到 gh-pages 分支）
npm run deploy
```

线上地址：https://larria.github.io/piggymicharacter3/

## 版本、图标与安全更新

首页显示版本自动来自 `package.json.version`，不单独修改界面字符串；同版本代码更新通过构建内容 hash 识别。点击版本入口检查／应用更新，不清除本机学习数据；学习、考试、导入、保存冲突或同 scope 其他窗口打开时不会强制刷新。

图标原图保留在非公开 `assets/icon-source/piggy-original.png`，用 `node scripts/generate-icons.mjs` 重建四种优化 PNG。生产 A/B 本地验证使用 `scripts/pwa-ab-fixture.mjs`，运行与同源切换步骤见开发规格；此脚本不发布、不提交、不清浏览器存储。

## 文档

- [产品规格](./PRODUCT_SPEC.md)：面向使用者的当前功能、学习与成长规则、能力边界。
- [开发规格](./DEVELOPMENT_SPEC.md)：工程结构、数据与资源、脚本、存储、离线、测试和发布要求。
