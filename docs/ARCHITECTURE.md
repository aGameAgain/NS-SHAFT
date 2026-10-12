# 架构与游戏逻辑说明

## 1. 游戏逻辑整理

### 1.1 一局游戏的生命周期

```
title ──(空格/回车/点击)──▶ playing ──(掉出屏幕底部 / 生命值归零)──▶ gameover
                             │  ▲                                        │
                    (P/Esc/切后台)│  │(P/空格/点击)                        │ (0.5s 后 空格/回车/点击)
                             ▼  │                                        ▼
                            paused                                    playing（新的一局）
```

场景状态机在 `src/app/GameApp.js`，一局内的纯逻辑在 `src/core/GameSession.js`。

### 1.2 坐标系与镜头

- **世界坐标**：x ∈ [0, 400)（`WORLD_WIDTH` 固定），y 向下增长，玩家和平台都存世界坐标。
- **镜头**：`depth` 即镜头顶部的世界 y，每 tick 增加 `SCREEN_SCROLL_SPEED = 0.5`；HUD 显示的「深度 m」就是 `floor(depth)`。
- **屏幕坐标** = 世界 y − depth。逻辑高度 = 屏幕高度 × (400 / 屏幕宽度)，因此不同宽高比的手机只是「看得更远/更近」，玩法宽度不变。
- 渲染时用 `setTransform(scale × devicePixelRatio)` 统一缩放，Retina / 高 DPR 屏幕清晰。

### 1.3 每个 tick 的执行顺序（`GameSession.step`）

1. `PlatformManager.update(depth)`：移动平台位移（记录 `dx`）、破碎平台倒计时、回收离开视野顶部 100px 的平台、在视野底部之外预生成平台。
2. `Player.update(input)`：左右输入 → 跟随脚下移动平台的 `dx` → 限制在屏幕内 → 走出平台边缘则离开平台。
3. 跳跃（仅站在平台上时生效，边沿触发）。
4. `Player.applyGravity()`：记录 `prevY`，空中时 `vy += 0.25`，`y += vy`。
5. `Physics.checkCollisions`：**扫掠检测**——上一 tick 脚底在平台顶面之上、这一 tick 在其下即落地；同时穿过多个平台取最高的。
   - 普通：站立；破碎：开始 60 tick 倒计时；弹簧：以 `8 × 1.5` 向上弹射；尖刺：不站立，强制 `vy ≥ 2` 穿过并每 tick 扣 1 点。
   - 顶面高于「站上去就会顶到天花板」阈值的平台被忽略。
6. 天花板尖刺：玩家屏幕 y ≤ 15 时扣 10 点（受伤闪烁 30 tick 内不重复扣），强制下落。
7. `depth += 0.5`；玩家世界 y > depth + 视野高度 → 游戏结束。

所有数值集中在 `src/core/config.js`。

### 1.4 平台生成与难度

- 初始 5 个平台，第一个是玩家正下方 50px 的普通平台，之后间隔 150px。
- 之后每个间隔 `max(150 × (1 + rand × 0.5), 120)`，即 150~225px。
- 平台类型按 **生成时的镜头深度** 分档（`DIFFICULTY_TIERS`）：

| 深度 | 尖刺 | 破碎 | 移动 | 弹簧 | 普通 |
| --- | --- | --- | --- | --- | --- |
| ≤ 100 | 0 | 0 | 0 | 0 | 100% |
| > 100 | 5% | 15% | 15% | 10% | 55% |
| > 200 | 10% | 15% | 15% | 10% | 50% |
| > 500 | 15% | 20% | 20% | 15% | 30% |

- 随机数来自可设种子的 `createRng(seed)`，同 seed + 同输入序列 = 完全相同的一局（可用于回放、bug 复现、确定性测试）。

### 1.5 时间步长

逻辑固定 60 tick/s，`GameApp.frame()` 用累加器把真实时间换算成 tick 数（单帧最多追 5 tick）。
因此 30Hz / 60Hz / 120Hz 设备上游戏速度一致，渲染帧率只影响流畅度。

## 2. 重构前发现并修复的问题

| # | 问题 | 影响 | 修复 |
| --- | --- | --- | --- |
| 1 | 游戏中点「重新开始」会再启动一个 `requestAnimationFrame` 循环，旧循环不停止 | 重开后游戏 2 倍速、越重开越快 | 全局只有一个渲染循环，场景切换不再启停循环 |
| 2 | 逻辑按「每帧」推进 | 120Hz 手机上游戏 2 倍速 | 固定步长 tick |
| 3 | 天花板检测用世界坐标 `player.y <= 15` | 开局 1 秒后天花板永远不会伤人；站在平台上可被带出屏幕顶部 | 改为相对镜头判断，并让玩家从平台跌落 |
| 4 | 站立时每帧交替「落地/离地」 | 约一半的跳跃按键无效；跟随移动平台速度减半 | 扫掠检测，站立状态稳定 |
| 5 | 碰撞窗口只有平台厚度 15px | 下落速度 > 15 时穿透平台 | 扫掠检测 |
| 6 | `spawnDepth` 初始为 0，而初始平台已生成到 y≈800 | 开局前几帧在已有平台之间重叠生成 | 从最后一个初始平台继续生成 |
| 7 | 受伤闪烁用 `setTimeout`，尖刺上每帧创建一个定时器 | 定时器堆积；小游戏切后台时行为不确定 | 改为 tick 计数 |
| 8 | 文档写破碎平台 2 秒，代码是 60 帧 | 文档与实现不一致 | 以实际手感（1 秒）为准，文档已更新 |
| 9 | 逻辑直接依赖 `window` / `document` / `localStorage` / DOM 按钮 | 无法移植到微信小游戏 | 分层 + 平台适配器，UI 全部画在 Canvas 上 |
| 10 | 原 e2e 测试大多只截图、不断言；部署工作流不跑测试 | 回归无法被发现 | 重写测试，CI 先测试后部署 |

