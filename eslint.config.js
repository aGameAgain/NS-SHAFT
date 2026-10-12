import js from '@eslint/js';
import globals from 'globals';

const LAYER_RESTRICTIONS = {
    core: ['../app/*', '../render/*', '../audio/*', '../platform/*', '../entries/*', '../web/*'],
    audio: ['../app/*', '../render/*', '../platform/*', '../entries/*', '../web/*'],
    render: ['../app/*', '../platform/*', '../entries/*', '../web/*'],
    app: ['../platform/*', '../entries/*', '../web/*']
};

const restrictImports = patterns => ({
    'no-restricted-imports': ['error', { patterns: patterns.map(group => ({ group: [group], message: '分层约束：该层不能依赖上层或平台实现' })) }]
});

export default [
    { ignores: ['dist/**', 'coverage/**', 'playwright-report/**', 'test-results/**', 'node_modules/**'] },
    js.configs.recommended,
    {
        languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
        rules: {
            'no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
        }
    },

    // 平台无关层：只允许 ECMAScript 内置对象，出现 window/document/wx/setTimeout 等会被 no-undef 拦截
    { files: ['src/core/**/*.js'], languageOptions: { globals: {} }, rules: restrictImports(LAYER_RESTRICTIONS.core) },
    { files: ['src/audio/**/*.js'], languageOptions: { globals: {} }, rules: restrictImports(LAYER_RESTRICTIONS.audio) },
    { files: ['src/render/**/*.js'], languageOptions: { globals: {} }, rules: restrictImports(LAYER_RESTRICTIONS.render) },
    { files: ['src/app/**/*.js'], languageOptions: { globals: {} }, rules: restrictImports(LAYER_RESTRICTIONS.app) },

    // 浏览器平台
    {
        files: ['src/platform/web.js', 'src/entries/web.js', 'src/web/**/*.js', 'dev/**/*.js'],
        languageOptions: { globals: globals.browser }
    },

    // 微信小游戏平台
    {
        files: ['src/platform/wechat.js', 'src/entries/wechat.js'],
        languageOptions: {
            globals: {
                wx: 'readonly',
                GameGlobal: 'readonly',
                requestAnimationFrame: 'readonly',
                setTimeout: 'readonly'
            }
        }
    },

    // 测试与工具配置
    {
        files: ['tests/**/*.js', '*.config.js', 'scripts/**/*.mjs'],
        languageOptions: { globals: { ...globals.node } }
    },
    {
        files: ['tests/e2e/**/*.js'],
        languageOptions: { globals: { ...globals.node, ...globals.browser } }
    }
];
