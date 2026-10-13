import { DAMAGE, DIFFICULTY_TIERS, MAX_LIVES, SCREEN_SCROLL_SPEED } from './config.js';

/**
 * 规则预设：同一套物理，不同的生命 / 伤害 / 回血 / 滚屏 / 平台分布。
 * classic 与重构前的行为保持一致（随机数消耗顺序也一致，旧 seed 生成的关卡不变）。
 *
 * spike.standable  false：尖刺平台可穿过，接触期间每 tick 扣 damage
 *                  true ：可以站立，落地时扣一次 damage（原版 NS-SHAFT）
 * landRegen        落在非尖刺平台上回复的生命值
 * scroll           每 tick 滚屏速度 = min(max, base + depth × perDepth)
 * tiers            按生成深度分档的平台概率，未列出的类型概率为 0，剩余为普通平台
 */
export const RULESETS = {
    classic: {
        id: 'classic',
        name: '经典',
        maxLives: MAX_LIVES,
        spike: { standable: false, damage: DAMAGE.SPIKE },
        ceilingDamage: DAMAGE.CEILING,
        landRegen: 0,
        scroll: { base: SCREEN_SCROLL_SPEED, perDepth: 0, max: SCREEN_SCROLL_SPEED },
        tiers: DIFFICULTY_TIERS
    },
    nsshaft: {
        id: 'nsshaft',
        name: '原版',
        maxLives: 12,
        spike: { standable: true, damage: 5 },
        ceilingDamage: 5,
        landRegen: 1,
        scroll: { base: SCREEN_SCROLL_SPEED, perDepth: 0, max: SCREEN_SCROLL_SPEED },
        tiers: [
            { minDepth: 600, spike: 0.2, breaking: 0.15, spring: 0.1, conveyor: 0.25 },
            { minDepth: 300, spike: 0.15, breaking: 0.15, spring: 0.1, conveyor: 0.2 },
            { minDepth: 100, spike: 0.1, breaking: 0.1, spring: 0.1, conveyor: 0.15 }
        ]
    },
    hard: {
        id: 'hard',
        name: '困难',
        maxLives: MAX_LIVES,
        spike: { standable: false, damage: DAMAGE.SPIKE },
        ceilingDamage: DAMAGE.CEILING,
        landRegen: 0,
        scroll: { base: SCREEN_SCROLL_SPEED, perDepth: 0.0005, max: 1 },
        tiers: [
            { minDepth: 500, spike: 0.2, breaking: 0.2, moving: 0.2, spring: 0.1, conveyor: 0.1 },
            { minDepth: 200, spike: 0.15, breaking: 0.2, moving: 0.2, spring: 0.1, conveyor: 0.05 },
            { minDepth: 50, spike: 0.1, breaking: 0.15, moving: 0.15, spring: 0.1 }
        ]
    }
};

export const RULESET_IDS = Object.keys(RULESETS);
export const DEFAULT_RULESET = 'classic';

export function getRules(id) {
    return RULESETS[id] || RULESETS[DEFAULT_RULESET];
}

export function scrollSpeedAt(rules, depth) {
    const { base, perDepth, max } = rules.scroll;
    return Math.min(max, base + depth * perDepth);
}
