import { describe, it, expect } from 'vitest';
import { computeLayout, getTouchButtons, hitTest, HUD_HEIGHT, CONTROLS_HEIGHT } from '../../src/app/layout.js';
import { WORLD_WIDTH } from '../../src/core/config.js';

describe('layout', () => {
    it('uses a fixed logical width and derives height from aspect ratio', () => {
        const layout = computeLayout({ width: 400, height: 680, pixelRatio: 2 });
        expect(layout.width).toBe(WORLD_WIDTH);
        expect(layout.scale).toBe(1);
        expect(layout.height).toBe(680);
        expect(layout.worldTop).toBe(HUD_HEIGHT);
        expect(layout.worldHeight).toBe(680 - HUD_HEIGHT);
        expect(layout.canvasWidth).toBe(800);
        expect(layout.canvasHeight).toBe(1360);
    });

    it('scales a phone viewport and reserves safe area and touch controls', () => {
        const layout = computeLayout({ width: 375, height: 812, pixelRatio: 3, safeTop: 44 }, { touchControls: true });
        const scale = 375 / WORLD_WIDTH;
        expect(layout.scale).toBe(scale);
        expect(layout.hudTop).toBeCloseTo(44 / scale);
        expect(layout.controlsHeight).toBe(CONTROLS_HEIGHT);
        expect(layout.controlsTop + layout.controlsHeight).toBeCloseTo(812 / scale);
        expect(layout.canvasWidth).toBe(1125);
    });

    it('creates three touch buttons only when touch controls are enabled', () => {
        expect(getTouchButtons(computeLayout({ width: 400, height: 680 }))).toEqual([]);

        const layout = computeLayout({ width: 400, height: 680 }, { touchControls: true });
        const buttons = getTouchButtons(layout);
        expect(buttons.map(b => b.id)).toEqual(['left', 'jump', 'right']);
        const y = layout.controlsTop + layout.controlsHeight / 2;
        expect(hitTest(buttons, 30, y).id).toBe('left');
        expect(hitTest(buttons, 200, y).id).toBe('jump');
        expect(hitTest(buttons, 370, y).id).toBe('right');
        expect(hitTest(buttons, 200, 100)).toBe(null);
    });
});
