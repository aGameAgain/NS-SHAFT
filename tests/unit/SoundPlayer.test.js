import { describe, it, expect } from 'vitest';
import { SoundPlayer } from '../../src/app/SoundPlayer.js';
import { PLATFORM_TYPES } from '../../src/core/Platform.js';
import { createFakeAudioContext } from '../helpers/fakes.js';

function createPlayer(options) {
    const ctx = createFakeAudioContext();
    let created = 0;
    const player = new SoundPlayer(() => {
        created++;
        return ctx;
    }, options);
    return { ctx, player, created: () => created };
}

describe('SoundPlayer', () => {
    it('stays silent and creates no context until unlocked by a user gesture', () => {
        const { ctx, player, created } = createPlayer();
        player.handleEvents([{ type: 'jump' }]);
        expect(created()).toBe(0);
        expect(ctx.played).toHaveLength(0);

        player.unlock();
        player.unlock();
        expect(created()).toBe(1);
        expect(ctx.resumeCalls).toBe(1);
        player.handleEvents([{ type: 'jump' }]);
        expect(ctx.played).toHaveLength(1);
    });

    it('maps game events to sounds and caches the synthesized buffers', () => {
        const { ctx, player } = createPlayer();
        player.unlock();
        player.handleEvents([
            { type: 'jump' },
            { type: 'land', platformType: PLATFORM_TYPES.NORMAL },
            { type: 'land', platformType: PLATFORM_TYPES.SPRING },
            { type: 'spring' },
            { type: 'land', platformType: PLATFORM_TYPES.SPIKE },
            { type: 'heal', amount: 1 },
            { type: 'gameover', depth: 10 },
            { type: 'jump' }
        ]);
        expect(ctx.played).toHaveLength(5);
        expect(ctx.played[0]).toBe(ctx.played[4]);
        expect(ctx.played[0].length).toBeGreaterThan(0);
        expect([...ctx.played[0].getChannelData(0)].some(s => s !== 0)).toBe(true);
    });

    it('rate-limits the hurt sound while passing through spikes', () => {
        const { ctx, player } = createPlayer();
        player.unlock();
        for (let i = 0; i < 10; i++) player.handleEvents([{ type: 'damage', source: 'spike', amount: 1 }]);
        expect(ctx.played).toHaveLength(1);
        ctx.currentTime = 0.5;
        player.handleEvents([{ type: 'damage', source: 'spike', amount: 1 }]);
        expect(ctx.played).toHaveLength(2);
    });

    it('can be muted', () => {
        const { ctx, player } = createPlayer({ muted: true });
        player.unlock();
        player.handleEvents([{ type: 'jump' }]);
        expect(ctx.played).toHaveLength(0);
        expect(player.toggleMute()).toBe(false);
        player.handleEvents([{ type: 'jump' }]);
        expect(ctx.played).toHaveLength(1);
    });

    it('degrades silently when audio is unavailable', () => {
        const player = new SoundPlayer(() => {
            throw new Error('no audio');
        });
        player.unlock();
        expect(player.available).toBe(false);
        expect(() => player.handleEvents([{ type: 'jump' }])).not.toThrow();

        const nullPlayer = new SoundPlayer(() => null);
        nullPlayer.unlock();
        expect(nullPlayer.play('jump')).toBe(false);
    });

    it('survives a context that throws while playing', () => {
        const { ctx, player } = createPlayer();
        player.unlock();
        ctx.createBufferSource = () => {
            throw new Error('boom');
        };
        expect(player.play('jump')).toBe(false);
    });
});
