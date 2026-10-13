import { PLAYER, CEILING, SPRING_BOOST } from './config.js';
import { PLATFORM_TYPES } from './Platform.js';

export class Physics {
    /** @param {{spikeStandable?: boolean}} [options] */
    constructor({ spikeStandable = false } = {}) {
        this.gravity = PLAYER.GRAVITY;
        this.jumpPower = PLAYER.JUMP_POWER;
        this.spikeStandable = spikeStandable;
    }

    /**
     * 扫掠式落地检测：用上一 tick 与当前 tick 的脚底位置判断是否「穿过」平台顶面，
     * 高速下落也不会穿透。站立时脚底恰好等于平台顶面，会被持续判定为落地。
     * 可穿过的尖刺平台例外：脚底这一 tick 的轨迹与平台厚度有交集就算接触，
     * 穿过期间每 tick 都会返回 spike。
     * @param {number} [minPlatformY] 顶面高于此值的平台被忽略（用于天花板击落）
     */
    checkCollisions(player, platforms, minPlatformY = -Infinity) {
        player.isOnPlatform = false;
        player.currentPlatform = null;

        if (player.velocityY < 0) return null;

        let target = null;
        let spikeContact = null;
        for (const platform of platforms) {
            if (platform.y < minPlatformY) continue;
            if (platform.type === PLATFORM_TYPES.SPIKE && !this.spikeStandable) {
                if (!spikeContact && this.isTouchingBand(player, platform)) spikeContact = platform;
            } else if (this.isColliding(player, platform) && (!target || platform.y < target.y)) {
                target = platform;
            }
        }
        if (target) return this.handlePlatformCollision(player, target);
        if (spikeContact) return this.handlePlatformCollision(player, spikeContact);
        return null;
    }

    overlapsHorizontally(player, platform) {
        return player.x + player.width > platform.x && player.x < platform.x + platform.width;
    }

    isColliding(player, platform) {
        const prevBottom = (player.prevY ?? player.y) + player.height;
        const bottom = player.y + player.height;
        return this.overlapsHorizontally(player, platform) && prevBottom <= platform.y && bottom >= platform.y;
    }

    isTouchingBand(player, platform) {
        const prevBottom = (player.prevY ?? player.y) + player.height;
        const bottom = player.y + player.height;
        return (
            this.overlapsHorizontally(player, platform) &&
            prevBottom <= platform.y + platform.height &&
            bottom >= platform.y
        );
    }

    handlePlatformCollision(player, platform) {
        if (platform.type === PLATFORM_TYPES.SPIKE && !this.spikeStandable) {
            player.velocityY = Math.max(player.velocityY, 2);
            return { type: 'spike', platform };
        }

        player.landOn(platform);

        if (platform.type === PLATFORM_TYPES.SPIKE) {
            return { type: 'spike', platform };
        }

        if (platform.type === PLATFORM_TYPES.SPRING) {
            player.leavePlatform();
            player.velocityY = -this.jumpPower * SPRING_BOOST;
            return { type: 'spring', platform };
        }

        if (platform.type === PLATFORM_TYPES.BREAKING) {
            platform.startBreaking();
        }

        return { type: 'platform', platform };
    }

    /** 天花板尖刺在屏幕顶部，必须用相对镜头的坐标判断 */
    checkCeilingSpikeCollision(player, depth) {
        if (player.y - depth <= CEILING.SPIKE_HEIGHT) {
            player.leavePlatform();
            player.velocityY = Math.max(player.velocityY, 2);
            return true;
        }
        return false;
    }

    /** 站上该平台就会顶到天花板的高度阈值 */
    ceilingLandingLimit(player, depth) {
        return depth + CEILING.SPIKE_HEIGHT + player.height;
    }

    checkGameBounds(player, depth, viewHeight) {
        return player.y > depth + viewHeight;
    }
}
