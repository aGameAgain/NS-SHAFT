// 所有玩法数值集中在这里，逻辑层按「固定步长 tick」计算（TICK_RATE 次/秒），
// 与设备刷新率无关。修改数值请同步检查 tests/unit 中的断言。

export const TICK_RATE = 60;
export const TICK_MS = 1000 / TICK_RATE;

// 逻辑坐标系宽度固定，高度随屏幕宽高比变化；渲染层负责缩放到实际像素
export const WORLD_WIDTH = 400;

export const SCREEN_SCROLL_SPEED = 0.5;

export const PLAYER = {
    WIDTH: 30,
    HEIGHT: 40,
    START_Y: 100,
    MOVE_SPEED: 5,
    GRAVITY: 0.25,
    JUMP_POWER: 8,
    HURT_TICKS: 30
};

export const SPRING_BOOST = 1.5;

export const PLATFORM = {
    WIDTH: 80,
    HEIGHT: 15,
    GAP: 150,
    MIN_GAP: 120,
    GAP_JITTER: 0.5,
    FIRST_OFFSET: 50,
    INITIAL_COUNT: 5,
    BREAK_TICKS: 60,
    MOVE_SPEED_MIN: 1,
    MOVE_SPEED_RANGE: 2,
    // 平台离开视野顶部多远后回收
    DESPAWN_MARGIN: 100
};

export const CEILING = {
    SPIKE_WIDTH: 20,
    SPIKE_HEIGHT: 15
};

export const MAX_LIVES = 100;

// 尖刺平台每 tick 接触扣 1 点；天花板触碰后玩家会穿过脚下平台下落，单次伤害更高
export const DAMAGE = {
    SPIKE: 1,
    CEILING: 10
};

// 按深度分档的平台概率（累积前的单项概率，剩余为普通平台）
export const DIFFICULTY_TIERS = [
    { minDepth: 500, spike: 0.15, breaking: 0.2, moving: 0.2, spring: 0.15 },
    { minDepth: 200, spike: 0.1, breaking: 0.15, moving: 0.15, spring: 0.1 },
    { minDepth: 100, spike: 0.05, breaking: 0.15, moving: 0.15, spring: 0.1 }
];

export const COLORS = {
    BACKGROUND: '#000',
    DEPTH_LINE: '#333',
    DEPTH_TEXT: '#777',
    CEILING_SPIKE: '#F44336',
    PLAYER: '#00BFFF',
    PLAYER_HURT: '#FF6B6B',
    PLATFORM_FLASH: '#FF6B6B',
    PANEL: '#333',
    TEXT: '#fff',
    ACCENT: '#4CAF50'
};
