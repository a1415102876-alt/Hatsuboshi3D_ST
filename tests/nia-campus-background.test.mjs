import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {parseBeatScript} from '../../mmd-dialogue-stage/beat-protocol.js';
import {BEAT_BACKGROUND_NAMES} from '../../mmd-dialogue-stage/beat-backgrounds.js';
await import('../../mmd-dialogue-stage/beat-background-routing.js');
const routing=globalThis.HatsuBeatBackgroundRouting;
const app=await readFile(new URL('../app.js',import.meta.url),'utf8');
function load(ctx,names){vm.createContext(ctx);for(const name of names){const start=app.indexOf('  function '+name+'(');assert.ok(start>=0,name+' missing');const tail=app.slice(start);const next=tail.slice(3).search(/^  (?:async )?function /m);vm.runInContext(next<0?tail:tail.slice(0,next+3),ctx);}return ctx;}
function context(){return {state:{idol:'秦谷美铃',pendingActionContext:{action:'nia_campus_activity',actionContext:{locationId:'swimming_pool',operationId:'pool-event-1'}},nia:{plan:{},training:{companionDay:{morningSummary:'上午训练。',afternoonSummary:'下午训练。'}}}},HatsuBeatBackgroundRouting:routing,normalizeNiaState:n=>n,niaTrainingCore:{ensureCompanionTrainingDay:n=>n,getCurrentNiaPlanAction:()=>({title:'陪同训练'})},isSandboxLaunch:()=>false,isKotoneBeatContractMode:()=>true,isKotoneBeatIdol:()=>false,isChoicePromptMode:()=>false,buildProducerPromptSection:()=>'',composeWorldSummaryBlock:()=>''};}
const helpers=['niaCampusBeatBackgroundSelection'];
const parsePool=script=>parseBeatScript(script,{backgrounds:BEAT_BACKGROUND_NAMES,backgroundCategory:'communication',backgroundContext:'communication.campus.swimming_pool'});
const bad='<beat id="p1" speaker="hmsz" background="3d-adv-hallway-00-00-evening"><display lang="zh">泳池的水面真安静。</display><tts lang="ja">水面が静かですね。</tts></beat><beat id="p2" speaker="producer"><display lang="zh">在这里坐一会吧。</display><tts lang="ja">ここで少し休もう。</tts></beat>';
test('campus activity prompt uses the chosen pool context and names its opening background',()=>{
 const ctx=load(context(),[...helpers,'buildNiaCampusActivityPrompt','outputContract','galgameRenderContract','kotoneBeatContract','beatBackgroundPromptBlock','beatCostumePromptBlock']);
 const prompt=ctx.buildNiaCampusActivityPrompt({id:'swimming_pool',name:'泳池',description:'学园泳池'});
 assert.match(prompt,/BEAT_BACKGROUND_CONTEXT=communication\.campus\.swimming_pool/);
 assert.match(prompt,/background="(?:泳池-夕|school-pool-00-evening)"/);
 assert.doesNotMatch(prompt,/BEAT_BACKGROUND_CONTEXT=communication\.general/);
});
test('the selected pool replaces a mistaken opening hallway while later explicit scene changes are preserved',()=>{
 const ctx=load(context(),[...helpers,'kotoneBeatScriptFromStory']);const script=ctx.kotoneBeatScriptFromStory(bad);const parsed=parsePool(script);
 assert.equal(parsed.beats[0].background,'env_2d_adv_school-pool-00-noon.png');
 assert.equal(parsed.beats[1].background,'env_2d_adv_school-pool-00-noon.png');
 assert.equal(parsed.beats[0].text,'泳池的水面真安静。');assert.equal(parsed.beats[0].ttsText,'水面が静かですね。');
 const moved=ctx.kotoneBeatScriptFromStory(bad.replace('speaker="producer"','speaker="producer" background="3d-adv-hallway-00-00-evening"'));
 assert.match(parsePool(moved).beats[1].background,/hallway/);
 const comment='<!-- 草稿示例 <beat background="3d-adv-hallway-00-00-evening"> -->';
 const commented=ctx.kotoneBeatScriptFromStory(comment+bad);
 assert.ok(commented.startsWith(comment));assert.equal(parsePool(commented).beats[0].background,'env_2d_adv_school-pool-00-noon.png');
});
test('pool opening also works without an AI background and does not alter ordinary dialogue',()=>{
 const ctx=load(context(),[...helpers,'kotoneBeatScriptFromStory']);const noBg=bad.replace(' background="3d-adv-hallway-00-00-evening"','');assert.equal(parsePool(ctx.kotoneBeatScriptFromStory(noBg)).beats[0].background,'env_2d_adv_school-pool-00-noon.png');
 ctx.state.pendingActionContext={action:'freechat'};assert.equal(ctx.kotoneBeatScriptFromStory(bad),bad);
});
test('restoring a campus event derives background scope from the saved chosen place instead of a stale general prompt',()=>{
 const ctx=context();ctx.state.lastPrompt='BEAT_BACKGROUND_CONTEXT=communication.general';load(ctx,[...helpers,'currentBeatBackgroundSelection','currentBeatBackgroundEventCategory']);const selection=ctx.currentBeatBackgroundSelection();
 assert.equal(selection.context,'communication.campus.swimming_pool');assert.equal(selection.defaultBackground,'泳池-夕');assert.ok(selection.planId.includes('pool-event-1'));
});
