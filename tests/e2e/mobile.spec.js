import { test, expect } from '@playwright/test';
import { gotoGame, snapshot, toPagePoint, waitForScene } from './helpers.js';

test.describe('Mobile web', () => {
    test.skip(({ isMobile }) => !isMobile, 'mobile only');

    test('fills the screen and shows on-canvas touch controls', async ({ page }) => {
        const errors = await gotoGame(page);
        const snap = await snapshot(page);
        expect(snap.touchControls).toBe(true);
        expect(snap.buttons).toHaveLength(3);

        const box = await page.locator('#gameCanvas').boundingBox();
        const viewport = page.viewportSize();
        expect(box.width).toBeCloseTo(viewport.width, 0);
        expect(box.height).toBeCloseTo(viewport.height, 0);
        await expect(page.locator('#gameInstructions')).toBeHidden();
        expect(errors).toEqual([]);
    });

    test('tap to start, hold the left button to move', async ({ page }) => {
        await gotoGame(page);
        await page.touchscreen.tap(100, 200);
        await waitForScene(page, 'playing');
        await expect.poll(async () => (await snapshot(page)).player.isOnPlatform).toBe(true);

        const { buttons, player } = await snapshot(page);
        const left = buttons.find(b => b.id === 'left');
        const point = await toPagePoint(page, '#gameCanvas', left.x + left.width / 2, left.y + left.height / 2);

        await page.mouse.move(point.x, point.y);
        await page.mouse.down();
        await expect.poll(async () => (await snapshot(page)).player.x).toBeLessThan(player.x - 10);
        await page.mouse.up();
    });

    test('instructions can be opened from the hint and closed', async ({ page }) => {
        await gotoGame(page);
        await page.locator('#mobileInstructionHint').click();
        await expect(page.locator('#gameInstructions')).toBeVisible();
        await page.locator('#closeInstructions').click();
        await expect(page.locator('#gameInstructions')).toBeHidden();
    });
});
