import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// 网页版：index.html 为正式页面，wechat.html 为浏览器内的微信运行时模拟器
export default defineConfig({
    base: './',
    publicDir: false,
    server: {
        port: 5173,
        host: true
    },
    preview: {
        port: 4173
    },
    build: {
        outDir: 'dist/web',
        emptyOutDir: true,
        sourcemap: true,
        rollupOptions: {
            input: {
                main: resolve(import.meta.dirname, 'index.html'),
                wechat: resolve(import.meta.dirname, 'wechat.html')
            }
        }
    }
});
