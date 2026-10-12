const CTX_METHODS = [
    'setTransform', 'clearRect', 'fillRect', 'strokeRect', 'fillText', 'beginPath', 'moveTo',
    'lineTo', 'arc', 'fill', 'stroke', 'rect', 'clip', 'save', 'restore', 'translate'
];

/** 记录所有调用的 2D 上下文替身，只实现渲染层用到的 API 子集 */
export function createRecordingContext() {
    const calls = [];
    const ctx = { calls };
    for (const name of CTX_METHODS) {
        ctx[name] = (...args) => {
            calls.push({ name, args, fillStyle: ctx.fillStyle, font: ctx.font });
        };
    }
    ctx.texts = () => calls.filter(c => c.name === 'fillText').map(c => c.args[0]);
    ctx.reset = () => {
        calls.length = 0;
    };
    return ctx;
}

export function createFakeCanvas(width = 400, height = 680) {
    const ctx = createRecordingContext();
    return { width, height, ctx, getContext: () => ctx };
}

/** 手动驱动时间和帧的平台适配器替身 */
export function createFakePlatform({ width = 400, height = 680, pixelRatio = 1, touchCapable = false } = {}) {
    const handlers = { resize: [], key: [], visibility: [] };
    const store = new Map();
    let pointer = null;
    let frameCb = null;
    let time = 0;
    const viewport = { width, height, pixelRatio, safeTop: 0 };

    const platform = {
        name: 'fake',
        canvas: createFakeCanvas(width, height),
        touchCapable,
        getViewport: () => ({ ...viewport }),
        onResize: cb => handlers.resize.push(cb),
        onPointer: h => {
            pointer = h;
        },
        onKey: cb => handlers.key.push(cb),
        onVisibility: cb => handlers.visibility.push(cb),
        storage: {
            get: key => (store.has(key) ? store.get(key) : null),
            set: (key, value) => store.set(key, value)
        },
        requestFrame: cb => {
            frameCb = cb;
        },
        now: () => time,

        // 测试控制
        store,
        viewport,
        pressKey(key) {
            handlers.key.forEach(cb => cb(key, true));
        },
        releaseKey(key) {
            handlers.key.forEach(cb => cb(key, false));
        },
        tap(id, x, y) {
            pointer.down(id, x, y);
        },
        drag(id, x, y) {
            pointer.move(id, x, y);
        },
        release(id) {
            pointer.up(id);
        },
        setVisible(visible) {
            handlers.visibility.forEach(cb => cb(visible));
        },
        resize(w, h) {
            viewport.width = w;
            viewport.height = h;
            handlers.resize.forEach(cb => cb());
        },
        /** 以给定帧间隔推进若干帧 */
        runFrames(count, frameMs = 1000 / 60) {
            for (let i = 0; i < count; i++) {
                time += frameMs;
                const cb = frameCb;
                frameCb = null;
                cb?.();
            }
        }
    };
    return platform;
}

/** 最小可用的 wx 全局替身，覆盖 src/platform/wechat.js 用到的 API */
export function createFakeWx({ windowWidth = 375, windowHeight = 812, pixelRatio = 3, safeTop = 44 } = {}) {
    const listeners = {};
    const on = name => cb => (listeners[name] ||= []).push(cb);
    const storage = new Map();
    const canvases = [];

    const wx = {
        canvases,
        storage,
        createCanvas() {
            const canvas = createFakeCanvas(windowWidth, windowHeight);
            canvases.push(canvas);
            return canvas;
        },
        getWindowInfo: () => ({
            windowWidth,
            windowHeight,
            pixelRatio,
            safeArea: { top: safeTop, bottom: windowHeight, left: 0, right: windowWidth }
        }),
        onTouchStart: on('touchstart'),
        onTouchMove: on('touchmove'),
        onTouchEnd: on('touchend'),
        onTouchCancel: on('touchcancel'),
        onShow: on('show'),
        onHide: on('hide'),
        getStorageSync: key => (storage.has(key) ? storage.get(key) : ''),
        setStorageSync: (key, value) => storage.set(key, value),
        emit(name, payload = {}) {
            (listeners[name] || []).forEach(cb => cb(payload));
        },
        touch(type, identifier, clientX, clientY) {
            const t = { identifier, clientX, clientY };
            wx.emit(type, { touches: [t], changedTouches: [t] });
        }
    };
    return wx;
}
