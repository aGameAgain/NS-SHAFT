/**
 * 程序合成音效：只产出 PCM 采样（Float32Array），不依赖任何音频 API，
 * 因此 Web / 微信 / Node 测试中结果完全一致，也不需要打包音频资源文件。
 */

/**
 * @typedef {object} Note
 * @property {'square'|'triangle'|'sine'|'noise'} wave
 * @property {[number, number]} freq   起止频率（Hz），按指数曲线滑动
 * @property {number} duration         秒
 * @property {number} [volume]         0..1
 */

/** @type {Record<string, Note[]>} */
export const SOUNDS = {
    jump: [{ wave: 'square', freq: [330, 660], duration: 0.11, volume: 0.18 }],
    spring: [{ wave: 'square', freq: [262, 1046], duration: 0.22, volume: 0.18 }],
    land: [{ wave: 'triangle', freq: [190, 90], duration: 0.06, volume: 0.35 }],
    hurt: [{ wave: 'noise', freq: [900, 200], duration: 0.14, volume: 0.3 }],
    gameover: [
        { wave: 'triangle', freq: [440, 440], duration: 0.14, volume: 0.35 },
        { wave: 'triangle', freq: [349, 349], duration: 0.14, volume: 0.35 },
        { wave: 'triangle', freq: [294, 294], duration: 0.14, volume: 0.35 },
        { wave: 'triangle', freq: [220, 110], duration: 0.45, volume: 0.35 }
    ]
};

export const SOUND_NAMES = Object.keys(SOUNDS);

const ATTACK_SECONDS = 0.004;

function oscillator(wave, phase, noise) {
    switch (wave) {
        case 'square': return phase < 0.5 ? 1 : -1;
        case 'triangle': return 1 - 4 * Math.abs(phase - 0.5);
        case 'sine': return Math.sin(phase * 2 * Math.PI);
        case 'noise': return noise;
        default: throw new Error(`未知波形: ${wave}`);
    }
}

/**
 * @param {Note} note
 * @param {Float32Array} out
 * @param {number} offset
 * @param {number} sampleRate
 * @returns {number} 写入的采样数
 */
function renderNote(note, out, offset, sampleRate) {
    const length = Math.round(note.duration * sampleRate);
    const [f0, f1] = note.freq;
    const volume = note.volume ?? 0.3;
    let phase = 0;
    let seed = 0x9e3779b9;
    let noise = 0;
    let lastPhase = 0;

    for (let i = 0; i < length; i++) {
        const t = i / length;
        const freq = f0 * Math.pow(f1 / f0, t);
        phase = (phase + freq / sampleRate) % 1;
        // 噪声按「频率」重新取样，频率越低越粗糙，模拟 8-bit 噪声通道
        if (phase < lastPhase || i === 0) {
            seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
            noise = (seed / 0xffffffff) * 2 - 1;
        }
        lastPhase = phase;

        const elapsed = i / sampleRate;
        const attack = Math.min(1, elapsed / ATTACK_SECONDS);
        const decay = (1 - t) * (1 - t);
        out[offset + i] = oscillator(note.wave, phase, noise) * volume * attack * decay;
    }
    return length;
}

/**
 * @param {string} name
 * @param {number} sampleRate
 * @returns {Float32Array}
 */
export function synthesize(name, sampleRate) {
    const notes = SOUNDS[name];
    if (!notes) throw new Error(`未知音效: ${name}`);
    const total = notes.reduce((sum, n) => sum + Math.round(n.duration * sampleRate), 0);
    const out = new Float32Array(total);
    let offset = 0;
    for (const note of notes) offset += renderNote(note, out, offset, sampleRate);
    return out;
}
