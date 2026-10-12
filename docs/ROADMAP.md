# 迭代规划

按依赖关系排序，每个阶段都可以独立交付。

## 阶段 0：工程化基线（本次已完成）

- [x] 分层：`core`（纯逻辑）/ `render` / `app` / `platform` / `entries`，ESLint 强制依赖方向与禁用宿主全局
- [x] Vite 构建：网页版（多页面）+ 微信小游戏单文件包
- [x] 固定步长、可设种子随机数、扫掠碰撞
- [x] Canvas 内 UI（HUD、标题、暂停、结束、触控按钮），安全区适配
- [x] 浏览器调试：`?seed` `?debug` `?touch`、`wechat.html` 小游戏模拟器、`__NS_SHAFT__` 钩子
- [x] 测试：Vitest（node 环境，核心覆盖率阈值 90%）、小游戏产物沙箱冒烟测试、Playwright 4 个浏览器项目
- [x] GitHub Actions：lint → 单测 + 覆盖率 → 构建 → e2e 矩阵 → main 分支部署 Pages，上传小游戏包

## 阶段 1：小游戏上线必需

| 事项 | 涉及模块 | 说明 |
| --- | --- | --- |
| 正式 AppID 与发布流水线 | `platforms/wechat/project.config.json`、CI | 使用 `miniprogram-ci` 在 CI 中上传体验版，密钥放 GitHub Secrets |
| 音效 | 新增 `platform.audio`（web: WebAudio / wx: `wx.createInnerAudioContext`） | `GameSession.step` 已返回 `jump/spring/damage/gameover` 事件，表现层订阅即可 |
| 资源加载 | 新增 `platform.loadImage`，`Renderer` 支持精灵图 | 小游戏主包 ≤ 4MB，大资源走分包或 CDN |
| 隐私与合规 | 小游戏后台 | 隐私协议、适龄提示；如接入排行榜需用户授权 |
| 真机性能基线 | `?debug` FPS 面板 | 低端安卓上验证；必要时缓存静态背景到离屏 canvas |

## 阶段 2：玩法打磨（需策划确认数值）

- **尖刺平台**：现为「穿过并持续扣血」，原版 NS-SHAFT 是「可站立、落地扣一次」，建议做成配置项对比手感。
- **生命值回复**：原版站上普通平台会慢慢回血，配合较低的总血量更有张力。
- **难度曲线**：`GameState.difficulty` 目前未被使用；可让滚动速度、平台宽度随深度变化，替代硬编码的 3 档。
- **跳跃手感**：土狼时间（离开平台后几 tick 内仍可跳）、跳跃缓冲（落地前按下的跳跃生效）。
- **新平台**：传送带（原版经典）、翻转平台、隐形平台。
- **数值配置外置**：`config.js` → JSON，方便策划调整、做 A/B。

## 阶段 3：留存与社交

- 本地最佳成绩已实现（`ns-shaft:bestDepth`），可扩展为每日挑战（固定 seed，全服同一关卡）。
- 微信开放数据域好友排行榜（需单独的 open-data 子包和共享 canvas）。
- 分享卡片（`wx.shareAppMessage`）、复活激励视频（`wx.createRewardedVideoAd`）。
- 回放：记录 seed + 每 tick 输入即可完整重现，可用于分享或反作弊校验。

## 阶段 4：工程持续改进

- 迁移到 TypeScript，或先用 JSDoc + `tsc --checkJs` 做类型检查。
- 用回放数据做视觉回归，在 CI 中对固定 seed 的若干帧做像素比对。
- 多平台复用：抖音 / QQ 小游戏的 API 与 `wx` 高度相似，新增一个适配器即可。
- 性能预算：在 CI 中检查 `dist/wechat/game.js` 体积。
