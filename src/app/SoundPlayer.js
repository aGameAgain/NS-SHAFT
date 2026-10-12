import { PLATFORM_TYPES } from '../core/Platform.js';
import { synthesize } from '../audio/sfx.js';

// 经典规则下穿过尖刺每 tick 都会扣血，受伤音效需要限频
const HURT_COOLDOWN_SECONDS = 0.2;

/**
 * 把游戏事件映射为音效，基于 WebAudio 兼容接口播放
 * （浏览器 AudioContext / 微信 wx.createWebAudioContext）。
 * 浏览器要求在用户手势中创建或恢复音频上下文，因此在 unlock() 前不发声。
 */
export class SoundPlayer {
    /**
     * @param {() => object|null} createContext
     * @param {{muted?: boolean}} [options]
     */
    constructor(createContext, { muted = false } = {}) {
        this.createContext = createContext;
        this.muted = muted;
        this.ctx = null;
        this.failed = false;
        this.buffers = new Map();
        this.lastPlayed = new Map();
    }

    get available() {
        return Boolean(this.ctx);
    }

    unlock() {
        if (this.failed) return;
        if (!this.ctx) {
            try {
                this.ctx = this.createContext() || null;
            } catch {
                this.ctx = null;
            }
            if (!this.ctx) {
                this.failed = true;
                return;
            }
        }
        if (this.ctx.state === 'suspended') {
            try {
                // 部分实现返回 Promise，被拒绝时静默降级
                this.ctx.resume?.()?.catch?.(() => {});
            } catch {
                // 恢复失败只影响音效
            }
        }
    }

    setMuted(muted) {
        this.muted = Boolean(muted);
    }

    toggleMute() {
        this.setMuted(!this.muted);
        return this.muted;
    }

    getBuffer(name) {
        let buffer = this.buffers.get(name);
        if (!buffer) {
            const { ctx } = this;
            const samples = synthesize(name, ctx.sampleRate || 44100);
            buffer = ctx.createBuffer(1, samples.length, ctx.sampleRate || 44100);
            buffer.getChannelData(0).set(samples);
            this.buffers.set(name, buffer);
        }
        return buffer;
    }

    /** @returns {boolean} 是否真的发出了声音 */
    play(name, { cooldown = 0 } = {}) {
        if (this.muted || !this.ctx) return false;
        const now = this.ctx.currentTime ?? 0;
        const last = this.lastPlayed.get(name);
        if (cooldown > 0 && last !== undefined && now - last < cooldown) return false;
        try {
            const source = this.ctx.createBufferSource();
            source.buffer = this.getBuffer(name);
            source.connect(this.ctx.destination);
            source.start(0);
        } catch {
            return false;
        }
        this.lastPlayed.set(name, now);
        return true;
    }

    /** @param {Array<{type: string, platformType?: number}>} events */
    handleEvents(events) {
        for (const event of events) {
            switch (event.type) {
                case 'jump': this.play('jump'); break;
                case 'spring': this.play('spring'); break;
                case 'land':
                    // 弹簧和尖刺有各自的音效
                    if (event.platformType !== PLATFORM_TYPES.SPRING && event.platformType !== PLATFORM_TYPES.SPIKE) {
                        this.play('land');
                    }
                    break;
                case 'damage': this.play('hurt', { cooldown: HURT_COOLDOWN_SECONDS }); break;
                case 'gameover': this.play('gameover'); break;
            }
        }
    }
}
