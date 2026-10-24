import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import * as api from '../nia-producer-work-api.js';
import '../nia-producer-work-core.js';
import { parseBeatScript } from '../../mmd-dialogue-stage/beat-protocol.js';
const workCore = globalThis.HatsuNiaProducerWork;
const raw = await readFile(new URL('./fixtures/nia-work-radio-booking.txt', import.meta.url), 'utf8');
const context = { receiptId: 'nia-producer-work-receipt-4cd9e1d4-42e5-4ba2-adf3-ae24e5e913a2', taskId: 'radio_booking', phaseId: 'meeting', periodId: 'afternoon', periodIndex: 1, isFinalPeriod: false, idol: '筱泽广' };
const tag = data => '<NIA_WORK_RESULT>' + JSON.stringify(data) + '</NIA_WORK_RESULT>';
const valid = { ...context, completedPhase: 'meeting', story: '<beat speaker="shro" cue="talk" shot="medium"><display lang="zh">录制安排已经确认。</display><tts lang="ja">収録の予定が決まりました。</tts></beat>', summary: '确认排期。', reunionStory: '' };

test('reported raw multiline work receipt parses and strips drafting comments', () => {
  const parsed = api.parseNiaProducerWorkPayload({ rawText: raw }, context);
  assert.equal(parsed.ok, true, parsed.reason);
  assert.doesNotMatch(parsed.data.story, /<!--|Prism|累计|草稿优化/);
  assert.match(parsed.data.story, /第56期《初星放送部》/);
  assert.equal(parsed.data.story.split(/\n\s*\n/).length, 8);
  assert.match(parsed.data.documents[0], /第5日录制排期确认单/);
  assert.match(parsed.data.documents[0], /提词支援/);
  assert.equal(parsed.data.followUps[0].id, 'followup-radio-cue-cards');
  assert.match(parsed.data.followUps[0].title, /提词板/);
  assert.doesNotMatch(JSON.stringify(parsed.data), /\[object Object\]/);
});
test('work prompt specifies localized Beat strings inside a parseable JSON envelope', () => {
  const prompt = api.buildNiaProducerWorkPrompt(context, { id: 'radio_booking' }, { id: 'afternoon' }, {});
  assert.match(prompt, /story.*Beat/);
  assert.match(prompt, /reunionStory.*Beat/);
  assert.match(prompt, /display.*zh/);
  assert.match(prompt, /tts.*ja/);
  assert.doesNotMatch(prompt, /story使用现有VN格式/);
  assert.match(prompt, /HTML注释/);
  const body = prompt.slice(prompt.lastIndexOf('<NIA_WORK_RESULT>') + 17, prompt.lastIndexOf('</NIA_WORK_RESULT>')).trim();
  assert.doesNotThrow(() => JSON.parse(body));
});
test('newline repair does not bypass receipt identity or accept truncated JSON', () => {
  for (const [key, reason] of [['receiptId', 'receipt_id_mismatch'], ['taskId', 'task_id_mismatch'], ['periodId', 'period_id_mismatch'], ['phaseId', 'phase_id_mismatch']]) {
    assert.equal(api.parseNiaProducerWorkPayload({ rawText: raw }, { ...context, [key]: 'stale' }).reason, reason);
  }
  assert.equal(api.parseNiaProducerWorkPayload({ rawText: raw.slice(0, -30) + '</NIA_WORK_RESULT>' }, context).ok, false);
});
test('valid Beat quotes, JSON escapes and TTS survive normalization', () => {
  const parsed = api.parseNiaProducerWorkPayload({ rawText: tag(valid) }, context);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.data.story, valid.story);
  assert.equal(parseBeatScript(parsed.data.story).beats[0].ttsText, '収録の予定が決まりました。');
});
test('JSON control-character recovery keeps literal backslashes intact', () => {
  const source = tag({ ...valid, story: '路线 C:\\stage\\assets。\n继续。\t完成。' }).replaceAll('\\n', '\n').replaceAll('\\t', '\t');
  const parsed = api.parseNiaProducerWorkPayload({ text: source }, context);
  assert.equal(parsed.ok, true, parsed.reason);
  assert.equal(parsed.data.story, '路线 C:\\stage\\assets。\n继续。\t完成。');
});

