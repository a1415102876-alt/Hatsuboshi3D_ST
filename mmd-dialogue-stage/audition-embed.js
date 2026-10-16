import { DEFAULT_MOTION_VARIANTS } from './core.js?v=20261015-audition30-v1';

export function auditionEmbedCommand(data = {}) {
    const actorId = String(data.actorId || '');
    const variant = DEFAULT_MOTION_VARIANTS[actorId];
    if (!variant) throw new Error('试镜角色没有配置动作分组');
    const round = Math.max(1, Math.min(3, Number(data.round) || 1));
    return { actorId, variant, sceneId: 'prod-audition-' + (round >= 3 ? '03' : round >= 2 ? '02' : '00') + '-00-noon' };
}

export function installAuditionEmbed(options) {
    const win = options.window || window;
    const parent = win.parent;
    const origin = options.parentOrigin;
    const requestFrame = options.requestFrame || requestAnimationFrame;
    const cancelFrame = options.cancelFrame || cancelAnimationFrame;
    let generation = 0, frame = 0, disposed = false, requestId = '', prepared = null;
    const send = (type, extra = {}) => parent.postMessage({ type: 'hatsu-nia-audition:' + type, requestId, ...extra }, origin);
    function stop() {
        generation++;
        cancelFrame(frame);
        frame = 0;
        prepared = null;
        options.stop();
    }
    function begin(command, isCurrent, resume = false) {
        if (!isCurrent()) return;
        if (resume) options.start();
        send('started', command);
        const tick = () => {
            if (!isCurrent()) return;
            const state = options.readPlayback();
            if (state.active && !state.playing && state.time >= state.duration - 0.05) { send('ended'); return; }
            frame = requestFrame(tick);
        };
        frame = requestFrame(tick);
    }
    async function receive(event) {
        if (disposed || event.source !== parent || event.origin !== origin) return;
        const data = event.data || {};
        if (data.type === 'hatsu-nia-audition:cancel' && data.requestId === requestId) { stop(); return; }
        if (data.type === 'hatsu-nia-audition:start') {
            if (!prepared || data.requestId !== requestId) return;
            const pending = prepared;
            prepared = null;
            try { begin(pending.command, pending.isCurrent, true); }
            catch (error) { if (pending.isCurrent()) send('error', { message: String(error?.message || error) }); }
            return;
        }
        if (data.type !== 'hatsu-nia-audition:play' || !data.requestId) return;
        stop();
        requestId = String(data.requestId);
        const current = generation;
        const isCurrent = () => !disposed && generation === current;
        try {
            const command = auditionEmbedCommand(data);
            await options.play(command, { isCurrent, autoplay: !data.deferStart,
                onProgress: progress => { if (isCurrent()) send('progress', { progress }); },
            });
            if (!isCurrent()) return;
            if (data.deferStart) {
                prepared = { command, isCurrent };
                send('prepared', command);
            } else begin(command, isCurrent);
        } catch (error) {
            if (isCurrent()) send('error', { message: String(error?.message || error) });
        }
    }
    win.addEventListener('message', receive);
    send('ready');
    return { dispose() { if (disposed) return; disposed = true; stop(); win.removeEventListener('message', receive); } };
}
