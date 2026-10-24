import { beatActorId } from '../mmd-dialogue-stage/beat-player-core.js?v=20261014-npc-portraits-v1';
import { NiaLiveBeatPlayer } from './nia-live-beat-player.js?v=20261024-crowd-budget-v1';
import { buildNiaRadioBeatTimeline } from './nia-radio-beat-core.js?v=20261014-radio-beat-v1';

export class NiaRadioBeatPlayer extends NiaLiveBeatPlayer {
    constructor(elements, options = {}) {
        super(elements, {
            ...options,
            buildTimeline: options.buildTimeline || buildNiaRadioBeatTimeline,
            fixedPresentation: null,
            prepareCompiled(player, timeline, callbacks) {
                const idolId = beatActorId(callbacks.idol);
                if (!idolId || beatActorId(timeline.rows[0]?.speaker) || !Array.isArray(player.compiled?.slides)) return;
                player.compiled.slides.unshift({type:'stage',action:'enter',idolId,position:'center',speaker:'',text:''});
                player.compiled.beatIndexes = player.compiled.beatIndexes.map(index => index+1);
            },
            loadingText: options.loadingText || '正在准备广播画面…',
            emptyText: options.emptyText || '广播没有可播放的台词。',
        });
    }
}
