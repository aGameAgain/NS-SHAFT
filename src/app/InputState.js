const LEFT_KEYS = new Set(['ArrowLeft', 'a']);
const RIGHT_KEYS = new Set(['ArrowRight', 'd']);
const JUMP_KEYS = new Set([' ', 'ArrowUp', 'w']);

/**
 * 把键盘和触控按钮统一成逻辑层需要的 {left, right, jump}。
 * jump 是边沿触发：按下时入队，下一个 tick 消费，帧率高于 tick 率时也不会丢。
 */
export class InputState {
    constructor() {
        this.keys = new Set();
        this.buttons = new Set();
        this.jumpQueued = false;
    }

    setKey(key, pressed) {
        if (pressed) {
            if (JUMP_KEYS.has(key) && !this.keys.has(key)) this.jumpQueued = true;
            this.keys.add(key);
        } else {
            this.keys.delete(key);
        }
    }

    setButton(id, pressed) {
        if (pressed) {
            if (id === 'jump' && !this.buttons.has(id)) this.jumpQueued = true;
            this.buttons.add(id);
        } else {
            this.buttons.delete(id);
        }
    }

    get left() {
        return this.buttons.has('left') || [...LEFT_KEYS].some(k => this.keys.has(k));
    }

    get right() {
        return this.buttons.has('right') || [...RIGHT_KEYS].some(k => this.keys.has(k));
    }

    consume() {
        const input = { left: this.left, right: this.right, jump: this.jumpQueued };
        this.jumpQueued = false;
        return input;
    }

    pressedButtons() {
        return this.buttons;
    }

    clearQueued() {
        this.jumpQueued = false;
    }

    clear() {
        this.keys.clear();
        this.buttons.clear();
        this.jumpQueued = false;
    }
}
