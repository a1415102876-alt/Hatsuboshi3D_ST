import { beatActorId } from '../mmd-dialogue-stage/beat-player-core.js?v=20261014-npc-portraits-v1';

export class NiaAuditionSuccessPlayer {
    constructor(host, options = {}) { this.host = host; this.options = options; this.generation = 0; }
    play({ requestId, idol, round }, callbacks = {}) {
        this.stop();
        const generation = this.generation;
        const baseUrl = this.options.baseUrl || import.meta.url;
        const url = new URL('../mmd-dialogue-stage/?embed=nia-audition&v=20261015-audition-loading-v1', baseUrl);
        const actorId = beatActorId(idol);
        if (!actorId) throw new Error('担当偶像缺少3D模型配置');
        const loading = this.loading = this.options.loading || globalThis.HatsuNiaAuditionLoading.create(this.host, { idolId: actorId, assetBase: baseUrl, onRetry: callbacks.onRetry });
        const frame = document.createElement('iframe');
        frame.className = 'nia-audition-animation-frame';
        frame.title = 'N.I.A 试镜成功演出';
        frame.style.visibility = 'hidden';
        this.host.append(frame);
        this.frame = frame; this.requestId = requestId; this.targetOrigin = url.origin;
        let finished = false, requested = false, prepared = false, startSent = false, started = false;
        const current = () => generation === this.generation && !finished;
        const fail = message => {
            if (!current()) return;
            clearTimeout(this.timeout);
            finished = true;
            frame.contentWindow?.postMessage({ type: 'hatsu-nia-audition:cancel', requestId }, url.origin);
            frame.remove();
            loading.fail(message);
            callbacks.onError?.(message);
        };
        const resetTimeout = () => {
            clearTimeout(this.timeout);
            this.timeout = setTimeout(() => fail('演出资源长时间没有下载进展，请重新载入。'), 90000);
        };
        this.listener = event => {
            if (!current() || event.source !== frame.contentWindow || event.origin !== url.origin) return;
            const data = event.data || {};
            if (data.type === 'hatsu-nia-audition:ready' && !requested) {
                requested = true;
                frame.contentWindow.postMessage({ type: 'hatsu-nia-audition:play', requestId, actorId, round, deferStart: true }, url.origin);
                return;
            }
            if (data.requestId !== requestId) return;
            if (data.type === 'hatsu-nia-audition:progress' && !prepared) {
                loading.updateProgress?.(data.progress);
                resetTimeout();
            }
            if (data.type === 'hatsu-nia-audition:prepared' && !prepared) {
                prepared = true;
                loading.covered.then(async covered => {
                    if (!covered || !current()) return;
                    frame.style.visibility = 'visible';
                    if (!await loading.reveal() || !current()) return;
                    startSent = true;
                    frame.contentWindow.postMessage({ type: 'hatsu-nia-audition:start', requestId }, url.origin);
                }).catch(error => fail(String(error?.message || error)));
            }
            if (data.type === 'hatsu-nia-audition:started' && startSent) { clearTimeout(this.timeout); started = true; }
            if (data.type === 'hatsu-nia-audition:error') fail(data.message);
            if (data.type === 'hatsu-nia-audition:ended' && started) { finished = true; clearTimeout(this.timeout); callbacks.onEnded?.(); }
        };
        window.addEventListener('message', this.listener);
        // A hidden cross-origin iframe cannot deliver the animation frames needed
        // for preparation. Let it render behind the fully closed Loading iris.
        loading.covered.then(covered => {
            if (covered && current()) frame.style.visibility = 'visible';
        }).catch(error => fail(String(error?.message || error)));
        resetTimeout();
        frame.src = url.href;
    }
    stop() {
        this.generation++;
        clearTimeout(this.timeout);
        if (this.frame?.contentWindow) this.frame.contentWindow.postMessage({ type: 'hatsu-nia-audition:cancel', requestId: this.requestId }, this.targetOrigin);
        if (this.listener) window.removeEventListener('message', this.listener);
        this.frame?.remove(); this.frame = null; this.listener = null;
        this.loading?.dispose(); this.loading = null;
    }
    dispose() { this.stop(); }
}
