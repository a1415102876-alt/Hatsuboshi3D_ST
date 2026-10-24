import test from 'node:test';
import assert from 'node:assert/strict';
import { buildNiaLiveSegmentPrompt, parseNiaLiveSegmentPayload } from '../nia-business-api.js';
import { parseBeatScript } from '../../mmd-dialogue-stage/beat-protocol.js';
const context={businessId:'live-beat-1',idol:'秦谷美铃',businessLevel:1,businessBrief:{title:'午后茶会'}};
test('live prompt supplies a playable bilingual Beat and names only the current idol',()=>{
 const prompt=buildNiaLiveSegmentPrompt(context,{businessId:context.businessId,pendingSegmentIndex:1});
 const body=prompt.match(/<NIA_LIVE_SEGMENT>\s*({[\s\S]*?})\s*<\/NIA_LIVE_SEGMENT>/)[1];
 const shape=JSON.parse(body);
 const parsed=parseBeatScript(shape.beats[0].text);
 assert.equal(parsed.beats.length,1);
 assert.deepEqual(parsed.errors,[]);
 assert.equal(parsed.beats[0].speaker,'hmsz');
 assert.equal(parsed.beats[0].shot,'close');
 assert.match(prompt,/固定近景/);
 assert.ok(parsed.beats[0].ttsText);
 for(const other of ['藤田琴音','花海咲季','花海佑芽','姬崎莉波','紫云清夏','葛城莉莉娅','十王星南','雨夜燕','有村麻央','月村手毬','仓本千奈','筱泽广'])assert.ok(!prompt.includes(other),other+' must not be injected by an actor list');
 assert.ok(!prompt.includes('<stage-enter'));
});
test('live parser preserves a full bilingual Beat longer than the former caption limit',()=>{
 const script='<beat id="beat-1" speaker="hmsz" cue="talk" look="camera" shot="medium"><display lang="zh">'+('今天我们慢慢聊。'.repeat(45))+'</display><tts lang="ja">'+('今日はゆっくり話しましょう。'.repeat(45))+'</tts></beat>';
 const source={schemaVersion:1,businessId:context.businessId,segmentIndex:1,topic:'茶会',beats:[{id:'beat-1',type:'dialogue',speaker:context.idol,text:script}],comments:[{id:'c1',text:'欢迎！',tone:'positive',triggerAfterBeatId:'beat-1'}],continuitySummary:'开始茶会。'};
 const parsed=parseNiaLiveSegmentPayload('<NIA_LIVE_SEGMENT>'+JSON.stringify(source)+'</NIA_LIVE_SEGMENT>',{businessId:context.businessId,segmentIndex:1});
 assert.equal(parsed.ok,true);
 assert.equal(parsed.data.beats[0].text,script);
 assert.deepEqual(parseBeatScript(parsed.data.beats[0].text).errors,[]);
 assert.equal(parsed.data.comments[0].triggerAfterBeatId,'beat-1');
});

import { buildNiaLiveBeatTimeline } from '../nia-live-beat-core.js';
import { NiaLiveBeatPlayer } from '../nia-live-beat-player.js';

test('legacy stage controls become placement metadata and keep comment receipt IDs',()=>{
 const timeline=buildNiaLiveBeatTimeline({beats:[
  {id:'enter',type:'action',text:'<stage-enter idol="秦谷美铃" position="right"/>'},
  {id:'look',type:'action',text:'<stage-look idol="秦谷美铃" target="camera"/>'},
  {id:'talk',type:'dialogue',speaker:'秦谷美铃(高兴)',text:'欢迎来到直播间。'}
 ]},{idol:'秦谷美铃'});
 assert.equal(timeline.rows.length,1);
 assert.deepEqual(timeline.rows[0].sourceIds,['enter','look','talk']);
 const beat=parseBeatScript(timeline.script).beats[0];
 assert.equal(beat.id,'talk');assert.equal(beat.speaker,'hmsz');
 assert.equal(beat.position,'center');assert.equal(beat.shot,'close');assert.equal(beat.text,'欢迎来到直播间。');
 assert.ok(!beat.text.includes('stage-'));
});
test('new live Beats keep bilingual text, expression and authoritative outer IDs',()=>{
 const timeline=buildNiaLiveBeatTimeline({beats:[{id:'receipt-1',text:'<beat id="inner-1" speaker="hmsz" cue="talk-excited" face="happy" shot="close"><display lang="zh">谢谢大家。</display><tts lang="ja">皆さん、ありがとう。</tts></beat>'}]});
 const beat=parseBeatScript(timeline.script).beats[0];
 assert.equal(beat.id,'receipt-1');assert.equal(beat.text,'谢谢大家。');
 assert.equal(beat.ttsText,'皆さん、ありがとう。');assert.equal(beat.shot,'close');
 assert.equal(beat.cue,'talk-excited');assert.equal(beat.face,'happy');
});
test('live incident options cannot be smuggled into the Beat picture',()=>{
 assert.throws(()=>buildNiaLiveBeatTimeline({beats:[{id:'b1',text:'<beat speaker="hmsz">你好。</beat><choice><option>A</option><option>B</option><option>C</option><option>D</option></choice>'}]}),/一个完整 Beat/);
});
const payload={beats:[{id:'b1',speaker:'秦谷美铃',type:'dialogue',text:'大家好。'},{id:'b2',speaker:'秦谷美铃',type:'dialogue',text:'慢慢聊吧。'}]};
function harness(goTo=async()=>true){
 const elements={script:{value:''}};
 const player={elements,state:{current:-1},preloadPromise:Promise.resolve(true),compile(){},async goTo(i,options){const result=await goTo(i,options);this.state.current=i;return result;},stop(){},dispose(){}};
 return {controller:new NiaLiveBeatPlayer(elements,{createPlayer:async()=>player}),player};
}
test('live controller emits comments at each presented row and completes exactly once',async()=>{
 const {controller}=harness(),seen=[];let ends=0;
 await controller.load(payload,{idol:context.idol,onBeat:row=>seen.push(row.id),onEnded:()=>ends++});
 assert.deepEqual(seen,['b1']);await controller.advance();assert.deepEqual(seen,['b1','b2']);
 await controller.advance();await controller.advance();assert.equal(ends,1);
});
test('a rapid second click cannot skip a row while the renderer is preparing it',async()=>{
 let release;const gate=new Promise(resolve=>release=resolve);const seen=[];
 const {controller}=harness(async i=>i===1?gate:true);
 await controller.load(payload,{idol:context.idol,onBeat:row=>seen.push(row.id)});
 const moving=controller.advance();assert.equal(await controller.advance(),false);
 release(true);await moving;assert.deepEqual(seen,['b1','b2']);
});
test('cancelled live rendering cannot emit comments or finish a replaced segment',async()=>{
 let release;const gate=new Promise(resolve=>release=resolve);let seen=0,ended=0;
 const {controller}=harness(()=>gate);
 const loading=controller.load(payload,{idol:context.idol,onBeat:()=>seen++,onEnded:()=>ended++});
 await new Promise(resolve=>setImmediate(resolve));controller.stop();release(true);await loading;
 assert.equal(seen,0);assert.equal(ended,0);
});

