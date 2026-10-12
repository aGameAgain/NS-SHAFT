# 架构与游戏逻辑说明

## 1. 游戏逻辑整理

### 1.1 一局游戏的生命周期

```
title    ──开始游戏 / 每日挑战 / ?replay=──▶ playing
playing  ──P / Esc / 切后台──▶ paused ──P / 空格 / 点击──▶ playing
playing  ──掉出屏幕底部 / 生命值归零──▶ gameover
gameover ──（0.5s 后）再试一次 / 空格 / 回车──▶ playing
gameover ──返回标题 / Esc / T──▶ title
title    ──← → / 点击模式按钮：切换规则预设（停留在 title）
```

场景状态机在 `src/app/GameApp.js`，一局内的纯逻辑在 `src/core/GameSession.js`。
除场景外，`GameApp.mode` 区分 `normal`（随机 seed）/ `daily`（当日固定 seed）/ `replay`（播放录像，不记成绩）。

### 1.2 坐标系与镜头

- **世界坐标**：x ∈ [0, 400)（`WORLD_WIDTH` 固定），y 向下增长，玩家和平台都存世界坐标。
- **镜头**：`depth` 即镜头顶部的世界 y，每 tick 增加滚动速度（经典 / 原版恒为 0.5，困难随深度加速到 1.0）；HUD 显示的「深度 m」就是 `floor(depth)`。
- **屏幕坐标** = 世界 y − depth。逻辑高度 = 屏幕高度 × (400 / 屏幕宽度)，因此不同宽高比的手机只是「看得更远/更近」，玩法宽度不变。
- 渲染时用 `setTransform(scale × devicePixelRatio)` 统一缩放，Retina / 高 DPR 屏幕清晰。

### 1.3 每个 tick 的执行顺序（`GameSession.step`）

1. `PlatformManager.update(depth)`：移动平台位移（记录 `dx`）、破碎平台倒计时、回收离开视野顶部 100px 的平台、在视野底部之外预生成平台。
2. `Player.update(input)`：土狼计时递减 → 左右输入 → 跟随脚下平台（移动平台 `dx` + 传送带 `surfaceSpeed`）→ 限制在屏幕内 → 走出平台边缘则离开平台并开始 6 tick 土狼时间。
3. 跳跃：按下时写入 6 tick 的跳跃缓冲；站在平台上或处于土狼时间内即消耗缓冲起跳。
4. `Player.applyGravity()`：记录 `prevY`，空中时 `vy += 0.25`，`y += vy`。
5. `Physics.checkCollisions`：**扫掠检测**——上一 tick 脚底在平台顶面之上、这一 tick 在其下即落地；同时穿过多个平台取最高的。
   - 普通：站立；破碎：开始 60 tick 倒计时；弹簧：以 `8 × 1.5` 向上弹射；传送带：站立并被推动。
   - 尖刺（由规则决定）：经典 / 困难不可站立，脚底与尖刺平台厚度有重叠的每个 tick 扣 1 点、强制 `vy ≥ 2` 穿过；原版可站立，落地时扣 5 点。
   - 顶面高于「站上去就会顶到天花板」阈值的平台被忽略。
6. 落地回血（仅原版）：落到尖刺、弹簧以外的平台回 1 点。
7. 天花板尖刺：玩家屏幕 y ≤ 15 时扣血（经典 / 困难 10 点、原版 5 点；受伤闪烁 30 tick 内不重复扣），强制下落。
8. 镜头下移；玩家世界 y > depth + 视野高度 → 游戏结束。

`step` 返回本 tick 的事件（`jump` / `land` / `spring` / `damage` / `heal` / `fell` / `gameover`），音效等表现层只订阅事件，不读内部状态。
物理常量在 `src/core/config.js`，可切换的规则在 `src/core/rules.js`。

### 1.4 平台生成与难度

- 初始 5 个平台，第一个是玩家正下方 50px 的普通平台，之后间隔 150px。
- 之后每个间隔 `max(150 × (1 + rand × 0.5), 120)`，即 150~225px。
- 平台类型按 **生成时的镜头深度** 分档，每个规则预设有自己的档位表（`rules.js` 中的 `tiers`）。经典规则（`DIFFICULTY_TIERS`）：

