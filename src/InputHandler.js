// InputHandler Class
export class InputHandler {
    constructor() {
        this.keys = {};
        this.setupEventListeners();
    }

    setupEventListeners() {
        const keyHandler = (pressed) => (e) => {
            this.keys[e.key] = pressed;
        };

        window.addEventListener('keydown', keyHandler(true));
        window.addEventListener('keyup', keyHandler(false));
    }

    setupMobileControls(leftButton, rightButton) {
        const createHandlers = (key) => ({
            start: () => { this.keys[key] = true; },
            end: () => { this.keys[key] = false; }
        });

        const leftHandlers = createHandlers('ArrowLeft');
        const rightHandlers = createHandlers('ArrowRight');

        // Left button events
        ['touchstart', 'mousedown'].forEach(event => {
            leftButton.addEventListener(event, leftHandlers.start);
        });
        ['touchend', 'mouseup', 'mouseleave'].forEach(event => {
            leftButton.addEventListener(event, leftHandlers.end);
        });

        // Right button events
        ['touchstart', 'mousedown'].forEach(event => {
            rightButton.addEventListener(event, rightHandlers.start);
        });
        ['touchend', 'mouseup', 'mouseleave'].forEach(event => {
            rightButton.addEventListener(event, rightHandlers.end);
        });
    }

    isPressed(key) {
        return Boolean(this.keys[key]);
    }

    getMovementInput() {
        const leftKeys = ['ArrowLeft', 'a', 'A'];
        const rightKeys = ['ArrowRight', 'd', 'D'];
        
        if (leftKeys.some(key => this.keys[key])) return -1;
        if (rightKeys.some(key => this.keys[key])) return 1;
        return 0;
    }

    isJumpPressed() {
        return this.keys[' '];
    }

    getKeys() {
        return this.keys;
    }
}