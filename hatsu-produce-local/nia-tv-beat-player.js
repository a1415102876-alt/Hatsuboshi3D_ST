import { NiaRadioBeatPlayer } from './nia-radio-beat-player.js?v=20261024-crowd-budget-v1';
import { buildNiaTvBeatTimeline } from './nia-tv-beat-core.js?v=20261015-tv-beat-v1';

export class NiaTvBeatPlayer extends NiaRadioBeatPlayer {
    constructor(elements, options = {}) {
        super(elements, {
            ...options,
            buildTimeline: buildNiaTvBeatTimeline,
            loadingText: '正在准备电视台画面…',
            emptyText: '电视节目没有可播放的台词。',
        });
    }
}
