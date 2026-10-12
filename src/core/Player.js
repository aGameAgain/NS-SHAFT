import { PLAYER } from './config.js';

export class Player {
    constructor(worldWidth) {
        this.width = PLAYER.WIDTH;
        this.height = PLAYER.HEIGHT;
        this.reset(worldWidth);
    }

    reset(worldWidth = this.worldWidth) {
        this.worldWidth = worldWidth;
        this.x = worldWidth / 2 - this.width / 2;
        this.y = PLAYER.START_Y;
        this.prevY = this.y;
        this.velocityX = 0;
        this.velocityY = 0;
        this.isOnPlatform = false;
        this.currentPlatform = null;
        this.hurtTicks = 0;
        this.coyoteTicks = 0;
    }

    /** @param {{left?: boolean, right?: boolean}} input */
    update(input) {
        if (!this.isOnPlatform && this.coyoteTicks > 0) this.coyoteTicks--;
        this.handleInput(input);
        this.followMovingPlatform();
        this.constrainToScreen();
        this.checkPlatformEdge();
        if (this.hurtTicks > 0) this.hurtTicks--;
    }

    handleInput(input) {
        if (input.left && !input.right) {
            this.velocityX = -PLAYER.MOVE_SPEED;
        } else if (input.right && !input.left) {
            this.velocityX = PLAYER.MOVE_SPEED;
        } else {
            this.velocityX = 0;
        }
        this.x += this.velocityX;
    }

    checkPlatformEdge() {
        const platform = this.currentPlatform;
        if (!this.isOnPlatform || !platform) return;

        const isOffPlatform = platform.removed ||
            this.x + this.width <= platform.x ||
            this.x >= platform.x + platform.width;
        if (isOffPlatform) {
            this.leavePlatform({ coyote: true });
        }
    }

    followMovingPlatform() {
        if (this.isOnPlatform && this.currentPlatform && !this.currentPlatform.removed) {
            this.x += (this.currentPlatform.dx || 0) + (this.currentPlatform.surfaceSpeed || 0);
        }
    }

    constrainToScreen() {
        this.x = Math.max(0, Math.min(this.x, this.worldWidth - this.width));
    }

    applyGravity() {
        this.prevY = this.y;
        if (!this.isOnPlatform) {
            this.velocityY += PLAYER.GRAVITY;
        }
        this.y += this.velocityY;
    }

    get canJump() {
        return this.isOnPlatform || this.coyoteTicks > 0;
    }

    jump() {
        if (!this.canJump) return false;
        this.leavePlatform();
        this.velocityY = -PLAYER.JUMP_POWER;
        return true;
    }

    landOn(platform) {
        this.isOnPlatform = true;
        this.currentPlatform = platform;
        this.y = platform.y - this.height;
        this.velocityY = 0;
        this.coyoteTicks = 0;
    }

    /** @param {{coyote?: boolean}} [options] coyote：自己走出边缘时保留短暂的起跳窗口 */
    leavePlatform({ coyote = false } = {}) {
        this.isOnPlatform = false;
        this.currentPlatform = null;
        this.coyoteTicks = coyote ? PLAYER.COYOTE_TICKS : 0;
    }

    takeDamage() {
        this.hurtTicks = PLAYER.HURT_TICKS;
    }

    get isHurt() {
        return this.hurtTicks > 0;
    }

    get bottom() {
        return this.y + this.height;
    }
}
