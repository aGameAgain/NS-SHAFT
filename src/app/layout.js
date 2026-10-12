import { WORLD_WIDTH } from '../core/config.js';

export const HUD_HEIGHT = 32;
export const CONTROLS_HEIGHT = 96;

/**
 * 把设备视口（CSS 像素）换算成逻辑坐标布局：逻辑宽度固定为 WORLD_WIDTH，
 * 自上而下依次为 安全区 / HUD / 游戏世界 / 触控按钮区。
 * @param {{width: number, height: number, pixelRatio?: number, safeTop?: number}} viewport
 */
export function computeLayout(viewport, { touchControls = false } = {}) {
    const scale = viewport.width / WORLD_WIDTH;
    const pixelRatio = viewport.pixelRatio || 1;
    const width = WORLD_WIDTH;
    const height = viewport.height / scale;
    const safeTop = (viewport.safeTop || 0) / scale;
    const hudTop = safeTop;
    const worldTop = hudTop + HUD_HEIGHT;
    const controlsHeight = touchControls ? CONTROLS_HEIGHT : 0;
    const worldHeight = Math.max(200, height - worldTop - controlsHeight);
    const controlsTop = worldTop + worldHeight;

    return {
        scale,
        pixelRatio,
        width,
        height,
        hudTop,
        hudHeight: HUD_HEIGHT,
        worldTop,
        worldHeight,
        controlsTop,
        controlsHeight,
        canvasWidth: Math.round(viewport.width * pixelRatio),
        canvasHeight: Math.round(viewport.height * pixelRatio)
    };
}

/** 触控按钮区域：左 / 跳 / 右 三等分 */
export function getTouchButtons(layout) {
    if (!layout.controlsHeight) return [];
    const pad = 8;
    const w = layout.width / 3;
    const y = layout.controlsTop + pad;
    const h = layout.controlsHeight - pad * 2;
    return [
        { id: 'left', label: '◀', x: pad, y, width: w - pad * 1.5, height: h },
        { id: 'jump', label: '跳', x: w + pad / 2, y, width: w - pad, height: h },
        { id: 'right', label: '▶', x: w * 2 + pad / 2, y, width: w - pad * 1.5, height: h }
    ];
}

export function hitTest(buttons, x, y) {
    return buttons.find(b => x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height) || null;
}
