import { TICK_MS } from '../core/config.js';
import { GameSession } from '../core/GameSession.js';
import { randomSeed } from '../core/rng.js';
import { Renderer } from '../render/Renderer.js';
import { InputState } from './InputState.js';
import { computeLayout, getTouchButtons, hitTest } from './layout.js';

const BEST_DEPTH_KEY = 'ns-shaft:bestDepth';
// 单帧最多追帧数，防止切后台回来后一次性模拟太久
const MAX_STEPS_PER_FRAME = 5;
// 游戏结束后短暂屏蔽输入，避免误触立即重开
const GAMEOVER_INPUT_DELAY_TICKS = 30;

/**
 * @typedef {object} PlatformAdapter
 * @property {string} name
 * @property {object} canvas                      主画布（需支持 getContext('2d')、width/height）
 * @property {() => {width: number, height: number, pixelRatio?: number, safeTop?: number}} getViewport  CSS 像素
 * @property {boolean} touchCapable
 * @property {(cb: () => void) => void} onResize
 * @property {(h: {down: Function, move: Function, up: Function}) => void} onPointer  坐标为相对画布的 CSS 像素
 * @property {(cb: (key: string, pressed: boolean) => void) => void} onKey
 * @property {(cb: (visible: boolean) => void) => void} onVisibility
 * @property {{get: (key: string) => string|null, set: (key: string, value: string) => void}} storage
 * @property {(cb: () => void) => void} requestFrame
 * @property {() => number} now                    毫秒
 */

export class GameApp {
    /**
     * @param {PlatformAdapter} platform
     * @param {{seed?: number, debug?: boolean, touchControls?: boolean}} [options]
     */
    constructor(platform, options = {}) {
        this.platform = platform;
        this.fixedSeed = options.seed;
        this.debugEnabled = Boolean(options.debug);
        this.touchControls = options.touchControls ?? platform.touchCapable;

        this.input = new InputState();
        this.ctx = platform.canvas.getContext('2d');
        this.renderer = new Renderer(this.ctx);
        this.scene = 'title';
        this.sceneTicks = 0;
        this.bestDepth = Number(platform.storage.get(BEST_DEPTH_KEY)) || 0;
        this.pointers = new Map();
        this.running = false;
        this.accumulator = 0;
        this.fps = 0;

        this.updateLayout();
        this.session = new GameSession({ viewHeight: this.layout.worldHeight, seed: this.nextSeed() });
        this.bindPlatform();
    }

    nextSeed() {
        return this.fixedSeed ?? randomSeed();
    }

    updateLayout() {
        this.layout = computeLayout(this.platform.getViewport(), { touchControls: this.touchControls });
        this.buttons = getTouchButtons(this.layout);
        const { canvas } = this.platform;
        if (canvas.width !== this.layout.canvasWidth) canvas.width = this.layout.canvasWidth;
        if (canvas.height !== this.layout.canvasHeight) canvas.height = this.layout.canvasHeight;
        this.session?.setViewHeight(this.layout.worldHeight);
    }

    bindPlatform() {
        const { platform } = this;
        platform.onResize(() => this.updateLayout());
        platform.onKey((key, pressed) => this.handleKey(key, pressed));
        platform.onVisibility(visible => {
            if (!visible) {
                this.input.clear();
                this.pointers.clear();
                if (this.scene === 'playing') this.setScene('paused');
            }
        });
        platform.onPointer({
            down: (id, x, y) => this.handlePointer(id, x, y, true),
            move: (id, x, y) => {
                if (this.pointers.has(id)) this.handlePointer(id, x, y, false);
            },
            up: id => this.releasePointer(id)
        });
    }

    start() {
        if (this.running) return;
        this.running = true;
        this.lastTime = this.platform.now();
        this.fpsWindowStart = this.lastTime;
        this.fpsFrames = 0;
        const frame = () => {
            if (!this.running) return;
            this.frame();
            this.platform.requestFrame(frame);
        };
        this.platform.requestFrame(frame);
    }

    stop() {
        this.running = false;
    }

