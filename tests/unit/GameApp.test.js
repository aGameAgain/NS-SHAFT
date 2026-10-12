import { describe, it, expect } from 'vitest';
import { GameApp } from '../../src/app/GameApp.js';
import { SCREEN_SCROLL_SPEED } from '../../src/core/config.js';
import { createFakePlatform } from '../helpers/fakes.js';

function createApp(options = {}, platformOptions = {}) {
    const platform = createFakePlatform(platformOptions);
    const app = new GameApp(platform, { seed: 1, ...options });
    app.start();
    return { app, platform };
}

describe('GameApp', () => {
    it('boots into the title scene and renders without starting the simulation', () => {
        const { app, platform } = createApp();
        platform.runFrames(30);
        expect(app.scene).toBe('title');
        expect(app.session.tick).toBe(0);
        expect(platform.canvas.ctx.texts()).toContain('NS-SHAFT');
    });

    it('starts with Space / Enter and simulates fixed ticks', () => {
        const { app, platform } = createApp();
        platform.pressKey(' ');
        expect(app.scene).toBe('playing');
        platform.runFrames(60);
        expect(app.session.tick).toBe(60);
        expect(app.session.depth).toBeCloseTo(60 * SCREEN_SCROLL_SPEED);
    });

    it('runs at the same game speed on 30Hz, 60Hz and 120Hz displays', () => {
        const ticksFor = frameMs => {
            const { app, platform } = createApp();
            platform.pressKey('Enter');
            platform.runFrames(Math.round(1000 / frameMs), frameMs);
            return app.session.tick;
        };
        for (const ticks of [ticksFor(1000 / 30), ticksFor(1000 / 60), ticksFor(1000 / 120)]) {
            expect(ticks).toBeGreaterThanOrEqual(59);
            expect(ticks).toBeLessThanOrEqual(60);
        }
    });

    it('restarting does not start a second loop (old double-speed bug)', () => {
        const { app, platform } = createApp();
        platform.pressKey(' ');
        platform.runFrames(30);
        platform.pressKey('r');
        platform.pressKey('r');
        platform.runFrames(60);
        expect(app.session.tick).toBe(60);
    });

    it('pauses / resumes with P and when the app goes to background', () => {
        const { app, platform } = createApp();
        platform.pressKey(' ');
        platform.runFrames(10);
        platform.pressKey('p');
        expect(app.scene).toBe('paused');
        platform.runFrames(10);
        expect(app.session.tick).toBe(10);
        platform.pressKey('p');
        expect(app.scene).toBe('playing');

        platform.setVisible(false);
        expect(app.scene).toBe('paused');
        platform.pressKey('Enter');
        expect(app.scene).toBe('playing');
    });

    it('moves the player from keyboard input', () => {
        const { app, platform } = createApp();
        platform.pressKey(' ');
        const startX = app.session.player.x;
        platform.pressKey('ArrowLeft');
        platform.runFrames(5);
        expect(app.session.player.x).toBeLessThan(startX);
        platform.releaseKey('ArrowLeft');
    });

    it('goes to game over, stores the best depth and restarts after a short delay', () => {
        const { app, platform } = createApp();
        platform.pressKey(' ');
        platform.runFrames(120);
        app.session.player.y = app.session.depth + 5000;
        platform.runFrames(1);

        expect(app.scene).toBe('gameover');
        const best = Math.floor(app.session.depth);
        expect(app.bestDepth).toBe(best);
        expect(platform.store.get('ns-shaft:bestDepth')).toBe(String(best));
        expect(platform.canvas.ctx.texts()).toContain('游戏结束');

        platform.pressKey('Enter');
        expect(app.scene).toBe('gameover');
        platform.runFrames(30);
        platform.pressKey('Enter');
        expect(app.scene).toBe('playing');
        expect(app.session.tick).toBe(0);
    });

    it('loads the stored best depth', () => {
        const platform = createFakePlatform();
        platform.store.set('ns-shaft:bestDepth', '321');
        const app = new GameApp(platform, { seed: 1 });
        expect(app.bestDepth).toBe(321);
    });

    describe('touch controls', () => {
        const center = b => [b.x + b.width / 2, b.y + b.height / 2];

        it('starts the game by tapping and steers with on-screen buttons', () => {
            const { app, platform } = createApp({}, { touchCapable: true });
            expect(app.buttons).toHaveLength(3);

            platform.tap(1, 200, 200);
            platform.release(1);
            expect(app.scene).toBe('playing');

            const [left, jump, right] = app.buttons;
            const startX = app.session.player.x;
            platform.tap(2, ...center(left));
            platform.runFrames(5);
            expect(app.session.player.x).toBeLessThan(startX);

            // 手指滑到右键上，方向随之切换
            platform.drag(2, ...center(right));
            const midX = app.session.player.x;
            platform.runFrames(5);
            expect(app.session.player.x).toBeGreaterThan(midX);
            platform.release(2);
            expect(app.input.consume()).toMatchObject({ left: false, right: false });

            platform.runFrames(30);
            platform.tap(3, ...center(jump));
            platform.runFrames(1);
            expect(app.session.player.velocityY).toBeLessThan(0);
        });

        it('scales pointer coordinates from CSS pixels to logical units', () => {
            const { app, platform } = createApp({}, { touchCapable: true, width: 200, height: 340 });
            platform.tap(1, 10, 10);
            const right = app.buttons[2];
            const [x, y] = center(right).map(v => v * app.layout.scale);
            platform.tap(2, x, y);
            expect(app.input.pressedButtons().has('right')).toBe(true);
        });
    });

    it('reacts to viewport resize', () => {
        const { app, platform } = createApp();
        platform.resize(400, 800);
        expect(app.layout.height).toBe(800);
        expect(app.session.viewHeight).toBe(app.layout.worldHeight);
        expect(platform.canvas.height).toBe(800);
    });

    it('exposes a serializable snapshot for debugging and e2e', () => {
        const { app } = createApp();
        app.startGame();
        app.advance(10);
        const snap = app.getSnapshot();
        expect(snap).toMatchObject({ platform: 'fake', scene: 'playing', tick: 10, seed: 1 });
        expect(() => JSON.stringify(snap)).not.toThrow();
    });

    it('toggles the debug overlay with the backtick key', () => {
        const { app, platform } = createApp();
        platform.pressKey('`');
        platform.runFrames(1);
        expect(platform.canvas.ctx.texts().some(t => t.startsWith('fps'))).toBe(true);
        expect(app.debugEnabled).toBe(true);
    });
});
