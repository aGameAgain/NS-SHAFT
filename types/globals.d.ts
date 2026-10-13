// 仅供 `npm run typecheck`（tsc --checkJs）使用，不参与构建

/** 微信小游戏全局对象。只在 src/platform/wechat.js 与入口中访问，接口以官方文档为准 */
declare const wx: any;
declare const GameGlobal: any;

interface Window {
    webkitAudioContext?: typeof AudioContext;
    __NS_SHAFT__?: import('../src/app/GameApp.js').GameApp;
    __NS_SHAFT_REPLAY_URL__?: () => string | null;
    wx?: any;
    GameGlobal?: any;
}
