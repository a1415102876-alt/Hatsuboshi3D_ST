import { parseBeatScript } from '../mmd-dialogue-stage/beat-protocol.js?v=20261014-npc-portraits-v1';
import { liveBeatSpeaker } from './nia-live-beat-core.js?v=20261014-live-close-v1';

const xml = value => String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function buildNiaRadioBeatTimeline(payload, options = {}) {
    const rows = [];
    for (const [index, line] of (payload.lines || []).entries()) {
        const id = String(line.id || 'radio-line-' + (index + 1));
        let source = String(line.text || '').trim();
        if (!source) continue;
        if (!/<beat\b/i.test(source)) {
            const visual = liveBeatSpeaker(line.speaker, line.type === 'dialogue' ? options.idol : 'narrator');
            const caption = source.replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, '').trim();
            if (!caption) continue;
            source = '<beat speaker="' + xml(visual.speaker) + '" cue="' + visual.cue
                + '" look="camera" position="center" shot="medium" wait="text"><display lang="zh">'
                + xml(caption) + '</display></beat>';
        }
        const parsed = parseBeatScript(source, { allowOtherSpeakers: true });
        if (parsed.beats.length !== 1 || parsed.choices.length || /<choice\b/i.test(source) || parsed.errors.some(error => error.code === 'malformed-beat')) throw new Error('每条广播记录必须包含一个完整 Beat。');
        const beat = parsed.beats[0];
        source = source.replace(/<beat\b([^>]*)>/i, (_all, attrs) => '<beat id="' + xml(id) + '"'
            + attrs.replace(/\s+id\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/ig, '') + '>');
        rows.push({ id, sourceIds: [id], script: source, text: beat.text, speaker: beat.speaker, type: line.type });
    }
    return { rows, script: rows.map(row => row.script).join('\n'), trailingSourceIds: [] };
}