| 深度 | 尖刺 | 破碎 | 移动 | 弹簧 | 普通 |
| --- | --- | --- | --- | --- | --- |
| ≤ 100 | 0 | 0 | 0 | 0 | 100% |
| > 100 | 5% | 15% | 15% | 10% | 55% |
| > 200 | 10% | 15% | 15% | 10% | 50% |
| > 500 | 15% | 20% | 20% | 15% | 30% |

- 随机数来自可设种子的 `createRng(seed)`，同 seed + 同规则 + 同输入序列 = 完全相同的一局。
- 类型按 `TIER_KEYS` 顺序累加概率抽取，新类型只能追加在末尾；`tests/unit/rules.test.js` 用 seed 42 的关卡指纹锁定经典规则的生成结果。

### 1.6 规则预设

| | 经典 `classic`（默认） | 原版 `nsshaft` | 困难 `hard` |
| --- | --- | --- | --- |
| 生命 | 100 | 12 | 100 |
| 尖刺 | 穿过，每 tick 扣 1 | 可站立，落地扣 5 | 穿过，每 tick 扣 1 |
| 天花板 | 10 | 5 | 10 |
| 回血 | 无 | 落地 +1 | 无 |
| 滚动 | 0.5 | 0.5 | 0.5 + 深度 × 0.0005，上限 1 |
| 平台 | 普通 / 移动 / 破碎 / 尖刺 / 弹簧 | 无移动平台，有传送带 | 全部类型，危险平台更密 |

当前预设保存在 `ns-shaft:rules`；最佳成绩按预设分别保存（经典沿用旧键 `ns-shaft:bestDepth`），每日挑战保存在 `ns-shaft:daily:<日期>:<规则>`。

### 1.7 回放与每日挑战（`src/core/replay.js`）

- 每 tick 的输入压成 3 位掩码（左 1 / 右 2 / 跳 4），连续相同的输入做游程编码：
  `ns1.<规则>.<seed>.<掩码><次数(36 进制)>_<掩码><次数>…`，按平均每 20 tick 改变一次输入估算，每分钟约 0.7KB。
