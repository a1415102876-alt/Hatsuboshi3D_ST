import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { parseExpressionAt } from 'acorn';
import { buildNiaTvSegmentPrompt, parseNiaTvSegmentPayload } from '../nia-tv-business-api.js';
import { parseBeatScript } from '../../mmd-dialogue-stage/beat-protocol.js';
await import('../nia-tv-business-core.js');
const tv = globalThis.HatsuNiaTvBusiness;
const context = { businessId: 'tv-beat', idol: '秦谷美铃', programName: '偶像生活访谈', host: '真诚优', theme: '近期训练与自我表达', businessLevel: 2 };
const beat = (id, speaker = 'hmsz') => `<beat id="${id}" speaker="${speaker}" cue="talk" face="happy" position="center" shot="close" wait="text"><display lang="zh">今天请多关照。</display><tts lang="ja">今日はよろしくお願いします。</tts></beat>`;
const payload = (extra = {}) => ({ schemaVersion: 1, businessId: context.businessId, segmentIndex: 1, status: 'continue', lines: [{ id: 'b1', type: 'dialogue', speaker: context.idol, text: beat('b1') }], continuitySummary: '主持人介绍了本期主题。', ...extra });
const parse = data => parseNiaTvSegmentPayload('<NIA_TV_PROGRAM>' + JSON.stringify(data) + '</NIA_TV_PROGRAM>', { businessId: context.businessId, segmentIndex: data.segmentIndex });
const bridge = await readFile(new URL('../st.html', import.meta.url), 'utf8');
function bridgeFunction(name) { const start = bridge.indexOf('function ' + name + '('); return bridge.slice(start, parseExpressionAt(bridge, start, { ecmaVersion: 'latest' }).end); }

