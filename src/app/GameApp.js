import { TICK_MS } from '../core/config.js';
import { GameSession } from '../core/GameSession.js';
import { randomSeed } from '../core/rng.js';
import { DEFAULT_RULESET, RULESET_IDS, getRules } from '../core/rules.js';
import { ReplayPlayer, ReplayRecorder, dailySeed, decodeReplay } from '../core/replay.js';
import { Renderer } from '../render/Renderer.js';
import { InputState } from './InputState.js';
import { SoundPlayer } from './SoundPlayer.js';
import { computeLayout, getMenuButtons, getTouchButtons, hitTest } from './layout.js';

const BEST_DEPTH_KEY = 'ns-shaft:bestDepth';
const RULES_KEY = 'ns-shaft:rules';
const MUTED_KEY = 'ns-shaft:muted';
// 单帧最多追帧数，防止切后台回来后一次性模拟太久
const MAX_STEPS_PER_FRAME = 5;
// 游戏结束后短暂屏蔽输入，避免误触立即重开
const GAMEOVER_INPUT_DELAY_TICKS = 30;

/** @typedef {'title'|'playing'|'paused'|'gameover'} Scene */

/**
 * @typedef {object} PlatformAdapter
 * @property {string} name
 * @property {{width: number, height: number, getContext: (type: '2d') => any}} canvas  主画布
 * @property {() => {width: number, height: number, pixelRatio?: number, safeTop?: number}} getViewport  CSS 像素
 * @property {boolean} touchCapable
 * @property {(cb: () => void) => void} onResize
 * @property {(h: {down: Function, move: Function, up: Function}) => void} onPointer  坐标为相对画布的 CSS 像素
 * @property {(cb: (key: string, pressed: boolean) => void) => void} onKey
 * @property {(cb: (visible: boolean) => void) => void} onVisibility
 * @property {{get: (key: string) => string|null, set: (key: string, value: string) => void}} storage
 * @property {(cb: () => void) => void} requestFrame
 * @property {() => number} now                    毫秒
 * @property {() => any} [createAudioContext]  返回 WebAudio 兼容的 AudioContext，不支持时为 null
 */

/**
 * @typedef {object} GameAppOptions
 * @property {number} [seed]           固定 seed（调试用）
 * @property {string} [rules]          规则预设 id，覆盖本地保存的选择
 * @property {string} [replay]         启动后直接播放的回放编码
 * @property {boolean} [debug]
 * @property {boolean} [touchControls]
 * @property {() => Date} [today]      每日挑战取日期的来源，测试时可注入
 * @property {{handleEvents: (events: Array<{type: string}>) => void, unlock?: () => void, toggleMute?: () => boolean, muted?: boolean}|null} [sound]
 *   默认在平台提供 createAudioContext 时使用 SoundPlayer，传 null 关闭音效
 */

export class GameApp {
    /**
     * @param {PlatformAdapter} platform
     * @param {GameAppOptions} [options]
     */
    constructor(platform, options = {}) {
        this.platform = platform;
        this.fixedSeed = options.seed;
        this.debugEnabled = Boolean(options.debug);
        this.touchControls = options.touchControls ?? platform.touchCapable;
        this.today = options.today || (() => new Date());
        this.sound = options.sound !== undefined ? options.sound : this.createSoundPlayer();

        this.input = new InputState();
        this.ctx = platform.canvas.getContext('2d');
        this.renderer = new Renderer(this.ctx);
        /** @type {Scene} */
        this.scene = 'title';
        this.sceneTicks = 0;
        /** @type {'normal'|'daily'|'replay'} */
        this.mode = 'normal';
        this.rulesId = getRules(options.rules ?? platform.storage.get(RULES_KEY) ?? DEFAULT_RULESET).id;
        this.daily = null;
        this.recorder = null;
        this.replayPlayer = null;
        this.notice = '';
        this.pointers = new Map();
        this.running = false;
        this.accumulator = 0;
        this.fps = 0;

        this.updateLayout();
        this.session = new GameSession({
            viewHeight: this.layout.worldHeight,
            seed: this.nextSeed(),
            rules: this.rulesId
        });
        this.bestDepth = this.loadBest();
        this.bindPlatform();

        if (options.replay) this.startReplay(options.replay);
    }