import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
const bridgeSource=await readFile(new URL('../st.html',import.meta.url),'utf8');
function bridgeCompatibility(source){
 const start=source.indexOf('    function isGeneratedTextCompatibleWithPrompt(');
 const tail=source.slice(start+1).search(/\n    (?:async )?function /);
 const fn=source.slice(start,start+1+tail);
 const sandbox={};vm.runInNewContext(fn+'\nglobalThis.compatible=isGeneratedTextCompatibleWithPrompt;',sandbox);return sandbox.compatible;
}
test('live bridge retains the outer receipt instead of accepting an unrelated Beat-only reply',()=>{
 const compatible=bridgeCompatibility(bridgeSource);
 const prompt=buildNiaLiveSegmentPrompt(context,{pendingSegmentIndex:1});
 assert.equal(compatible(prompt,'<NIA_LIVE_SEGMENT>{"businessId":"live-beat-1","beats":[]}</NIA_LIVE_SEGMENT>'),true);
 assert.equal(compatible(prompt,'<beat speaker="hmsz">你好。</beat>'),false);
 assert.equal(compatible(prompt,'<NIA_WORK_RESULT>{}</NIA_WORK_RESULT>'),false);
});
test('live bridge also accepts a legacy receipt after the prompt has switched to Beat',()=>{
 const compatible=bridgeCompatibility(bridgeSource);
 assert.equal(compatible(buildNiaLiveSegmentPrompt(context,{pendingSegmentIndex:1}),'<NIA_LIVE_SEGMENT>{"beats":[{"text":"<stage-enter idol=\\"秦谷美铃\\"/>"}]}</NIA_LIVE_SEGMENT>'),true);
});

test('live ignores scripted shot changes and keeps the host at the fixed station',()=>{
 const beats=['wide','medium','close','reaction','keep'].map((shot,i)=>({id:'fixed-'+i,text:'<beat speaker="hmsz" position="left" shot="'+shot+'"><display lang="zh">台词'+i+'</display><tts lang="ja">こんにちは。</tts></beat>'}));
 const timeline=buildNiaLiveBeatTimeline({beats},{idol:context.idol});
 const parsed=parseBeatScript(timeline.script);
 assert.deepEqual(parsed.errors,[]);
 assert.deepEqual(parsed.beats.map(b=>b.shot),['close','close','close','close','close']);
 assert.deepEqual(parsed.beats.map(b=>b.position),['center','center','center','center','center']);
 assert.deepEqual(timeline.rows.map(row=>row.sourceIds),beats.map(b=>[b.id]));
});
test('live holds the host camera while the producer or another idol speaks',async()=>{
 const {controller,player}=harness();
 const mixed={beats:[
  {id:'host',type:'dialogue',speaker:context.idol,text:'欢迎大家。'},
  {id:'producer',type:'dialogue',speaker:'制作人',text:'时间还有很多。'},
  {id:'guest',text:'<beat speaker="ttmr" shot="wide"><display lang="zh">我来打个招呼。</display><tts lang="ja">こんにちは。</tts></beat>'}
 ]};
 await controller.load(mixed,{idol:context.idol});
 assert.deepEqual(player.fixedPresentation,{focus:'hmsz',shot:'close',inherited:false});
 await controller.advance();await controller.advance();
 assert.deepEqual(player.fixedPresentation,{focus:'hmsz',shot:'close',inherited:false});
});
