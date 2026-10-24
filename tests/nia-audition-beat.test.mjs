import test from 'node:test';
import assert from 'node:assert/strict';
import * as api from '../nia-audition-api.js';
import { parseBeatScript } from '../../mmd-dialogue-stage/beat-protocol.js';
await import('../nia-audition-core.js');
const core=globalThis.HatsuNiaAudition;
const before='<beat id="b1" speaker="hmsz" cue="talk" look="camera" position="center" background="other-waitingroom-nia-00-noon" shot="medium" wait="text"><display lang="zh">制作人，我准备好了。</display><tts lang="ja">プロデューサー、準備ができました。</tts></beat>';
const after=before.replace('b1','a1').replace('我准备好了','我通过了').replace('準備ができました','合格しました');
const make=()=>core.createAuditionRuntime({auditionId:'aud-1',idolName:'秦谷美铃',roundNumber:2,flowVersion:2,context:{stats:{Vo:123,Da:234,Vi:345},growth:{Vo:20}}});
const data=(phase,story)=>({schemaVersion:1,auditionId:'aud-1',phase,story,continuitySummary:phase==='before'?'已完成出发前准备。':'成功后在化妆间会合。'});
function readyBefore(){assert.equal(typeof core.beginAuditionBeat,'function');const started=core.beginAuditionBeat(make(),'before',{requestId:'r1'});assert.equal(started.ok,true);const applied=core.applyAuditionBeat(started.runtime,data('before',before));assert.equal(applied.ok,true);return applied.runtime;}
function readyAnimation(){const r=core.completeAuditionBeforePlayback(readyBefore());assert.equal(r.ok,true);return r.runtime;}

test('new auditions keep pre-dialogue, success, and post-dialogue in strict playback order',()=>{
 const beforeRuntime=readyBefore();assert.equal(beforeRuntime.beatFlow.status,'playing_before');
 assert.equal(core.beginAuditionBeat(beforeRuntime,'after').ok,false);
 const animation=core.completeAuditionBeforePlayback(beforeRuntime);assert.equal(animation.ok,true);assert.equal(animation.runtime.beatFlow.status,'success_animation');assert.equal(animation.runtime.result.qualified,true);assert.equal(animation.runtime.progressionApplied,false);
 assert.equal(core.completeAuditionBeforePlayback(animation.runtime).ok,false);
 assert.equal(core.beginAuditionBeat(animation.runtime,'after').ok,false);
 const success=core.completeAuditionSuccessPlayback(animation.runtime);assert.equal(success.ok,true);
 const post=core.beginAuditionBeat(success.runtime,'after',{requestId:'r2'});assert.equal(post.ok,true);
 const applied=core.applyAuditionBeat(post.runtime,data('after',after));assert.equal(applied.ok,true);
 const completed=core.completeAuditionAfterPlayback(applied.runtime);assert.equal(completed.ok,true);assert.equal(completed.runtime.beatFlow.status,'completed');assert.equal(completed.runtime.postAudition.status,'completed');assert.equal(completed.runtime.result.fanGain,20000);
 assert.equal(core.completeAuditionAfterPlayback(completed.runtime).ok,false);
 assert.equal(core.settleAuditionOnce(completed.runtime,'aud-1').ok,false);
});

test('temporary success policy snapshots actual stats while leaving later result evaluation separate',()=>{
 assert.equal(typeof core.evaluateAuditionOutcome,'function');
 const r=core.evaluateAuditionOutcome({Vo:0,Da:123,Vi:456});assert.equal(r.qualified,true);assert.equal(r.policy,'temporary_success');assert.deepEqual(r.stats,{Vo:0,Da:123,Vi:456});
 assert.equal(core.evaluateAuditionOutcome({Vo:999,Da:999,Vi:999}).qualified,true);
});

test('stale audition or wrong phase receipts cannot advance or overwrite the current conversation',()=>{
 assert.equal(typeof core.beginAuditionBeat,'function');const runtime=core.beginAuditionBeat(make(),'before').runtime;
 assert.equal(core.applyAuditionBeat(runtime,{...data('before',before),auditionId:'other'}).ok,false);
 assert.equal(core.applyAuditionBeat(runtime,data('after',after)).ok,false);
 assert.equal(core.applyAuditionBeat(runtime,data('before',before)).ok,true);
});

