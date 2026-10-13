# NS-SHAFT 游戏

[![CI](https://github.com/aGameAgain/NS-SHAFT/actions/workflows/ci.yml/badge.svg)](https://github.com/aGameAgain/NS-SHAFT/actions/workflows/ci.yml)

经典下落式平台游戏，原生 JavaScript + Canvas 实现，**同一套代码运行在浏览器和微信小游戏**。

## 玩法

- ← → 或 A / D 左右移动（手机/小游戏：底部 ◀ ▶ 按钮）
- 空格向上跳（手机/小游戏：「跳」按钮）
- 走到平台边缘自动下落；屏幕会不断向下滚动，不要掉出屏幕底部
- 碰到顶部尖刺会受伤并从平台上跌落；生命值归零游戏结束
- 标题界面 ← → 切换规则预设，C 开始每日挑战（同一天所有人关卡相同）
- P / Esc 暂停，R 重开，M 静音，`` ` `` 显示调试信息

| 平台 | 颜色 | 效果 |
| --- | --- | --- |
| 普通 | 绿 | 安全 |
| 移动 | 紫 | 左右移动，站在上面会被带着走 |
| 破碎 | 黄 | 站上去 1 秒后碎裂 |
| 尖刺 | 红 | 经典 / 困难：穿过时持续扣血；原版：可站立，落地扣血 |
| 弹簧 | 蓝 | 把玩家弹起 |
| 传送带 | 灰 | 把玩家向左或向右推（原版 / 困难） |

| 规则 | 说明 |
| --- | --- |
| 经典（默认） | 100 点生命，深度超过 100m / 200m / 500m 后危险平台比例逐级提高 |
| 原版 | 仿原版 NS-SHAFT：12 点生命，尖刺可站立，落地回血，有传送带 |
| 困难 | 滚动速度随深度加快，危险平台更多 |

## 开发

```bash
npm install
npm run dev            # http://localhost:5173  网页版
                       # http://localhost:5173/wechat.html  浏览器里模拟微信小游戏
npm run build          # dist/web（网页）+ dist/wechat（小游戏）
npm run dev:wechat     # 小游戏开发构建 + watch，用微信开发者工具导入 dist/wechat
```

调试参数：`?seed=123` 固定关卡，`?rules=nsshaft` 指定规则，`?replay=...` 播放回放，`?debug` 调试面板，`?touch=1` 强制触控按钮；
控制台 `__NS_SHAFT__.getSnapshot()` / `__NS_SHAFT__.advance(60)`，`__NS_SHAFT_REPLAY_URL__()` 生成可复现当前一局的链接。

微信发布：`npm run wechat:preview` / `npm run wechat:upload`（miniprogram-ci，见 [架构文档 4.1](docs/ARCHITECTURE.md#41-ci-上传miniprogram-ci)）。

## 测试

```bash
npm run lint           # ESLint（含分层约束）
npm run typecheck      # tsc --checkJs（JSDoc 类型检查）
npm run test:unit      # Vitest：逻辑 / 渲染 / 应用层 + 小游戏产物沙箱测试
npm run test:coverage  # 带覆盖率
npx playwright install # 首次运行 e2e 前
npm run test:e2e       # Playwright：桌面 Chrome / Firefox / Safari + 移动端 Chrome
npm test               # 全部
```

## 文档

- [架构与游戏逻辑说明](docs/ARCHITECTURE.md)：逻辑梳理、已修复问题、分层、微信移植、调试方法
- [迭代规划](docs/ROADMAP.md)
- [测试说明](tests/README.md)
