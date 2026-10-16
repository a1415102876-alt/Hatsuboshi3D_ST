import { buildNiaLiveBeatTimeline, liveBeatSpeaker } from './nia-live-beat-core.js?v=20261014-live-close-v1';

async function createDefaultPlayer(root, options) {
    const { BeatPlayerApp } = await import('../mmd-dialogue-stage/beat-player.js?v=20261017-browser-cache-v1');
    return new BeatPlayerApp(root, options);
}

export class NiaLiveBeatPlayer {
    constructor(elements, options = {}) {
        this.elements = elements;
        this.createPlayer = options.createPlayer || createDefaultPlayer;
        this.options = options;
        this.player = null;
        this.playerPromise = null;
        this.generation = 0;
        this.index = -1;
        this.busy = false;
        this.ended = false;
        this.disposed = false;
    }

    async ensurePlayer() {
        if (!this.playerPromise) {
            this.playerPromise = Promise.resolve(this.createPlayer(this.elements.stage, {
                loadSample: false,
                bindEvents: false,
                elements: this.elements,
                resolveSpeakerTheme: this.options.resolveSpeakerTheme,
            })).then(player => {
                if (this.disposed) { player.dispose(); return null; }
                this.player = player;
                return player;
            }).catch(error => { this.playerPromise = null; throw error; });
        }
        return this.playerPromise;
    }

    async load(payload, callbacks = {}) {
        this.stop();
        if (this.disposed) return false;
        const generation = this.generation;
        this.timeline = (this.options.buildTimeline || buildNiaLiveBeatTimeline)(payload, { idol: callbacks.idol });
        if (!this.timeline.rows.length) throw new Error(this.options.emptyText || '直播没有可播放的台词。');
        this.callbacks = callbacks;
        const startIndex = Number.isInteger(callbacks.startIndex) ? callbacks.startIndex : 0;
        this.index = Math.min(this.timeline.rows.length - 1, Math.max(0, startIndex)) - 1;
        this.ended = false;
        this.busy = true;
        try {
            const player = await this.ensurePlayer();
            if (!player || generation !== this.generation) return false;
            player.fixedPresentation = this.options.fixedPresentation !== undefined ? this.options.fixedPresentation : {
                focus: liveBeatSpeaker(callbacks.idol || this.timeline.rows[0].speaker).speaker,
                shot: 'close',
                inherited: false,
            };
            player.elements.script.value = this.timeline.script;
            player.compile({ prepareCompiled: () => this.options.prepareCompiled?.(player, this.timeline, callbacks) });
            if (this.elements.text) this.elements.text.textContent = this.options.loadingText || "正在准备直播画面…";
            if (this.elements.speaker) this.elements.speaker.textContent = "";
            await player.preloadPromise;
            if (generation !== this.generation) return false;
        } finally {
            if (generation === this.generation) this.busy = false;
        }
        return this.advance();
    }

    async advance() {
        if (this.disposed || this.busy || this.ended || !this.player || !this.callbacks) return false;
        const generation = this.generation;
        const next = this.index + 1;
        if (next >= this.timeline.rows.length) {
            this.ended = true;
            this.player.stop({ cancelTts: false });
            this.callbacks.onTrailing?.(this.timeline.trailingSourceIds);
            this.callbacks.onEnded?.();
            return true;
        }
        this.busy = true;
        try {
            const moved = await this.player.goTo(next, { autoplay: false });
            if (generation !== this.generation || moved === false) return false;
            this.index = next;
            this.callbacks.onBeat?.(this.timeline.rows[next], next);
            return true;
        } finally {
            if (generation === this.generation) this.busy = false;
        }
    }

    stop() {
        this.generation++;
        this.busy = false;
        this.callbacks = null;
        this.player?.stop();
        this.player?.cancelResourceLoad?.();
    }

    dispose() {
        if (this.disposed) return;
        this.stop();
        this.disposed = true;
        this.player?.dispose();
        this.player = null;
    }
}
