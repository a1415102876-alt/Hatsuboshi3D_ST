import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { parseExpressionAt } from 'acorn';
import { buildNiaTvSegmentPrompt, parseNiaTvSegmentPayload } from '../nia-tv-business-api.js';
await import('../nia-tv-business-core.js');
const tv = globalThis.HatsuNiaTvBusiness;
const context = { businessId: 'tv-two', idol: '秦谷美铃', host: '真诚优', programName: '偶像生活访谈', businessLevel: 2, theme: '从容与训练', selectedTopics: ['训练细节'], day: { day: 4, title: '电视台访谈' }, plan: { publicImage: '温柔而有实力', principle: '展示真实积累', days: [{ workSeed: { tasks: [{ background: 'UNRELATED_WORK_DUMP' }] } }], asariReview: 'OLD_REVIEW_DUMP' } };
const incident = { incident: '节目组临时追加挑战', problem: '如何让观众理解从容与实力', options: ['展示训练', '坦率解释', '回应提问'] };
const closing = { highlight: '以从容的气息展示训练成果', audienceResponse: '观众理解了努力', impressionChange: '温柔而有实力', followupHook: '期待下一场舞台', resultSummary: '本期正式收播', bonusTier: 'medium' };
const line = id => ({ id, type: 'dialogue', speaker: context.idol, text: `<beat id="${id}" speaker="hmsz" cue="talk" shot="medium"><display lang="zh">展示训练成果。</display><tts lang="ja">練習の成果です。</tts></beat>` });
const payload = (index, extra = {}) => ({ schemaVersion: 2, segmentCount: 2, businessId: context.businessId, segmentIndex: index, status: index === 1 ? 'awaiting_producer' : 'ended', lines: [line('b' + index)], continuitySummary: '节目话题已推进。', ...(index === 1 ? incident : closing), ...extra });
const parse = data => parseNiaTvSegmentPayload('<NIA_TV_PROGRAM>' + JSON.stringify(data) + '</NIA_TV_PROGRAM>', { businessId: context.businessId, segmentIndex: data.segmentIndex, segmentCount: 2 });

test('new TV sessions need exactly one instruction between two generated segments and settle once', () => {
    let runtime = tv.createTvRuntime({ businessId: context.businessId });
    assert.equal(runtime.schemaVersion, 2); assert.equal(runtime.segmentCount, 2);
    runtime = tv.applySegmentPayload(tv.beginSegmentGeneration(runtime, 1).runtime, payload(1)).runtime;
    assert.equal(tv.settleTvOnce(runtime, context.businessId).ok, false);
    runtime = tv.completeSegmentPlayback(runtime).runtime; assert.equal(runtime.status, 'awaiting_producer_instruction');
    assert.equal(tv.beginSegmentGeneration(runtime, 2).reason, 'producer_instruction_missing');
    runtime = tv.submitProducerInstruction(runtime, '展示训练').runtime;
    for (const index of [0, 3, 4, 99, 1.5]) assert.equal(tv.beginSegmentGeneration(runtime, index).ok, false);
    runtime = tv.applySegmentPayload(tv.beginSegmentGeneration(runtime, 2).runtime, payload(2)).runtime;
    assert.equal(tv.settleTvOnce(runtime, context.businessId).ok, false);
    runtime = tv.completeSegmentPlayback(runtime).runtime; assert.equal(runtime.status, 'awaiting_settlement');
    const settled = tv.settleTvOnce(runtime, context.businessId); assert.equal(settled.result.fanGain, 4000); assert.equal(settled.runtime.segments.length, 2);
    assert.equal(tv.settleTvOnce(settled.runtime, context.businessId).reason, 'already_settled');
});

test('old unversioned active TV saves retain four segments and their fourth-segment reward', () => {
    let runtime = tv.normalizeTvRuntime({ businessId: 'old-tv', status: 'playing_1', segmentIndex: 1, segments: [{ lines: [{ text: '旧台词' }] }] });
    assert.equal(runtime.segmentCount, 4); assert.equal(runtime.schemaVersion, 1);
    runtime = tv.completeSegmentPlayback(runtime).runtime; assert.equal(runtime.status, 'awaiting_continue_1');
    runtime = tv.normalizeTvRuntime({ businessId: 'old-tv', status: 'awaiting_settlement', segmentIndex: 4, segments: [{}, {}, {}, closing] });
    assert.equal(tv.settleTvOnce(runtime, 'old-tv').result.fanGain, 4000);
});

