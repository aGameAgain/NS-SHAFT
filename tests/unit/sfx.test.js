import { describe, it, expect } from 'vitest';
import { SOUNDS, SOUND_NAMES, renderNotes, synthesize } from '../../src/audio/sfx.js';

describe('synthesized sound effects', () => {
    it.each(SOUND_NAMES)('renders %s as bounded, non-silent PCM of the declared length', name => {
        const rate = 8000;
        const samples = synthesize(name, rate);
        const expected = SOUNDS[name].reduce((sum, n) => sum + Math.round(n.duration * rate), 0);
        expect(samples).toBeInstanceOf(Float32Array);
        expect(samples.length).toBe(expected);
        let peak = 0;
        for (const s of samples) {
            expect(Number.isFinite(s)).toBe(true);
            peak = Math.max(peak, Math.abs(s));
        }
        expect(peak).toBeGreaterThan(0.05);
        expect(peak).toBeLessThanOrEqual(1);
    });

    it('is deterministic, including the noise channel', () => {
        expect(synthesize('hurt', 22050)).toEqual(synthesize('hurt', 22050));
    });

    it('fades out to avoid clicks at the end', () => {
        const samples = synthesize('jump', 44100);
        expect(Math.abs(samples[samples.length - 1])).toBeLessThan(0.001);
    });

    it('rejects unknown sounds and waveforms', () => {
        expect(() => synthesize('nope', 8000)).toThrow('未知音效');
        expect(() => renderNotes([{ wave: 'saw', freq: [440, 440], duration: 0.01 }], 8000)).toThrow('未知波形');
    });

    it('renders sine notes back to back with a default volume', () => {
        const samples = renderNotes([
            { wave: 'sine', freq: [440, 440], duration: 0.01 },
            { wave: 'sine', freq: [880, 880], duration: 0.01 }
        ], 8000);
        expect(samples.length).toBe(160);
        expect(Math.max(...samples)).toBeLessThanOrEqual(0.3);
        expect(Math.max(...samples.subarray(80))).toBeGreaterThan(0.05);
    });
});
