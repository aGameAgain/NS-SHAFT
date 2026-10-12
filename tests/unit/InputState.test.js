import { describe, it, expect } from 'vitest';
import { InputState } from '../../src/app/InputState.js';

describe('InputState', () => {
    it('maps keyboard keys to directions', () => {
        const input = new InputState();
        input.setKey('ArrowLeft', true);
        expect(input.consume()).toMatchObject({ left: true, right: false });
        input.setKey('ArrowLeft', false);
        input.setKey('d', true);
        expect(input.consume()).toMatchObject({ left: false, right: true });
    });

    it('treats jump as an edge-triggered press consumed once', () => {
        const input = new InputState();
        input.setKey(' ', true);
        expect(input.consume().jump).toBe(true);
        expect(input.consume().jump).toBe(false);

        // 按住不放的键盘重复事件不会再次触发
        input.setKey(' ', true);
        expect(input.consume().jump).toBe(false);
        input.setKey(' ', false);
        input.setKey(' ', true);
        expect(input.consume().jump).toBe(true);
    });

    it('merges touch buttons with keyboard', () => {
        const input = new InputState();
        input.setButton('right', true);
        input.setButton('jump', true);
        expect(input.consume()).toEqual({ left: false, right: true, jump: true });
        expect(input.pressedButtons().has('right')).toBe(true);
        input.setButton('right', false);
        expect(input.consume().right).toBe(false);
    });

    it('clears all state (e.g. when the app goes to background)', () => {
        const input = new InputState();
        input.setKey('a', true);
        input.setButton('jump', true);
        input.clear();
        expect(input.consume()).toEqual({ left: false, right: false, jump: false });
    });
});
