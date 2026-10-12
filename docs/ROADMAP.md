# 迭代规划

按依赖关系排序，每个阶段都可以独立交付。

## 阶段 0：工程化基线（已完成）

- [x] 分层：`core`（纯逻辑）/ `audio` / `render` / `app` / `platform` / `entries`，ESLint 强制依赖方向与禁用宿主全局
- [x] Vite 构建：网页版（多页面）+ 微信小游戏单文件包
- [x] 固定步长、可设种子随机数、扫掠碰撞
- [x] Canvas 内 UI（HUD、标题、暂停、结束、菜单与触控按钮），安全区适配
- [x] 浏览器调试：`?seed` `?debug` `?touch` `?rules` `?replay`、`wechat.html` 小游戏模拟器、`__NS_SHAFT__` 钩子
- [x] 测试：Vitest（node 环境，`core` / `audio` 覆盖率阈值 90%）、小游戏产物沙箱冒烟测试、Playwright 4 个浏览器项目
- [x] GitHub Actions：lint → 类型检查 → 单测 + 覆盖率 → 构建 → e2e 矩阵 → main 分支部署 Pages，上传小游戏包

## 阶段 1：小游戏上线必需

| 状态 | 事项 | 涉及模块 | 说明 |
| --- | --- | --- | --- |
| ✅ | 发布流水线 | `scripts/wechat-upload.mjs`、`.github/workflows/wechat-upload.yml` | `miniprogram-ci` 上传开发版 / 生成预览二维码；未配置密钥时只做 dry run。**尚未用真实 AppID 验证** |
| ✅ | 音效 | `src/audio/sfx.js`、`src/app/SoundPlayer.js`、`platform.createAudioContext` | 程序合成，无音频资源；Web 用 WebAudio，微信用 `wx.createWebAudioContext`（基础库 2.19.0+），M 键 / 标题菜单静音 |
| ⬜ | 正式 AppID | `platforms/wechat/project.config.json`、GitHub Secrets | 配置 `WECHAT_APPID` / `WECHAT_PRIVATE_KEY`，公众平台关闭上传 IP 白名单 |
| ⬜ | 资源加载 | 新增 `platform.loadImage`，`Renderer` 支持精灵图 | 小游戏主包 ≤ 4MB，大资源走分包或 CDN |
| ⬜ | 隐私与合规 | 小游戏后台 | 隐私协议、适龄提示；如接入排行榜需用户授权 |
| ⬜ | 真机性能基线 | `?debug` FPS 面板 | 低端安卓上验证；必要时缓存静态背景到离屏 canvas |

## 阶段 2：玩法打磨

已完成（默认的「经典」规则与之前完全一致，旧 seed 生成的关卡不变）：

- [x] **规则预设**（`src/core/rules.js`）：经典 / 原版 / 困难，标题界面 ← → 切换并记住选择，最佳成绩按预设分别保存。
  - 原版：12 点生命，尖刺可站立、落地扣 5 点，落到尖刺、弹簧以外的平台回 1 点，出现传送带。
  - 困难：滚动速度随深度增加（0.5 → 1.0），危险平台更密。
- [x] **跳跃手感**：土狼时间（走出平台边缘 6 tick 内仍可跳）、跳跃缓冲（落地前 6 tick 内按下的跳跃会生效）。
- [x] **传送带平台**：把站在上面的玩家向左 / 右推。
- [x] 修复：扫掠碰撞引入后，经典规则下穿过尖刺只扣 1 点血（应为每 tick 接触扣 1 点）。

待做（需策划确认数值）：

- 翻转平台、隐形平台等新平台类型（只能追加在 `TIER_KEYS` 末尾，否则旧 seed 关卡会变）。
- 数值配置外置：`rules.js` → JSON，方便策划调整、做 A/B。
- 平台宽度随深度变窄；`GameState.difficulty` 仍未被使用。

## 阶段 3：留存与社交

- [x] **每日挑战**：按本地日期生成固定 seed，同一天所有玩家关卡相同，单独记录当日最佳。
- [x] **回放**：记录 seed + 每 tick 输入（游程编码），`?replay=` 或 `__NS_SHAFT_REPLAY_URL__()` 完整复现一局，可用于复现 bug。
- ⬜ 微信开放数据域好友排行榜（需单独的 open-data 子包和共享 canvas）；每日挑战可做成「今日好友榜」。
- ⬜ 分享卡片（`wx.shareAppMessage`，可携带回放编码）、复活激励视频（`wx.createRewardedVideoAd`）。
- ⬜ 服务端用回放重算成绩做反作弊校验（`GameSession` 无宿主依赖，可直接在 Node 中运行）。

## 阶段 4：工程持续改进

- [x] JSDoc + `tsc --checkJs` 类型检查（`npm run typecheck`，CI 中执行）。
- [x] 体积预算：`tests/wechat/bundle.test.js` 限制 `game.js` ≤ 64KB / gzip ≤ 20KB。
- ⬜ 逐步开启 `strict`（当前开启后约 60 处报错，主要是可空值）。
- ⬜ 用回放数据做视觉回归，在 CI 中对固定 seed 的若干帧做像素比对。
- ⬜ 多平台复用：抖音 / QQ 小游戏的 API 与 `wx` 高度相似，新增一个适配器即可。
