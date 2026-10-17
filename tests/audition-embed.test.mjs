import test from 'node:test';
import assert from 'node:assert/strict';
const embed = await import('../mmd-dialogue-stage/audition-embed.js').catch(()=>({}));
function harness(play=async()=>{}){
 const messages=[],frames=[];let listener;const parent={postMessage:data=>messages.push(data)};
 const win={parent,addEventListener(_type,fn){listener=fn;},removeEventListener(){listener=null;}};
 const playback={active:true,playing:true,time:0,duration:6};
 const api=embed.installAuditionEmbed({window:win,parentOrigin:'http://parent.test',play:async(...args)=>{await play(...args);playback.active=true;},start(){playback.playing=true;},stop(){playback.active=false;},readPlayback:()=>playback,requestFrame:fn=>(frames.push(fn),frames.length),cancelFrame(){}});
 return {api,messages,frames,playback,send:data=>listener?.({source:parent,origin:'http://parent.test',data}),wrong:data=>listener?.({source:parent,origin:'http://other.test',data})};
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
test('embedded audition selects the established actor group and matching NIA scene',()=>{
 assert.equal(typeof embed.auditionEmbedCommand,'function');
 for(const [actorId,variant,round,sceneId] of [['hski','a',1,'prod-audition-00-00-noon'],['fktn','b',1,'prod-audition-00-00-noon'],['ttmr','c',2,'prod-audition-02-00-noon'],['hmsz','d',3,'prod-audition-03-00-noon'],['ssmk','a',2,'prod-audition-02-00-noon'],['shro','d',3,'prod-audition-03-00-noon']])assert.deepEqual(embed.auditionEmbedCommand({actorId,round}),{actorId,variant,sceneId});
 assert.throws(()=>embed.auditionEmbedCommand({actorId:'unknown'}));
});
test('embedded animation reports completion only after the real playback reaches its end',async()=>{
 assert.equal(typeof embed.installAuditionEmbed,'function');const h=harness();assert.equal(h.messages[0].type,'hatsu-nia-audition:ready');
 h.send({type:'hatsu-nia-audition:play',requestId:'one',actorId:'hmsz',round:1});await flush();
 assert.equal(h.messages.at(-1).type,'hatsu-nia-audition:started');h.frames.shift()();assert.equal(h.messages.some(m=>m.type.endsWith(':ended')),false);
 h.playback.playing=false;h.playback.time=6;h.frames.shift()();assert.equal(h.messages.at(-1).type,'hatsu-nia-audition:ended');assert.equal(h.messages.at(-1).requestId,'one');h.api.dispose();
});
test('foreign messages and cancelled asynchronous animation loads cannot start or finish a new scene',async()=>{
 assert.equal(typeof embed.installAuditionEmbed,'function');let release;const h=harness(()=>new Promise(resolve=>{release=resolve;}));
 h.wrong({type:'hatsu-nia-audition:play',requestId:'bad',actorId:'hski'});assert.equal(h.messages.length,1);
 h.send({type:'hatsu-nia-audition:play',requestId:'old',actorId:'hski'});await flush();h.send({type:'hatsu-nia-audition:cancel',requestId:'old'});release();await flush();assert.equal(h.messages.length,1);assert.equal(h.frames.length,0);h.api.dispose();
});

test('deferred audition holds the prepared first frame until the parent starts after its reveal',async()=>{
 let release,received;const h=harness((command,options)=>{received=options;h.playback.playing=false;h.playback.time=0;return new Promise(resolve=>{release=resolve;});});
 h.send({type:'hatsu-nia-audition:play',requestId:'deferred',actorId:'hmsz',round:1,deferStart:true});
 h.send({type:'hatsu-nia-audition:start',requestId:'deferred'});await flush();assert.equal(h.messages.length,1);release();await flush();
 assert.equal(received.autoplay,false);assert.equal(h.messages.at(-1).type,'hatsu-nia-audition:prepared');assert.equal(h.playback.playing,false);assert.equal(h.playback.time,0);assert.equal(h.frames.length,0);
 h.wrong({type:'hatsu-nia-audition:start',requestId:'deferred'});h.send({type:'hatsu-nia-audition:start',requestId:'other'});assert.equal(h.playback.playing,false);
 h.send({type:'hatsu-nia-audition:start',requestId:'deferred'});assert.equal(h.messages.at(-1).type,'hatsu-nia-audition:started');assert.equal(h.playback.playing,true);assert.equal(h.frames.length,1);
 h.send({type:'hatsu-nia-audition:start',requestId:'deferred'});assert.equal(h.frames.length,1);
 h.playback.playing=false;h.playback.time=6;h.frames.shift()();assert.equal(h.messages.at(-1).type,'hatsu-nia-audition:ended');h.api.dispose();
});
test('cancelled prepared auditions cannot restart from a delayed reveal message',async()=>{
 const h=harness(()=>{h.playback.playing=false;});h.send({type:'hatsu-nia-audition:play',requestId:'closed',actorId:'hski',deferStart:true});await flush();
 assert.equal(h.messages.at(-1).type,'hatsu-nia-audition:prepared');h.send({type:'hatsu-nia-audition:cancel',requestId:'closed'});h.send({type:'hatsu-nia-audition:start',requestId:'closed'});
 assert.equal(h.frames.length,0);assert.equal(h.playback.active,false);assert.equal(h.messages.some(m=>m.type.endsWith(':started')),false);h.api.dispose();
});

test('explicit parent origin works without a referrer and takes precedence over asset-host referrers', () => {
 assert.equal(typeof embed.auditionParentOrigin, 'function');
 const href='https://stage.test/mmd-dialogue-stage/?embed=nia-audition&parentOrigin='+encodeURIComponent('http://127.0.0.1:8000');
 assert.equal(embed.auditionParentOrigin(href, ''), 'http://127.0.0.1:8000');
 assert.equal(embed.auditionParentOrigin(href, 'https://stage.test/'), 'http://127.0.0.1:8000');
});

test('legacy referrers and standalone audition pages retain their origin fallback', () => {
 assert.equal(typeof embed.auditionParentOrigin, 'function');
 const href='https://stage.test/mmd-dialogue-stage/?embed=nia-audition';
 assert.equal(embed.auditionParentOrigin(href, 'http://parent.test/chat'), 'http://parent.test');
 assert.equal(embed.auditionParentOrigin(href, ''), 'https://stage.test');
});

test('an opaque or non-web parent origin is rejected without allowing wildcard messages', () => {
 assert.equal(typeof embed.auditionParentOrigin, 'function');
 for(const value of ['null','*','javascript:alert(1)','data:text/html,hi'])assert.throws(()=>embed.auditionParentOrigin('https://stage.test/?parentOrigin='+encodeURIComponent(value),''));
});
