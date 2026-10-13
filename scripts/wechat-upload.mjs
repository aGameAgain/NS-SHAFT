#!/usr/bin/env node
/**
 * 用 miniprogram-ci 把 dist/wechat 上传为开发版或生成预览二维码。
 *
 *   npm run build:wechat
 *   WECHAT_APPID=wx... WECHAT_PRIVATE_KEY="$(cat private.key)" node scripts/wechat-upload.mjs --action preview
 *   node scripts/wechat-upload.mjs --dry-run          # 不需要密钥，只校验产物与参数
 *
 * 环境变量：
 *   WECHAT_APPID              小游戏 AppID
 *   WECHAT_PRIVATE_KEY        代码上传密钥内容（与下一项二选一）
 *   WECHAT_PRIVATE_KEY_PATH   代码上传密钥文件路径
 *
 * miniprogram-ci 依赖很重（约 300MB），不放进 devDependencies，需要时临时安装：
 *   npm install --no-save miniprogram-ci
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REQUIRED_FILES = ['game.js', 'game.json', 'project.config.json'];
const ACTIONS = ['upload', 'preview'];

/**
 * @param {string[]} argv
 * @param {Record<string, string | undefined>} env
 * @param {{root?: string}} [options]
 */
export function resolveUploadConfig(argv, env, { root = ROOT } = {}) {
    const { values } = parseArgs({
        args: argv,
        options: {
            action: { type: 'string', default: 'upload' },
            'dry-run': { type: 'boolean', default: false },
            'project-path': { type: 'string', default: join(root, 'dist/wechat') },
            version: { type: 'string' },
            desc: { type: 'string' },
            robot: { type: 'string', default: '1' },
            qrcode: { type: 'string', default: join(root, 'dist/wechat-preview.jpg') }
        }
    });

    const action = values.action;
    if (!ACTIONS.includes(action)) throw new Error(`--action 只能是 ${ACTIONS.join(' / ')}，收到 ${action}`);

    const robot = Number(values.robot);
    if (!Number.isInteger(robot) || robot < 1 || robot > 30) throw new Error('--robot 取值范围为 1 ~ 30');

    const projectPath = resolve(values['project-path']);
    const missing = REQUIRED_FILES.filter(file => !existsSync(join(projectPath, file)));
    if (missing.length) {
        throw new Error(`${projectPath} 缺少 ${missing.join(', ')}，请先运行 npm run build:wechat`);
    }

    const dryRun = values['dry-run'];
    const appid = env.WECHAT_APPID || '';
    const privateKey = env.WECHAT_PRIVATE_KEY || (env.WECHAT_PRIVATE_KEY_PATH ? readFileSync(env.WECHAT_PRIVATE_KEY_PATH, 'utf8') : '');
    if (!dryRun) {
        if (!/^wx[0-9a-f]{16}$/i.test(appid)) throw new Error('缺少或无效的 WECHAT_APPID');
        if (!privateKey.includes('PRIVATE KEY')) throw new Error('缺少 WECHAT_PRIVATE_KEY / WECHAT_PRIVATE_KEY_PATH');
    }

    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
    const sha = env.GITHUB_SHA ? env.GITHUB_SHA.slice(0, 7) : 'local';
    return {
        action,
        dryRun,
        appid,
        privateKey,
        projectPath,
        robot,
        version: values.version || pkg.version,
        desc: values.desc || `ci ${sha}`,
        qrcodeOutputDest: resolve(values.qrcode)
    };
}

/** 发布用的 project.config.json 与本地调试用的 touristappid 区分开 */
function writeAppid(projectPath, appid) {
    const file = join(projectPath, 'project.config.json');
    const config = JSON.parse(readFileSync(file, 'utf8'));
    config.appid = appid;
    writeFileSync(file, `${JSON.stringify(config, null, 2)}\n`);
}

async function loadMiniprogramCi() {
    try {
        const mod = await import('miniprogram-ci');
        return mod.default ?? mod;
    } catch {
        throw new Error('未安装 miniprogram-ci，请先运行 npm install --no-save miniprogram-ci');
    }
}

export async function run(config, { log = console.log } = {}) {
    const summary = {
        action: config.action,
        projectPath: config.projectPath,
        version: config.version,
        desc: config.desc,
        robot: config.robot,
        appid: config.appid ? `${config.appid.slice(0, 4)}…` : '(未设置)'
    };
    if (config.dryRun) {
        log(`[dry-run] ${JSON.stringify(summary)}`);
        return { dryRun: true, summary };
    }

    const ci = await loadMiniprogramCi();
    writeAppid(config.projectPath, config.appid);
    const project = new ci.Project({
        appid: config.appid,
        type: 'miniGame',
        projectPath: config.projectPath,
        privateKey: config.privateKey,
        ignores: ['node_modules/**/*']
    });
    const common = {
        project,
        desc: config.desc,
        robot: config.robot,
        setting: { useProjectConfig: true },
        onProgressUpdate: () => {}
    };

    log(`${config.action} ${JSON.stringify(summary)}`);
    if (config.action === 'preview') {
        mkdirSync(dirname(config.qrcodeOutputDest), { recursive: true });
        const result = await ci.preview({ ...common, qrcodeFormat: 'image', qrcodeOutputDest: config.qrcodeOutputDest });
        log(`预览二维码: ${config.qrcodeOutputDest}`);
        return result;
    }
    return ci.upload({ ...common, version: config.version });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
    try {
        const result = await run(resolveUploadConfig(process.argv.slice(2), process.env));
        if (result?.subPackageInfo) console.log(JSON.stringify(result.subPackageInfo));
    } catch (err) {
        console.error(`wechat-upload: ${err.message}`);
        process.exitCode = 1;
    }
}
