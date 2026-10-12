# 自动化测试

| 层次 | 位置 | 工具 / 环境 | 关注点 |
| --- | --- | --- | --- |
| 单元测试 | `tests/unit/` | Vitest，**node 环境（无 DOM）** | 核心逻辑、输入、布局、渲染调用、应用状态机、微信适配器 |
| 小游戏产物测试 | `tests/wechat/` | Vitest + Vite build API + `node:vm` | 真实 `game.js` 在只有 `wx` 的沙箱中启动、渲染、触摸、存储 |
| 端到端测试 | `tests/e2e/` | Playwright | 网页版键盘流程、移动端触控、`wechat.html` 模拟器、像素级渲染校验 |

单元测试跑在 node 环境本身就是一道约束：`core` / `render` / `app` 一旦依赖 DOM，测试就会失败。

## 运行

```bash
npm run test:unit                              # 单元 + 小游戏产物
npm run test:coverage                          # 覆盖率，src/core 低于 90% 失败
npx playwright install                         # 首次
npm run test:e2e                               # 4 个项目：chromium / firefox / webkit / mobile-chrome
npx playwright test --project=chromium         # 只跑一个
npm run test:e2e:ui                            # 可视化调试
```

本地 e2e 自动启动 `vite` dev server；CI 中（`CI=1`）使用 `vite preview` 测试 `dist/web` 构建产物，需先 `npm run build:web`。

## 编写约定

- **确定性**：逻辑测试固定 seed（`new GameSession({ seed: 1 })`），e2e 页面带 `?seed=1`。
- **不靠 sleep 断言状态**：e2e 通过 `window.__NS_SHAFT__.getSnapshot()` 读取状态，用 `expect.poll` 等待；
  需要精确步数时用 `__NS_SHAFT__.advance(n)` 同步推进。
- **测试替身**：`tests/helpers/fakes.js` 提供记录调用的 2D context、可手动推进时间的平台适配器、`wx` 替身。
- **回归测试**：修 bug 时先在 `GameSession.test.js` / `GameApp.test.js` 写出能复现的用例（参见「重开不产生第二个循环」「站立时任意 tick 都能起跳」）。

## CI

`.github/workflows/ci.yml`：

1. `check`：`npm ci` → lint → 单测 + 覆盖率 → 构建，上传 `web-dist`、`wechat-minigame`、`coverage` 产物；
2. `e2e`：4 个 Playwright 项目矩阵并行，测试 `check` 产出的 `dist/web`，失败时上传报告；
3. `deploy`：仅 `main` 分支 push 且前两步通过后部署 GitHub Pages。
