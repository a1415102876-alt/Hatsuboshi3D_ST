import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { parseExpressionAt } from 'acorn';
import { readFile } from 'node:fs/promises';
import { buildNiaRadioSegmentPrompt, parseNiaRadioSegmentPayload } from '../nia-radio-business-api.js';
import { parseBeatScript } from '../../mmd-dialogue-stage/beat-protocol.js';
await import('../nia-radio-business-core.js');
const radio = globalThis.HatsuNiaRadioBusiness;
const context={businessId:'radio-beat',idol:'秦谷美铃',guest:'秦谷美铃',host:'真诚优',programTitle:'初星放送部',episodeTitle:'从容的步调',goal:'展示从容实力',interviewFocus:'近期气息训练',day:{day:5,title:'当前广播'},plan:{publicImage:'温柔从容',principle:'尊重固有步调',evidence:['气息训练成果'],days:[{title:'OTHER_DAY_DUMP',workSeed:{tasks:[{background:'OLD_WORK_DUMP'}]}}],asariReview:'OLD_REVIEW_DUMP'}};
const body=(index,extra={})=>({businessId:context.businessId,segmentIndex:index,status:index===1?'awaiting_producer':'ended',lines:[{id:'line-'+index,type:'dialogue',speaker:context.guest,text:'欢迎大家。'}],continuitySummary:'访谈中听众提出了疑问。',...extra});
const incident={listenerLetter:'有人质疑慢节奏是否意味着不努力。',problem:'如何解释从容与实力',options:['展示训练成果','坦率解释步调','由优换一个角度']};
const closing={highlight:'从容地展示了训练成果',audienceResponse:'听众理解了她的步调',impressionChange:'温柔从容也有实力',followupHook:'期待下一次正式演出',resultSummary:'节目已完整收播',fanGain:600};
const parse=(data,index)=>parseNiaRadioSegmentPayload('<NIA_RADIO>'+JSON.stringify(data)+'</NIA_RADIO>',{businessId:context.businessId,segmentIndex:index,segmentCount:2});
test('new radio merges opening/interview/letter before one instruction and closes after the second reply',()=>{
 let r=radio.createRadioRuntime({businessId:context.businessId,plan:context});assert.equal(r.segmentCount,2);assert.equal(r.schemaVersion,2);
 r=radio.beginSegmentGeneration(r,1).runtime;r=radio.applySegmentPayload(r,body(1,incident)).runtime;r=radio.completeSegmentPlayback(r).runtime;
 assert.equal(r.status,'awaiting_producer_instruction');assert.equal(radio.beginSegmentGeneration(r,2).reason,'producer_instruction_missing');
 r=radio.submitProducerInstruction(r,'展示气息训练').runtime;assert.equal(radio.beginSegmentGeneration(r,3).ok,false);
 r=radio.beginSegmentGeneration(r,2).runtime;r=radio.applySegmentPayload(r,body(2,closing)).runtime;r=radio.completeSegmentPlayback(r).runtime;
 assert.equal(r.status,'awaiting_settlement');const done=radio.settleRadioOnce(r,context.businessId);assert.equal(done.result.fanGain,600);assert.equal(done.runtime.segments.length,2);assert.equal(radio.settleRadioOnce(done.runtime,context.businessId).reason,'already_settled');
});
test('old four-stage radio save retains the original pauses and settlement',()=>{
 const r=radio.normalizeRadioRuntime({businessId:'old-radio',status:'playing_1',segmentIndex:1,segments:[{}]});assert.equal(r.segmentCount,4);assert.equal(radio.completeSegmentPlayback(r).runtime.status,'awaiting_continue_1');
 const final=radio.normalizeRadioRuntime({businessId:'old-radio',status:'awaiting_settlement',segmentIndex:4,segments:[{},{},{},closing]});assert.equal(radio.settleRadioOnce(final,'old-radio').result.fanGain,600);
});
test('long radio playback cursor and custom instruction survive reload/retry',()=>{
 const playing=radio.normalizeRadioRuntime({schemaVersion:2,segmentCount:2,businessId:context.businessId,status:'playing_1',segmentIndex:1,playbackLineIndex:31});assert.equal(playing.playbackLineIndex,31);
 const recovered=radio.recoverInterruptedRadio({schemaVersion:2,segmentCount:2,businessId:context.businessId,status:'generating_2',segmentIndex:1,pendingSegmentIndex:2,producerInstruction:'自定义方案'});assert.equal(recovered.retrySegmentIndex,2);assert.equal(recovered.producerInstruction,'自定义方案');assert.equal(radio.beginSegmentGeneration(recovered,2).ok,true);
});
test('first and last radio reply contracts follow the authoritative two-phase runtime',()=>{
 assert.equal(parse(body(1,incident),1).ok,true);assert.equal(parse(body(1),1).reason,'invalid_incident_contract');
 assert.equal(parse(body(2,closing),2).ok,true);assert.equal(parse(body(2),2).reason,'invalid_closing_contract');assert.equal(parse(body(2,{...closing,options:['再问一次']}),2).ok,false);
 assert.equal(parse(body(3,incident),3).ok,false);
});
test('32 bilingual radio lines keep the last sentence and authoritative IDs',()=>{
 const lines=Array.from({length:32},(_,i)=>({id:'b'+i,type:'dialogue',speaker:context.guest,text:'<beat id="b'+i+'" speaker="hmsz" cue="talk" shot="medium"><display lang="zh">'+('中文台词。'.repeat(50))+'</display><tts lang="ja">'+('こんにちは。'.repeat(50))+'</tts></beat>'}));
 const parsed=parse(body(1,{...incident,lines}),1);assert.equal(parsed.ok,true);assert.equal(parsed.data.lines.length,32);assert.equal(parsed.data.lines.at(-1).id,'b31');assert.equal(parsed.data.lines.at(-1).text,lines.at(-1).text);
});
test('radio prompt uses current cast Beat examples and compact scene facts with longer length budgets',()=>{
 const first=buildNiaRadioSegmentPrompt(context,{segmentCount:2,pendingSegmentIndex:1});assert.match(first,/1200[～~—–-]1800/);assert.match(first,/20[～~—–-]32/);assert.match(first,/开场.*访谈.*来信/);assert.doesNotMatch(first,/OTHER_DAY_DUMP|OLD_WORK_DUMP|OLD_REVIEW_DUMP/);assert.ok(first.includes('气息训练成果'));
 const shape=JSON.parse(first.match(/<NIA_RADIO>\s*({[\s\S]*?})\s*<\/NIA_RADIO>/)[1]);assert.ok(shape.lines[0].text.includes('<tts lang="ja">'));assert.equal(parseBeatScript(shape.lines[0].text).beats[0].speaker,'真诚优');assert.equal(parseBeatScript(shape.lines[1].text).beats[0].speaker,'hmsz');
 const last=buildNiaRadioSegmentPrompt(context,{segmentCount:2,pendingSegmentIndex:2,segments:[body(1,incident)],producerInstruction:'展示气息训练'});assert.match(last,/800[～~—–-]1200/);assert.ok(last.includes(incident.listenerLetter));assert.ok(last.includes('展示气息训练'));assert.match(last,/完整收播/);
});
test('radio timeline preserves scripted shots, NPC portraits and readable legacy captions',async()=>{
 const {buildNiaRadioBeatTimeline}=await import('../nia-radio-beat-core.js');
 const timeline=buildNiaRadioBeatTimeline({lines:[{id:'host',speaker:'真诚优',text:'<beat id="wrong" speaker="真诚优" face="温和微笑" shot="medium"><display lang="zh">欢迎。</display><tts lang="ja">こんにちは。</tts></beat>'},{id:'guest',type:'dialogue',speaker:'秦谷美铃(高兴)',text:'谢谢大家。'}]},{idol:context.idol});
 const beats=parseBeatScript(timeline.script).beats;assert.equal(beats[0].id,'host');assert.equal(beats[0].portrait.emotion,'温和微笑');assert.ok(timeline.rows[0].script.includes('<tts lang="ja">こんにちは。</tts>'));assert.equal(beats[0].ttsText,undefined);assert.equal(beats[1].cue,'glad');assert.equal(beats[1].shot,'medium');assert.equal(timeline.rows[0].text,'欢迎。');
 assert.throws(()=>buildNiaRadioBeatTimeline({lines:[{id:'b1',text:'<beat speaker="hmsz">你好。</beat><choice><option>A</option></choice>'}]}),/完整 Beat/);
});
test('radio player resumes the current page without restarting, and ends once',async()=>{
 const {NiaRadioBeatPlayer}=await import('../nia-radio-beat-player.js');const visited=[],seen=[];let ended=0;
 const player={elements:{script:{value:''}},preloadPromise:Promise.resolve(true),compile(){},async goTo(i){visited.push(i);return true;},stop(){},dispose(){}};
 const controller=new NiaRadioBeatPlayer({script:player.elements.script},{createPlayer:async()=>player});
 await controller.load({lines:Array.from({length:32},(_,i)=>({id:'b'+i,type:'dialogue',speaker:context.guest,text:'台词'+i}))},{idol:context.idol,startIndex:30,onBeat:(row,index)=>seen.push([row.id,index]),onEnded:()=>ended++});
 assert.deepEqual(visited,[30]);assert.deepEqual(seen,[['b30',30]]);assert.equal(player.fixedPresentation,null);
 await controller.advance();await controller.advance();await controller.advance();assert.equal(ended,1);assert.deepEqual(visited,[30,31]);
});
const bridge=await readFile(new URL('../st.html',import.meta.url),'utf8');
function bridgeFunction(name){const start=bridge.indexOf('function '+name+'(');const node=parseExpressionAt(bridge,start,{ecmaVersion:'latest'});return bridge.slice(start,node.end);}
test('radio outer JSON contract takes precedence over Beat examples and forbidden choice examples',()=>{
 const sandbox={};vm.runInNewContext(bridgeFunction('isGeneratedTextCompatibleWithPrompt')+'\nglobalThis.compatible=isGeneratedTextCompatibleWithPrompt;',sandbox);
 const prompt='[HATSU_OUTPUT_MODE:NIA_SCHOOL_RADIO]\n<beat>演出</beat>禁止<choice>';
 assert.equal(sandbox.compatible(prompt,'<NIA_RADIO>{}</NIA_RADIO>'),true);assert.equal(sandbox.compatible(prompt,'<beat speaker="hmsz">你好。</beat>'),false);
});

