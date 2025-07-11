import { PLATFORM_TYPES } from './Platform.js';

// Player Class
export class Player {
    constructor(canvasWidth, canvasHeight) {
        this.width = 30;
        this.height = 40;
        this.x = canvasWidth / 2 - this.width / 2;
        this.y = 100;
        this.velocityX = 0;
        this.velocityY = 0;
        this.isJumping = false;
        this.isOnPlatform = false;
        this.currentPlatform = null;
        this.color = '#00BFFF';
        this.onSpring = false;
        this.canvasWidth = canvasWidth;
    }

    reset(canvasWidth, canvasHeight) {
        Object.assign(this, {
            x: canvasWidth / 2 - this.width / 2,
            y: 100,
            velocityX: 0,
            velocityY: 0,
            isJumping: false,
            isOnPlatform: false,
            currentPlatform: null,
            color: '#00BFFF',
            onSpring: false,
            canvasWidth
        });
    }

    update(keys) {
        this.handleInput(keys);
        this.checkPlatformEdge();
        this.followMovingPlatform();
        this.constrainToScreen();
    }

    handleInput(keys) {
        const leftPressed = keys.ArrowLeft || keys.a || keys.A;
        const rightPressed = keys.ArrowRight || keys.d || keys.D;
        
        if (leftPressed) {
            this.velocityX = -5;
        } else if (rightPressed) {
            this.velocityX = 5;
        } else {
            this.velocityX = 0;
        }

        this.x += this.velocityX;
    }

    checkPlatformEdge() {
        if (this.isOnPlatform && this.currentPlatform) {
            const isOffPlatform = this.x + this.width <= this.currentPlatform.x ||
                                  this.x >= this.currentPlatform.x + this.currentPlatform.width;
            if (isOffPlatform) {
                this.isOnPlatform = false;
                this.currentPlatform = null;
            }
        }
    }

    followMovingPlatform() {
        if (this.isOnPlatform && this.currentPlatform?.type === PLATFORM_TYPES.MOVING) {
            this.x += this.currentPlatform.direction * this.currentPlatform.speed;
        }
    }

    constrainToScreen() {
        this.x = Math.max(0, Math.min(this.x, this.canvasWidth - this.width));
    }

    applyGravity() {
        if (!this.isOnPlatform) {
            this.velocityY += 0.25;
        }
        this.y += this.velocityY;
    }

    jump() {
        if (this.isOnPlatform) {
            this.isOnPlatform = false;
            this.currentPlatform = null;
            this.velocityY = -8;
            return true;
        }
        return false;
    }

    takeDamage() {
        this.color = '#FF6B6B';
        setTimeout(() => {
            this.color = '#00BFFF';
        }, 500);
    }

    draw(ctx, depth) {
        const relativeY = this.y - depth;
        
        // Draw player body
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, relativeY, this.width, this.height);

        // Draw eyes
        ctx.fillStyle = '#000';
        ctx.fillRect(this.x + 5, relativeY + 8, 5, 5);
        ctx.fillRect(this.x + this.width - 10, relativeY + 8, 5, 5);

        // Draw mouth
        ctx.strokeStyle = '#000';
        ctx.beginPath();
        const mouthY = this.velocityY > 0 ? relativeY + 25 : relativeY + 20;
        const startAngle = this.velocityY > 0 ? 0 : Math.PI;
        const endAngle = this.velocityY > 0 ? Math.PI : 0;
        ctx.arc(this.x + this.width / 2, mouthY, 5, startAngle, endAngle, this.velocityY <= 0);
        ctx.stroke();
    }
}