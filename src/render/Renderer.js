import { CEILING, COLORS, MAX_LIVES } from '../core/config.js';
import { PLATFORM_TYPES } from '../core/Platform.js';

const FONT = 'sans-serif';

/**
 * 只依赖 CanvasRenderingContext2D 的通用子集，浏览器和微信小游戏共用。
 * 所有坐标都是逻辑坐标，缩放由 setTransform 统一处理。
 */
export class Renderer {
    constructor(ctx) {
        this.ctx = ctx;
    }

    /**
     * @param {object} frame
     * @param {'title'|'playing'|'paused'|'gameover'} frame.scene
     * @param {import('../core/GameSession.js').GameSession} frame.session
     * @param {ReturnType<import('../app/layout.js').computeLayout>} frame.layout
     * @param {Array} [frame.buttons]
     * @param {Set<string>} [frame.pressed]
     * @param {number} [frame.bestDepth]
     * @param {object|null} [frame.debug]
     */
    render(frame) {
        const { ctx } = this;
        const { layout } = frame;
        const k = layout.scale * layout.pixelRatio;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, layout.canvasWidth, layout.canvasHeight);
        ctx.setTransform(k, 0, 0, k, 0, 0);

        ctx.fillStyle = COLORS.PANEL;
        ctx.fillRect(0, 0, layout.width, layout.height);