test('TV prompts use bilingual Beat lines and keep the legacy four-stage programme contract', () => {
    for (const [idol, actor] of [['秦谷美铃', 'hmsz'], ['花海佑芽', 'hume'], ['筱泽广', 'shro']]) {
        const prompt = buildNiaTvSegmentPrompt({ ...context, idol }, { segmentCount: 4, pendingSegmentIndex: 1 });
        const shape = JSON.parse(prompt.match(/<NIA_TV_PROGRAM>\s*({[\s\S]*?})\s*<\/NIA_TV_PROGRAM>/)[1]);
        const line = shape.lines.find(line => line.speaker === idol);
        assert.ok(line, 'the current idol must have a Beat example');
        const parsed = parseBeatScript(line.text);
        assert.equal(parsed.beats[0]?.speaker, actor); assert.match(line.text, /<tts lang="ja">/);
        assert.match(prompt, /电视.*3D Beat/); assert.equal(shape.status, 'continue');
        assert.ok(!shape.lines.some(line => /[（(]/.test(line.speaker)), 'legacy portrait keywords cannot be part of the new speaker names');
    }
    const incident = buildNiaTvSegmentPrompt(context, { segmentCount: 4, pendingSegmentIndex: 3 }); assert.match(incident, /awaiting_producer/);
    const closing = buildNiaTvSegmentPrompt(context, { segmentCount: 4, pendingSegmentIndex: 4, producerInstruction: '展示训练过程', segments: [{}, {}, { problem: '临时追问', incident: '节目组变更环节' }] });
    assert.ok(closing.includes('展示训练过程')); assert.ok(closing.includes('临时追问')); assert.match(closing, /ended/);
});

test('TV rejects incomplete or multiple Beat sentences while accepting legacy plain captions', () => {
    assert.equal(parse(payload()).ok, true);
    for (const text of [beat('b1').replace('</beat>', ''), beat('b1') + beat('b2'), beat('b1') + '<choice>选项</choice>']) {
        assert.equal(parse(payload({ lines: [{ id: 'b1', speaker: context.idol, text }] })).ok, false);
    }
    assert.equal(parse(payload({ lines: [{ type: 'dialogue', speaker: '秦谷美铃(微笑)', text: '旧存档里的台词。' }] })).ok, true);
});

test('TV cursor and readable history survive reload and reset only for the retried segment', () => {
    const runtime = tv.normalizeTvRuntime({ businessId: context.businessId, status: 'playing_2', segmentIndex: 2, playbackLineIndex: 31, playedLines: [{ id: 'a', text: '第一段', segmentIndex: 1 }, { id: 'b', text: '第二段', segmentIndex: 2 }] });
    assert.equal(runtime.playbackLineIndex, 31); assert.equal(runtime.playedLines.length, 2);
    const retried = tv.beginSegmentGeneration({ ...runtime, status: 'retryable_failed', retrySegmentIndex: 2 }, 2);
    assert.equal(retried.ok, true); assert.equal(retried.runtime.playbackLineIndex, 0); assert.equal(retried.runtime.playedLines.length, 1); assert.equal(retried.runtime.playedLines[0].id, 'a');
});

test('TV timeline preserves camera and expression cues and converts old portrait labels into readable Beats', async () => {
    const module = await import('../nia-tv-beat-core.js').catch(() => ({}));
    assert.equal(typeof module.buildNiaTvBeatTimeline, 'function');
    const timeline = module.buildNiaTvBeatTimeline({ lines: [payload().lines[0], { id: 'legacy', speaker: '秦谷美铃(温柔喜悦)', type: 'dialogue', text: '旧台词。' }] }, { idol: context.idol });
    assert.equal(timeline.rows.length, 2); assert.equal(timeline.rows[0].text, '今天请多关照。'); assert.match(timeline.rows[0].script, /shot="close"/);
    assert.equal(timeline.rows[1].speaker, 'hmsz'); assert.equal(timeline.rows[1].text, '旧台词。'); assert.match(timeline.rows[1].script, /cue="glad"/);
});

test('TV JSON contract takes priority over Beat and forbidden choice examples in SillyTavern', () => {
    const sandbox = {}; vm.runInNewContext(bridgeFunction('isGeneratedTextCompatibleWithPrompt') + '\nglobalThis.compatible=isGeneratedTextCompatibleWithPrompt;', sandbox);
    const prompt = '[HATSU_OUTPUT_MODE:NIA_TV_PROGRAM]\n<beat>台词</beat>禁止<choice>';
    assert.equal(sandbox.compatible(prompt, '<NIA_TV_PROGRAM>{}</NIA_TV_PROGRAM>'), true);
    assert.equal(sandbox.compatible(prompt, '<beat speaker="hmsz">漏掉了外层JSON。</beat>'), false);
});

test('the classic SillyTavern loader executes TV Beat imports independently of radio loading', async () => {
    const module = await readFile(new URL('../nia-tv-business-api.js', import.meta.url), 'utf8');
    const sandbox = { HatsuBeatPlayerCore: await import('../../mmd-dialogue-stage/beat-player-core.js'), HatsuBeatProtocol: await import('../../mmd-dialogue-stage/beat-protocol.js') };
    vm.runInNewContext(bridgeFunction('convertNiaBusinessModuleToClassic') + '\nglobalThis.convert=convertNiaBusinessModuleToClassic;', sandbox);
    vm.runInNewContext(sandbox.convert(module), sandbox);
    const prompt = sandbox.HatsuNiaTvApi.buildNiaTvSegmentPrompt(context, { pendingSegmentIndex: 1 }); assert.match(prompt, /<tts lang=\\"ja\\">/);
    assert.equal(sandbox.HatsuNiaTvApi.parseNiaTvSegmentPayload('<NIA_TV_PROGRAM>' + JSON.stringify(payload()) + '</NIA_TV_PROGRAM>', { businessId: context.businessId, segmentIndex: 1 }).ok, true);
});

const app = await readFile(new URL('../app.js', import.meta.url), 'utf8');
function loadFunctions(context, names) {
    vm.createContext(context);
    for (const name of names) {
        const start = app.search(new RegExp('^  (?:async )?function ' + name + '\\(', 'm')) + 2;
        assert.ok(start > 1, name);
        vm.runInContext(app.slice(start, parseExpressionAt(app, start, { ecmaVersion: 'latest' }).end), context);
    }
    return context;
}
const flush = () => new Promise(resolve => setImmediate(resolve));
function playbackFixture(ensurePlayer) {
    const history = [], saved = [], node = { classList: { add() {}, remove() {} }, textContent: '' };
    const runtime = tv.normalizeTvRuntime({ businessId: context.businessId, status: 'playing_1', segmentIndex: 1, playbackLineIndex: 2, playedLines: [{ id: 'b0', text: '第一句', segmentIndex: 1 }, { id: 'b1', text: '第二句', segmentIndex: 1 }] });
    const ctx = { state: { idol: context.idol, nia: { tvBusiness: runtime } }, activeHostSaveScope: 'one', runtimeSessionEpoch: 1, niaTvBusinessSession: { businessId: context.businessId, context, runtime, saveScope: 'one', sessionEpoch: 1 },
        niaTvBusinessCore: tv, canonicalIdolName: value => value, normalizeNiaState: value => value, niaRadioEl: () => node, appendNiaRadioHistory: line => history.push(line), saveState: reason => saved.push(reason), renderNiaTvBusiness() {}, completeNiaTvAfterPlayback() {},
        stopNiaTvPlayback() {}, ensureNiaTvBeatPlayer: ensurePlayer, failNiaTvBusiness(message) { throw new Error(message); } };
    loadFunctions(ctx, ['isCurrentNiaTvBusinessSession', 'playNiaTvSegment']);
    return { ctx, history, saved };
}

test('TV playback resumes the last displayed sentence without duplicating history or completing early', async () => {
    let callbacks;
    const player = { player: { elements: { speaker: { textContent: context.idol } } }, async load(_payload, value) { callbacks = value; }, async advance() {} };
    const { ctx, history } = playbackFixture(async () => player);
    ctx.playNiaTvSegment(payload()); await flush();
    assert.equal(callbacks.startIndex, 1);
    callbacks.onBeat({ id: 'b1', speaker: 'hmsz', text: '第二句' }, 1);
    assert.equal(history.length, 0); assert.equal(ctx.niaTvBusinessSession.runtime.playedLines.length, 2);
    callbacks.onBeat({ id: 'b2', speaker: 'hmsz', text: '第三句' }, 2);
    assert.equal(history.length, 1); assert.equal(history[0].text, '第三句'); assert.equal(ctx.niaTvBusinessSession.runtime.status, 'playing_1');
    callbacks.onEnded(); assert.equal(ctx.niaTvBusinessSession.runtime.status, 'awaiting_continue_1');
    callbacks.onEnded(); assert.equal(ctx.niaTvBusinessSession.runtime.status, 'awaiting_continue_1');
});

test('a delayed TV player load cannot modify a different chat scope', async () => {
    let resolve, loaded = 0;
    const waiting = new Promise(done => { resolve = done; });
    const { ctx, history, saved } = playbackFixture(() => waiting);
    ctx.playNiaTvSegment(payload()); ctx.activeHostSaveScope = 'another-chat';
    resolve({ async load() { loaded++; } }); await flush();
    assert.equal(loaded, 0); assert.equal(history.length, 0); assert.equal(saved.length, 0);
});

test('TV scope reset cancels playback, invalidates pending imports and disposes its model exactly once', () => {
    let disposed = 0; const overlay = { hidden: false }, controller = { cancelled: false };
    const ctx = { niaTvBusinessSession: { playbackController: controller }, niaTvBeatPlayer: { stop() {}, dispose() { disposed++; } }, niaTvBeatPlayerLoad: Promise.resolve(), niaTvBeatPlayerGeneration: 0,
        getPrimaryModelChannelOwner:()=>null, niaRadioEl: id => id === 'niaRadioOverlay' ? overlay : null };
    loadFunctions(ctx, ['stopNiaTvPlayback', 'disposeNiaTvBeatPlayer', 'resetNiaTvBusinessSession']);
    ctx.resetNiaTvBusinessSession(); ctx.resetNiaTvBusinessSession();
    assert.equal(controller.cancelled, true); assert.equal(disposed, 1); assert.equal(ctx.niaTvBeatPlayerGeneration, 1);
    assert.equal(ctx.niaTvBusinessSession, null); assert.equal(ctx.niaTvBeatPlayerLoad, null); assert.equal(overlay.hidden, true);
});

test('TV reset releases its own pending model lease and leaves another feature owner intact', () => {
    for (const ownerKind of ['nia_tv_business', 'nia_radio_business']) {
        const released = [], controller = { cancelled: false };
        const ctx = { state: { pendingAiRequestId: 'pending' }, pendingAiRequestId: 'pending', niaTvBusinessSession: { requestId: 'pending', playbackController: controller }, niaTvBeatPlayer: null, niaTvBeatPlayerLoad: null, niaTvBeatPlayerGeneration: 0,
            getPrimaryModelChannelOwner: () => ({ ownerKind, requestId: 'pending', channelLeaseId: 'lease' }), releasePrimaryModelChannel: (...args) => released.push(args), niaRadioEl: () => null };
        loadFunctions(ctx, ['stopNiaTvPlayback', 'disposeNiaTvBeatPlayer', 'resetNiaTvBusinessSession']); ctx.resetNiaTvBusinessSession();
        assert.equal(controller.cancelled, true);
        assert.equal(released.length, ownerKind === 'nia_tv_business' ? 1 : 0);
        assert.equal(ctx.pendingAiRequestId, ownerKind === 'nia_tv_business' ? '' : 'pending');
        assert.equal(ctx.state.pendingAiRequestId, ownerKind === 'nia_tv_business' ? '' : 'pending');
    }
});

test('TV Beat player keeps the idol on screen during an NPC opening without adding a dialogue page', async () => {
    const { NiaTvBeatPlayer } = await import('../nia-tv-beat-player.js');
    const visited = [];
    const player = { elements: { script: { value: '' } }, compile(options) { this.compiled = { slides: [{ type: 'beat' }], beatIndexes: [0] }; options?.prepareCompiled?.(); }, preloadPromise: Promise.resolve(), async goTo(index) { visited.push(index); return true; }, stop() {}, dispose() {} };
    const controller = new NiaTvBeatPlayer({ script: player.elements.script }, { createPlayer: async () => player });
    await controller.load({ lines: [{ id: 'host', speaker: '真诚优', text: beat('host', '真诚优') }] }, { idol: context.idol });
    assert.deepEqual(visited, [0]); assert.equal(player.fixedPresentation, null);
    assert.equal(player.compiled.slides[0].action, 'enter'); assert.equal(player.compiled.slides[0].idolId, 'hmsz'); assert.equal(controller.timeline.rows.length, 1);
    controller.dispose();
});
