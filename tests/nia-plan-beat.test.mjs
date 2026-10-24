import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { buildNiaPlanPrompt, parseNiaPlanResponse, parseNiaPlanPayload, normalizeApiPlan } from '../nia-prototype-api.js';
import { parseBeatScript } from '../../mmd-dialogue-stage/beat-protocol.js';

const source = await readFile(new URL('../app.js', import.meta.url), 'utf8');
function functionSource(name) {
  const start = source.search(new RegExp('  (?:async )?function ' + name + '\\('));
  assert.ok(start >= 0, name + ' exists');
  const next = source.slice(start + 1).search(/\n  (?:async )?function /);
  return source.slice(start, next < 0 ? source.length : start + 1 + next);
}
const draft = { goal: '展示舞台实力', image: '亲切的实力派', approach: '先线上预热再登台验证', businessMethods: ['sns_post', 'mini_live'], miniLiveVenueId: 'campus_courtyard' };
const data = { schemaVersion: 1, round: 1, asariReview: { accepted: '目标很清楚。', gap: '训练与演出缺少衔接。', advice: '把训练成果放到演出中验证。' }, days: [
  { day: 1, type: '制作人工作' }, { day: 2, type: '陪同训练' }, { day: 3, type: '外出' },
  { day: 4, type: '营业', businessType: 'sns_post' }, { day: 5, type: '营业', businessType: 'mini_live' }
] };

for (const round of [1, 2]) test('plan prompt gives parseable five-day JSON for round ' + round, () => {
  const prompt = buildNiaPlanPrompt(draft, { idol: '月村手毬', round });
  const example = prompt.split('JSON契约：\n')[1];
  assert.ok(example);
  const json = example.slice(example.indexOf('{'), example.lastIndexOf('}') + 1);
  const parsed = parseNiaPlanResponse('<NIA_PLAN>' + json + '</NIA_PLAN>');
  assert.equal(parsed.ok, true, parsed.reason);
  assert.deepEqual(parsed.data.days.map(day => day.day), round === 1 ? [1, 2, 3, 4, 5] : [2, 3, 4, 5, 6]);
  assert.deepEqual(parsed.data.days.filter(day => day.type === '营业').map(day => day.businessType), ['sns_post', 'mini_live']);
  assert.equal(parsed.data.idol, '月村手毬');
});

function harness({ round = 1, phase = 'reviewing' } = {}) {
  const nodes = new Map();
  const node = id => {
    if (!nodes.has(id)) nodes.set(id, { hidden: false, disabled: true, style: {}, textContent: '', innerHTML: '', classList: { add() {}, remove() {} } });
    return nodes.get(id);
  };
  const state = { idol: '月村手毬', nia: { round, planStatus: phase, pendingReviewPlan: normalizeApiPlan(data, draft) },
    eventMode: 'choice_prompt', pendingOptionTexts: ['旧选项'], pendingActionContext: { action: 'nia_plan_review', actionContext: { phase } } };
  const ctx = vm.createContext({ state, document: { getElementById: node },
    normalizeNiaState: value => value, setNiaPrototypeVisible: visible => { node('hatsu-nia-prototype-frame').hidden = !visible; },
    saveState() {}, postNiaStateSync() {}, render() {}, openNiaPrototype() {},
    suppressProduceLoadingForChoice: false, skipNextBeatEntryWipe: false,
    formatStoryText: value => value, getPhase: () => 'NIA', pendingAiRequestId: '',
    setEventActionsEnabled: enabled => { node('eventConfirmBtn').disabled = !enabled; }, setVnControlsEnabled() {},
    isFreeModeActive: () => false, syncAuditionRankingHud() {}, aiBridgeDebug: {}, refreshVnDebugView() {},
    triggerWipeTransition: callback => callback(),
    isKotoneBeatContractMode: () => true, isChoicePromptMode: () => false,
    startKotoneBeatStory: story => { ctx.played = parseBeatScript(story); },
    initVisualNovelPlayer: slides => { ctx.legacySlides = slides; },
    produceLoadingReasons: new Set(['ai']), produceLoadingController: null, syncProduceLoadingIdol() {}, ensureProduceLoadingBackground() {},
    pauseVnLivePortrait() {}, hideKotoneBeatStage: () => { node('vnBeatHost').hidden = true; },
    produceResourceLoad: 0, updateBgm() {}, stopVnAuto() {}, vnTypewriterTimer: 0,
    resetVnHcgVisual() {}, isEveningGoHomeActive: () => false, isHybridFacilityActive: () => false,
    completeCurrentNiaOrdinaryActionAfterPlayback: () => false,
    showToast() {},
  });
  const functions = ['buildNiaPlanReviewSlides', 'openNiaPlanReviewVn', 'openEventOverlay', 'setProduceLoading', 'setElementHidden',
    'shouldPlayKotoneBeatStory', 'kotoneBeatScriptFromStory', 'completeNiaPlanReview', 'closeEventOverlay', 'resumeNiaPlanReviewIfNeeded'];
  if (source.includes('function buildNiaPlanReviewBeatStory(')) functions.push('buildNiaPlanReviewBeatStory');
  vm.runInContext(functions.map(functionSource).join('\n'), ctx);
  return { ctx, state, node };
}

