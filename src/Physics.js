import { PLATFORM_TYPES } from './Platform.js';

// Physics Class
export class Physics {
    constructor() {
        this.gravity = 0.25;
        this.jumpPower = 8;
    }

    checkCollisions(player, platforms) {
        const wasOnPlatform = player.isOnPlatform;
        const wasOnSpring = player.onSpring;
        
        player.isOnPlatform = false;
        player.currentPlatform = null;
        player.onSpring = false;

        if (player.velocityY > 0) {
            for (const platform of platforms) {
                if (this.isColliding(player, platform)) {
                    return this.handlePlatformCollision(player, platform, wasOnSpring);
                }
            }
        }
        return null;
    }

    isColliding(player, platform) {
        return (
            player.x + player.width > platform.x &&
            player.x < platform.x + platform.width &&
            player.y + player.height >= platform.y &&
            player.y + player.height <= platform.y + platform.height
        );
    }

    handlePlatformCollision(player, platform, wasOnSpring) {
        if (platform.type === PLATFORM_TYPES.SPIKE) {
            player.velocityY = Math.max(player.velocityY, 2);
            return { type: 'spike', platform };
        }
        
        player.isOnPlatform = true;
        player.currentPlatform = platform;
        player.y = platform.y - player.height;
        player.velocityY = 0;

        if (platform.type === PLATFORM_TYPES.SPRING) {
            player.onSpring = true;
            if (!wasOnSpring) {
                player.velocityY = -this.jumpPower * 1.5;
                player.isOnPlatform = false;
                player.currentPlatform = null;
            }
        }

        if (platform.type === PLATFORM_TYPES.BREAKING) {
            platform.startBreaking();
        }

        return { type: 'platform', platform };
    }

    checkCeilingSpikeCollision(player) {
        if (player.y <= 15) {
            player.velocityY = Math.max(player.velocityY, 2);
            return true;
        }
        return false;
    }

    checkGameBounds(player, depth, canvasHeight) {
        return player.y > depth + canvasHeight;
    }
}