import { CEILING, COLORS } from '../core/config.js';
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
                this.drawPlatform(platform, relativeY, session.tick);
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

    drawPlatform(platform, relativeY, tick = 0) {
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
        } else if (platform.type === PLATFORM_TYPES.CONVEYOR) {
            this.drawConveyor(platform, relativeY, tick);
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

    /** 箭头随 tick 沿传送方向滚动 */
    drawConveyor(platform, relativeY, tick) {
        const { ctx } = this;
        const step = 12;
        const dir = Math.sign(platform.surfaceSpeed) || 1;
        const offset = ((tick * Math.abs(platform.surfaceSpeed)) % step) * dir;
        const midY = relativeY + platform.height / 2;
        ctx.save();
        ctx.beginPath();
        ctx.rect(platform.x, relativeY, platform.width, platform.height);
        ctx.clip();
        ctx.strokeStyle = '#424242';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let x = platform.x - step; x < platform.x + platform.width + step; x += step) {
            const tip = x + offset + dir * 4;
            ctx.moveTo(x + offset - dir * 2, relativeY + 3);
            ctx.lineTo(tip, midY);
            ctx.lineTo(x + offset - dir * 2, relativeY + platform.height - 3);
        }
        ctx.stroke();
        ctx.restore();
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

    drawHud({ session, layout, hudLabel }) {
        const label = hudLabel ?? (session.rules.id === 'classic' ? '' : session.rules.name);
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
        ctx.fillText(`生命值: ${session.state.lives}/${session.state.maxLives}`, layout.width - 10, y);

        if (label) {
            ctx.font = `12px ${FONT}`;
            ctx.textAlign = 'center';
            ctx.fillStyle = '#FFC107';
            ctx.fillText(label, layout.width / 2, y);
        }
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

    drawOverlay(frame) {
        const { scene, layout } = frame;
        if (scene === 'playing') return;
        const { ctx } = this;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, layout.worldTop, layout.width, layout.worldHeight);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const cx = layout.width / 2;
        const cy = layout.worldTop + layout.worldHeight / 2;
        const text = (value, dy, size, color = COLORS.TEXT) => {
            ctx.font = `${size}px ${FONT}`;
            ctx.fillStyle = color;
            ctx.fillText(value, cx, cy + dy);
        };

        if (scene === 'paused') {
            text('已暂停', -22, 32);
            text(`${frame.touchControls ? '点击屏幕' : '按空格 / 回车'}继续`, 22, 18);
            return;
        }

        const { session, bestDepth = 0, mode = 'normal' } = frame;
        if (scene === 'title') {
            text('NS-SHAFT', -120, 36);
            text(`最佳深度: ${Math.floor(bestDepth)}m`, -72, 14);
            if (frame.notice) text(frame.notice, -48, 13, '#FF8A65');
            if (!frame.touchControls) text('← → 切换模式 · 空格开始 · C 每日挑战 · M 静音', 220, 12, '#aaa');
        } else if (scene === 'gameover') {
            text(mode === 'replay' ? '回放结束' : '游戏结束', -110, 32);
            text(`你的最终深度: ${Math.floor(session.depth)}m`, -60, 18);
            if (mode !== 'replay') {
                text(`${mode === 'daily' ? '今日最佳' : '最佳深度'}: ${Math.floor(bestDepth)}m`, -22, 14);
            }
            if (!frame.touchControls) text('空格 / 回车 再来一局 · Esc 返回标题', 175, 12, '#aaa');
        }
        this.drawMenu(frame);
    }

    menuLabel(id, { modeName = '', dailyKey = '', mode = 'normal', muted = false }) {
        switch (id) {
            case 'mode': return `◀ 模式: ${modeName} ▶`;
            case 'start': return '开始游戏';
            case 'daily': return `每日挑战 ${dailyKey.slice(5)}`;
            case 'retry': return mode === 'replay' ? '重新播放' : mode === 'daily' ? '再次挑战' : '再试一次';
            case 'title': return '返回标题';
            case 'sound': return `音效: ${muted ? '关' : '开'}`;
            default: return id;
        }
    }

    drawMenu(frame) {
        const { ctx } = this;
        ctx.font = `18px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (const b of frame.menu || []) {
            ctx.fillStyle = b.id === 'mode' || b.id === 'title' || b.id === 'sound' ? '#555' : COLORS.ACCENT;
            ctx.fillRect(b.x, b.y, b.width, b.height);
            ctx.fillStyle = COLORS.TEXT;
            ctx.fillText(this.menuLabel(b.id, frame), b.x + b.width / 2, b.y + b.height / 2);
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
