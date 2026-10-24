import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { buildNiaLiveSegmentPrompt, parseNiaLiveSegmentPayload } from '../nia-business-api.js';
await import('../nia-live-business-core.js');
const live = globalThis.HatsuNiaLiveBusiness;
const context = { businessId:'live-two', idol:'秦谷美铃', businessLevel:1, day:{day:4,title:'午后茶会',purpose:'展示从容实力',problem:'快节奏弹幕'}, plan:{publicImage:'温柔从容',principle:'尊重固有步调',storyQuestion:'从容能否展现实力',evidence:['气息训练成果'],days:[{title:'OTHER_DAY_SECRET',workSeed:{tasks:[{background:'UNRELATED_WORK_DUMP'}]}}],asariReview:'OLD_REVIEW_DUMP'},businessBrief:{title:'茶会',preparation:['茶具'],boundaries:['不泄露隐私']} };
const segment = (index, extra={}) => ({ businessId:context.businessId,segmentIndex:index,topic:'茶会',beats:[{id:'b1',speaker:context.idol,text:'欢迎大家。'}],comments:[],continuitySummary:'茶会误解引起争论',...extra });
const incident = {incident:'观众误解了她的节奏',options:['展示气息训练','解释企划用意','先回应关切']};
const closing = {resolution:'执行方案后澄清误解并收播',imageMatch:'strong',bonusTier:'medium',bonusReason:'具体展示了从容实力',closingSummary:'温柔从容又有实力'};
const parse = (body,index,count=2) => parseNiaLiveSegmentPayload('<NIA_LIVE_SEGMENT>'+JSON.stringify(body)+'</NIA_LIVE_SEGMENT>',{businessId:context.businessId,segmentIndex:index,segmentCount:count});
test('new live needs only two replies, one producer intervention and one settlement',()=>{
 let r=live.createLiveRuntime({businessId:context.businessId,baseFans:2000});
 assert.equal(r.schemaVersion,2);assert.equal(r.segmentCount,2);
 assert.equal(live.beginSegmentGeneration(r,2).ok,false);
 r=live.beginSegmentGeneration(r,1).runtime;
 r=live.applySegmentPayload(r,segment(1,incident)).runtime;
 r=live.completeSegmentPlayback(r).runtime;
 assert.equal(r.status,'awaiting_producer_instruction');
 assert.equal(live.beginSegmentGeneration(r,2).reason,'producer_instruction_missing');
 r=live.submitProducerInstruction(r,'先解释再展示训练').runtime;
 assert.equal(live.beginSegmentGeneration(r,3).ok,false);
 r=live.beginSegmentGeneration(r,2).runtime;
 r=live.applySegmentPayload(r,segment(2,closing)).runtime;
 r=live.completeSegmentPlayback(r).runtime;
 assert.equal(r.status,'awaiting_settlement');
 const done=live.settleLiveOnce(r,context.businessId);
 assert.equal(done.result.fans,2500);assert.equal(done.runtime.segments.length,2);
 assert.equal(live.settleLiveOnce(done.runtime,context.businessId).reason,'already_settled');
});
test('new live count and selected instruction survive interrupted closing generation',()=>{
 const raw={schemaVersion:2,segmentCount:2,businessId:context.businessId,status:'generating_2',segmentIndex:1,pendingSegmentIndex:2,producerInstruction:'自定义处理',segments:[segment(1,incident)]};
 const recovered=live.recoverInterruptedLive(JSON.parse(JSON.stringify(raw)));
 assert.equal(recovered.segmentCount,2);assert.equal(recovered.retrySegmentIndex,2);
 assert.equal(recovered.producerInstruction,'自定义处理');
 assert.equal(live.beginSegmentGeneration(recovered,2).runtime.status,'generating_2');
});
test('legacy four-stage save keeps its first pause and final settlement',()=>{
 let r=live.normalizeLiveRuntime({businessId:'legacy',status:'playing_1',segmentIndex:1,segments:[{}]});
 assert.equal(r.segmentCount,4);assert.equal(live.completeSegmentPlayback(r).runtime.status,'awaiting_continue_1');
 r=live.normalizeLiveRuntime({businessId:'legacy',status:'awaiting_settlement',segmentIndex:4,baseFans:2000,segments:[{},{},{},{...closing}]});
 assert.equal(live.settleLiveOnce(r,'legacy').result.fans,2500);
});
test('first and final contracts belong to the two new phases',()=>{
 assert.equal(parse(segment(1,incident),1).ok,true);
 assert.equal(parse(segment(1),1).reason,'invalid_incident_contract');
 assert.equal(parse(segment(2,closing),2).ok,true);
 assert.equal(parse(segment(2),2).reason,'invalid_closing_contract');
 assert.equal(parse(segment(3,incident),3).ok,false);
});
for (const businessLevel of [2,3]) test('Lv'+businessLevel+' combines planned content and incident before the final reply',()=>{
 const first=buildNiaLiveSegmentPrompt({...context,businessLevel},{segmentCount:2,pendingSegmentIndex:1});
 assert.match(first,/开场.*推进.*转折.*问题/);assert.match(first,/恰好三个/);
 const second=buildNiaLiveSegmentPrompt({...context,businessLevel},{segmentCount:2,pendingSegmentIndex:2,producerInstruction:'执行所选方案'});assert.match(second,/本场最后一次生成/);
});

