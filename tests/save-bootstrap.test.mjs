import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import {adaptFrontend,publicOrigin,root} from '../tools/build.mjs';

test('production embeds use the public project domain instead of a protected deployment URL',()=>{
 const env={VERCEL_ENV:'production',VERCEL_URL:'deployment-private.vercel.app',VERCEL_PROJECT_PRODUCTION_URL:'public-project.vercel.app'};
 assert.equal(publicOrigin(env),'https://public-project.vercel.app');
 assert.equal(publicOrigin({...env,VERCEL_ENV:'preview'}),'https://deployment-private.vercel.app');
 assert.equal(publicOrigin({...env,HATSU_PUBLIC_ORIGIN:'https://custom.example'}),'https://custom.example');
});

for(const shape of ['current','legacy-block','legacy-inline'])test(`a loader-provided public asset base survives the embedded fallback attribute (${shape})`,async()=>{
 const source=await fs.readFile(path.join(root,'hatsu-produce-local/st.html'),'utf8');
 const legacy=shape==='legacy-inline'
  ?source.replace(/if \(fromAttr && !String\(window.HATSU_ASSET_BASE \|\| ""\)\.trim\(\)\) \{\s*window.HATSU_ASSET_BASE = fromAttr;\s*\}/,'if (fromAttr) window.HATSU_ASSET_BASE = fromAttr;')
  :shape==='legacy-block'?source.replace('if (fromAttr && !String(window.HATSU_ASSET_BASE || "").trim()) {','if (fromAttr) {'):source;
 const st=adaptFrontend(legacy,'st.html','https://deployment-private.vercel.app');
 const read=st.match(/function readLoaderAssetBaseAttr\(\) \{[\s\S]*?\n  \}/)?.[0];
 const absorb=st.match(/function absorbLoaderAssetBase\(\) \{[\s\S]*?\n  \}/)?.[0];
 assert.ok(read&&absorb);
 const fallback='https://deployment-private.vercel.app/hatsu-produce-local/';
 const context={window:{HATSU_ASSET_BASE:'https://public-project.vercel.app/hatsu-produce-local/'},document:{getElementById:()=>({getAttribute:()=>fallback})}};
 vm.runInNewContext(read+'\n'+absorb+'\nabsorbLoaderAssetBase();',context);
 assert.equal(context.window.HATSU_ASSET_BASE,'https://public-project.vercel.app/hatsu-produce-local/');
 context.window.HATSU_ASSET_BASE='';vm.runInNewContext('absorbLoaderAssetBase();',context);
 assert.equal(context.window.HATSU_ASSET_BASE,fallback);
});