test('supported cue and portrait fallbacks do not reject an otherwise playable radio reply',async()=>{
 const line={id:'fallback',type:'dialogue',speaker:'真诚优',text:'<beat speaker="真诚优" face="happy" cue="talk"><display lang="zh">欢迎。</display><tts lang="ja">こんにちは。</tts></beat>'};
 const parsed=parse(body(1,{...incident,lines:[line]}),1);assert.equal(parsed.ok,true);
 const {buildNiaRadioBeatTimeline}=await import('../nia-radio-beat-core.js');assert.equal(buildNiaRadioBeatTimeline(parsed.data).rows.length,1);
});

test('embedded classic loader executes the radio Beat API with its declared imports',async()=>{
 const module=await readFile(new URL('../nia-radio-business-api.js',import.meta.url),'utf8');
 const core=await import('../../mmd-dialogue-stage/beat-player-core.js');const protocol=await import('../../mmd-dialogue-stage/beat-protocol.js');
 const sandbox={HatsuBeatPlayerCore:core,HatsuBeatProtocol:protocol};
 vm.runInNewContext(bridgeFunction('convertNiaBusinessModuleToClassic')+'\nglobalThis.convert=convertNiaBusinessModuleToClassic;',sandbox);
 vm.runInNewContext(sandbox.convert(module),sandbox);
 const prompt=sandbox.HatsuNiaRadioApi.buildNiaRadioSegmentPrompt(context,{segmentCount:2,pendingSegmentIndex:1});
 const shape=JSON.parse(prompt.match(/<NIA_RADIO>\s*({[\s\S]*?})\s*<\/NIA_RADIO>/)[1]);assert.match(shape.lines[0].text,/<tts lang="ja">/);assert.equal(sandbox.HatsuNiaRadioApi.parseNiaRadioSegmentPayload('<NIA_RADIO>'+JSON.stringify(body(1,incident))+'</NIA_RADIO>',{businessId:context.businessId,segmentIndex:1,segmentCount:2}).ok,true);
});
test('radio helper uses the saved current floor instead of injecting another full user input',async()=>{
 const start=bridge.indexOf('    async function runTransactionalViaTavernHelper('),end=bridge.indexOf('    async function runTransactionalPrompt(',start);const chat=[];let config;
 const sandbox={getContext:()=>({chat}),createSilentChatMessage:async(role,mes)=>{chat.push({role,mes});return chat.length-1;},persistChatSilently:async()=>{},postCommittedReply(){},extractReplyTextFromGenerated:x=>typeof x==='string'?x:'',isGeneratedTextCompatibleWithPrompt:()=>true,setTimeout:()=>0};
 vm.runInNewContext(bridge.slice(start,end)+'\nglobalThis.run=runTransactionalViaTavernHelper;',sandbox);
 const prompt='[HATSU_OUTPUT_MODE:NIA_SCHOOL_RADIO]\n本场广播契约';
 await sandbox.run({generate:async value=>{config=value;assert.equal(chat[0].mes,prompt);return '<NIA_RADIO>{}</NIA_RADIO>';}},prompt,'radio-request','radio-lease');
 assert.ok(!config.user_input);assert.equal(chat.length,2);assert.equal(config.generation_id,'radio-request');
});

