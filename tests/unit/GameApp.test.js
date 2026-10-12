import { describe, it, expect } from 'vitest';
import { GameApp } from '../../src/app/GameApp.js';
import { SCREEN_SCROLL_SPEED } from '../../src/core/config.js';
import { dailySeed } from '../../src/core/replay.js';
import { createFakeAudioContext, createFakePlatform } from '../helpers/fakes.js';

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

    describe('modes and menus', () => {
        const center = b => [b.x + b.width / 2, b.y + b.height / 2];
        const menuButton = (app, id) => app.menuButtons.find(b => b.id === id);

        it('cycles rule presets on the title screen and remembers the choice', () => {
            const { app, platform } = createApp();
            platform.pressKey('ArrowRight');
            expect(app.rulesId).toBe('nsshaft');
            expect(platform.store.get('ns-shaft:rules')).toBe('nsshaft');
            expect(app.session.state.lives).toBe(12);
            platform.pressKey('ArrowLeft');
            platform.pressKey('ArrowLeft');
            expect(app.rulesId).toBe('hard');

            const again = new GameApp(platform, { seed: 1 });
            expect(again.rulesId).toBe('hard');
            expect(new GameApp(platform, { seed: 1, rules: 'classic' }).rulesId).toBe('classic');
        });

        it('keeps a separate best depth per preset (classic keeps the legacy key)', () => {
            const { app, platform } = createApp();
            platform.store.set('ns-shaft:bestDepth', '50');
            platform.store.set('ns-shaft:bestDepth:nsshaft', '7');
            expect(app.loadBest()).toBe(50);
            platform.pressKey('d');
            expect(app.bestDepth).toBe(7);
        });

        it('starts the daily challenge with a date-derived seed', () => {
            const today = () => new Date(2026, 9, 12);
            const platform = createFakePlatform();
            const app = new GameApp(platform, { today });
            app.start();
            platform.pressKey('c');
            expect(app.mode).toBe('daily');
            expect(app.session.seed).toBe(dailySeed(2026, 10, 12).seed);

            app.advance(100);
            app.session.player.y = app.session.depth + 5000;
            app.advance(31);
            expect(app.scene).toBe('gameover');
            expect(platform.store.get('ns-shaft:daily:2026-10-12:classic')).toBe(String(app.bestDepth));
            expect(platform.store.has('ns-shaft:bestDepth')).toBe(false);

            platform.pressKey('Enter');
            expect(app.mode).toBe('daily');
            expect(app.session.seed).toBe(dailySeed(2026, 10, 12).seed);
        });

        it('handles menu taps on title and game over', () => {
            const { app, platform } = createApp({}, { touchCapable: true });
            platform.tap(1, ...center(menuButton(app, 'mode')));
            expect(app.rulesId).toBe('nsshaft');
            expect(app.scene).toBe('title');

            platform.tap(2, ...center(menuButton(app, 'daily')));
            expect(app.scene).toBe('playing');
            expect(app.mode).toBe('daily');

            app.session.player.y = app.session.depth + 5000;
            app.advance(1);
            platform.tap(3, ...center(menuButton(app, 'title')));
            expect(app.scene).toBe('gameover');
            app.advance(30);
            platform.tap(4, ...center(menuButton(app, 'title')));
            expect(app.scene).toBe('title');
            expect(app.mode).toBe('normal');
        });

        it('returns to the title from game over with Escape', () => {
            const { app, platform } = createApp();
            app.startGame();
            app.session.player.y = app.session.depth + 5000;
            app.advance(40);
            platform.pressKey('Escape');
            expect(app.scene).toBe('title');
        });
    });

    describe('replay', () => {
        const playRecorded = app => {
            app.startGame();
            for (let i = 0; i < 400 && !app.session.isOver; i++) {
                app.input.setKey('ArrowLeft', i % 90 < 30);
                app.input.setKey('ArrowRight', i % 90 > 60);
                if (i % 70 === 0) app.input.setKey(' ', true);
                app.advance(1);
                app.input.setKey(' ', false);
            }
        };

        it('exports the current run and reproduces it exactly from the code', () => {
            const { app } = createApp({ seed: 5 });
            playRecorded(app);
            const code = app.exportReplay();
            const expected = app.session.snapshot();

            const { app: viewer } = createApp({ seed: 999, replay: code });
            expect(viewer.mode).toBe('replay');
            expect(viewer.scene).toBe('playing');
            viewer.advance(expected.tick);
            expect(viewer.session.snapshot()).toEqual(expected);
            expect(viewer.exportReplay()).toBe(code);
        });

        it('ignores player input and does not record best depth during replays', () => {
            const { app } = createApp({ seed: 5 });
            playRecorded(app);
            const code = app.exportReplay();

            const viewer = createApp({ replay: code });
            viewer.platform.pressKey('ArrowRight');
            viewer.app.advance(2000);
            expect(viewer.app.scene).toBe('gameover');
            expect(viewer.platform.store.size).toBe(0);

            viewer.platform.pressKey('Enter');
            expect(viewer.app.mode).toBe('replay');
            expect(viewer.app.session.tick).toBe(0);
        });

        it('shows a notice for invalid replay codes', () => {
            const { app, platform } = createApp({ replay: 'garbage' });
            expect(app.scene).toBe('title');
            platform.runFrames(1);
            expect(platform.canvas.ctx.texts()).toContain('无法识别的回放格式');
        });
    });

    it('forwards session events to the sound hook', () => {
        const events = [];
        const sound = { handleEvents: e => events.push(...e), unlock: () => events.push({ type: 'unlock' }) };
        const { app, platform } = createApp({ sound });
        platform.pressKey(' ');
        platform.runFrames(30);
        expect(events.map(e => e.type)).toEqual(['unlock', 'land']);
        expect(app.scene).toBe('playing');
    });

    describe('built-in sound', () => {
        it('plays synthesized effects through the platform audio context after the first gesture', () => {
            const audio = createFakeAudioContext();
            const { app, platform } = createApp({ sound: undefined }, { audio });
            expect(app.sound).not.toBeNull();
            expect(audio.resumeCalls).toBe(0);
            platform.pressKey(' ');
            expect(audio.resumeCalls).toBe(1);
            platform.runFrames(30);
            expect(audio.played.length).toBeGreaterThan(0);
        });

        it('toggles mute with M and from the title menu, persisting the choice', () => {
            const audio = createFakeAudioContext();
            const { app, platform } = createApp({}, { audio });
            const soundButton = app.getSnapshot().menu.find(b => b.id === 'sound');
            expect(soundButton).toBeDefined();
            platform.pressKey('m');
            expect(app.sound.muted).toBe(true);
            expect(platform.store.get('ns-shaft:muted')).toBe('1');
            platform.runFrames(1);
            expect(platform.canvas.ctx.texts()).toContain('音效: 关');

            platform.tap(1, soundButton.x + 5, soundButton.y + 5);
            expect(app.sound.muted).toBe(false);
            expect(app.scene).toBe('title');

            platform.store.set('ns-shaft:muted', '1');
            const reopened = new GameApp(platform, { seed: 1 });
            expect(reopened.sound.muted).toBe(true);
        });

        it('has no sound menu when the platform cannot play audio or sound is disabled', () => {
            expect(createApp().app.getSnapshot().menu.map(b => b.id)).toEqual(['mode', 'start', 'daily']);
            const { app } = createApp({ sound: null }, { audio: createFakeAudioContext() });
            expect(app.sound).toBeNull();
            expect(() => app.handleKey('m', true)).not.toThrow();
        });
    });

    it('toggles the debug overlay with the backtick key', () => {
        const { app, platform } = createApp();
        platform.pressKey('`');
        platform.runFrames(1);
        expect(platform.canvas.ctx.texts().some(t => t.startsWith('fps'))).toBe(true);
        expect(app.debugEnabled).toBe(true);
    });
});
