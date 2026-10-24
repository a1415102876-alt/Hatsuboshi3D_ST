import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
await import('../nia-audition-core.js');
const core=globalThis.HatsuNiaAudition;
const source=await readFile(new URL('../app.js',import.meta.url),'utf8');
function load(ctx,names){vm.createContext(ctx);for(const name of names){const re=new RegExp('^  (?:async )?function '+name+'\\(','m');const start=source.search(re);assert.ok(start>=0,name+' must be present');const tail=source.slice(start);const next=tail.slice(3).search(/^  (?:async )?function /m);vm.runInContext(next<0?tail:tail.slice(0,next+3),ctx);}return ctx;}
const before='<beat speaker="hmsz"><display lang="zh">准备好了。</display><tts lang="ja">準備できました。</tts></beat>';
function preRuntime(){const runtime=core.createAuditionRuntime({auditionId:'n1',flowVersion:2,idolName:'秦谷美铃',context:{growth:{},stats:{Vo:120,Da:100,Vi:90}}});return core.applyAuditionBeat(core.beginAuditionBeat(runtime,'before').runtime,{auditionId:'n1',phase:'before',story:before,continuitySummary:'准备完毕'}).runtime;}
test('finishing pre-dialogue starts the success cutscene exactly once instead of a second stage generation',()=>{
 let animations=0;const ctx=load({isCurrentNiaAuditionSession:()=>true,niaAuditionSession:{auditionId:'n1',context:{},runtime:preRuntime()},niaAuditionCore:core,hideKotoneBeatStage(){},syncNiaAuditionState(){},saveState(){},playNiaAuditionSuccess(){animations++;return true;}},['completeNiaAuditionBeatPlayback']);
 assert.equal(ctx.completeNiaAuditionBeatPlayback(),true);assert.equal(ctx.niaAuditionSession.runtime.beatFlow.status,'success_animation');assert.equal(animations,1);assert.equal(ctx.completeNiaAuditionBeatPlayback(),false);assert.equal(animations,1);
});
test('post-dialogue must finish before numeric rewards apply and repeated confirmations cannot duplicate them',()=>{
 let runtime=core.completeAuditionBeforePlayback(preRuntime()).runtime;runtime=core.completeAuditionSuccessPlayback(runtime).runtime;runtime=core.applyAuditionBeat(core.beginAuditionBeat(runtime,'after').runtime,{auditionId:'n1',phase:'after',story:before,continuitySummary:'报喜完成'}).runtime;
 let finished=0;const ctx=load({isCurrentNiaAuditionSession:()=>true,state:{nia:{training:{fans:1000},audition:runtime},Vo:100,Da:100,Vi:100,cap:{Vo:999,Da:999,Vi:999}},niaAuditionSession:{auditionId:'n1',context:{},runtime,result:runtime.result},niaAuditionCore:core,niaTrainingCore:{normalizeNiaTraining:v=>v},normalizeNiaState:v=>v,clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),hideKotoneBeatStage(){},syncNiaAuditionState(){},saveState(){},reconcileNiaFanMilestoneAfterSettlement(){},completeNiaPostAuditionAfterPlayback(){finished++;return true;},pendingAiRequestId:''},['completeNiaAuditionBeatPlayback','confirmNiaAuditionResult']);
 assert.equal(ctx.confirmNiaAuditionResult(),false);assert.equal(ctx.state.nia.training.fans,1000);
 assert.equal(ctx.completeNiaAuditionBeatPlayback(),true);assert.equal(ctx.state.nia.training.fans,11000);assert.equal(ctx.state.Vo,220);assert.equal(finished,1);assert.equal(ctx.confirmNiaAuditionResult(),false);assert.equal(ctx.state.nia.training.fans,11000);
});


test('switching save scopes disposes the previous audition session before reading the new save',()=>{
 const ctx=load({activeStorageKey:'scope-A',state:{pendingActionContext:{action:'nia_audition'}},niaAuditionSession:{auditionId:'A'},niaAuditionSuccessPlayer:null,niaAuditionAnimationGeneration:0,
  resetNiaTvBusinessSession(){},storageKeyForScope:s=>'scope-'+s,loadState:()=>({nia:{audition:{auditionId:''}}}),ensureStateShape(){},document:{getElementById:()=>null},hideKotoneBeatStage(){}},['disposeNiaAuditionSuccessPlayer','resetNiaAuditionSession','switchStorageScope']);
 assert.equal(ctx.switchStorageScope('B'),true);assert.equal(ctx.niaAuditionSession,null);assert.equal(ctx.state.nia.audition.auditionId,'');
});
test('audition player module resolves through the ST asset base when mounted in the host root page',()=>{
 const ctx=load({window:{HATSU_RESOLVE_ASSET_URL:p=>'https://tavern.test/hatsu-produce-local/'+p.replace(/^.\//,'')},document:{baseURI:'https://tavern.test/'}},['niaAuditionPlayerModuleUrl']);
 assert.equal(new URL(ctx.niaAuditionPlayerModuleUrl()).pathname,'/hatsu-produce-local/nia-audition-player.js');
});


test('a resumed audition cannot belong to another save, idol or audition ID',()=>{
 const ctx=load({activeHostSaveScope:'scope-A',state:{idol:'秦谷美铃',nia:{round:1,audition:{auditionId:'A'}}},niaAuditionSession:{auditionId:'A',saveScope:'scope-A',context:{idol:'秦谷美铃',round:1}}},['isCurrentNiaAuditionSession']);
 assert.equal(ctx.isCurrentNiaAuditionSession(),true);ctx.activeHostSaveScope='scope-B';assert.equal(ctx.isCurrentNiaAuditionSession(),false);ctx.activeHostSaveScope='scope-A';ctx.state.nia.audition.auditionId='B';assert.equal(ctx.isCurrentNiaAuditionSession(),false);
});
