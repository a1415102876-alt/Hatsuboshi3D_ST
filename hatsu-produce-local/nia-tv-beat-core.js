import { buildNiaRadioBeatTimeline } from './nia-radio-beat-core.js?v=20261014-radio-beat-v1';

export function buildNiaTvBeatTimeline(payload, options = {}) {
    try {
        return buildNiaRadioBeatTimeline(payload, options);
    } catch (error) {
        throw new Error(String(error?.message || error).replace(/广播/g, '电视节目'));
    }
}
