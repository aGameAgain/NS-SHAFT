import { GameApp } from '../app/GameApp.js';
import { createWechatPlatform } from '../platform/wechat.js';

export const app = new GameApp(createWechatPlatform(wx));
app.start();

// 微信开发者工具控制台中可通过 GameGlobal.__NS_SHAFT__ 调试
if (typeof GameGlobal !== 'undefined') {
    GameGlobal.__NS_SHAFT__ = app;
}
