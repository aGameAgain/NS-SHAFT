// mulberry32：可复现的伪随机数，便于回放、调试（?seed=123）和确定性测试
export function createRng(seed) {
    let state = seed >>> 0;
    const next = () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    next.seed = seed >>> 0;
    return next;
}

export function randomSeed() {
    return Math.floor(Math.random() * 0xffffffff);
}