        this.drawWorld(frame);
        this.drawHud(frame);
        this.drawTouchControls(frame);
        this.drawOverlay(frame);
        if (frame.debug) this.drawDebug(frame);
    }

    drawWorld({ session, layout, debug }) {
        const { ctx } = this;
        const depth = session.depth;
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, layout.worldTop, layout.width, layout.worldHeight);
        ctx.clip();
        ctx.translate(0, layout.worldTop);

        this.drawBackground(depth, layout);
        this.drawCeilingSpikes(layout);
        for (const platform of session.platforms) {
            const relativeY = platform.y - depth;
            if (relativeY >= -platform.height - 10 && relativeY <= layout.worldHeight) {
                this.drawPlatform(platform, relativeY);
                if (debug) this.drawHitbox(platform.x, relativeY, platform.width, platform.height);
            }
        }
        this.drawPlayer(session.player, session.player.y - depth);
        if (debug) {
            const p = session.player;
            this.drawHitbox(p.x, p.y - depth, p.width, p.height);
        }
        ctx.restore();
    }

    drawBackground(depth, layout) {
        const { ctx } = this;
        ctx.fillStyle = COLORS.BACKGROUND;
        ctx.fillRect(0, 0, layout.width, layout.worldHeight);

        ctx.font = `12px ${FONT}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        for (let d = Math.floor(depth / 100) * 100; d <= depth + layout.worldHeight; d += 100) {
            const y = d - depth;
            ctx.fillStyle = COLORS.DEPTH_LINE;
            ctx.fillRect(0, y, layout.width, 1);
            ctx.fillStyle = COLORS.DEPTH_TEXT;
            ctx.fillText(`${d}m`, 5, y - 5);
        }
    }

    drawCeilingSpikes(layout) {
        const { ctx } = this;
        const { SPIKE_WIDTH: w, SPIKE_HEIGHT: h } = CEILING;
        ctx.fillStyle = COLORS.CEILING_SPIKE;
        for (let x = 0; x < layout.width; x += w) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x + w / 2, h);
            ctx.lineTo(x + w, 0);
            ctx.fill();
        }
    }

    drawPlatform(platform, relativeY) {
        const { ctx } = this;
        ctx.fillStyle = platform.breaking && platform.breakTime % 5 === 0
            ? COLORS.PLATFORM_FLASH
            : platform.color;
        ctx.fillRect(platform.x, relativeY, platform.width, platform.height);

        if (platform.type === PLATFORM_TYPES.SPIKE) {
            ctx.fillStyle = platform.color;
            for (let i = 0; i < platform.width - 10; i += 10) {
                ctx.beginPath();
                ctx.moveTo(platform.x + i + 5, relativeY - 10);
                ctx.lineTo(platform.x + i + 10, relativeY);
                ctx.lineTo(platform.x + i, relativeY);
                ctx.fill();
            }
        } else if (platform.type === PLATFORM_TYPES.SPRING) {
            ctx.fillStyle = platform.color;
            for (let i = 0; i < 3; i++) {
                ctx.fillRect(
                    platform.x + platform.width / 4,
                    relativeY + platform.height + i * 3,
                    platform.width / 2,
                    2
                );
            }
        }
    }

    drawPlayer(player, relativeY) {
        const { ctx } = this;
        ctx.fillStyle = player.isHurt ? COLORS.PLAYER_HURT : COLORS.PLAYER;
        ctx.fillRect(player.x, relativeY, player.width, player.height);

        ctx.fillStyle = '#000';
        ctx.fillRect(player.x + 5, relativeY + 8, 5, 5);
        ctx.fillRect(player.x + player.width - 10, relativeY + 8, 5, 5);

        const falling = player.velocityY > 0;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(
            player.x + player.width / 2,
            falling ? relativeY + 25 : relativeY + 20,
            5,
            falling ? 0 : Math.PI,
            falling ? Math.PI : 0,
            !falling
        );
        ctx.stroke();
    }

    drawHud({ session, layout }) {
        const { ctx } = this;
        const y = layout.hudTop + layout.hudHeight / 2;
        ctx.fillStyle = COLORS.PANEL;
        ctx.fillRect(0, 0, layout.width, layout.worldTop);

        ctx.fillStyle = COLORS.TEXT;
        ctx.font = `16px ${FONT}`;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';
        ctx.fillText(`深度: ${Math.floor(session.depth)}m`, 10, y);
        ctx.textAlign = 'right';
        ctx.fillText(`生命值: ${session.state.lives}/${MAX_LIVES}`, layout.width - 10, y);
    }

    drawTouchControls({ layout, buttons = [], pressed }) {
        if (!layout.controlsHeight) return;
        const { ctx } = this;
        ctx.fillStyle = COLORS.PANEL;
        ctx.fillRect(0, layout.controlsTop, layout.width, layout.height - layout.controlsTop);

        ctx.font = `28px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (const b of buttons) {
            ctx.fillStyle = pressed?.has(b.id) ? '#2E7D32' : COLORS.ACCENT;
            ctx.fillRect(b.x, b.y, b.width, b.height);
            ctx.fillStyle = COLORS.TEXT;
            ctx.fillText(b.label, b.x + b.width / 2, b.y + b.height / 2);
        }
    }

    drawOverlay({ scene, session, layout, bestDepth = 0, touchControls }) {
        if (scene === 'playing') return;
        const { ctx } = this;
        const cx = layout.width / 2;
        const cy = layout.worldTop + layout.worldHeight / 2;
        const action = touchControls ? '点击屏幕' : '按空格 / 回车';

        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, layout.worldTop, layout.width, layout.worldHeight);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = COLORS.TEXT;

        const lines = {
            title: [['NS-SHAFT', 36], [`${action}开始游戏`, 18], [`最佳深度: ${Math.floor(bestDepth)}m`, 14]],
            paused: [['已暂停', 32], [`${action}继续`, 18]],
            gameover: [
                ['游戏结束', 32],
                [`你的最终深度: ${Math.floor(session.depth)}m`, 18],
                [`最佳深度: ${Math.floor(bestDepth)}m`, 14],
                [`${action}再试一次`, 18]
            ]
        }[scene] || [];

        const lineHeight = 44;
        let y = cy - ((lines.length - 1) * lineHeight) / 2;
        for (const [text, size] of lines) {
            ctx.font = `${size}px ${FONT}`;
            ctx.fillText(text, cx, y);
            y += lineHeight;
        }
    }

    drawHitbox(x, y, w, h) {
        const { ctx } = this;
        ctx.strokeStyle = '#0F0';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, w, h);
    }

    drawDebug({ session, layout, debug }) {
        const { ctx } = this;
        const p = session.player;
        const rows = [
            `fps ${debug.fps.toFixed(0)}  tick ${session.tick}  seed ${session.seed}`,
            `player x ${p.x.toFixed(1)} y ${p.y.toFixed(1)} vy ${p.velocityY.toFixed(2)}`,
            `onPlatform ${p.isOnPlatform}  platforms ${session.platforms.length}`
        ];
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, layout.worldTop + 20, layout.width, rows.length * 14 + 6);
        ctx.fillStyle = '#0F0';
        ctx.font = `11px monospace`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        rows.forEach((row, i) => ctx.fillText(row, 4, layout.worldTop + 23 + i * 14));
    }
}
