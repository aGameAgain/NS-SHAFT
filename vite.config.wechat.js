import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// 微信小游戏：打包成单个 game.js，并把 platforms/wechat 下的工程配置一起输出，
// 产物目录 dist/wechat 可直接用微信开发者工具导入
export default defineConfig(({ mode }) => ({
    publicDir: resolve(import.meta.dirname, 'platforms/wechat'),
    build: {
        outDir: 'dist/wechat',
        emptyOutDir: true,
        target: 'es2015',
        minify: mode !== 'development',
        sourcemap: mode === 'development' ? 'inline' : false,
        lib: {
            entry: resolve(import.meta.dirname, 'src/entries/wechat.js'),
            formats: ['iife'],
            name: 'NSShaft',
            fileName: () => 'game.js'
        }
    }
}));
