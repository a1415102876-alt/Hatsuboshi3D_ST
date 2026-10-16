import { parseBeatScript } from '../mmd-dialogue-stage/beat-protocol.js?v=20261014-npc-portraits-v1';
import { beatActorId } from '../mmd-dialogue-stage/beat-player-core.js?v=20261014-npc-portraits-v1';

const xml = value => String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const attr = (tag, name) => tag.match(new RegExp('\\b' + name + '\\s*=\\s*["\\x27]([^"\\x27]*)["\\x27]', 'i'))?.[1] || '';

export function liveBeatSpeaker(value, fallback = '') {
    const raw = String(value || fallback || '').trim();
    const match = raw.match(/^([^（(]+)(?:[（(]([^）)]+)[）)])?$/);
    const name = (match?.[1] || raw).trim();
    const expression = match?.[2] || '';
    const actor = beatActorId(name);
    const speaker = actor || (/制作人|プロデューサー|producer/i.test(name) ? 'producer' : name || 'narrator');
    const cue = /开心|高兴|喜悦|微笑|大笑|欢呼|陶醉/.test(expression) ? 'glad'
        : /担心|不安|顾虑|困惑/.test(expression) ? 'talk-concerned'
        : /生气|愤怒|不满|抗议/.test(expression) ? 'angry'
        : /害羞|羞涩/.test(expression) ? 'tereru'
        : /惊讶|震惊|意外/.test(expression) ? 'odoroku'
        : /悲伤|沮丧|低落|哭/.test(expression) ? 'sad'
        : /思考|沉思/.test(expression) ? 'think' : 'talk';
    return { speaker, cue };
}

// Keep the receipt IDs as the comment timeline. Legacy stage-control records
// are folded into the next caption rather than displayed as XML to the player.
export function buildNiaLiveBeatTimeline(payload, options = {}) {
    const rows = [];
    const pendingIds = [];
    const placement = new Map();
    for (const [index, record] of (payload.beats || []).entries()) {
        const id = String(record.id || 'beat-' + (index + 1));
        let source = String(record.text || '').trim();
        if (!source) continue;
        if (/^<stage-(?:enter|exit|look|action|preload)\b/i.test(source)) {
            const idol = attr(source, 'idol');
            const key = liveBeatSpeaker(idol, options.idol).speaker;
            const previous = placement.get(key) || {};
            placement.set(key, {
                ...previous,
                position: attr(source, 'position') || previous.position,
                look: attr(source, 'target') || previous.look,
            });
            pendingIds.push(id);
            continue;
        }
        if (!/<beat\b/i.test(source)) {
            const dialogue = source.match(/<dialogue\b([^>]*)>([\s\S]*?)<\/dialogue>/i);
            const visual = liveBeatSpeaker(dialogue ? attr(dialogue[1], 'char') : record.speaker,
                record.type === 'dialogue' ? options.idol : 'narrator');
            const settings = placement.get(visual.speaker) || {};
            const caption = (dialogue?.[2] || source).replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, '').trim();
            if (!caption) { pendingIds.push(id); continue; }
            source = '<beat speaker="' + xml(visual.speaker) + '" cue="' + visual.cue
                + '" look="' + xml(settings.look || 'camera') + '" position="' + xml(settings.position || 'center')
                + '" shot="close" wait="text"><display lang="zh">' + xml(caption) + '</display></beat>';
        }
        const parsed = parseBeatScript(source, { allowOtherSpeakers: true });
        if (parsed.beats.length !== 1 || parsed.choices.length) throw new Error('每条直播记录必须包含一个完整 Beat。');
        const beat = parsed.beats[0];
        source = source.replace(/<beat\b([^>]*)>/i, (_all, attrs) =>
            '<beat id="' + xml(id) + '" shot="close" position="center"'
                + attrs.replace(/\s+(?:id|shot|position)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/ig, '') + '>');
        rows.push({ id, sourceIds: [...pendingIds.splice(0), id], script: source, text: beat.text, speaker: beat.speaker });
    }
    return { rows, script: rows.map(row => row.script).join('\n'), trailingSourceIds: pendingIds };
}
