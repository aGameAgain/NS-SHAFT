import { installWxShim } from './wx-shim.js';

const params = new URLSearchParams(window.location.search);
installWxShim({ mount: document.getElementById('device'), device: params.get('device') || 'iphonex' });

// 必须在 shim 安装之后再加载微信入口，入口模块顶层会立即访问 wx
await import('../src/entries/wechat.js');
