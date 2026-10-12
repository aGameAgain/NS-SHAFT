/**
 * 浏览器里模拟微信小游戏运行时（仅实现本项目用到的 API），
 * 用于在 Chrome DevTools 中调试 src/entries/wechat.js 的完整链路。
 * 与真机差异以微信开发者工具为准。
 */
const DEVICES = {
    iphone8: { width: 375, height: 667, safeTop: 20 },
    iphonex: { width: 375, height: 812, safeTop: 44 },
    android: { width: 393, height: 851, safeTop: 28 }
};

export function installWxShim({ mount = document.body, device = 'iphonex', storagePrefix = 'wx-shim:' } = {}) {
    const spec = DEVICES[device] || DEVICES.iphonex;
    const pixelRatio = window.devicePixelRatio || 1;

    const frame = document.createElement('div');
    frame.className = 'wx-device';
    frame.style.width = `${spec.width}px`;
    frame.style.height = `${spec.height}px`;
    mount.appendChild(frame);

    const listeners = {};
    const on = name => cb => (listeners[name] ||= []).push(cb);
    const emit = (name, payload) => (listeners[name] || []).forEach(cb => cb(payload));

    let screenCanvas = null;
    const createCanvas = () => {
        const canvas = document.createElement('canvas');
        if (!screenCanvas) {
            screenCanvas = canvas;
            canvas.id = 'wxScreenCanvas';
            canvas.width = spec.width;
            canvas.height = spec.height;
            canvas.style.width = '100%';
            canvas.style.height = '100%';
            canvas.style.touchAction = 'none';
            frame.appendChild(canvas);
            bindTouches(canvas);
        }
        return canvas;
    };

    const toTouch = e => {
        const rect = screenCanvas.getBoundingClientRect();
        return { identifier: e.pointerId, clientX: e.clientX - rect.left, clientY: e.clientY - rect.top };
    };
    const active = new Map();
    const touchEvent = e => ({ touches: [...active.values()], changedTouches: [toTouch(e)], timeStamp: e.timeStamp });

    function bindTouches(canvas) {
        canvas.addEventListener('pointerdown', e => {
            e.preventDefault();
            canvas.setPointerCapture?.(e.pointerId);
            active.set(e.pointerId, toTouch(e));
            emit('touchstart', touchEvent(e));
        });
        canvas.addEventListener('pointermove', e => {
            if (!active.has(e.pointerId)) return;
            active.set(e.pointerId, toTouch(e));
            emit('touchmove', touchEvent(e));
        });
        const end = type => e => {
            if (!active.has(e.pointerId)) return;
            active.delete(e.pointerId);
            emit(type, touchEvent(e));
        };
        canvas.addEventListener('pointerup', end('touchend'));
        canvas.addEventListener('pointercancel', end('touchcancel'));
    }

    window.addEventListener('keydown', e => {
        if ([' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp'].includes(e.key)) e.preventDefault();
        emit('keydown', { key: e.key, code: e.code, timeStamp: e.timeStamp });
    });
    window.addEventListener('keyup', e => emit('keyup', { key: e.key, code: e.code, timeStamp: e.timeStamp }));
    document.addEventListener('visibilitychange', () => emit(document.hidden ? 'hide' : 'show', {}));

    const windowInfo = () => ({
        windowWidth: spec.width,
        windowHeight: spec.height,
        screenWidth: spec.width,
        screenHeight: spec.height,
        pixelRatio,
        statusBarHeight: spec.safeTop,
        safeArea: { top: spec.safeTop, left: 0, right: spec.width, bottom: spec.height, width: spec.width, height: spec.height - spec.safeTop }
    });

    const wx = {
        createCanvas,
        getWindowInfo: windowInfo,
        getSystemInfoSync: () => ({ ...windowInfo(), platform: 'devtools', brand: 'wx-shim' }),
        onTouchStart: on('touchstart'),
        onTouchMove: on('touchmove'),
        onTouchEnd: on('touchend'),
        onTouchCancel: on('touchcancel'),
        onKeyDown: on('keydown'),
        onKeyUp: on('keyup'),
        onShow: on('show'),
        onHide: on('hide'),
        onWindowResize: on('resize'),
        getStorageSync: key => {
            const raw = localStorage.getItem(storagePrefix + key);
            return raw === null ? '' : JSON.parse(raw);
        },
        setStorageSync: (key, value) => localStorage.setItem(storagePrefix + key, JSON.stringify(value))
    };

    window.wx = wx;
    window.GameGlobal = window;
    return wx;
}
