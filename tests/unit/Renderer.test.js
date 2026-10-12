import { describe, it, expect } from 'vitest';
import { Renderer } from '../../src/render/Renderer.js';
import { GameSession } from '../../src/core/GameSession.js';
import { Platform, PLATFORM_TYPES, PLATFORM_COLORS } from '../../src/core/Platform.js';
import { computeLayout, getTouchButtons } from '../../src/app/layout.js';
import { createRecordingContext } from '../helpers/fakes.js';

function renderFrame(overrides = {}) {
    const ctx = createRecordingContext();
    const layout = computeLayout({ width: 400, height: 680, pixelRatio: 2 }, { touchControls: overrides.touchControls });
    const session = new GameSession({ viewHeight: layout.worldHeight, seed: 1 });
    const frame = {
        scene: 'playing',
        session,
        layout,
        buttons: getTouchButtons(layout),
        pressed: new Set(),
        bestDepth: 0,
        debug: null,
        ...overrides
    };
    overrides.setup?.(session);
    new Renderer(ctx).render(frame);
    return ctx;
}

describe('Renderer', () => {
    it('applies the device pixel ratio via setTransform', () => {
        const ctx = renderFrame();
        const transforms = ctx.calls.filter(c => c.name === 'setTransform').map(c => c.args);
        expect(transforms).toContainEqual([2, 0, 0, 2, 0, 0]);
    });

    it('draws the HUD with depth and lives', () => {
        const texts = renderFrame().texts();
        expect(texts).toContain('深度: 0m');
        expect(texts).toContain('生命值: 100/100');
    });

    it('draws every platform type with its color', () => {
        const ctx = renderFrame({
            setup: session => {
                session.platformManager.platforms = Object.values(PLATFORM_TYPES).map(
                    (type, i) => new Platform(10 + i * 70, 200 + i * 20, type)
                );
            }
        });
        const fills = ctx.calls.filter(c => c.name === 'fillRect').map(c => c.fillStyle);
        for (const color of Object.values(PLATFORM_COLORS)) {
            expect(fills).toContain(color);
        }
    });

    it('shows scene overlays', () => {
        expect(renderFrame({ scene: 'title' }).texts()).toContain('NS-SHAFT');
        expect(renderFrame({ scene: 'paused' }).texts()).toContain('已暂停');
        expect(renderFrame({ scene: 'gameover', bestDepth: 88 }).texts()).toContain('最佳深度: 88m');
        expect(renderFrame({ scene: 'gameover', mode: 'replay' }).texts()).toContain('回放结束');
        expect(renderFrame({ scene: 'gameover', mode: 'daily', bestDepth: 5 }).texts()).toContain('今日最佳: 5m');
    });

    it('labels menu buttons from the current state', () => {
        const titleLayout = computeLayout({ width: 400, height: 680 });
        const menu = [{ id: 'mode' }, { id: 'start' }, { id: 'daily' }].map(b => ({ ...b, x: 0, y: 0, width: 10, height: 10 }));
        const texts = renderFrame({ scene: 'title', layout: titleLayout, menu, modeName: '原版', dailyKey: '2026-10-12' }).texts();
        expect(texts).toEqual(expect.arrayContaining(['◀ 模式: 原版 ▶', '开始游戏', '每日挑战 10-12']));
        expect(texts.some(t => t.includes('C 每日挑战'))).toBe(true);

        const retry = [{ id: 'retry', x: 0, y: 0, width: 10, height: 10 }];
        expect(renderFrame({ scene: 'gameover', menu: retry, mode: 'replay' }).texts()).toContain('重新播放');
        expect(renderFrame({ scene: 'gameover', menu: retry, mode: 'daily' }).texts()).toContain('再次挑战');
    });

    it('shows the rules name and per-preset max lives in the HUD', () => {
        const texts = renderFrame({ setup: session => session.reset(1, 'nsshaft') }).texts();
        expect(texts).toContain('生命值: 12/12');
        expect(texts).toContain('原版');
        expect(renderFrame({ hudLabel: '回放' }).texts()).toContain('回放');
    });

    it('draws touch buttons only when enabled', () => {
        expect(renderFrame().texts()).not.toContain('跳');
        expect(renderFrame({ touchControls: true }).texts()).toEqual(expect.arrayContaining(['◀', '跳', '▶']));
    });

    it('draws the debug overlay', () => {
        const texts = renderFrame({ debug: { fps: 60 } }).texts();
        expect(texts.some(t => t.startsWith('fps 60'))).toBe(true);
    });
});
