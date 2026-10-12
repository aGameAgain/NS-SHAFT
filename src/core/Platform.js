import { PLATFORM, DIFFICULTY_TIERS } from './config.js';

export const PLATFORM_TYPES = {
    NORMAL: 0,
    MOVING: 1,
    BREAKING: 2,
    SPIKE: 3,
    SPRING: 4,
    CONVEYOR: 5
};

export const PLATFORM_COLORS = {
    [PLATFORM_TYPES.NORMAL]: '#8BC34A',
    [PLATFORM_TYPES.MOVING]: '#9C27B0',
    [PLATFORM_TYPES.BREAKING]: '#FFC107',
    [PLATFORM_TYPES.SPIKE]: '#F44336',
    [PLATFORM_TYPES.SPRING]: '#2196F3',
    [PLATFORM_TYPES.CONVEYOR]: '#9E9E9E'
};

// determinePlatformType 的累积顺序，新增类型只能追加在末尾，否则旧 seed 的关卡会变化
const TIER_KEYS = [
    ['spike', PLATFORM_TYPES.SPIKE],
    ['breaking', PLATFORM_TYPES.BREAKING],
    ['moving', PLATFORM_TYPES.MOVING],
    ['spring', PLATFORM_TYPES.SPRING],
    ['conveyor', PLATFORM_TYPES.CONVEYOR]
];

export class Platform {
    constructor(x, y, type = PLATFORM_TYPES.NORMAL, rng = Math.random) {
        this.x = x;
        this.y = y;
        this.width = PLATFORM.WIDTH;
        this.height = PLATFORM.HEIGHT;
        this.type = type;
        this.breaking = false;
        this.removed = false;
        this.direction = rng() > 0.5 ? 1 : -1;
        this.speed = rng() * PLATFORM.MOVE_SPEED_RANGE + PLATFORM.MOVE_SPEED_MIN;
        // 本 tick 的水平位移，站在上面的玩家据此跟随
        this.dx = 0;
        // 传送带表面速度：站在上面的玩家额外被推动，平台本身不动
        this.surfaceSpeed = type === PLATFORM_TYPES.CONVEYOR ? this.direction * PLATFORM.CONVEYOR_SPEED : 0;
        this.breakTime = type === PLATFORM_TYPES.BREAKING ? PLATFORM.BREAK_TICKS : 0;
        this.color = this.getColor();
    }

    getColor() {
        return PLATFORM_COLORS[this.type] || PLATFORM_COLORS[PLATFORM_TYPES.NORMAL];
    }

    /** @returns {boolean} 平台是否已碎裂、需要移除 */
    update(worldWidth) {
        this.dx = 0;
        if (this.type === PLATFORM_TYPES.MOVING) {
            const prevX = this.x;
            this.x += this.direction * this.speed;
            if (this.x <= 0 || this.x + this.width >= worldWidth) {
                this.x = Math.max(0, Math.min(this.x, worldWidth - this.width));
                this.direction *= -1;
            }
            this.dx = this.x - prevX;
        }

        if (this.breaking) {
            this.breakTime--;
            return this.breakTime <= 0;
        }
        return false;
    }

    startBreaking() {
        if (this.type === PLATFORM_TYPES.BREAKING) {
            this.breaking = true;
        }
    }
}

export class PlatformManager {
    constructor(worldWidth, viewHeight, rng = Math.random, tiers = DIFFICULTY_TIERS) {
        this.platforms = [];
        this.worldWidth = worldWidth;
        this.viewHeight = viewHeight;
        this.rng = rng;
        this.tiers = tiers;
        this.nextSpawnY = 0;
    }

    createInitialPlatforms(playerY) {
        const firstY = playerY + PLATFORM.FIRST_OFFSET;
        this.platforms.push(new Platform(
            this.worldWidth / 2 - PLATFORM.WIDTH / 2,
            firstY,
            PLATFORM_TYPES.NORMAL,
            this.rng
        ));

        for (let i = 1; i < PLATFORM.INITIAL_COUNT; i++) {
            this.createPlatform(firstY + i * PLATFORM.GAP);
        }
        this.nextSpawnY = firstY + (PLATFORM.INITIAL_COUNT - 1) * PLATFORM.GAP + this.randomGap();
    }

    randomGap() {
        return Math.max(PLATFORM.GAP * (1 + this.rng() * PLATFORM.GAP_JITTER), PLATFORM.MIN_GAP);
    }

    createPlatform(y, depth = 0) {
        const x = this.rng() * (this.worldWidth - PLATFORM.WIDTH);
        const type = this.determinePlatformType(depth);
        const platform = new Platform(x, y, type, this.rng);
        this.platforms.push(platform);
        return platform;
    }

    determinePlatformType(depth) {
        const tier = this.tiers.find(t => depth > t.minDepth);
        if (!tier) return PLATFORM_TYPES.NORMAL;

        const rand = this.rng();
        let threshold = 0;
        for (const [key, type] of TIER_KEYS) {
            threshold += tier[key] || 0;
            if (rand < threshold) return type;
        }
        return PLATFORM_TYPES.NORMAL;
    }

    update(depth) {
        const kept = [];
        for (const platform of this.platforms) {
            const broken = platform.update(this.worldWidth);
            const aboveView = platform.y <= depth - PLATFORM.DESPAWN_MARGIN;
            if (broken || aboveView) {
                platform.removed = true;
            } else {
                kept.push(platform);
            }
        }
        this.platforms = kept;

        // 在视野底部之外提前生成一屏，避免平台突然出现
        while (this.nextSpawnY < depth + this.viewHeight + PLATFORM.GAP) {
            this.createPlatform(this.nextSpawnY, depth);
            this.nextSpawnY += this.randomGap();
        }
    }

    setViewHeight(viewHeight) {
        this.viewHeight = viewHeight;
    }

    clear() {
        this.platforms = [];
        this.nextSpawnY = 0;
    }
}
