import { GameApp } from '../app/GameApp.js';
import { createWebPlatform } from '../platform/web.js';
import { setupInstructions } from '../web/instructions.js';

const params = new URLSearchParams(window.location.search);
const seedParam = params.get('seed');
const touchParam = params.get('touch');

setupInstructions();

const platform = createWebPlatform(document.getElementById('gameCanvas'), {
    forceTouch: touchParam === '1'
});
const app = new GameApp(platform, {
    seed: seedParam !== null ? Number(seedParam) : undefined,
    debug: params.has('debug'),
    touchControls: touchParam === null ? undefined : touchParam === '1'
});
app.start();

// 调试 / e2e 钩子：控制台里可用 __NS_SHAFT__.getSnapshot()、__NS_SHAFT__.advance(60)
window.__NS_SHAFT__ = app;
