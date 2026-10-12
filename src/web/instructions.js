const MOBILE_BREAKPOINT = 768;
const VIEWED_KEY = 'instructionsViewed';

/** 网页版专属：游戏说明面板在移动端默认折叠 */
export function setupInstructions() {
    const instructions = document.getElementById('gameInstructions');
    const hint = document.getElementById('mobileInstructionHint');
    const closeBtn = document.getElementById('closeInstructions');
    if (!instructions || !hint || !closeBtn) return;

    const isMobile = () => window.innerWidth <= MOBILE_BREAKPOINT;
    const viewed = () => {
        try {
            return localStorage.getItem(VIEWED_KEY) === 'true';
        } catch {
            return false;
        }
    };

    const apply = () => {
        if (isMobile()) {
            instructions.classList.add('hide-instructions');
            closeBtn.style.display = '';
            hint.style.display = viewed() ? 'none' : '';
        } else {
            instructions.classList.remove('hide-instructions');
            closeBtn.style.display = 'none';
            hint.style.display = 'none';
        }
    };

    hint.addEventListener('click', () => {
        instructions.classList.remove('hide-instructions');
        hint.style.display = 'none';
    });
    closeBtn.addEventListener('click', () => {
        instructions.classList.add('hide-instructions');
        try {
            localStorage.setItem(VIEWED_KEY, 'true');
        } catch {
            // 忽略
        }
    });

    let wasMobile = isMobile();
    apply();
    window.addEventListener('resize', () => {
        if (isMobile() !== wasMobile) {
            wasMobile = isMobile();
            apply();
        }
    });
}
