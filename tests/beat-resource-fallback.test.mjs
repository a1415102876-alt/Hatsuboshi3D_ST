import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {buildDialogueAssetPlan} from '../mmd-dialogue-stage/dialogue-asset-plan.js';
import {ResourceBarrier} from '../mmd-dialogue-stage/resource-barrier.js';
import {BEAT_PAIRED_CUE_IDS,resolveBeatCueAlias} from '../mmd-dialogue-stage/beat-cues.js';
import {SCENE_IDOLS} from '../mmd-dialogue-stage/scene-protocol.js';
const read=async name=>JSON.parse(await readFile(new URL('../mmd-dialogue-stage/'+name,import.meta.url),'utf8'));
const library={config:await read('library.json'),manifest:await read('resource-manifest.json'),map:await read('gakumas-motion-map.json')};
const cue='花海咲季(__beat-paired__kime)';
const compiled={beats:[{speaker:'hski',cue:'kime'}],slides:[]};
const preload={cast:['hski'],cuesById:{hski:[cue]},costumesById:{}};

test('Saki kime uses a pinned available idle instead of blocking the whole dialogue',()=>{
 const plan=buildDialogueAssetPlan(compiled,preload,library);
 const selected=plan.performances.get('hski').get(cue);
 assert.ok(selected.body&&selected.face);assert.match(selected.body,/idle/);
 assert.ok(['hski','cmmn'].includes(selected.character));
 assert.deepEqual(plan.fallbacks,[{idolId:'hski',speaker:cue,requested:'kime',used:'idle'}]);
 assert.equal(plan.keys.some(key=>/fktn-kime|ssmk-kime/.test(key)),false);
 const retry=buildDialogueAssetPlan(compiled,preload,library);
 assert.equal(retry.performances.get('hski').get(cue).key,selected.key);
});

test('actors with dedicated kime keep their own paired motion and face',()=>{
 for(const [idolId,name]of [['fktn','藤田琴音'],['ssmk','紫云清夏']]){
  const speaker=`${name}(__beat-paired__kime)`;
  const plan=buildDialogueAssetPlan({beats:[],slides:[]},{cast:[idolId],cuesById:{[idolId]:[speaker]},costumesById:{}},library);
  const selected=plan.performances.get(idolId).get(speaker);
  assert.match(selected.body,new RegExp(idolId+'-kime'));assert.ok(selected.face);assert.deepEqual(plan.fallbacks,[]);
 }
});

test('all 13 idols can prepare advertised paired cues without borrowing another idol motion',()=>{
 const names=Object.fromEntries(Object.entries(SCENE_IDOLS).filter(([,id])=>id!=='nasr').map(([name,id])=>[id,name]));
 const cuesById=Object.fromEntries(Object.entries(names).map(([id,name])=>[id,BEAT_PAIRED_CUE_IDS.map(cue=>`${name}(${resolveBeatCueAlias(cue)})`)]));
 const plan=buildDialogueAssetPlan({beats:[],slides:[]},{cast:Object.keys(names),cuesById,costumesById:{}},library);
 assert.equal(plan.cast.length,13);
 for(const id of plan.cast)for(const speaker of cuesById[id]){
  const selected=plan.performances.get(id).get(speaker);assert.ok(selected?.body&&selected.face,`${id}: ${speaker}`);
  assert.ok(['cmmn',id].includes(selected.character),speaker);
 }
});

test('retry after a real download error resumes the original caller with the same fallback',async()=>{
 let attempts=0,resets=0,settled=false;const plans=[];
 const barrier=new ResourceBarrier({prepare:async()=>{
  const plan=buildDialogueAssetPlan(compiled,preload,library);plans.push(plan);
  if(++attempts===1)throw new Error('simulated resource HTTP 503');return plan;
 },beforeRetry:()=>{resets++;}});
 const original=barrier.run().then(plan=>{settled=true;return plan;});
 await new Promise(resolve=>setImmediate(resolve));assert.equal(settled,false);assert.equal(attempts,1);
 barrier.retry();const ready=await original;assert.equal(attempts,2);assert.equal(resets,1);
 assert.equal(ready.performances.get('hski').get(cue).key,plans[0].performances.get('hski').get(cue).key);
});

test('an actually missing model still raises a resource error instead of being hidden by fallback',()=>{
 const assets={...library.manifest.assets};const idol=library.config.idols.find(row=>row.id==='hski');
 delete assets[`${library.config.packs[idol.pack].r2Prefix||idol.pack}/${idol.model}`];
 assert.throws(()=>buildDialogueAssetPlan(compiled,preload,{...library,manifest:{...library.manifest,assets}}),/本段资源不在清单中/);
});
