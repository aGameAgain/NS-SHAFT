import { expect } from '@playwright/test';

export const snapshot = page => page.evaluate(() => window.__NS_SHAFT__.getSnapshot());

export async function waitForScene(page, scene) {
    await expect.poll(async () => (await snapshot(page)).scene).toBe(scene);
}

export async function gotoGame(page, path = '/?seed=1') {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    page.on('console', msg => {
        if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto(path);
    await page.waitForFunction(() => Boolean(window.__NS_SHAFT__));
    return errors;
}

/** 逻辑坐标 → 页面坐标（用于点击画布上的按钮） */
export async function toPagePoint(page, selector, x, y) {
    const box = await page.locator(selector).boundingBox();
    const { layout } = await snapshot(page);
    const border = await page.locator(selector).evaluate(el => parseFloat(getComputedStyle(el).borderLeftWidth) || 0);
    return { x: box.x + border + x * layout.scale, y: box.y + border + y * layout.scale };
}

/** 读取画布上某个逻辑坐标处的像素颜色 */
export function readPixel(page, selector, x, y) {
    return page.evaluate(([sel, lx, ly]) => {
        const app = window.__NS_SHAFT__;
        app.render();
        const canvas = document.querySelector(sel);
        const k = app.layout.scale * app.layout.pixelRatio;
        const data = canvas.getContext('2d').getImageData(Math.round(lx * k), Math.round(ly * k), 1, 1).data;
        return [data[0], data[1], data[2]];
    }, [selector, x, y]);
}