test('expanded replies preserve 32 bilingual beats and their comment trigger ids',()=>{
 const beats=Array.from({length:32},(_,i)=>({id:'b'+i,speaker:context.idol,text:'<beat id="b'+i+'" speaker="hmsz" shot="close"><display lang="zh">中文台词</display><tts lang="ja">こんにちは。</tts></beat>'}));
 const comments=beats.map(b=>({id:'c'+b.id,text:'好从容！',tone:'positive',triggerAfterBeatId:b.id}));
 const parsed=parse(segment(1,{...incident,beats,comments}),1);
 assert.equal(parsed.ok,true);assert.equal(parsed.data.beats.length,32);assert.equal(parsed.data.comments.length,32);
 assert.equal(parsed.data.comments.at(-1).triggerAfterBeatId,'b31');
});
test('two prompts combine progression before intervention and finish after it with longer length budgets',()=>{
 const first=buildNiaLiveSegmentPrompt(context,{segmentCount:2,pendingSegmentIndex:1});
 assert.match(first,/1200[～~—–-]1800/);assert.match(first,/20[～~—–-]32/);
 assert.match(first,/开场.*转折.*问题/);assert.match(first,/恰好三个/);
 assert.match(first,/固定近景/);assert.doesNotMatch(first,/OTHER_DAY_SECRET|UNRELATED_WORK_DUMP|OLD_REVIEW_DUMP/);
 assert.ok(first.includes('温柔从容'));assert.ok(first.includes('不泄露隐私'));assert.ok(first.includes('气息训练成果'));
 const last=buildNiaLiveSegmentPrompt(context,{segmentCount:2,pendingSegmentIndex:2,segments:[segment(1,incident)],continuity:['已经出现弹幕误解'],producerInstruction:'先解释再展示训练'});
 assert.match(last,/800[～~—–-]1200/);assert.match(last,/14[～~—–-]24/);
 assert.ok(last.includes(incident.incident));assert.ok(last.includes('先解释再展示训练'));assert.ok(last.includes('已经出现弹幕误解'));
 assert.match(last,/收播/);assert.doesNotMatch(last,/UNRELATED_WORK_DUMP/);
});
const bridge=await readFile(new URL('../st.html',import.meta.url),'utf8');
const start=bridge.indexOf('    async function runTransactionalViaTavernHelper(');
const end=bridge.indexOf('    async function runTransactionalPrompt(',start);
function transactionHarness(){
 const chat=[],posts=[];let calls=0;
 const sandbox={getContext:()=>({chat}),createSilentChatMessage:async(role,mes,id)=>{chat.push({is_user:role==='user',mes,id});return chat.length-1;},persistChatSilently:async()=>{},rollbackSilentUserMessage:(i)=>chat.splice(i,1),postCommittedReply:(...x)=>posts.push(x),extractReplyTextFromGenerated:x=>typeof x==='string'?x:'',isGeneratedTextCompatibleWithPrompt:()=>true,setTimeout:()=>0,isGenerationEndedPayloadForRequest:()=>true,normalizeGenerationEndedText:()=>'',console};
 vm.runInNewContext(bridge.slice(start,end)+'\nglobalThis.run=runTransactionalViaTavernHelper;',sandbox);
 return {run:sandbox.run,chat,posts};
}
test('live helper reads the saved user floor once without injecting another full user input',async()=>{
 const h=transactionHarness(),prompt='[HATSU_OUTPUT_MODE:NIA_ONLINE_LIVE]\n当前直播完整契约';let config;
 await h.run({generate:async value=>{config=value;assert.equal(h.chat[0].mes,prompt);return '<NIA_LIVE_SEGMENT>{}</NIA_LIVE_SEGMENT>';}},prompt,'req-live','lease');
 assert.ok(!config.user_input);assert.equal(config.generation_id,'req-live');
 assert.equal(h.chat.length,2);assert.equal(h.posts.length,1);
});
test('other helper modes retain user_input and failed live input is rolled back',async()=>{
 const normal=transactionHarness();let config;
 await normal.run({generate:async value=>{config=value;return '正文';}},'普通事件','req-normal','lease');
 assert.equal(config.user_input,'普通事件');
 const failed=transactionHarness();
 await assert.rejects(failed.run({generate:async()=>{throw new Error('模拟失败');}},'[HATSU_OUTPUT_MODE:NIA_ONLINE_LIVE]','req-failed','lease'),/模拟失败/);
 assert.equal(failed.chat.length,0);assert.equal(failed.posts.length,1);
});
