/**
 * 微信小游戏平台适配器。这里是唯一允许直接访问 wx.* 的地方。
 * @param {object} wx  微信全局对象（测试或浏览器模拟时可传入替身）
 * @returns {import('../app/GameApp.js').PlatformAdapter}
 */
export function createWechatPlatform(wx, { raf } = {}) {
    const getInfo = () => (wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync());
    // 首次调用 wx.createCanvas() 得到的是上屏画布
    const canvas = wx.createCanvas();
    const requestFrame = raf
        || (typeof requestAnimationFrame === 'function'
            ? cb => requestAnimationFrame(cb)
            : cb => setTimeout(cb, 1000 / 60));

    const eachTouch = handler => res => {
        for (const t of res.changedTouches || []) {
            handler(t.identifier, t.clientX, t.clientY);
        }
    };

    return {
        name: 'wechat',
        canvas,
        touchCapable: true,

        getViewport() {
            const info = getInfo();
            return {
                width: info.windowWidth,
                height: info.windowHeight,
                pixelRatio: info.pixelRatio || 1,
                safeTop: info.safeArea ? info.safeArea.top : (info.statusBarHeight || 0)
            };
        },

        onResize(cb) {
            wx.onWindowResize?.(() => cb());
        },

        onPointer({ down, move, up }) {
            wx.onTouchStart(eachTouch(down));
            wx.onTouchMove(eachTouch(move));
            wx.onTouchEnd(eachTouch(id => up(id)));
            wx.onTouchCancel(eachTouch(id => up(id)));
        },

        // PC 版微信支持键盘事件，移动端没有这两个 API
        onKey(cb) {
            wx.onKeyDown?.(res => cb(res.key, true));
            wx.onKeyUp?.(res => cb(res.key, false));
        },

        onVisibility(cb) {
            wx.onShow?.(() => cb(true));
            wx.onHide?.(() => cb(false));
        },

        storage: {
            get(key) {
                try {
                    const value = wx.getStorageSync(key);
                    return value === '' || value === undefined ? null : String(value);
                } catch {
                    return null;
                }
            },
            set(key, value) {
                try {
                    wx.setStorageSync(key, value);
                } catch {
                    // 存储满或被禁用时忽略，不影响游戏
                }
            }
        },

        requestFrame,
        now: () => Date.now()
    };
}
