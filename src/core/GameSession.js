import { WORLD_WIDTH, SCREEN_SCROLL_SPEED, DAMAGE, PLAYER } from './config.js';
import { GameState } from './GameState.js';
import { Player } from './Player.js';
import { PlatformManager } from './Platform.js';
import { Physics } from './Physics.js';
import { createRng, randomSeed } from './rng.js';

/**
 * 一局游戏的纯逻辑模拟，不依赖任何平台 API。
 * 每调用一次 step() 推进一个固定 tick，相同 seed + 相同输入序列 = 相同结果。
 */
export class GameSession {
    constructor({ viewHeight, seed = randomSeed(), worldWidth = WORLD_WIDTH } = {}) {
        this.worldWidth = worldWidth;
        this.viewHeight = viewHeight;
        this.physics = new Physics();
        this.state = new GameState();
        this.player = new Player(worldWidth);
        this.reset(seed);
    }

    reset(seed = randomSeed()) {
        this.seed = seed >>> 0;
        this.rng = createRng(this.seed);
        this.tick = 0;
        this.jumpBuffer = 0;
        this.state.reset();
        this.player.reset(this.worldWidth);
        this.platformManager = new PlatformManager(this.worldWidth, this.viewHeight, this.rng);
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

        const { player, physics, state } = this;

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
        if (collision?.type === 'spike') {
            this.damage(DAMAGE.SPIKE, 'spike', events);
        } else if (collision?.type === 'spring') {
            events.push({ type: 'spring' });
        }

        if (physics.checkCeilingSpikeCollision(player, state.depth) && !player.isHurt) {
            this.damage(DAMAGE.CEILING, 'ceiling', events);
        }

        state.updateDepth(SCREEN_SCROLL_SPEED);

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
            depth: state.depth,
            lives: state.lives,
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
