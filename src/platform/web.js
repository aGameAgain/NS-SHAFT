const PREVENT_DEFAULT_KEYS = new Set([' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']);

/**
 * 浏览器平台适配器
 * @param {HTMLCanvasElement} canvas
 * @returns {import('../app/GameApp.js').PlatformAdapter}
 */
export function createWebPlatform(canvas, { forceTouch = false } = {}) {
    const touchCapable = forceTouch || 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    const toCanvas = e => {
        const rect = canvas.getBoundingClientRect();
        return [e.clientX - rect.left, e.clientY - rect.top];
    };

    return {
        name: 'web',
        canvas,
        touchCapable,

        getViewport() {
            const rect = canvas.getBoundingClientRect();
            return {
                width: rect.width || canvas.clientWidth || 400,
                height: rect.height || canvas.clientHeight || 600,
                pixelRatio: window.devicePixelRatio || 1,
                safeTop: 0
            };
        },

        onResize(cb) {
            window.addEventListener('resize', cb);
            if (typeof ResizeObserver !== 'undefined') {
                new ResizeObserver(cb).observe(canvas);
            }
        },

        onPointer({ down, move, up }) {
            canvas.addEventListener('pointerdown', e => {
                e.preventDefault();
                canvas.setPointerCapture?.(e.pointerId);
                down(e.pointerId, ...toCanvas(e));
            });
            canvas.addEventListener('pointermove', e => move(e.pointerId, ...toCanvas(e)));
            canvas.addEventListener('pointerup', e => up(e.pointerId));
            canvas.addEventListener('pointercancel', e => up(e.pointerId));
            canvas.addEventListener('contextmenu', e => e.preventDefault());
        },

        onKey(cb) {
            window.addEventListener('keydown', e => {
                if (PREVENT_DEFAULT_KEYS.has(e.key)) e.preventDefault();
                cb(e.key, true);
            });
            window.addEventListener('keyup', e => cb(e.key, false));
        },

        onVisibility(cb) {
            document.addEventListener('visibilitychange', () => cb(!document.hidden));
            window.addEventListener('blur', () => cb(false));
        },

        storage: {
            get(key) {
                try {
                    return window.localStorage.getItem(key);
                } catch {
                    return null;
                }
            },
            set(key, value) {
                try {
                    window.localStorage.setItem(key, value);
                } catch {
                    // 隐私模式等场景下 localStorage 不可用，忽略即可
                }
            }
        },

        requestFrame: cb => window.requestAnimationFrame(cb),
        now: () => performance.now()
    };
}
