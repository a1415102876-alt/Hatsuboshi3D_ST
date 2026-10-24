import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { parseExpressionAt } from 'acorn';
import { parseNiaLiveSegmentPayload } from '../nia-business-api.js';
import { buildNiaLiveBeatTimeline } from '../nia-live-beat-core.js';
import { parseBeatScript } from '../../mmd-dialogue-stage/beat-protocol.js';

const actual = await readFile(new URL('./fixtures/nia-live-unescaped-tts.txt', import.meta.url), 'utf8');
const expected = { businessId: 'nia-training-business-e21e337a-7803-4ff6-a2aa-a2bbaf7d7c3b', segmentIndex: 2, segmentCount: 2 };
const slash = String.fromCharCode(92);
const valid = JSON.parse(actual.match(/<NIA_LIVE_SEGMENT>\s*([\s\S]*?)\s*<\/NIA_LIVE_SEGMENT>/)[1].replace('<tts lang="ja' + slash + '">', '<tts lang=' + slash + '"ja' + slash + '">'));
const wrap = body => '<NIA_LIVE_SEGMENT>' + body + '</NIA_LIVE_SEGMENT>';
const parse = text => parseNiaLiveSegmentPayload(text, expected);
const compact = data => JSON.stringify({ ...valid, beats: [valid.beats[0]], comments: [], ...data });

test('the real 14-sentence reply recovers its missing TTS quote escape without losing content', () => {
    const result = parse(actual);
    assert.equal(result.ok, true);
    assert.equal(result.data.beats.length, 14); assert.equal(result.data.comments.length, 5);
    assert.deepEqual(result.data.beats.map(beat => beat.text), valid.beats.map(beat => beat.text));
    assert.equal(buildNiaLiveBeatTimeline(result.data, { idol: '秦谷美铃' }).rows.length, 14);
    assert.ok(result.repairs?.some(repair => repair.type === 'xml_attribute_quote'));
});

test('a missing opening, closing or both attribute escapes can be repaired in multiple Beat tags', () => {
    for (const [oldText, newText] of [
        ['<tts lang=' + slash + '"ja' + slash + '">', '<tts lang="ja' + slash + '">'],
        ['<tts lang=' + slash + '"ja' + slash + '">', '<tts lang=' + slash + '"ja">'],
        ['<tts lang=' + slash + '"ja' + slash + '">', '<tts lang="ja">'],
        ['speaker=' + slash + '"hmsz' + slash + '"', 'speaker="hmsz"'],
    ]) {
        const body = compact({}).replaceAll(oldText, newText);
        const result = parse(wrap(body)); assert.equal(result.ok, true, newText);
        assert.equal(result.data.beats[0].text, valid.beats[0].text);
    }
});

test('literal string line breaks and trailing commas are repaired while text punctuation stays unchanged', () => {
    const line = { ...valid.beats[0], text: valid.beats[0].text.replace('镜头外', '镜头外\n\t') };
    const body = compact({ beats: [line], closingSummary: '保留文字里的逗号 ,} 和引号“你好”。' })
        .replaceAll('\\n', '\n').replaceAll('\\t', '\t').replace(/}$/, ',}');
    const result = parse(wrap(body)); assert.equal(result.ok, true);
    assert.equal(result.data.beats[0].text, line.text);
    assert.equal(result.data.closingSummary, '保留文字里的逗号 ,} 和引号“你好”。');
});

test('multiline Beat attribute lists can recover both literal whitespace and missing quote escapes', () => {
    const body = compact({}).replace('<beat id=', '<beat\n\t id=').replaceAll('speaker=' + slash + '"hmsz' + slash + '"', 'speaker="hmsz"');
    const result = parse(wrap(body)); assert.equal(result.ok, true);
    assert.equal(result.data.beats[0].text, valid.beats[0].text.replace('<beat id=', '<beat\n\t id='));
});

test('already valid JSON keeps paths, quotes, XML-like speech and escaped line breaks exactly', () => {
    const text = String.raw`台词："你好"，路径 C:\voice\clip.wav，文字 ,}，示例 <tts lang="ja">。`;
    const result = parse(wrap(compact({ closingSummary: text })));
    assert.equal(result.ok, true); assert.equal(result.data.closingSummary, text); assert.equal(result.repairs, undefined);
});

test('repair never accepts truncation, missing closing facts or a different business identity', () => {
    for (const body of [
        compact({}).slice(0, -1),
        compact({ closingSummary: '' }).replaceAll('speaker=' + slash + '"hmsz' + slash + '"', 'speaker="hmsz"'),
        compact({ beats: [{ ...valid.beats[0], text: valid.beats[0].text.replace('</beat>', '') }] }).replaceAll('speaker=' + slash + '"hmsz' + slash + '"', 'speaker="hmsz"'),
        compact({ businessId: 'another-business' }).replaceAll('speaker=' + slash + '"hmsz' + slash + '"', 'speaker="hmsz"'),
    ]) assert.equal(parse(wrap(body)).ok, false);
});

