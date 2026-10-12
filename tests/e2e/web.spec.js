import { test, expect } from '@playwright/test';
import { gotoGame, readPixel, snapshot, waitForScene } from './helpers.js';

test.describe('Web build', () => {
    test.skip(({ isMobile }) => isMobile, 'desktop keyboard flow');

    test('loads into the title screen without errors', async ({ page }) => {
        const errors = await gotoGame(page);
        await expect(page).toHaveTitle('NS-SHAFT 游戏');
        await expect(page.locator('#gameCanvas')).toBeVisible();
        await expect(page.getByText('按空格键向上跳')).toBeVisible();

        const snap = await snapshot(page);
        expect(snap).toMatchObject({ platform: 'web', scene: 'title', tick: 0, seed: 1, touchControls: false });
        expect(errors).toEqual([]);
    });

    test('renders the canvas at device pixel resolution', async ({ page }) => {
        await gotoGame(page);
        const size = await page.evaluate(() => {
            const c = document.getElementById('gameCanvas');
            return { width: c.width, cssWidth: c.getBoundingClientRect().width, dpr: window.devicePixelRatio };
        });
        expect(size.width).toBe(Math.round(size.cssWidth * size.dpr));
    });

    test('starts with Space and the camera keeps scrolling', async ({ page }) => {
        await gotoGame(page);
        await page.keyboard.press('Space');
        await waitForScene(page, 'playing');
        await expect.poll(async () => (await snapshot(page)).depth).toBeGreaterThan(10);
    });

    test('draws the first platform in green under the player', async ({ page }) => {
        await gotoGame(page);
        await page.keyboard.press('Space');
        await waitForScene(page, 'playing');
        const snap = await snapshot(page);
        // 初始平台位于世界坐标 y=150、水平居中，宽 80 高 15
        const y = snap.layout.worldTop + 150 + 7 - snap.depth;
        expect(await readPixel(page, '#gameCanvas', 200, y)).toEqual([139, 195, 74]);
    });

    test('moves the player with arrow keys and jumps with Space', async ({ page }) => {
        await gotoGame(page);
        await page.keyboard.press('Space');
        await expect.poll(async () => (await snapshot(page)).player.isOnPlatform).toBe(true);

        // 按住方向键期间同步推进固定 tick 数，避免依赖真实帧率
        const holdFor = async (key, ticks) => {
            await page.keyboard.down(key);
            const before = (await snapshot(page)).player.x;
            await page.evaluate(n => window.__NS_SHAFT__.advance(n), ticks);
            const after = (await snapshot(page)).player.x;
            await page.keyboard.up(key);
            return after - before;
        };
        expect(await holdFor('ArrowLeft', 4)).toBeLessThanOrEqual(-20);
        expect(await holdFor('ArrowRight', 4)).toBeGreaterThanOrEqual(20);

        expect((await snapshot(page)).player.isOnPlatform).toBe(true);
        await page.keyboard.press('Space');
        await expect.poll(async () => (await snapshot(page)).player.velocityY).toBeLessThan(0);
    });

    test('pauses with P and resumes', async ({ page }) => {
        await gotoGame(page);
        await page.keyboard.press('Space');
        await waitForScene(page, 'playing');
        await page.keyboard.press('p');
        await waitForScene(page, 'paused');

        const tick = (await snapshot(page)).tick;
        await page.waitForTimeout(300);
        expect((await snapshot(page)).tick).toBe(tick);

        await page.keyboard.press('p');
        await waitForScene(page, 'playing');
    });

    test('restart keeps a single game loop running at ~60 ticks/s', async ({ page }) => {
        await gotoGame(page);
        await page.keyboard.press('Space');
        await page.waitForTimeout(300);
        await page.keyboard.press('r');
        await page.keyboard.press('r');

        const t0 = await snapshot(page);
        const started = Date.now();
        await page.waitForTimeout(1000);
        const t1 = await snapshot(page);
        const rate = ((t1.tick - t0.tick) * 1000) / (Date.now() - started);
        expect(rate).toBeGreaterThan(30);
        expect(rate).toBeLessThan(70);
    });

    test('shows game over, stores best depth and restarts', async ({ page }) => {
        await gotoGame(page);
        await page.keyboard.press('Space');
        await expect.poll(async () => (await snapshot(page)).depth).toBeGreaterThan(20);

        await page.evaluate(() => {
            const app = window.__NS_SHAFT__;
            app.session.player.y = app.session.depth + 5000;
        });
        await waitForScene(page, 'gameover');

        const { bestDepth } = await snapshot(page);
        expect(bestDepth).toBeGreaterThan(20);
        expect(await page.evaluate(() => localStorage.getItem('ns-shaft:bestDepth'))).toBe(String(bestDepth));

        await page.waitForTimeout(600);
        await page.keyboard.press('Enter');
        await waitForScene(page, 'playing');

        await page.reload();
        await page.waitForFunction(() => Boolean(window.__NS_SHAFT__));
        expect((await snapshot(page)).bestDepth).toBe(bestDepth);
    });

    test('switches rule presets on the title screen', async ({ page }) => {
        await gotoGame(page);
        await page.keyboard.press('ArrowRight');
        expect(await snapshot(page)).toMatchObject({ rules: 'nsshaft', maxLives: 12 });
        await page.keyboard.press('Space');
        await waitForScene(page, 'playing');
        expect((await snapshot(page)).rules).toBe('nsshaft');

        await page.reload();
        await page.waitForFunction(() => Boolean(window.__NS_SHAFT__));
        expect((await snapshot(page)).rules).toBe('nsshaft');
    });

    test('starts the daily challenge with C', async ({ page }) => {
        await gotoGame(page, '/');
        await page.keyboard.press('c');
        await waitForScene(page, 'playing');
        expect((await snapshot(page)).mode).toBe('daily');
    });

    test('replay link reproduces the recorded run', async ({ page }) => {
        await gotoGame(page);
        await page.keyboard.press('Space');
        await waitForScene(page, 'playing');
        const recorded = await page.evaluate(() => {
            const app = window.__NS_SHAFT__;
            app.stop();
            for (let i = 0; i < 300; i++) {
                app.input.setKey('ArrowRight', i % 80 < 20);
                app.input.setKey(' ', i % 45 === 0);
                app.advance(1);
            }
            return { url: window.__NS_SHAFT_REPLAY_URL__(), snap: app.session.snapshot() };
        });
        expect(recorded.url).toContain('replay=ns1.classic.1.');

        await gotoGame(page, recorded.url.replace(/^https?:\/\/[^/]+/, ''));
        const replayed = await page.evaluate(ticks => {
            const app = window.__NS_SHAFT__;
            app.stop();
            app.advance(ticks - app.session.tick);
            return { mode: app.mode, snap: app.session.snapshot() };
        }, recorded.snap.tick);
        expect(replayed.mode).toBe('replay');
        expect(replayed.snap).toEqual(recorded.snap);
    });

    test('supports ?debug and ?touch query params for browser debugging', async ({ page }) => {
        await gotoGame(page, '/?seed=7&debug&touch=1');
        const snap = await snapshot(page);
        expect(snap).toMatchObject({ seed: 7, touchControls: true });
        expect(snap.buttons.map(b => b.id)).toEqual(['left', 'jump', 'right']);
        expect(await page.evaluate(() => window.__NS_SHAFT__.debugEnabled)).toBe(true);
    });
});
