import { WORLD_WIDTH, PLAYER } from './config.js';
import { GameState } from './GameState.js';
import { Player } from './Player.js';
import { PlatformManager } from './Platform.js';
import { Physics } from './Physics.js';
import { createRng, randomSeed } from './rng.js';
import { getRules, scrollSpeedAt } from './rules.js';

/**
 * 一局游戏的纯逻辑模拟，不依赖任何平台 API。
 * 每调用一次 step() 推进一个固定 tick，相同 seed + 相同输入序列 = 相同结果。
 */
export class GameSession {
    /**
     * @param {{viewHeight: number, seed?: number, rules?: string, worldWidth?: number}} options
     *   rules 为 rules.js 中的预设 id，默认 classic
     */
    constructor({ viewHeight, seed = randomSeed(), rules, worldWidth = WORLD_WIDTH }) {
        this.worldWidth = worldWidth;
        this.viewHeight = viewHeight;
        this.state = new GameState();
        this.player = new Player(worldWidth);
        this.reset(seed, rules);
    }

    reset(seed = randomSeed(), rulesId = this.rules?.id) {
        this.rules = getRules(rulesId);
        this.physics = new Physics({ spikeStandable: this.rules.spike.standable });
        this.seed = seed >>> 0;
        this.rng = createRng(this.seed);
        this.tick = 0;
        this.jumpBuffer = 0;
        this.scrollSpeed = scrollSpeedAt(this.rules, 0);
        this.state.reset(this.rules.maxLives);
        this.player.reset(this.worldWidth);
        this.platformManager = new PlatformManager(this.worldWidth, this.viewHeight, this.rng, this.rules.tiers);
        this.platformManager.createInitialPlatforms(this.player.y);
        this.lastEvents = [];
    }

    get platforms() {
        return this.platformManager.platforms;
    }

    get depth() {
        return this.state.depth;
    }

    get isOver() {
        return this.state.isGameOver();
    }

    setViewHeight(viewHeight) {
        this.viewHeight = viewHeight;
        this.platformManager.setViewHeight(viewHeight);
    }

    /**
     * @param {{left?: boolean, right?: boolean, jump?: boolean}} input
     * @returns {Array<{type: string}>} 本 tick 发生的事件，供表现层播放音效/特效
     */
    step(input = {}) {
        const events = [];
        this.lastEvents = events;
        if (this.isOver) return events;

        const { player, physics, state, rules } = this;
        const groundedBefore = player.isOnPlatform;
        const platformBefore = player.currentPlatform;

        this.platformManager.update(state.depth);
        player.update(input);
        this.jumpBuffer = input.jump ? PLAYER.JUMP_BUFFER_TICKS : Math.max(0, this.jumpBuffer - 1);
        if (this.jumpBuffer > 0 && player.jump()) {
            this.jumpBuffer = 0;
            events.push({ type: 'jump' });
        }
        player.applyGravity();

        const collision = physics.checkCollisions(
            player,
            this.platforms,
            physics.ceilingLandingLimit(player, state.depth)
        );
        const landed = player.isOnPlatform &&
            (!groundedBefore || player.currentPlatform !== platformBefore);
        if (landed) {
            events.push({ type: 'land', platformType: player.currentPlatform.type });
        }

        if (collision?.type === 'spike') {
            // 可站立的尖刺只在落地那一刻扣血；可穿过的尖刺接触期间持续扣血
            if (!rules.spike.standable || landed) {
                this.damage(rules.spike.damage, 'spike', events);
            }
        } else if (collision?.type === 'spring') {
            events.push({ type: 'spring' });
        } else if (landed && rules.landRegen > 0) {
            const healed = state.heal(rules.landRegen);
            if (healed > 0) events.push({ type: 'heal', amount: healed });
        }

        if (physics.checkCeilingSpikeCollision(player, state.depth) && !player.isHurt) {
            this.damage(rules.ceilingDamage, 'ceiling', events);
        }

        this.scrollSpeed = scrollSpeedAt(rules, state.depth);
        state.updateDepth(this.scrollSpeed);

        if (!state.isGameOver() && physics.checkGameBounds(player, state.depth, this.viewHeight)) {
            state.end();
            events.push({ type: 'fell' });
        }
        if (state.isGameOver()) {
            events.push({ type: 'gameover', depth: state.depth });
        }

        this.tick++;
        return events;
    }

    damage(amount, source, events) {
        this.state.loseLife(amount);
        this.player.takeDamage();
        events.push({ type: 'damage', source, amount });
    }

    snapshot() {
        const { player, state } = this;
        return {
            tick: this.tick,
            seed: this.seed,
            rules: this.rules.id,
            depth: state.depth,
            scrollSpeed: this.scrollSpeed,
            lives: state.lives,
            maxLives: state.maxLives,
            gameOver: state.isGameOver(),
            player: {
                x: player.x,
                y: player.y,
                velocityX: player.velocityX,
                velocityY: player.velocityY,
                isOnPlatform: player.isOnPlatform,
                hurt: player.isHurt
            },
            platformCount: this.platforms.length
        };
    }
}
