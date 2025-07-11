// Platform Types Constants
export const PLATFORM_TYPES = {
    NORMAL: 0,
    MOVING: 1,
    BREAKING: 2,
    SPIKE: 3,
    SPRING: 4
};

// Platform Class
export class Platform {
    constructor(x, y, type = PLATFORM_TYPES.NORMAL) {
        this.x = x;
        this.y = y;
        this.width = 80;
        this.height = 15;
        this.type = type;
        this.breaking = false;
        this.direction = Math.random() > 0.5 ? 1 : -1;
        this.speed = Math.random() * 2 + 1;
        this.breakTime = type === PLATFORM_TYPES.BREAKING ? 60 : 0;
        this.color = this.getColor();
    }

    getColor() {
        const colorMap = {
            [PLATFORM_TYPES.NORMAL]: '#8BC34A',
            [PLATFORM_TYPES.MOVING]: '#9C27B0',
            [PLATFORM_TYPES.BREAKING]: '#FFC107',
            [PLATFORM_TYPES.SPIKE]: '#F44336',
            [PLATFORM_TYPES.SPRING]: '#2196F3'
        };
        return colorMap[this.type] || '#8BC34A';
    }

    update(canvasWidth) {
        if (this.type === PLATFORM_TYPES.MOVING) {
            this.x += this.direction * this.speed;
            if (this.x <= 0 || this.x + this.width >= canvasWidth) {
                this.direction *= -1;
            }
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

    draw(ctx, relativeY) {
        if (relativeY >= -this.height && relativeY <= ctx.canvas.height) {
            ctx.fillStyle = this.color;
            
            if (this.breaking && this.breakTime % 5 === 0) {
                ctx.fillStyle = '#FF6B6B';
            }

            ctx.fillRect(this.x, relativeY, this.width, this.height);

            if (this.type === PLATFORM_TYPES.SPIKE) {
                this.drawSpikes(ctx, relativeY);
            } else if (this.type === PLATFORM_TYPES.SPRING) {
                this.drawSpring(ctx, relativeY);
            }
        }
    }

    drawSpikes(ctx, relativeY) {
        ctx.fillStyle = '#F44336';
        for (let i = 0; i < this.width - 10; i += 10) {
            ctx.beginPath();
            ctx.moveTo(this.x + i + 5, relativeY - 10);
            ctx.lineTo(this.x + i + 10, relativeY);
            ctx.lineTo(this.x + i, relativeY);
            ctx.fill();
        }
    }

    drawSpring(ctx, relativeY) {
        ctx.fillStyle = '#2196F3';
        for (let i = 0; i < 3; i++) {
            ctx.fillRect(
                this.x + this.width / 4,
                relativeY + this.height + i * 3,
                this.width / 2,
                2
            );
        }
    }
}

// PlatformManager Class
export class PlatformManager {
    constructor(canvasWidth, canvasHeight) {
        this.platforms = [];
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.PLATFORM_GAP = 150;
        this.MAX_PLATFORMS = 5;
    }

    createInitialPlatforms(playerY) {
        this.platforms.push(new Platform(
            this.canvasWidth / 2 - 40,
            playerY + 50,
            PLATFORM_TYPES.NORMAL
        ));

        for (let i = 1; i < this.MAX_PLATFORMS; i++) {
            this.createPlatform(playerY + 50 + i * this.PLATFORM_GAP);
        }
    }

    createPlatform(y, depth = 0) {
        const x = Math.random() * (this.canvasWidth - 80);
        const type = this.determinePlatformType(depth);
        this.platforms.push(new Platform(x, y, type));
    }

    determinePlatformType(depth) {
        const rand = Math.random();
        
        if (depth > 500) {
            if (rand < 0.15) return PLATFORM_TYPES.SPIKE;
            if (rand < 0.35) return PLATFORM_TYPES.BREAKING;
            if (rand < 0.55) return PLATFORM_TYPES.MOVING;
            if (rand < 0.7) return PLATFORM_TYPES.SPRING;
        } else if (depth > 200) {
            if (rand < 0.1) return PLATFORM_TYPES.SPIKE;
            if (rand < 0.25) return PLATFORM_TYPES.BREAKING;
            if (rand < 0.4) return PLATFORM_TYPES.MOVING;
            if (rand < 0.5) return PLATFORM_TYPES.SPRING;
        } else if (depth > 100) {
            if (rand < 0.05) return PLATFORM_TYPES.SPIKE;
            if (rand < 0.2) return PLATFORM_TYPES.BREAKING;
            if (rand < 0.35) return PLATFORM_TYPES.MOVING;
            if (rand < 0.45) return PLATFORM_TYPES.SPRING;
        }
        return PLATFORM_TYPES.NORMAL;
    }

    update(depth, spawnDepth) {
        this.platforms = this.platforms.filter(platform => platform.y > depth - 100);
        
        for (let i = this.platforms.length - 1; i >= 0; i--) {
            const platform = this.platforms[i];
            if (platform.update(this.canvasWidth)) {
                this.platforms.splice(i, 1);
            }
        }

        if (spawnDepth < depth + this.canvasHeight) {
            const newGap = Math.max(this.PLATFORM_GAP * (1 + Math.random() * 0.5), 120);
            this.createPlatform(spawnDepth + newGap, depth);
            return spawnDepth + newGap;
        }

        while (this.platforms.length < this.MAX_PLATFORMS) {
            const newGap = Math.max(this.PLATFORM_GAP * (1 + Math.random() * 0.5), 120);
            this.createPlatform(spawnDepth, depth);
            spawnDepth += newGap;
        }

        return spawnDepth;
    }

    draw(ctx, depth) {
        this.platforms.forEach(platform => {
            const relativeY = platform.y - depth;
            platform.draw(ctx, relativeY);
        });
    }

    // Update canvas dimensions without affecting existing platforms
    updateCanvasDimensions(newWidth, newHeight) {
        this.canvasWidth = newWidth;
        this.canvasHeight = newHeight;
        
        // Constrain existing platforms to new canvas width
        this.platforms.forEach(platform => {
            if (platform.x + platform.width > this.canvasWidth) {
                platform.x = this.canvasWidth - platform.width;
            }
            if (platform.x < 0) {
                platform.x = 0;
            }
        });
    }

    clear() {
        this.platforms = [];
    }
}