test('refresh during generation retries only that conversation and preserves a completed success animation',()=>{
 assert.equal(typeof core.beginAuditionBeat,'function');const beforeGen=core.beginAuditionBeat(make(),'before').runtime;
 const recovered=core.recoverInterruptedAudition(beforeGen);assert.equal(recovered.beatFlow.retryPhase,'before');assert.equal(core.beginAuditionBeat(recovered,'before').ok,true);
 const animation=readyAnimation();assert.equal(core.recoverInterruptedAudition(animation).beatFlow.status,'success_animation');
 const done=core.completeAuditionSuccessPlayback(animation).runtime;const afterGen=core.beginAuditionBeat(done,'after').runtime;const retry=core.recoverInterruptedAudition(afterGen);assert.equal(retry.beatFlow.retryPhase,'after');assert.equal(retry.result.fanGain,20000);assert.equal(core.beginAuditionBeat(retry,'before').ok,false);assert.equal(core.beginAuditionBeat(retry,'after').ok,true);
});

test('long bilingual stories survive normalization and legacy four-segment saves remain legacy',()=>{
 assert.equal(typeof core.beginAuditionBeat,'function');const story=before.replace('制作人，我准备好了。','这次准备已经完成。'.repeat(1700));assert.ok(story.length>12000);
 const r=core.applyAuditionBeat(core.beginAuditionBeat(make(),'before').runtime,data('before',story));assert.equal(r.ok,true);assert.equal(core.normalizeAuditionRuntime(r.runtime).beatFlow.beforeStory,story);
 assert.equal(core.normalizeAuditionRuntime({auditionId:'old',status:'playing_3',segmentIndex:3,segments:[]}).flowVersion,1);
});

test('both prompts produce bilingual Beats in the same real NIA makeup room without old multi-segment directions',()=>{
 assert.equal(typeof api.buildNiaAuditionBeatPrompt,'function');
 for(const phase of ['before','after']){
  const prompt=api.buildNiaAuditionBeatPrompt({auditionId:'aud-1',idol:'秦谷美铃',round:2},make(),phase);
  const shape=JSON.parse(prompt.match(/<NIA_AUDITION_BEAT>\s*({[\s\S]*?})\s*<\/NIA_AUDITION_BEAT>/)[1]);
  assert.equal(shape.phase,phase);const parsed=parseBeatScript(shape.story);assert.deepEqual(parsed.errors,[]);assert.equal(parsed.beats[0].speaker,'hmsz');assert.ok(parsed.beats[0].ttsText);assert.equal(parsed.beats[0].background,'other-waitingroom-nia-00-noon');
  assert.equal(api.parseNiaAuditionBeatPayload('<NIA_AUDITION_BEAT>'+JSON.stringify(shape)+'</NIA_AUDITION_BEAT>',{auditionId:'aud-1',phase}).ok,true);
  assert.doesNotMatch(prompt,/四段|第 [1234] 段|<dialogue|<narration/);
 }
});

test('Beat receipt parser rejects missing wrappers, wrong identifiers, choices and malformed story',()=>{
 assert.equal(typeof api.parseNiaAuditionBeatPayload,'function');
 const wrap=v=>'<NIA_AUDITION_BEAT>'+JSON.stringify(v)+'</NIA_AUDITION_BEAT>';
 const expected={auditionId:'aud-1',phase:'before'};
 assert.equal(api.parseNiaAuditionBeatPayload(wrap(data('before',before)),expected).ok,true);
 assert.equal(api.parseNiaAuditionBeatPayload(before,expected).ok,false);
 for(const v of [{...data('before',before),auditionId:'other'},data('after',after),data('before',before.replace('</beat>','')),data('before',before+'<narration>旧格式</narration>'),{...data('before',before),options:['选项']},{...data('before',before),fanGain:99999}])assert.equal(api.parseNiaAuditionBeatPayload(wrap(v),expected).ok,false);
});