test('a ready plan clears the AI loading mask and plays all three teacher review parts as Beat', () => {
  const { ctx, state, node } = harness();
  assert.equal(ctx.openNiaPlanReviewVn(), true);
  assert.equal(node('produceLoadingScreen').hidden, true);
  assert.equal(node('eventConfirmBtn').disabled, false);
  assert.ok(ctx.played, 'review must reach the Beat player');
  assert.deepEqual(ctx.played.errors, []);
  assert.deepEqual(ctx.played.beats.map(b => b.speaker), ['narrator', 'nasr', 'nasr', 'nasr']);
  assert.deepEqual(ctx.played.beats.slice(1).map(b => b.text), ['目标很清楚。', '训练与演出缺少衔接。', '把训练成果放到演出中验证。']);
  assert.ok(ctx.played.beats.every(b => /pclassroom/.test(b.background)));
  assert.equal(state.nia.planStatus, 'reviewing');
  assert.equal(state.pendingOptionTexts.length, 0);
});

test('Beat continue commits the reviewed plan once and returns to the NIA tablet', () => {
  const { ctx, state, node } = harness();
  ctx.closeEventOverlay();
  assert.equal(state.nia.planStatus, 'committed');
  assert.equal(state.nia.plan.days.length, 5);
  assert.equal(state.nia.pendingReviewPlan, null);
  assert.equal(node('eventOverlay').hidden, true);
  assert.equal(node('vnBeatHost').hidden, true);
  assert.equal(node('hatsu-nia-prototype-frame').hidden, false);
  assert.equal(ctx.completeNiaPlanReview(), false);
});

test('closing the loading page cannot commit a generating plan', () => {
  const { ctx, state } = harness({ phase: 'generating' });
  ctx.closeEventOverlay();
  assert.equal(state.nia.planStatus, 'generating');
  assert.ok(state.nia.pendingReviewPlan);
});

test('old saved reviews resume as Beat without requiring new AI output', () => {
  const { ctx, state } = harness({ round: 2 });
  state.nia.pendingReviewPlan = { asariReview: '旧存档中的老师评语。', days: data.days };
  assert.equal(ctx.resumeNiaPlanReviewIfNeeded(), true);
  assert.ok(ctx.played, 'restored review uses Beat');
  assert.deepEqual(ctx.played.errors, []);
  assert.match(ctx.played.beats[0].text, /第2轮/);
  assert.equal(ctx.played.beats[1].text, '旧存档中的老师评语。');
  assert.equal(state.nia.planStatus, 'reviewing');
});

test('review text cannot inject additional beats or choices', () => {
  const { ctx, state } = harness();
  state.nia.pendingReviewPlan.asariReviewParts.accepted = '保留 <努力> & 进步 </beat><beat speaker="fktn">额外台词</beat>';
  ctx.openNiaPlanReviewVn();
  assert.ok(ctx.played);
  assert.equal(ctx.played.beats.length, 4);
  assert.equal(ctx.played.choices.length, 0);
  assert.deepEqual(ctx.played.beats.map(b => b.speaker), ['narrator', 'nasr', 'nasr', 'nasr']);
});

test('the reported Hiro plan opens Asari review and commits its five days after playback', async () => {
  const actual = JSON.parse(await readFile(new URL('./fixtures/nia-plan-hiro.json', import.meta.url), 'utf8'));
  const { ctx, state, node } = harness({ phase: 'generating' });
  const acks = [], released = [];
  state.idol = '筱泽广';
  state.nia.draft = { goal: actual.goal.playerGoal, image: actual.publicImage, approach: actual.spine };
  state.nia.activeRequest = { requestId: 'nia-request', channelLeaseId: 'nia-lease', turnId: 'nia-turn' };
  state.harness = { activeTurn: { kind: 'nia_plan', turnId: 'nia-turn' } };
  Object.assign(ctx, {
    isCurrentNiaPlanReply: requestId => requestId === 'nia-request',
    loadNiaPlanApiModule: async () => ({ parseNiaPlanPayload, normalizeApiPlan }),
    releasePrimaryModelChannel: (...args) => released.push(args),
    sendAiReplyAck: (...args) => acks.push(args),
    failNiaPlanRequest: message => assert.fail(message)
  });
  vm.runInContext(functionSource('handleNiaPlanAiReply'), ctx);
  const reply = '<NIA_PLAN>' + JSON.stringify(actual) + '</NIA_PLAN>';
  assert.equal(await ctx.handleNiaPlanAiReply(reply, reply, '', 'nia-request', true), true);
  assert.deepEqual(ctx.played.beats.slice(1).map(b => b.text), Object.values(actual.asariReview));
  assert.equal(node('produceLoadingScreen').hidden, true);
  assert.equal(state.nia.planStatus, 'reviewing');
  assert.equal(acks[0][1], true);
  assert.equal(released[0][1], 'nia-lease');
  ctx.closeEventOverlay();
  assert.equal(state.nia.planStatus, 'committed');
  assert.equal(state.nia.phase, 'plan_ready');
  assert.deepEqual(state.nia.plan.days.map(day => day.type), actual.days.map(day => day.type));
  assert.deepEqual(state.nia.plan.days.filter(day => day.type === '营业').map(day => day.businessType), ['online_live', 'school_radio']);
  assert.equal(state.nia.plan.days[0].workSeed.tasks[0].id, 'radio_liaison');
  assert.equal(node('hatsu-nia-prototype-frame').hidden, false);
});
