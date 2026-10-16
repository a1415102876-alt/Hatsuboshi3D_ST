import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import path from 'node:path';import vm from 'node:vm';
import {adaptFrontend,publicOrigin,root} from '../tools/build.mjs';

test('ST embed resolves stage libraries against the remote frontend origin',()=>{
 const adapted=adaptFrontend(`const map={three:'/mmd-dialogue-stage/vendor/three/build/three.module.js'}; globalThis.result=map.three;`,'st.html','https://preview.example');
 const context={URL,window:{HATSU_ASSET_BASE:'https://preview.example/hatsu-produce-local/'},document:{baseURI:'http://localhost:8000/'}};
 vm.runInNewContext(adapted,context);assert.equal(context.result,'https://preview.example/mmd-dialogue-stage/vendor/three/build/three.module.js');
});
test('ST embed keeps the per-page loading and Beat module on the asset host',()=>{
 const source=`const loading='/mmd-dialogue-stage/loading-background.js';const audition=new URL('./nia-audition-player.js', document.baseURI || window.location.href).href;const player=new URL('../mmd-dialogue-stage/beat-player.js', document.baseURI || window.location.href).href;globalThis.result={loading,player};`;
 const context={URL,window:{HATSU_ASSET_BASE:'https://preview.example/hatsu-produce-local/'},document:{baseURI:'http://localhost:8000/'}};
 vm.runInNewContext(adaptFrontend(source,'app.js'),context);assert.deepEqual(JSON.parse(JSON.stringify(context.result)),{loading:'https://preview.example/mmd-dialogue-stage/loading-background.js',player:'https://preview.example/mmd-dialogue-stage/beat-player.js'});
});
test('Vercel preview and explicit custom origins produce absolute embed bases',()=>{
 assert.equal(publicOrigin({VERCEL_URL:'preview.example'}),'https://preview.example');
 assert.equal(publicOrigin({VERCEL_URL:'preview.example',HATSU_PUBLIC_ORIGIN:'https://custom.example/'}),'https://custom.example');
 assert.throws(()=>publicOrigin({HATSU_PUBLIC_ORIGIN:'https://key:secret@example.com/'}));
 const out=adaptFrontend('<div data-asset-base=""></div>/* HATSU_WORKER_INJECT_ASSET_BASE */','st.html','https://preview.example');
 assert.match(out,/data-asset-base="https:\/\/preview.example\/hatsu-produce-local\/"/);
 assert.match(out,/window.HATSU_ASSET_BASE = window.HATSU_ASSET_BASE \|\| "https:\/\/preview.example\/hatsu-produce-local\/"/);
});
test('cloud resource routes keep the two buckets and preserve a real 404 for missing code',async()=>{
 const config=JSON.parse(await fs.readFile(path.join(root,'vercel.json')));
 assert.equal(config.outputDirectory,'dist');assert.equal(config.routes[1].handle,'filesystem');
 function target(url){for(const r of config.routes){if(!r.dest)continue;const m=url.match(new RegExp('^'+r.src+'$'));if(m)return r.dest.replace(/\$(\d+)/g,(_,n)=>m[Number(n)]||'');}return null;}
 assert.equal(target('/hatsu-produce-local/assets/MAP/Gakuen.png'),'https://pub-cfdeb8f85de84d8193695eca002e7880.r2.dev/assets/MAP/Gakuen.png');
 assert.equal(target('/mmd-dialogue-stage/library/file/scenes/gakumas/example/scene.glb'),'https://pub-2e2f5c45d3714278ab051f56652e15a6.r2.dev/scenes/example/scene.glb');
 assert.equal(target('/mmd-dialogue-stage/npc-portraits/yuu/neutral.png'),'https://pub-2e2f5c45d3714278ab051f56652e15a6.r2.dev/npc-portraits/yuu/neutral.png');
 assert.equal(target('/mmd-dialogue-stage/missing.js'),null);
});
test('embedded CSS resolves Stage imports and dialogue frames on the asset host',async()=>{
 const st=await fs.readFile(path.join(root,'dist/st.html'),'utf8');
 const body=st.match(/function rewriteAssetsInCss\(text\) \{([\s\S]*?)\n  \}/)?.[1];assert.ok(body);
 const context={normalizeAssetPath:()=>'',shouldRewriteUrl:p=>!p.startsWith('#')&&!p.startsWith('data:'),rewriteAssetRef:p=>new URL(p,'https://preview.example/hatsu-produce-local/').href};
 vm.runInNewContext(`function rewriteAssetsInCss(text){${body}};globalThis.css=rewriteAssetsInCss('@import url("../mmd-dialogue-stage/loading-background.css");x{background:url("/mmd-dialogue-stage/ui/name-bg.png");filter:url(#id)}');`,context);
 assert.ok(context.css.includes('https://preview.example/mmd-dialogue-stage/loading-background.css'));assert.ok(context.css.includes('https://preview.example/mmd-dialogue-stage/ui/name-bg.png'));assert.ok(context.css.includes('url(#id)'));
});
test('publish tree includes player, Three.js, resource indexes and pre-download Loading art',async()=>{
 const required=['hatsu-produce-local/st.html','hatsu-produce-local/index.html','hatsu-produce-local/app.js','hatsu-produce-local/world/cast-track.js','mmd-dialogue-stage/index.html','mmd-dialogue-stage/beat-player.js','mmd-dialogue-stage/vendor/three/build/three.module.js','mmd-dialogue-stage/library.json','mmd-dialogue-stage/gakumas-motion-map.json','mmd-dialogue-stage/resource-manifest.json','mmd-dialogue-stage/assets/loading-background/img_pattern_artdeco.png','mmd-dialogue-stage/ui/loading-sd/img_sd_hmsz_cmmn-01.png'];
 for(const file of required)assert.ok((await fs.stat(path.join(root,'dist',file))).size>0,file);
 const config=JSON.parse(await fs.readFile(path.join(root,'dist/mmd-dialogue-stage/library.json')));assert.equal(config.source,'r2');assert.equal(config.r2.baseUrl,'https://pub-2e2f5c45d3714278ab051f56652e15a6.r2.dev');
 const main=await fs.readFile(path.join(root,'dist/index.html'),'utf8');assert.match(main,/hatsu-produce-local\/st.html/);
 const st=await fs.readFile(path.join(root,'dist/st.html'),'utf8');for(const m of st.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)){new vm.Script(m[1]);}
 const app=await fs.readFile(path.join(root,'dist/hatsu-produce-local/app.js'),'utf8');
 assert.equal(/new URL\("\.\.\/mmd-dialogue-stage\/beat-player\.js[^\n]+, document\.baseURI \|\| window\.location\.href\)/.test(app),false,'Actual Beat launcher must use the remote asset base');
});
