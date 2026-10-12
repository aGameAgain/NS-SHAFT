import { describe, it, expect, beforeAll } from 'vitest';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import vm from 'node:vm';
import { gzipSync } from 'node:zlib';
import { build } from 'vite';
import { createFakeWx } from '../helpers/fakes.js';

const root = resolve(import.meta.dirname, '../..');

// 体积预算：防止误引入大依赖。小游戏主包上限为 4MB，这里远低于上限，超出时应先确认原因再调整
const BUDGET = { rawBytes: 64 * 1024, gzipBytes: 20 * 1024 };

/**
 * 把真实构建产物 game.js 放进一个「没有 window / document / localStorage」的沙箱里执行，
 * 只提供微信小游戏运行时会有的全局对象，验证产物可以在小游戏环境中启动和交互。
 */
function bootInSandbox(code, wx) {
    let frameCb = null;
    const context = {
        wx,
        GameGlobal: {},
        console,
        Math,
        Date,
        requestAnimationFrame: cb => {
            frameCb = cb;
        },
        setTimeout,
        clearTimeout
    };
    context.GameGlobal = context;
    vm.createContext(context);
    vm.runInContext(code, context, { filename: 'game.js' });
    return {
        context,
        runFrames(n) {
            for (let i = 0; i < n; i++) {
                const cb = frameCb;
                frameCb = null;
                cb?.();
            }
        }
    };
}

describe('WeChat mini game bundle', () => {
    let outDir;
    let code;

    beforeAll(async () => {
        outDir = mkdtempSync(join(tmpdir(), 'ns-shaft-wechat-'));
        await build({
            configFile: join(root, 'vite.config.wechat.js'),
            root,
            logLevel: 'silent',
            build: { outDir, emptyOutDir: true }
        });
        code = readFileSync(join(outDir, 'game.js'), 'utf8');
    }, 60_000);

    it('emits game.js together with the mini game project files', () => {
        for (const file of ['game.js', 'game.json', 'project.config.json']) {
            expect(existsSync(join(outDir, file))).toBe(true);
        }
        const gameJson = JSON.parse(readFileSync(join(outDir, 'game.json'), 'utf8'));
        expect(gameJson.deviceOrientation).toBe('portrait');
        const project = JSON.parse(readFileSync(join(outDir, 'project.config.json'), 'utf8'));
        expect(project.compileType).toBe('game');
    });

    it('stays within the bundle size budget', () => {
        const raw = Buffer.byteLength(code);
        const gzip = gzipSync(code).length;
        console.info(`game.js: ${(raw / 1024).toFixed(1)} KB, gzip ${(gzip / 1024).toFixed(1)} KB`);
        expect(raw).toBeLessThanOrEqual(BUDGET.rawBytes);
        expect(gzip).toBeLessThanOrEqual(BUDGET.gzipBytes);
    });

    it('does not reference browser-only globals or ES module syntax', () => {
        expect(code).not.toMatch(/\b(document|localStorage|sessionStorage|navigator)\b/);
        expect(code).not.toMatch(/\bwindow\./);
        expect(code).not.toMatch(/^\s*(import|export)\s/m);
        // `?.` 后跟数字是三元表达式（如 `x==null?.3:y`），不是可选链
        expect(code).not.toMatch(/\?\.(?!\d)|\?\?/);
    });

    it('boots, renders and responds to touches inside a wx-only sandbox', () => {
        const wx = createFakeWx();
        const { context, runFrames } = bootInSandbox(code, wx);

        expect(wx.canvases).toHaveLength(1);
        const canvas = wx.canvases[0];
        expect(canvas.width).toBe(375 * 3);
        expect(canvas.height).toBe(812 * 3);

        runFrames(3);
        expect(canvas.ctx.texts()).toContain('NS-SHAFT');

        const app = context.__NS_SHAFT__;
        expect(app.getSnapshot()).toMatchObject({ platform: 'wechat', scene: 'title', touchControls: true });

        wx.touch('touchstart', 1, 180, 300);
        wx.touch('touchend', 1, 180, 300);
        expect(app.getSnapshot().scene).toBe('playing');

        app.advance(60);
        expect(app.getSnapshot().tick).toBe(60);

        wx.emit('hide');
        expect(app.getSnapshot().scene).toBe('paused');
    });

    it('persists the best depth through wx storage', () => {
        const wx = createFakeWx();
        wx.storage.set('ns-shaft:bestDepth', '77');
        const { context } = bootInSandbox(code, wx);
        const app = context.__NS_SHAFT__;
        expect(app.getSnapshot().bestDepth).toBe(77);

        app.startGame();
        app.advance(400);
        app.session.player.y = app.session.depth + 5000;
        app.advance(1);
        expect(app.getSnapshot().scene).toBe('gameover');
        expect(Number(wx.storage.get('ns-shaft:bestDepth'))).toBeGreaterThan(77);
    });
});