test('repaired JSON requires complete Beat, display and TTS coverage rather than a playable prefix', () => {
    const text = valid.beats[0].text;
    for (const broken of [text + '<beat speaker=', text.replace('</tts>', ''), text.replace('</display>', ''), text.replace('</tts>', '</display>'), text + '遗漏在Beat外的台词']) {
        const body = compact({ beats: [{ ...valid.beats[0], text: broken }] }).replaceAll('speaker=' + slash + '"hmsz' + slash + '"', 'speaker="hmsz"');
        const result = parse(wrap(body)); assert.equal(result.ok, false, broken); assert.equal(result.reason, 'invalid_live_beat');
    }
});

test('damaged root JSON cannot be replaced by a nested comment or an older complete tagged block', () => {
    const broken = compact({ closingSummary: '普通正文里 "引号错误' }).replace('\\"引号错误', '"引号错误');
    const result = parse(wrap(compact({})) + '\n' + wrap(broken));
    assert.equal(result.ok, false); assert.equal(result.reason, 'invalid_json');
});

test('repair still supports explanatory text and a code fence around the complete current object', () => {
    const body = compact({}).replaceAll('speaker=' + slash + '"hmsz' + slash + '"', 'speaker="hmsz"');
    const result = parse(wrap('以下是回复：\n```json\n' + body + '\n```'));
    assert.equal(result.ok, true); assert.equal(result.data.businessId, expected.businessId);
});

test('classic SillyTavern conversion can repair the same real reply with explicit Beat imports', async () => {
    const bridge = await readFile(new URL('../st.html', import.meta.url), 'utf8');
    const start = bridge.indexOf('function convertNiaBusinessModuleToClassic(');
    const fn = bridge.slice(start, parseExpressionAt(bridge, start, { ecmaVersion: 'latest' }).end);
    const sandbox = { HatsuBeatPlayerCore: await import('../../mmd-dialogue-stage/beat-player-core.js'), HatsuBeatProtocol: { parseBeatScript }, Hatsu3DPortraitCues: await import('../../mmd-dialogue-stage/portrait-cues.js') };
    vm.runInNewContext(fn + '\nglobalThis.convert=convertNiaBusinessModuleToClassic;', sandbox);
    vm.runInNewContext(sandbox.convert(await readFile(new URL('../nia-business-api.js', import.meta.url), 'utf8')), sandbox);
    const result = sandbox.HatsuNiaBusiness.parseNiaLiveSegmentPayload(actual, expected);
    assert.equal(result.ok, true); assert.equal(result.data.beats.length, 14);
});

test('repair preserves the current two-part incident and legacy four-part closing requirements', () => {
    const damaged = data => wrap(compact(data).replaceAll('speaker=' + slash + '"hmsz' + slash + '"', 'speaker="hmsz"'));
    const first = damaged({ segmentIndex: 1, incident: '弹幕提出疑问。', options: ['回应', '示范', '澄清'] });
    assert.equal(parseNiaLiveSegmentPayload(first, { ...expected, segmentIndex: 1 }).ok, true);
    assert.equal(parseNiaLiveSegmentPayload(damaged({ segmentIndex: 1, incident: '', options: [] }), { ...expected, segmentIndex: 1 }).reason, 'invalid_incident_contract');
    const legacy = parseNiaLiveSegmentPayload(damaged({ segmentIndex: 4 }), { ...expected, segmentIndex: 4, segmentCount: 4 });
    assert.equal(legacy.ok, true); assert.equal(legacy.data.segmentCount, 4);
});

test('the actual live reply handler acknowledges and starts the repaired final segment', async () => {
    await import('../nia-live-business-core.js');
    const core = globalThis.HatsuNiaLiveBusiness;
    const app = await readFile(new URL('../app.js', import.meta.url), 'utf8');
    const start = app.indexOf('function handleNiaBusinessAiReply(');
    const fn = app.slice(start, parseExpressionAt(app, start, { ecmaVersion: 'latest' }).end);
    const acks = [], played = [];
    const ctx = { HatsuNiaBusiness: { parseNiaLiveSegmentPayload }, niaLiveBusinessCore: core,
        niaBusinessSession: { businessId: expected.businessId, requestId: 'request', segmentIndex: 2, runtime: core.normalizeLiveRuntime({ schemaVersion: 2, segmentCount: 2, businessId: expected.businessId, status: 'generating_2', pendingSegmentIndex: 2 }) },
        state: { nia: {} }, pendingAiRequestId: 'request', normalizeNiaState: value => value,
        sendAiReplyAck: (...args) => acks.push(args), saveState() {}, renderNiaLiveBusiness() {}, playNiaLiveSegment: data => played.push(data), failNiaBusiness: message => assert.fail(message) };
    vm.runInNewContext(fn, ctx); ctx.handleNiaBusinessAiReply(actual, 'request', true);
    assert.equal(ctx.niaBusinessSession.runtime.status, 'playing_2'); assert.equal(played.length, 1); assert.equal(played[0].beats.length, 14);
    assert.equal(acks.at(-1)[1], true); assert.equal(ctx.pendingAiRequestId, '');
});
