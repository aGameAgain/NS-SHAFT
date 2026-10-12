const VERSION = 'ns1';
const LEFT = 1;
const RIGHT = 2;
const JUMP = 4;

const toMask = input => (input.left ? LEFT : 0) | (input.right ? RIGHT : 0) | (input.jump ? JUMP : 0);
const fromMask = mask => ({ left: Boolean(mask & LEFT), right: Boolean(mask & RIGHT), jump: Boolean(mask & JUMP) });

/**
 * 回放 = 规则 + seed + 每 tick 的输入。GameSession 是确定性的，
 * 所以用它就能逐帧重现一局（复现 bug、分享、成绩校验）。
 * 编码：`ns1.<rules>.<seed>.<runs>`，runs 为 `<输入掩码><重复次数(36进制)>` 以 `_` 连接。
 */
export class ReplayRecorder {
    constructor(rules, seed) {
        this.rules = rules;
        this.seed = seed >>> 0;
        this.runs = [];
        this.ticks = 0;
    }

    record(input) {
        const mask = toMask(input);
        const last = this.runs[this.runs.length - 1];
        if (last && last[0] === mask) last[1]++;
        else this.runs.push([mask, 1]);
        this.ticks++;
    }

    encode() {
        const runs = this.runs.map(([mask, count]) => `${mask}${count.toString(36)}`).join('_');
        return `${VERSION}.${this.rules}.${this.seed}.${runs}`;
    }
}

/** @returns {{rules: string, seed: number, ticks: number, runs: Array<[number, number]>}} */
export function decodeReplay(code) {
    const parts = String(code).trim().split('.');
    if (parts.length !== 4 || parts[0] !== VERSION) {
        throw new Error('无法识别的回放格式');
    }
    const [, rules, seedText, runsText] = parts;
    const seed = Number(seedText);
    if (!rules || !Number.isInteger(seed) || seed < 0) {
        throw new Error('回放数据损坏');
    }
    /** @type {Array<[number, number]>} */
    const runs = runsText === '' ? [] : runsText.split('_').map(token => {
        const mask = Number(token[0]);
        const count = parseInt(token.slice(1), 36);
        if (!(mask >= 0 && mask <= 7) || !(count > 0)) throw new Error('回放数据损坏');
        return /** @type {[number, number]} */ ([mask, count]);
    });
    const ticks = runs.reduce((sum, [, count]) => sum + count, 0);
    return { rules, seed, ticks, runs };
}

/** 逐 tick 产出录制时的输入，播完后返回空输入 */
export class ReplayPlayer {
    constructor(replay) {
        this.replay = replay;
        this.runIndex = 0;
        this.used = 0;
        this.tick = 0;
    }

    get done() {
        return this.tick >= this.replay.ticks;
    }

    next() {
        const run = this.replay.runs[this.runIndex];
        if (!run) return { left: false, right: false, jump: false };
        this.tick++;
        if (++this.used >= run[1]) {
            this.runIndex++;
            this.used = 0;
        }
        return fromMask(run[0]);
    }
}

/** 日期 → 当日固定 seed，所有玩家同一天玩到同一关 */
export function dailySeed(year, month, day) {
    const key = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    let hash = 0x811c9dc5;
    for (let i = 0; i < key.length; i++) {
        hash ^= key.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return { key, seed: hash };
}