const app = await readFile(new URL('../app.js', import.meta.url), 'utf8');
const st = await readFile(new URL('../st.html', import.meta.url), 'utf8');
function fn(source, name, indent = 2) {
  const start = source.search(new RegExp('^ {' + indent + '}(?:async )?function ' + name + '\\(', 'm'));
  assert.ok(start >= 0, name);
  const next = source.slice(start + 1).search(new RegExp('\\n {' + indent + '}(?:async )?function '));
  return source.slice(start, start + 1 + next);
}
test('work output mode wins over Beat/choice mentions in bridge filtering', () => {
  const ctx = vm.createContext({});
  vm.runInContext(['readBeatChoiceOptions', 'hasCompleteOptionPayload', 'isGeneratedTextCompatibleWithPrompt'].map(n => fn(st, n, 4)).join('\n'), ctx);
  const prompt = api.buildNiaProducerWorkPrompt(context, {}, {}, {}) + '\n不输出<beat>或<choice>外壳。';
  assert.equal(ctx.isGeneratedTextCompatibleWithPrompt(prompt, raw), true);
  assert.equal(ctx.isGeneratedTextCompatibleWithPrompt(prompt, '<beat speaker="producer">非回执</beat>'), false);
});

function harness(overrides = {}) {
  const active = { ...context, ...overrides, requestId: 'work-request', channelLeaseId: 'work-lease', turnId: 'work-turn', saveScope: 'save-scope', sessionEpoch: 'epoch' };
  const work = workCore.normalizeProducerWork({
    status: 'generating', periodIndex: active.periodIndex, activeRequest: active,
    tasks: [{ id: context.taskId, title: '广播预约', category: 'external', phases: [{ id: 'meeting', required: true }] }],
    periods: [0, 1, 2].map(index => index === active.periodIndex
      ? { taskId: context.taskId, phaseId: 'meeting', status: 'generating' }
      : { status: index < active.periodIndex ? 'completed' : 'pending' })
  });
  const state = { idol: '筱泽广', nia: { producerWork: work, training: { actionIndex: 0, fans: 0 } }, harness: {},
    pendingActionContext: { action: 'nia_producer_work', actionContext: { phase: 'generating' } }, pendingAiRequestId: active.requestId };
  let owner = { ...active, ownerKind: 'nia_producer_work' };
  const ctx = vm.createContext({ state, niaProducerWorkCore: workCore, normalizeNiaState: v => v,
    getPrimaryModelChannelOwner: () => owner, activeHostSaveScope: active.saveScope, runtimeSessionEpoch: active.sessionEpoch,
    loadNiaProducerWorkApiModule: async () => api, isKotoneBeatContractMode: () => true,
    pendingAiRequestId: active.requestId, releasePrimaryModelChannel: () => { owner = null; },
    sendAiReplyAck: () => {}, saveState: () => {}, postNiaStateSync: () => {}, setNiaPrototypeVisible: () => {},
    setElementHidden: () => {}, render: () => {}, openNiaPrototype: () => { ctx.returned = true; },
    reconcileNiaFanMilestoneAfterSettlement: () => false,
    settleNiaProducerWorkTraining: work => work, niaTrainingCore: { normalizeNiaTraining: value => value },
    activateNiaEveningAfterDayCompletion: day => { ctx.completedDay = day; }, resumeNiaEveningIfNeeded: () => {},
    failNiaProducerWork: message => assert.fail(message),
    openEventOverlay: (_title, _summary, story) => { ctx.played = parseBeatScript(story); }
  });
  vm.runInContext(['sanitizeVnStorySource', 'buildNiaProducerWorkDisplayStory', 'isCurrentNiaProducerWorkReply',
    'formatNiaProducerWorkFailureReason', 'handleNiaProducerWorkAiReply', 'completeNiaProducerWorkAfterPlayback'].map(n => fn(app, n)).join('\n'), ctx);
  return { ctx, state };
}
test('reported work reply plays clean Beat paragraphs and completes only its current period once', async () => {
  const { ctx, state } = harness();
  assert.equal(await ctx.handleNiaProducerWorkAiReply(raw, raw, '', 'work-request', true), true);
  assert.deepEqual(ctx.played.errors, []);
  assert.equal(ctx.played.beats.length, 8);
  assert.ok(ctx.played.beats.every(b => b.speaker === 'narrator'), 'unattributed old prose must not be voiced by the absent idol');
  assert.equal(state.nia.producerWork.periodIndex, 2);
  assert.equal(state.nia.producerWork.backlog[0].id, 'followup-radio-cue-cards');
  assert.match(state.nia.producerWork.backlog[0].title, /提词板/);
  assert.equal(state.nia.producerWork.processedReceiptIds.length, 1);
  assert.equal(state.nia.training.actionIndex, 0);
  assert.equal(await ctx.handleNiaProducerWorkAiReply(raw, raw, '', 'work-request', true), false);
  ctx.completeNiaProducerWorkAfterPlayback();
  assert.equal(ctx.returned, true);
  assert.equal(state.nia.producerWork.periodIndex, 2);
  assert.equal(state.nia.training.actionIndex, 0);
});
test('legacy VN speaker names and new localized Beat are preserved in work playback', () => {
  const { ctx } = harness();
  const story = '<narration>会面。</narration><dialogue char="真诚优">请进。</dialogue><dialogue char="制作人">谢谢。</dialogue>';
  const parsed = parseBeatScript(ctx.buildNiaProducerWorkDisplayStory(story));
  assert.deepEqual(parsed.beats.map(b => b.speaker), ['narrator', '真诚优', 'producer']);
  assert.equal(ctx.buildNiaProducerWorkDisplayStory(valid.story), valid.story);
});


