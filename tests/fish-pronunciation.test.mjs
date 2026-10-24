import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';
import worker from '../cloudflare/worker.js';

const source=await readFile(new URL('../hatsu-produce-local/fish-tts.js',import.meta.url),'utf8');
const expected=[
 ['藤田ことね','ふじた　ことね','fujitakotone'],
 ['月村手毬','つきむら　てまり','tsukimuratemari'],
 ['花海咲季','はなみ　さき','hanamisaki'],
 ['秦谷美鈴','はたや　みすず','hatayamisuzu'],
 ['花海佑芽','はなみ　うめ','hanamiume'],
 ['有村麻央','ありむら　まお','arimuramao'],
 ['葛城リーリヤ','かつらぎ　りーりや','katsuragiriiriya'],
 ['倉本千奈','くらもと　ちな','kuramotochina'],
 ['紫雲清夏','しうん　すみか','shiuNsumika'],
 ['篠澤広','しのさわ　ひろ','shinosawahiro'],
 ['姫崎莉波','ひめさき　りなみ','himesakirinami'],
 ['十王星南','じゅうおう　せな','juuoosena'],
 ['雨夜燕','あまや　つばめ','amayatsubame'],
 ['shiun sumika','しうん　すみか','shiuNsumika'],
 ['shiun-sumika','しうん　すみか','shiuNsumika'],
 ['arimura mao','ありむら　まお','arimuramao'],
 ['arimura-mao','ありむら　まお','arimuramao'],
 ['amaya tsubame','あまや　つばめ','amayatsubame'],
 ['amaya-tsubame','あまや　つばめ','amayatsubame'],
 ['初星','はつぼし','hatsuboshi'],
 ['毬','まり','mari']
];
function client(fetch){
 const context={console,URL,AbortController,Blob,setTimeout,clearTimeout,fetch};context.globalThis=context;
 vm.runInNewContext(source,context);
 const api=context.HatsuFishTts;api.configure({enabled:true,apiKey:'fixture-key'});api.beginSession('dictionary-test');
 return api;
}

test('the shipped readings produce Japanese phonemes, including long vowels',()=>{
 const api=client();const rules=api.PRONUNCIATION_RULES;
 assert.ok(Array.isArray(rules),'the shipped client must expose the versioned pronunciation rules');
 assert.equal(rules.length,expected.length);assert.ok(Object.isFrozen(rules));
 for(const [key,reading,phonemes]of expected){
  const rule=rules.find(rule=>rule.key===key);assert.ok(rule,key);assert.equal(rule.reading,reading);
  assert.match(rule.value,/^[A-Za-z01]+$/);assert.equal(rule.value.replace(/[01]/g,''),phonemes,key);
  assert.ok(Object.isFrozen(rule));
 }
 assert.ok(api.getConfig().pronunciationVersion);
});

test('full-name matches precede 毬 while unrelated lines send no dictionary',async()=>{
 const requests=[];const api=client(async(_url,init)=>{requests.push(JSON.parse(init.body));return new Response(new Uint8Array([1]),{headers:{'Content-Type':'audio/mpeg'}});});
 const original='[soft]月村手毬さん、毬と初星の話です。';
 await api.prepare({id:'names',speaker:'fktn',text:original});
 const items=requests[0].pronunciation_dictionary?.[0]?.items;
 assert.ok(items,'a matching TTS request must include pronunciation_dictionary');
 assert.deepEqual(items.map(item=>item.key),['月村手毬','初星','毬']);
 assert.equal(requests[0].text,original);assert.equal(items[0].value.replace(/[01]/g,''),'tsukimuratemari');
 assert.ok(items.every(item=>!Object.hasOwn(item,'reading')&&!item.value.includes('<|')));
 const parsed=api.parseLocalizedText('<display lang="zh">月村手毬和初星</display><tts lang="ja">月村手毬と初星</tts>','fktn');
 assert.equal(parsed.display,'月村手毬和初星');assert.equal(parsed.ttsText,'月村手毬と初星');
 await api.prepare({id:'plain',speaker:'fktn',text:'おはようございます。'});
 assert.equal(Object.hasOwn(requests[1],'pronunciation_dictionary'),false);
 api.cancel();
});

test('the shared TTS client dictionary survives the Cloudflare proxy',async()=>{
 const originalFetch=globalThis.fetch;const upstream=[];
 try{
  globalThis.fetch=async(url,init)=>{assert.equal(url,'https://api.fish.audio/v1/tts');upstream.push(JSON.parse(init.body));return new Response(new Uint8Array([1,2]),{headers:{'Content-Type':'audio/mpeg'}});};
  const api=client(async(url,init)=>worker.fetch(new Request(url,init),{}));
  const text=expected.map(row=>row[0]).join('、');
  const audio=await api.prepare({id:'all',speaker:'hmsz',text});assert.ok(audio?.blob);
  const items=upstream[0].pronunciation_dictionary?.[0]?.items;
  assert.equal(items?.length,expected.length,'the proxy must forward all matching rules to Fish');
  assert.equal(upstream[0].text,text);assert.equal(upstream[0].reference_id,api.referenceIdForSpeaker('hmsz'));
  api.cancel();
 }finally{globalThis.fetch=originalFetch;}
});

test('the proxy preserves managed dictionary versions and legacy TTS without a dictionary',async()=>{
 const originalFetch=globalThis.fetch;const upstream=[];
 try{
  globalThis.fetch=async(_url,init)=>{upstream.push(JSON.parse(init.body));return new Response(new Uint8Array([1]),{headers:{'Content-Type':'audio/mpeg'}});};
  const dictionary=[{id:'fixture-dictionary',version:'fixture-version'}];
  for(const extra of [{pronunciation_dictionary:dictionary},{}]){
   const response=await worker.fetch(new Request('https://proxy.test/api/fish-tts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:'テスト',...extra})}),{FISH_AUDIO_API_KEY:'fixture-key'});
   assert.equal(response.status,200);assert.equal(response.headers.get('Access-Control-Allow-Origin'),'*');
  }
  assert.deepEqual(upstream[0].pronunciation_dictionary,dictionary);
  assert.equal(Object.hasOwn(upstream[1],'pronunciation_dictionary'),false);
 }finally{globalThis.fetch=originalFetch;}
});
