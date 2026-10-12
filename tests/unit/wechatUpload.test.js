import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveUploadConfig, run } from '../../scripts/wechat-upload.mjs';

const KEY = '-----BEGIN RSA PRIVATE KEY-----\nabc\n-----END RSA PRIVATE KEY-----\n';
const APPID = 'wx0123456789abcdef';

function createProject({ files = ['game.js', 'game.json', 'project.config.json'] } = {}) {
    const root = mkdtempSync(join(tmpdir(), 'ns-shaft-upload-'));
    writeFileSync(join(root, 'package.json'), JSON.stringify({ version: '2.3.4' }));
    const dist = join(root, 'dist/wechat');
    mkdirSync(dist, { recursive: true });
    for (const file of files) writeFileSync(join(dist, file), '{}');
    return root;
}

describe('wechat-upload script', () => {
    it('allows a dry run without credentials and never touches miniprogram-ci', async () => {
        const root = createProject();
        const config = resolveUploadConfig(['--dry-run'], {}, { root });
        expect(config).toMatchObject({ action: 'upload', dryRun: true, robot: 1, version: '2.3.4', desc: 'ci local' });
        const logs = [];
        const result = await run(config, { log: line => logs.push(line) });
        expect(result.dryRun).toBe(true);
        expect(logs[0]).toContain('[dry-run]');
    });

    it('requires a valid appid and private key for real uploads', () => {
        const root = createProject();
        expect(() => resolveUploadConfig([], {}, { root })).toThrow('WECHAT_APPID');
        expect(() => resolveUploadConfig([], { WECHAT_APPID: APPID }, { root })).toThrow('WECHAT_PRIVATE_KEY');
        const keyPath = join(root, 'key');
        writeFileSync(keyPath, KEY);
        const config = resolveUploadConfig(['--action', 'preview', '--robot', '3', '--version', '9.9.9'], {
            WECHAT_APPID: APPID,
            WECHAT_PRIVATE_KEY_PATH: keyPath,
            GITHUB_SHA: 'abcdef1234567'
        }, { root });
        expect(config).toMatchObject({ action: 'preview', robot: 3, version: '9.9.9', desc: 'ci abcdef1', privateKey: KEY });
    });

    it('rejects bad arguments and missing build output', () => {
        const root = createProject();
        expect(() => resolveUploadConfig(['--dry-run', '--action', 'publish'], {}, { root })).toThrow('--action');
        expect(() => resolveUploadConfig(['--dry-run', '--robot', '31'], {}, { root })).toThrow('--robot');
        const empty = createProject({ files: ['game.json'] });
        expect(() => resolveUploadConfig(['--dry-run'], {}, { root: empty })).toThrow('npm run build:wechat');
    });

    it('masks the appid in its log output', async () => {
        const root = createProject();
        const logs = [];
        await run(resolveUploadConfig(['--dry-run'], { WECHAT_APPID: APPID }, { root }), { log: line => logs.push(line) });
        expect(logs.join('\n')).not.toContain(APPID);
    });
});
