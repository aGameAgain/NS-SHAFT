import { GameApp } from '../app/GameApp.js';
import { createWebPlatform } from '../platform/web.js';
import { setupInstructions } from '../web/instructions.js';

const params = new URLSearchParams(window.location.search);
const seedParam = params.get('seed');
const touchParam = params.get('touch');

setupInstructions();

const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('gameCanvas'));
const platform = createWebPlatform(canvas, {
    forceTouch: touchParam === '1'
});
const app = new GameApp(platform, {
    seed: seedParam !== null ? Number(seedParam) : undefined,
    rules: params.get('rules') ?? undefined,
    replay: params.get('replay') ?? undefined,
    debug: params.has('debug'),
    touchControls: touchParam === null ? undefined : touchParam === '1'
});
app.start();

// 调试 / e2e 钩子：控制台里可用 __NS_SHAFT__.getSnapshot()、__NS_SHAFT__.advance(60)
window.__NS_SHAFT__ = app;

/** 生成可直接打开的回放链接，用于复现 bug：__NS_SHAFT_REPLAY_URL__() */
window.__NS_SHAFT_REPLAY_URL__ = () => {
    const code = app.exportReplay();
    if (!code) return null;
    const url = new URL(window.location.href);
    url.search = '';
    url.searchParams.set('replay', code);
    return url.toString();
};