> 数值调整说明：修复 #3 后天花板真正生效，原来「每帧扣 1」在跌落机制下只会扣 1~2 点，
> 因此改为单次扣 10 点（`DAMAGE.CEILING`），需要策划确认。

## 3. 分层结构

```
src/
├── core/            纯游戏逻辑，只允许 ECMAScript 内置对象（ESLint 强制）
│   ├── config.js        全部玩法数值
│   ├── rng.js           可设种子的随机数
│   ├── GameState.js     深度 / 生命 / 结束标记
│   ├── Player.js
│   ├── Platform.js      Platform + PlatformManager（生成、难度、回收）
│   ├── Physics.js       扫掠碰撞、天花板、出界
│   └── GameSession.js   一局游戏：step(input) → events
├── render/
│   └── Renderer.js      只用 CanvasRenderingContext2D 通用子集，浏览器 / 小游戏共用
├── app/             平台无关的应用层
│   ├── GameApp.js       场景状态机、固定步长循环、输入映射、最佳成绩、调试钩子
│   ├── InputState.js    键盘 + 触控 → {left, right, jump}
│   └── layout.js        逻辑分辨率、安全区、触控按钮布局与命中测试
├── platform/        平台适配器（唯一允许接触宿主 API 的地方）
│   ├── web.js           DOM / Pointer Events / localStorage
│   └── wechat.js        wx.createCanvas / wx.onTouch* / wx.getStorageSync / wx.onShow|onHide
├── entries/
│   ├── web.js           index.html 入口
│   └── wechat.js        打包成小游戏 game.js
└── web/instructions.js  网页版专属的说明面板
dev/
├── wx-shim.js           在浏览器里模拟 wx 运行时
└── wechat-sim.js        wechat.html 入口
platforms/wechat/        小游戏工程模板（game.json、project.config.json）
```

依赖方向：`entries → platform / app → render → core`，反向依赖会被 ESLint `no-restricted-imports` 拦截；
`core` / `render` / `app` 中出现 `window`、`document`、`wx`、`setTimeout` 等会被 `no-undef` 拦截。

### 平台适配器接口

```js
{
  name, canvas, touchCapable,
  getViewport(): { width, height, pixelRatio, safeTop },   // CSS 像素
  onResize(cb), onKey(cb(key, pressed)), onVisibility(cb(visible)),
  onPointer({ down(id, x, y), move(id, x, y), up(id) }),   // 相对画布的 CSS 像素
  storage: { get(key), set(key, value) },
  requestFrame(cb), now()
}
```

新增平台（抖音小游戏、QQ 小游戏、App 内 WebView 等）只需实现这个对象和一个入口文件。

## 4. 微信小游戏

```bash
npm run build:wechat        # 产物：dist/wechat/{game.js, game.json, project.config.json}
npm run dev:wechat          # 开发模式 + watch，未压缩、内联 sourcemap
```

1. 微信开发者工具 → 导入项目 → 选择 `dist/wechat` 目录。
2. `project.config.json` 默认 `appid: touristappid`（游客模式），正式发布前替换成自己的 AppID（改 `platforms/wechat/project.config.json`）。
3. 开发者工具控制台可通过 `GameGlobal.__NS_SHAFT__` 访问游戏实例。

产物约束（由 `tests/wechat/bundle.test.js` 在 CI 中验证）：

- 单文件 IIFE、ES2015 语法，不含 `import/export`、`?.`、`??`；
- 不引用 `window`、`document`、`localStorage`、`navigator`；
- 在只有 `wx` 全局的 Node 沙箱中能启动、渲染、响应触摸、切后台暂停、读写存储。

## 5. 浏览器调试

| 地址 | 用途 |
| --- | --- |
| `http://localhost:5173/` | 网页版 |
| `/?seed=123` | 固定关卡种子，复现问题 |
| `/?debug` | 显示 FPS / tick / 玩家状态 / 碰撞框（游戏中也可按 `` ` `` 切换） |
| `/?touch=1` | 桌面浏览器上强制显示触控按钮 |
| `/wechat.html?device=iphonex` | 通过 wx shim 运行**微信入口**，可选 `iphone8` / `android`，带安全区 |

控制台调试钩子 `window.__NS_SHAFT__`：

```js
__NS_SHAFT__.getSnapshot()      // 当前场景、深度、生命、玩家状态
__NS_SHAFT__.advance(60)        // 同步推进 60 tick
__NS_SHAFT__.stop()             // 冻结循环，配合 advance 单步调试
__NS_SHAFT__.session.player     // 直接查看/修改实体
```
