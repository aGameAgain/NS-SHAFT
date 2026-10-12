import { defineConfig } from 'vitest/config';

// 逻辑层、渲染层、应用层都不依赖 DOM，单测直接跑在 node 环境
export default defineConfig({
    test: {
        environment: 'node',
        include: ['tests/unit/**/*.test.js', 'tests/wechat/**/*.test.js'],
        coverage: {
            provider: 'v8',
            include: ['src/core/**', 'src/app/**', 'src/render/**', 'src/platform/wechat.js'],
            reporter: ['text', 'html', 'json-summary'],
            thresholds: {
                'src/core/**': { lines: 90, branches: 85, functions: 90, statements: 90 }
            }
        }
    }
});
