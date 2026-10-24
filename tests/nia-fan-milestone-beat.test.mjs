import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { buildNiaFanMilestonePrompt, parseNiaFanMilestonePayload } from '../nia-fan-milestone-api.js';
import * as protocol from '../../mmd-dialogue-stage/beat-protocol.js';
import * as beatCore from '../../mmd-dialogue-stage/beat-player-core.js';
await import('../nia-fan-milestone-core.js');
const core=globalThis.HatsuNiaFanMilestone;
const eventId='nia-saki-fans-5000';
const wrap=story=>'<NIA_FAN_MILESTONE_EVENT>'+JSON.stringify({schemaVersion:1,eventId,story})+'</NIA_FAN_MILESTONE_EVENT>';
const beat='<beat id="m1" speaker="hski" cue="talk" look="camera" position="center" background="school-pclassroom-00-noon" shot="medium"><display lang="zh">谢谢大家的支持。</display><tts lang="ja">皆さん、応援ありがとうございます。</tts></beat>';
const sakiEvents=['fans-5000','fans-10000','round2-audition-eve','round2-quartet-opening','round2-quartet-victory','round3-first-business','round3-finale-eve','finale-sisters-aftermath','finale-partner-epilogue'];
const kotoneEvents=['fans-5000','fans-10000','round2-audition-eve','round2-quartet-opening','round2-quartet-victory','round3-first-business','round3-finale-eve','finale-victory','finale-epilogue'];
for (const [prefix,idol,speaker,events] of [['saki','花海咲季','hski',sakiEvents],['kotone','藤田琴音','fktn',kotoneEvents]]) for (const event of events) test(prefix+' '+event+' requests a playable bilingual Beat receipt',()=>{
 const id='nia-'+prefix+'-'+event;
 const prompt=buildNiaFanMilestonePrompt({eventId:id,idolName:idol,fans:52000});
 const shape=JSON.parse(prompt.match(/<NIA_FAN_MILESTONE_EVENT>\s*({[\s\S]*?})\s*<\/NIA_FAN_MILESTONE_EVENT>/)[1]);
 assert.equal(shape.eventId,id);
 const parsed=protocol.parseBeatScript(shape.story);
 assert.deepEqual(parsed.errors,[]);assert.ok(parsed.beats.length);assert.equal(parsed.beats[0].speaker,speaker);assert.ok(parsed.beats[0].ttsText);
 assert.equal(parseNiaFanMilestonePayload('<NIA_FAN_MILESTONE_EVENT>'+JSON.stringify(shape)+'</NIA_FAN_MILESTONE_EVENT>',{eventId:id}).ok,true);
 assert.doesNotMatch(prompt,/<dialogue|<narration|\(功能词\)|\(平常待机\)/);
});
test('route anchors request current actor Beats without a full idol list',()=>{
 const id='nia-misuzu-fans-5000';const prompt=buildNiaFanMilestonePrompt({eventId:id,idolName:'秦谷美铃',route:{idolName:'秦谷美铃',promptProvider:'route-anchors',episodes:[{eventId:id,episode:12,promptAnchors:['美铃感谢支持自己的观众。']}]}});
 const shape=JSON.parse(prompt.match(/<NIA_FAN_MILESTONE_EVENT>\s*({[\s\S]*?})\s*<\/NIA_FAN_MILESTONE_EVENT>/)[1]);
 assert.equal(protocol.parseBeatScript(shape.story).beats[0].speaker,'hmsz');assert.match(prompt,/美铃感谢支持/);assert.doesNotMatch(prompt,/藤田琴音|花海咲季|可用偶像/);
});
test('new Beat receipts preserve both languages while legacy VN receipts remain accepted',()=>{
 const parsed=parseNiaFanMilestonePayload(wrap(beat),{eventId});assert.equal(parsed.ok,true);assert.equal(parsed.data.story,beat);
 assert.equal(parseNiaFanMilestonePayload(wrap('<narration>咲季走进教室。</narration><dialogue char="花海咲季">谢谢。</dialogue>'),{eventId}).ok,true);
});
test('milestone rejects choices, incomplete Beats, mixed formats and prose outside Beats',()=>{
 for(const story of [beat+'<choice><option>A</option><option>B</option><option>C</option><option>D</option></choice>',beat.replace('</beat>',''),beat+'正文外的解释',beat+'<narration>旁白。</narration>'])assert.equal(parseNiaFanMilestonePayload(wrap(story),{eventId}).ok,false,story.slice(-60));
});
test('long bilingual milestone stays complete through applying and recovering a save',()=>{
 const story=beat.replace('谢谢大家的支持。','谢谢大家。'.repeat(1400)).replace('皆さん、応援ありがとうございます。','ありがとうございます。'.repeat(1100));assert.ok(story.length>12000);
 const parsed=parseNiaFanMilestonePayload(wrap(story),{eventId});assert.equal(parsed.ok,true);
 const applied=core.applyFanMilestoneStory({eventId,status:'generating'},parsed.data);assert.equal(applied.ok,true);assert.equal(applied.runtime.story,story);
 assert.equal(core.recoverInterruptedFanMilestone(applied.runtime).story,story);
 const completed=core.completeFanMilestone(applied.runtime);assert.equal(completed.ok,true);assert.equal(core.completeFanMilestone(completed.runtime).ok,false);
});
const app=await readFile(new URL('../app.js',import.meta.url),'utf8');
const st=await readFile(new URL('../st.html',import.meta.url),'utf8');
function functionSource(source,name,indent='  '){const start=source.indexOf(indent+'function '+name+'(');assert.ok(start>=0,name);const rest=source.slice(start+1),next=rest.search(new RegExp('\n'+indent+'(?:async )?function '));return source.slice(start,next<0?source.length:start+1+next);}
test('Beat milestone can continue only after playback has ended',()=>{
 const state={activeStoryNode:{type:'niaFanMilestone',ready:true},nia:{fanMilestoneEvent:{status:'playing'}}};let completed=0,warnings=0;
 const sandbox={state,kotoneBeatAwaitingExit:false,normalizeNiaState:n=>n,completeNiaFanMilestoneAfterPlayback:()=>{completed++;state.activeStoryNode=null;return true;},showToast:()=>warnings++};
 vm.runInNewContext(functionSource(app,'closeEventOverlay')+';globalThis.close=closeEventOverlay;',sandbox);
 sandbox.close();assert.equal(completed,0);assert.equal(warnings,1);
 sandbox.kotoneBeatAwaitingExit=true;sandbox.close();assert.equal(completed,1);
});
test('classic loader and bridge prioritize the milestone JSON contract over Beat examples',()=>{
 const sandbox={HatsuBeatPlayerCore:beatCore,HatsuBeatProtocol:protocol};
 const convert=functionSource(st,'convertNiaBusinessModuleToClassic');vm.runInNewContext(convert+';globalThis.convert=convertNiaBusinessModuleToClassic;',sandbox);
 const source=readFile(new URL('../nia-fan-milestone-api.js',import.meta.url),'utf8');return source.then(source=>{
 vm.runInNewContext(sandbox.convert(source),sandbox);
 const prompt=sandbox.HatsuNiaFanMilestoneApi.buildNiaFanMilestonePrompt({eventId,idolName:'花海咲季'});
 vm.runInNewContext(functionSource(st,'isGeneratedTextCompatibleWithPrompt','    ')+';globalThis.compatible=isGeneratedTextCompatibleWithPrompt;',sandbox);
 assert.equal(sandbox.compatible(prompt,wrap(beat)),true);assert.equal(sandbox.compatible(prompt,beat),false);assert.equal(sandbox.compatible(prompt,'<NIA_WORK_RESULT>{}</NIA_WORK_RESULT>'),false);
 assert.equal(sandbox.HatsuNiaFanMilestoneApi.parseNiaFanMilestonePayload(wrap(beat),{eventId}).ok,true);
 });
});

test('recoverable Beat cue and NPC face diagnostics do not reject the entire event',()=>{
 const story=beat.replace('cue="talk"','cue="unlisted-action"')+'<beat speaker="真诚优" face="happy"><display lang="zh">期待下次的正式演出。</display></beat>';
 assert.equal(parseNiaFanMilestonePayload(wrap(story),{eventId}).ok,true);
 const parsed=protocol.parseBeatScript(story,{allowOtherSpeakers:true});assert.equal(parsed.beats.length,2);assert.ok(parsed.errors.length);
});