test('interrupted two-part TV retries only the final segment and preserves the producer decision', () => {
    const runtime = tv.recoverInterruptedTv({ schemaVersion: 2, segmentCount: 2, businessId: context.businessId, status: 'generating_2', pendingSegmentIndex: 2, producerInstruction: '自定义：先澄清后示范', playbackLineIndex: 31, playedLines: [{ id: 'old', segmentIndex: 1, text: '已完成的开场' }] });
    assert.equal(runtime.segmentCount, 2); assert.equal(runtime.retrySegmentIndex, 2); assert.equal(runtime.producerInstruction, '自定义：先澄清后示范');
    const retry = tv.beginSegmentGeneration(runtime, 2); assert.equal(retry.ok, true); assert.equal(retry.runtime.playbackLineIndex, 0); assert.equal(retry.runtime.playedLines.length, 1);
    assert.equal(tv.beginSegmentGeneration(runtime, 4).ok, false);
});

test('two-part TV parser requires the incident first and a complete final result without reopening choices', () => {
    assert.equal(parse(payload(1)).ok, true); assert.equal(parse(payload(2)).ok, true);
    for (const extra of [{ incident: '' }, { problem: '' }, { options: ['只一个'] }, { status: 'continue' }]) assert.equal(parse(payload(1, extra)).ok, false);
    for (const extra of [{ status: 'continue' }, { resultSummary: '' }, { audienceResponse: '' }, { options: ['再问一次'] }, { problem: '新的问题' }]) assert.equal(parse(payload(2, extra)).ok, false);
    assert.equal(parse(payload(3)).ok, false);
});

test('merged TV prompt budgets match the other businesses and retain current scene facts only', () => {
    for (const businessLevel of [1, 2, 3]) {
        const first = buildNiaTvSegmentPrompt({ ...context, businessLevel }, { schemaVersion: 2, segmentCount: 2, pendingSegmentIndex: 1 });
        const shape = JSON.parse(first.match(/<NIA_TV_PROGRAM>\s*({[\s\S]*?})\s*<\/NIA_TV_PROGRAM>/)[1]);
        assert.equal(shape.segmentCount, 2); assert.equal(shape.status, 'awaiting_producer'); assert.equal(shape.options.length, 3);
        assert.match(first, /1200[～~—–-]1800/); assert.match(first, /20[～~—–-]32/); assert.match(first, /开场.*核心.*临时/);
        assert.doesNotMatch(first, /UNRELATED_WORK_DUMP|OLD_REVIEW_DUMP/); assert.ok(first.includes(context.theme)); assert.ok(first.includes('温柔而有实力'));
        const last = buildNiaTvSegmentPrompt({ ...context, businessLevel }, { schemaVersion: 2, segmentCount: 2, pendingSegmentIndex: 2, producerInstruction: '自定义执行方案', segments: [payload(1)] });
        const finalShape = JSON.parse(last.match(/<NIA_TV_PROGRAM>\s*({[\s\S]*?})\s*<\/NIA_TV_PROGRAM>/)[1]);
        assert.equal(finalShape.status, 'ended'); assert.match(last, /800[～~—–-]1200/); assert.match(last, /14[～~—–-]24/);
        assert.ok(last.includes('自定义执行方案')); assert.ok(last.includes(incident.problem)); assert.ok(last.includes(incident.incident));
    }
});

test('32 bilingual TV lines survive the first response without truncating the final sentence', () => {
    const lines = Array.from({ length: 32 }, (_, index) => line('b' + index)); const result = parse(payload(1, { lines }));
    assert.equal(result.ok, true); assert.equal(result.data.lines.length, 32); assert.equal(result.data.lines[31].text, lines[31].text);
});

test('the real producer instruction handler requests the runtime final index for both new and old TV', async () => {
    const app = await readFile(new URL('../app.js', import.meta.url), 'utf8');
    const start = app.indexOf('function submitNiaTvProducerInstruction('); const fn = app.slice(start, parseExpressionAt(app, start, { ecmaVersion: 'latest' }).end);
    for (const segmentCount of [2, 4]) {
        const requests = [], ctx = { niaTvBusinessCore: tv, niaTvBusinessSession: { runtime: { schemaVersion: segmentCount === 2 ? 2 : 1, segmentCount, businessId: 'tv', status: 'awaiting_producer_instruction' } },
            isCurrentNiaTvBusinessSession: () => true, state: { nia: {} }, normalizeNiaState: value => value, saveState() {}, requestNiaTvSegment: index => { requests.push(index); return true; } };
        vm.runInNewContext(fn, ctx); assert.equal(ctx.submitNiaTvProducerInstruction('自定义方案'), true); assert.deepEqual(requests, [segmentCount]);
    }
});