    createSoundPlayer() {
        const { platform } = this;
        if (typeof platform.createAudioContext !== 'function') return null;
        return new SoundPlayer(() => platform.createAudioContext(), {
            muted: platform.storage.get(MUTED_KEY) === '1'
        });
    }

    toggleMute() {
        if (!this.sound?.toggleMute) return;
        this.sound.unlock?.();
        const muted = this.sound.toggleMute();
        this.platform.storage.set(MUTED_KEY, muted ? '1' : '0');
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

    get menuButtons() {
        return getMenuButtons(this.layout, this.scene, { sound: Boolean(this.sound?.toggleMute) });
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

        let input;
        if (this.mode === 'replay') {
            input = this.replayPlayer.next();
            this.input.consume();
        } else {
            input = this.input.consume();
            this.recorder.record(input);
        }

        const events = this.session.step(input);
        this.sound?.handleEvents(events);
        if (this.session.isOver) {
            if (this.mode !== 'replay') this.recordBest(this.session.depth);
            this.setScene('gameover');
        }
    }

    render() {
        const rules = getRules(this.rulesId);
        this.renderer.render({
            scene: this.scene,
            session: this.session,
            layout: this.layout,
            buttons: this.buttons,
            pressed: this.input.pressedButtons(),
            menu: this.menuButtons,
            bestDepth: this.bestDepth,
            mode: this.mode,
            modeName: rules.name,
            dailyKey: this.daily?.key ?? this.todayKey().key,
            notice: this.notice,
            muted: Boolean(this.sound?.muted),
            hudLabel: this.hudLabel(),
            touchControls: this.touchControls,
            debug: this.debugEnabled ? { fps: this.fps } : null
        });
    }

    hudLabel() {
        if (this.mode === 'replay') return '回放';
        if (this.mode === 'daily') return '每日挑战';
        return undefined;
    }

    /** @param {Scene} scene */
    setScene(scene) {
        this.scene = scene;
        this.sceneTicks = 0;
    }

    todayKey() {
        const d = this.today();
        return dailySeed(d.getFullYear(), d.getMonth() + 1, d.getDate());
    }

    /** @param {'normal'|'daily'} [mode] */
    startGame(mode = this.mode === 'replay' ? 'normal' : this.mode) {
        this.mode = mode;
        let seed;
        if (mode === 'daily') {
            this.daily = this.todayKey();
            seed = this.daily.seed;
        } else {
            this.daily = null;
            seed = this.nextSeed();
        }
        this.session.reset(seed, this.rulesId);
        this.recorder = new ReplayRecorder(this.rulesId, this.session.seed);
        this.replayPlayer = null;
        this.bestDepth = this.loadBest();
        this.beginPlay();
    }

    /** @returns {boolean} 回放是否成功开始 */
    startReplay(code) {
        let replay;
        try {
            replay = decodeReplay(code);
        } catch (err) {
            this.notice = err.message;
            return false;
        }
        this.mode = 'replay';
        this.replayCode = code;
        this.replayPlayer = new ReplayPlayer(replay);
        this.recorder = null;
        this.session.reset(replay.seed, replay.rules);
        this.beginPlay();
        return true;
    }

    beginPlay() {
        this.notice = '';
        this.input.clearQueued();
        this.accumulator = 0;
        this.sound?.unlock?.();
        this.setScene('playing');
    }

    /** 当前或上一局的回放编码，可通过 ?replay= 复现 */
    exportReplay() {
        if (this.mode === 'replay') return this.replayCode;
        return this.recorder ? this.recorder.encode() : null;
    }

    restart() {
        if (this.mode === 'replay') this.startReplay(this.replayCode);
        else this.startGame(this.mode);
    }

    goToTitle() {
        if (this.mode === 'replay') this.session.reset(this.nextSeed(), this.rulesId);
        this.mode = 'normal';
        this.daily = null;
        this.bestDepth = this.loadBest();
        this.setScene('title');
    }

    cycleRules(step = 1) {
        const index = RULESET_IDS.indexOf(this.rulesId);
        this.rulesId = RULESET_IDS[(index + step + RULESET_IDS.length) % RULESET_IDS.length];
        this.platform.storage.set(RULES_KEY, this.rulesId);
        this.session.reset(this.session.seed, this.rulesId);
        this.bestDepth = this.loadBest();
    }

    togglePause() {
        if (this.scene === 'playing') this.setScene('paused');
        else if (this.scene === 'paused') this.setScene('playing');
    }

    get gameoverLocked() {
        return this.scene === 'gameover' && this.sceneTicks < GAMEOVER_INPUT_DELAY_TICKS;
    }

    /** 标题/暂停/结束界面上的「确认」操作 */
    confirm() {
        if (this.scene === 'title') this.startGame('normal');
        else if (this.scene === 'paused') this.setScene('playing');
        else if (this.scene === 'gameover' && !this.gameoverLocked) this.restart();
    }

    menuAction(id) {
        if (this.gameoverLocked) return;
        switch (id) {
            case 'mode': this.cycleRules(1); break;
            case 'start': this.startGame('normal'); break;
            case 'daily': this.startGame('daily'); break;
            case 'retry': this.restart(); break;
            case 'title': this.goToTitle(); break;
            case 'sound': this.toggleMute(); break;
        }
    }

    bestKey() {
        if (this.mode === 'daily' && this.daily) return `ns-shaft:daily:${this.daily.key}:${this.rulesId}`;
        return this.rulesId === DEFAULT_RULESET ? BEST_DEPTH_KEY : `${BEST_DEPTH_KEY}:${this.rulesId}`;
    }

    loadBest() {
        return Number(this.platform.storage.get(this.bestKey())) || 0;
    }

    recordBest(depth) {
        if (depth > this.bestDepth) {
            this.bestDepth = Math.floor(depth);
            this.platform.storage.set(this.bestKey(), String(this.bestDepth));
        }
    }

    handleKey(rawKey, pressed) {
        const key = rawKey.length === 1 ? rawKey.toLowerCase() : rawKey;
        if (pressed && this.handleMenuKey(key)) return;
        if (pressed && (key === 'p' || key === 'Escape')) {
            this.togglePause();
            return;
        }
        if (pressed && key === 'r') {
            this.restart();
            return;
        }
        if (pressed && key === 'm') {
            this.toggleMute();
            return;
        }
        if (pressed && key === '`') {
            this.debugEnabled = !this.debugEnabled;
            return;
        }
        this.input.setKey(key, pressed);
    }

    /** @returns {boolean} 按键是否被菜单消费 */
    handleMenuKey(key) {
        if (this.scene === 'playing') return false;
        if (key === ' ' || key === 'Enter') {
            this.confirm();
            return true;
        }
        if (this.scene === 'title') {
            if (key === 'ArrowLeft' || key === 'a') this.cycleRules(-1);
            else if (key === 'ArrowRight' || key === 'd') this.cycleRules(1);
            else if (key === 'c') this.startGame('daily');
            else return false;
            return true;
        }
        if (this.scene === 'gameover' && (key === 'Escape' || key === 't')) {
            this.menuAction('title');
            return true;
        }
        return false;
    }

    toLogical(x, y) {
        return { x: x / this.layout.scale, y: y / this.layout.scale };
    }

    handlePointer(id, x, y, isDown) {
        const p = this.toLogical(x, y);

        if (isDown && this.scene !== 'playing') {
            const menu = hitTest(this.menuButtons, p.x, p.y);
            if (menu) this.menuAction(menu.id);
            else this.confirm();
            this.pointers.set(id, null);
            return;
        }

        const button = hitTest(this.buttons, p.x, p.y);
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
        const strip = ({ id, x, y, width, height }) => ({ id, x, y, width, height });
        return {
            platform: this.platform.name,
            scene: this.scene,
            mode: this.mode,
            bestDepth: this.bestDepth,
            muted: Boolean(this.sound?.muted),
            touchControls: this.touchControls,
            layout: {
                width: this.layout.width,
                height: this.layout.height,
                worldTop: this.layout.worldTop,
                worldHeight: this.layout.worldHeight,
                controlsTop: this.layout.controlsTop,
                scale: this.layout.scale
            },
            buttons: this.buttons.map(strip),
            menu: this.menuButtons.map(strip),
            ...this.session.snapshot()
        };
    }
}
