import { test, expect } from '@playwright/test';
import { gotoGame, readPixel, snapshot, toPagePoint, waitForScene } from './helpers.js';

const CANVAS = '#wxScreenCanvas';

test.describe('WeChat runtime simulator (wechat.html)', () => {
    test('boots the wechat entry through the wx shim', async ({ page }) => {
        const errors = await gotoGame(page, '/wechat.html?device=iphonex');
        const snap = await snapshot(page);
        expect(snap).toMatchObject({ platform: 'wechat', scene: 'title', touchControls: true });
        // iPhone X 安全区 44px，HUD 需要下移
        expect(snap.layout.worldTop).toBeGreaterThan(44);
        expect(errors).toEqual([]);
    });

    test('tap to start and steer with the right button', async ({ page }) => {
        await gotoGame(page, '/wechat.html?device=iphone8');
        await page.locator(CANVAS).click({ position: { x: 150, y: 250 } });
        await waitForScene(page, 'playing');
        await expect.poll(async () => (await snapshot(page)).player.isOnPlatform).toBe(true);

        const { buttons, player } = await snapshot(page);
        const right = buttons.find(b => b.id === 'right');
        const point = await toPagePoint(page, CANVAS, right.x + right.width / 2, right.y + right.height / 2);
        await page.mouse.move(point.x, point.y);
        await page.mouse.down();
        await expect.poll(async () => (await snapshot(page)).player.x).toBeGreaterThan(player.x + 10);
        await page.mouse.up();

        const snap = await snapshot(page);
        const y = snap.layout.worldTop + 150 + 7 - snap.depth;
        expect(await readPixel(page, CANVAS, 200, y)).toEqual([139, 195, 74]);
    });

    test('persists best depth via wx storage', async ({ page }) => {
        await gotoGame(page, '/wechat.html');
        await page.evaluate(() => {
            const app = window.__NS_SHAFT__;
            app.startGame();
            app.advance(200);
            app.session.player.y = app.session.depth + 5000;
            app.advance(1);
        });
        await waitForScene(page, 'gameover');
        expect(await page.evaluate(() => window.wx.getStorageSync('ns-shaft:bestDepth'))).toBe('100');
    });
});