    frame() {
        const now = this.platform.now();
        this.accumulator += Math.min(now - this.lastTime, TICK_MS * MAX_STEPS_PER_FRAME);
        this.lastTime = now;

        let steps = 0;
        // 容差用于吸收浮点误差，避免 60Hz 屏幕上偶发「这帧 0 tick、下帧 2 tick」
        while (this.accumulator >= TICK_MS - 1e-3 && steps < MAX_STEPS_PER_FRAME) {
            this.tick();
            this.accumulator -= TICK_MS;
            steps++;
        }

        this.fpsFrames++;
        if (now - this.fpsWindowStart >= 500) {
            this.fps = (this.fpsFrames * 1000) / (now - this.fpsWindowStart);
            this.fpsWindowStart = now;
            this.fpsFrames = 0;
        }
        this.render();
    }

    tick() {
        this.sceneTicks++;
        if (this.scene !== 'playing') return;

        this.session.step(this.input.consume());
        if (this.session.isOver) {
            this.recordBest(this.session.depth);
            this.setScene('gameover');
        }
    }

    render() {
        this.renderer.render({
            scene: this.scene,
            session: this.session,
            layout: this.layout,
            buttons: this.buttons,
            pressed: this.input.pressedButtons(),
            bestDepth: this.bestDepth,
            touchControls: this.touchControls,
            debug: this.debugEnabled ? { fps: this.fps } : null
        });
    }

    setScene(scene) {
        this.scene = scene;
        this.sceneTicks = 0;
    }

    startGame() {
        this.session.reset(this.nextSeed());
        this.input.clearQueued();
        this.accumulator = 0;
        this.setScene('playing');
    }

    togglePause() {
        if (this.scene === 'playing') this.setScene('paused');
        else if (this.scene === 'paused') this.setScene('playing');
    }

    /** 标题/暂停/结束界面上的「确认」操作 */
    confirm() {
        if (this.scene === 'title') this.startGame();
        else if (this.scene === 'paused') this.setScene('playing');
        else if (this.scene === 'gameover' && this.sceneTicks >= GAMEOVER_INPUT_DELAY_TICKS) this.startGame();
    }

    recordBest(depth) {
        if (depth > this.bestDepth) {
            this.bestDepth = Math.floor(depth);
            this.platform.storage.set(BEST_DEPTH_KEY, String(this.bestDepth));
        }
    }

    handleKey(rawKey, pressed) {
        const key = rawKey.length === 1 ? rawKey.toLowerCase() : rawKey;
        if (pressed && this.scene !== 'playing' && (key === ' ' || key === 'Enter')) {
            this.confirm();
            return;
        }
        if (pressed && (key === 'p' || key === 'Escape')) {
            this.togglePause();
            return;
        }
        if (pressed && key === 'r') {
            this.startGame();
            return;
        }
        if (pressed && key === '`') {
            this.debugEnabled = !this.debugEnabled;
            return;
        }
        this.input.setKey(key, pressed);
    }

    toLogical(x, y) {
        return { x: x / this.layout.scale, y: y / this.layout.scale };
    }

    handlePointer(id, x, y, isDown) {
        const p = this.toLogical(x, y);
        const button = hitTest(this.buttons, p.x, p.y);

        if (isDown && this.scene !== 'playing') {
            this.confirm();
            this.pointers.set(id, null);
            return;
        }

        const prev = this.pointers.get(id);
        const next = button?.id ?? null;
        if (prev === next && !isDown) return;
        if (prev) this.input.setButton(prev, false);
        if (next) this.input.setButton(next, true);
        this.pointers.set(id, next);
    }

    releasePointer(id) {
        const prev = this.pointers.get(id);
        if (prev) this.input.setButton(prev, false);
        this.pointers.delete(id);
    }

    /** 调试 / 测试钩子：同步推进 n 个 tick */
    advance(ticks = 1) {
        for (let i = 0; i < ticks; i++) this.tick();
        this.render();
    }

    getSnapshot() {
        return {
            platform: this.platform.name,
            scene: this.scene,
            bestDepth: this.bestDepth,
            touchControls: this.touchControls,
            layout: {
                width: this.layout.width,
                height: this.layout.height,
                worldTop: this.layout.worldTop,
                worldHeight: this.layout.worldHeight,
                controlsTop: this.layout.controlsTop,
                scale: this.layout.scale
            },
            buttons: this.buttons.map(({ id, x, y, width, height }) => ({ id, x, y, width, height })),
            ...this.session.snapshot()
        };
    }
}