test('host opening establishes the guest without adding a spoken page or history row',async()=>{
 const {NiaRadioBeatPlayer}=await import('../nia-radio-beat-player.js');let row;
 const player={elements:{script:{value:''}},compiled:{slides:[{type:'dialogue',speaker:'真诚优',text:'欢迎。'},{type:'stage',action:'enter',idolId:'hmsz',position:'center'},{type:'dialogue',speaker:'秦谷美铃',text:'谢谢。'}],beatIndexes:[0,2]},preloadPromise:Promise.resolve(true),compile(options){options?.prepareCompiled?.();},async goTo(){return true;},stop(){},dispose(){}};
 const controller=new NiaRadioBeatPlayer({script:player.elements.script},{createPlayer:async()=>player});
 await controller.load({lines:[{id:'host',type:'dialogue',speaker:'真诚优',text:'欢迎。'},{id:'guest',type:'dialogue',speaker:'秦谷美铃',text:'谢谢。'}]},{idol:context.idol,onBeat:r=>row=r});
 assert.equal(player.compiled.slides[0].type,'stage');assert.equal(player.compiled.slides[0].action,'enter');assert.equal(player.compiled.slides[0].idolId,'hmsz');assert.deepEqual(player.compiled.beatIndexes,[1,3]);assert.equal(controller.index,0);assert.equal(row.id,'host');assert.equal(controller.timeline.rows.length,2);
});
