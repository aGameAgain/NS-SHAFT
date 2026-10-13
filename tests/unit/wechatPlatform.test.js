import { describe, it, expect, vi } from 'vitest';
import { createWechatPlatform } from '../../src/platform/wechat.js';
import { createFakeWx } from '../helpers/fakes.js';

describe('WeChat platform adapter', () => {
    it('reads viewport and safe area from wx.getWindowInfo', () => {
        const platform = createWechatPlatform(createFakeWx({ windowWidth: 390, windowHeight: 844, pixelRatio: 3, safeTop: 47 }));
        expect(platform.getViewport()).toEqual({ width: 390, height: 844, pixelRatio: 3, safeTop: 47 });
        expect(platform.touchCapable).toBe(true);
    });

    it('creates a WebAudio context only when the base library supports it', () => {
        const wx = createFakeWx();
        expect(createWechatPlatform(wx).createAudioContext()).toBeNull();
        const ctx = {};
        wx.createWebAudioContext = () => ctx;
        expect(createWechatPlatform(wx).createAudioContext()).toBe(ctx);
    });

    it('falls back to getSystemInfoSync on old base libraries', () => {
        const wx = createFakeWx();
        delete wx.getWindowInfo;
        wx.getSystemInfoSync = () => ({ windowWidth: 320, windowHeight: 568, pixelRatio: 2, statusBarHeight: 20 });
        expect(createWechatPlatform(wx).getViewport()).toEqual({ width: 320, height: 568, pixelRatio: 2, safeTop: 20 });
    });

    it('forwards every changed touch with its identifier', () => {
        const wx = createFakeWx();
        const platform = createWechatPlatform(wx);
        const down = vi.fn();
        const move = vi.fn();
        const up = vi.fn();
        platform.onPointer({ down, move, up });

        wx.emit('touchstart', { changedTouches: [{ identifier: 1, clientX: 10, clientY: 20 }, { identifier: 2, clientX: 30, clientY: 40 }] });
        wx.touch('touchmove', 1, 15, 25);
        wx.touch('touchend', 1, 15, 25);
        wx.touch('touchcancel', 2, 30, 40);

        expect(down.mock.calls).toEqual([[1, 10, 20], [2, 30, 40]]);
        expect(move).toHaveBeenCalledWith(1, 15, 25);
        expect(up.mock.calls).toEqual([[1], [2]]);
    });

    it('maps lifecycle, keyboard (PC WeChat) and storage APIs', () => {
        const wx = createFakeWx();
        const keyListeners = [];
        wx.onKeyDown = cb => keyListeners.push(['down', cb]);
        wx.onKeyUp = cb => keyListeners.push(['up', cb]);
        const platform = createWechatPlatform(wx);

        const visibility = vi.fn();
        platform.onVisibility(visibility);
        wx.emit('hide');
        wx.emit('show');
        expect(visibility.mock.calls).toEqual([[false], [true]]);

        const onKey = vi.fn();
        platform.onKey(onKey);
        keyListeners.forEach(([, cb]) => cb({ key: 'ArrowLeft' }));
        expect(onKey.mock.calls).toEqual([['ArrowLeft', true], ['ArrowLeft', false]]);

        expect(platform.storage.get('missing')).toBe(null);
        platform.storage.set('k', '5');
        expect(platform.storage.get('k')).toBe('5');

        wx.getStorageSync = () => {
            throw new Error('denied');
        };
        expect(platform.storage.get('k')).toBe(null);
    });

    it('works without optional APIs (onKeyDown / onWindowResize)', () => {
        const platform = createWechatPlatform(createFakeWx());
        expect(() => {
            platform.onKey(() => {});
            platform.onResize(() => {});
        }).not.toThrow();
    });

    it('uses the injected frame scheduler', () => {
        const raf = vi.fn();
        const platform = createWechatPlatform(createFakeWx(), { raf });
        const cb = () => {};
        platform.requestFrame(cb);
        expect(raf).toHaveBeenCalledWith(cb);
        expect(typeof platform.now()).toBe('number');
    });
});