test('last work period preserves long Beat and reunion across save normalization before advancing the day', async () => {
  const { ctx, state } = harness({ periodId: 'evening', periodIndex: 2, isFinalPeriod: true });
  const story = Array.from({ length: 80 }, (_, index) => valid.story.replace('<beat ', '<beat id="w' + index + '" ')).join('\n');
  const reunionStory = '<beat id="reunion" speaker="shro" cue="talk" shot="medium"><display lang="zh">制作人，辛苦了。</display><tts lang="ja">プロデューサー、お疲れ様。</tts></beat>';
  assert.ok(story.length > 10000);
  const reply = tag({ ...valid, periodId: 'evening', story, reunionStory });
  assert.equal(await ctx.handleNiaProducerWorkAiReply(reply, reply, '', 'work-request', true), true);
  assert.equal(ctx.played.beats.length, 81);
  assert.deepEqual(ctx.played.errors, []);
  assert.equal(ctx.played.beats.at(-1).ttsText, 'プロデューサー、お疲れ様。');
  assert.equal(state.nia.producerWork.status, 'complete');
  assert.equal(state.nia.training.actionIndex, 0, 'whole day advances only after playback');
  const restored = workCore.normalizeProducerWork(JSON.parse(JSON.stringify(state.nia.producerWork)));
  assert.equal(restored.lastStory, story + '\n' + reunionStory);
  assert.equal(await ctx.handleNiaProducerWorkAiReply(reply, reply, '', 'work-request', true), false);
  ctx.completeNiaProducerWorkAfterPlayback();
  assert.equal(state.nia.training.actionIndex, 1);
  assert.equal(ctx.completedDay, 0);
});