- 回放时 `GameSession` 用录像中的规则和 seed 重置，逐 tick 喂入录制的输入，结果与原局逐位一致。
- 每日挑战 seed = FNV-1a(`YYYY-MM-DD`)，按本地日期计算。

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
| 11 | 引入扫掠碰撞后，穿过尖刺平台只在「跨过顶面」的那 1 tick 判定 | 经典规则下尖刺每次只扣 1 点（原先约 2~8 点） | 不可站立的尖刺改为「脚底与平台厚度重叠」判定，每 tick 扣血；已加回归测试 |

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
│   ├── rules.js         规则预设（经典 / 原版 / 困难）
│   ├── replay.js        回放录制 / 编码 / 播放，每日挑战 seed
│   └── GameSession.js   一局游戏：step(input) → events
├── audio/
│   └── sfx.js           程序合成音效，只产出 Float32Array 采样
├── render/
│   └── Renderer.js      只用 CanvasRenderingContext2D 通用子集，浏览器 / 小游戏共用
├── app/             平台无关的应用层
│   ├── GameApp.js       场景状态机、模式（普通 / 每日 / 回放）、固定步长循环、输入映射、最佳成绩、调试钩子
│   ├── SoundPlayer.js   游戏事件 → 音效，WebAudio 兼容接口，静音
│   ├── InputState.js    键盘 + 触控 → {left, right, jump}
│   └── layout.js        逻辑分辨率、安全区、触控 / 菜单按钮布局与命中测试
├── platform/        平台适配器（唯一允许接触宿主 API 的地方）
│   ├── web.js           DOM / Pointer Events / localStorage / AudioContext
│   └── wechat.js        wx.createCanvas / wx.onTouch* / wx.getStorageSync / wx.onShow|onHide / wx.createWebAudioContext
├── entries/
│   ├── web.js           index.html 入口
│   └── wechat.js        打包成小游戏 game.js
└── web/instructions.js  网页版专属的说明面板
dev/
├── wx-shim.js           在浏览器里模拟 wx 运行时
└── wechat-sim.js        wechat.html 入口
platforms/wechat/        小游戏工程模板（game.json、project.config.json）
scripts/wechat-upload.mjs  miniprogram-ci 上传 / 预览
types/globals.d.ts       仅供类型检查的宿主全局声明（wx、window 调试钩子）
```

依赖方向：`entries → platform / app → render / audio → core`，反向依赖会被 ESLint `no-restricted-imports` 拦截；
`core` / `audio` / `render` / `app` 中出现 `window`、`document`、`wx`、`setTimeout` 等会被 `no-undef` 拦截。

### 平台适配器接口

```js
{
  name, canvas, touchCapable,
  getViewport(): { width, height, pixelRatio, safeTop },   // CSS 像素
  onResize(cb), onKey(cb(key, pressed)), onVisibility(cb(visible)),
  onPointer({ down(id, x, y), move(id, x, y), up(id) }),   // 相对画布的 CSS 像素
  storage: { get(key), set(key, value) },
  requestFrame(cb), now(),
  createAudioContext?(): AudioContext | null               // 可选；缺省时没有音效
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

### 4.1 CI 上传（miniprogram-ci）

```bash
npm install --no-save miniprogram-ci        # 依赖约 300MB，不放进 devDependencies
WECHAT_APPID=wx... WECHAT_PRIVATE_KEY_PATH=./private.key npm run wechat:preview   # 生成预览二维码
WECHAT_APPID=wx... WECHAT_PRIVATE_KEY_PATH=./private.key npm run wechat:upload    # 上传为开发版
npm run wechat:upload -- --dry-run           # 不需要密钥，只校验产物和参数（CI 每次都会跑）
```

`.github/workflows/wechat-upload.yml`：手动触发（预览 / 上传），或在仓库变量 `WECHAT_AUTO_UPLOAD=true` 时于 main 分支 CI 通过后自动上传开发版。准备工作：

1. 微信公众平台 → 开发管理 → 开发设置 → 小程序代码上传：生成上传密钥，**关闭 IP 白名单**（GitHub 托管 runner 出口 IP 不固定），或改用固定 IP 的 self-hosted runner。
2. GitHub 仓库 Settings → Secrets：`WECHAT_APPID`、`WECHAT_PRIVATE_KEY`（密钥文件全文）。
3. 未配置密钥时工作流只做 dry run 并给出 warning，不会失败。

> 该流水线已用伪造 AppID 验证到「请求微信签名接口」这一步，尚未用真实账号完成上传。

产物约束（由 `tests/wechat/bundle.test.js` 在 CI 中验证）：

- 单文件 IIFE、ES2015 语法，不含 `import/export`、`?.`、`??`；
- 体积 ≤ 64KB、gzip ≤ 20KB（当前约 32KB / 12KB）；
- 不引用 `window`、`document`、`localStorage`、`navigator`；
- 在只有 `wx` 全局的 Node 沙箱中能启动、渲染、响应触摸、切后台暂停、读写存储。

## 5. 浏览器调试

| 地址 | 用途 |
| --- | --- |
| `http://localhost:5173/` | 网页版 |
| `/?seed=123` | 固定关卡种子，复现问题 |
| `/?debug` | 显示 FPS / tick / 玩家状态 / 碰撞框（游戏中也可按 `` ` `` 切换） |
| `/?touch=1` | 桌面浏览器上强制显示触控按钮 |
| `/?rules=nsshaft` | 指定规则预设（`classic` / `nsshaft` / `hard`） |
| `/?replay=ns1....` | 直接播放一段回放 |
| `/wechat.html?device=iphonex` | 通过 wx shim 运行**微信入口**，可选 `iphone8` / `android`，带安全区 |

控制台调试钩子 `window.__NS_SHAFT__`：

```js
__NS_SHAFT__.getSnapshot()      // 当前场景、深度、生命、玩家状态
__NS_SHAFT__.advance(60)        // 同步推进 60 tick
__NS_SHAFT__.stop()             // 冻结循环，配合 advance 单步调试
__NS_SHAFT__.session.player     // 直接查看/修改实体
__NS_SHAFT__.exportReplay()     // 当前 / 上一局的回放编码
__NS_SHAFT_REPLAY_URL__()       // 可直接打开的回放链接，贴进 bug 报告即可复现
```
