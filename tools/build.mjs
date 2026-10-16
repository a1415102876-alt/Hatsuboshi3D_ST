import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const root=fileURLToPath(new URL('../',import.meta.url));
export function publicOrigin(env=process.env){
 const deploymentHost=env.VERCEL_ENV==='production'&&env.VERCEL_PROJECT_PRODUCTION_URL
  ?env.VERCEL_PROJECT_PRODUCTION_URL:env.VERCEL_URL;
 const raw=env.HATSU_PUBLIC_ORIGIN||(deploymentHost?'https://'+deploymentHost:'');
 if(!raw)return '';
 const url=new URL(raw);if(!['https:','http:'].includes(url.protocol)||url.username||url.password)throw new Error('Invalid public origin');
 return url.origin;
}
export function adaptFrontend(text,filename,origin='',localMedia=[]){
 if(filename==='st.html'){
  // Synced legacy loaders must also preserve the public base chosen by the host.
  text=text.replace(/if \(fromAttr\)(?:\s*\{\s*window\.HATSU_ASSET_BASE = fromAttr;\s*\}|\s+window\.HATSU_ASSET_BASE = fromAttr;)/,
   'if (fromAttr && !String(window.HATSU_ASSET_BASE || "").trim()) {\n      window.HATSU_ASSET_BASE = fromAttr;\n    }');
  const base=origin?JSON.stringify(origin+'/hatsu-produce-local/'):"new URL('/hatsu-produce-local/', window.location.href).href";
  text=text.replace('/* HATSU_WORKER_INJECT_ASSET_BASE */',`window.HATSU_ASSET_BASE = window.HATSU_ASSET_BASE || ${base};`);
  if(origin)text=text.replace('data-asset-base=""',`data-asset-base="${origin}/hatsu-produce-local/"`);
  text=text.replace('if (!normalizeAssetPath(path)) return match;', 'if (!shouldRewriteUrl(path)) return match;');
  if(localMedia.length){
   const list=JSON.stringify(localMedia).replace(/</g,'\\u003c');
   text=text.replace('return R2_MEDIA_CDN + "/" + clean',`if (${list}.includes(clean)) return new URL(clean, BASE).href;\n    return R2_MEDIA_CDN + "/" + clean`);
   text=text.replace('const target = isConcatenatedPrefix || hasTemplateExpression',`const target = ${list}.includes(normalized) ? new URL(normalized, BASE).href : isConcatenatedPrefix || hasTemplateExpression`);
  }
 }
 if(filename==='st.html'||filename==='app.js'){
  text=text.replace(/(["'])\/mmd-dialogue-stage\/([^"'\n]*)\1/g,(_,quote,tail)=>`new URL(${JSON.stringify('../mmd-dialogue-stage/'+tail)}, window.HATSU_ASSET_BASE || new URL('./', document.baseURI)).href`);
  text=text.replaceAll('document.baseURI || window.location.href).href;', 'window.HATSU_ASSET_BASE || document.baseURI || window.location.href).href;');
 }
 return text;
}
export async function build(){
 const dist=path.join(root,'dist');
 if(path.resolve(dist)!==path.resolve(root,'dist'))throw new Error('Invalid output directory');
 await fs.rm(dist,{recursive:true,force:true});await fs.mkdir(dist,{recursive:true});
 const origin=publicOrigin();
 const snapshot=JSON.parse(await fs.readFile(path.join(root,'docs/source-snapshot.json')));
 const localMedia=[...snapshot.mediaMissing,...snapshot.mediaUnverified].map(item=>item.path);
 for(const dir of ['hatsu-produce-local','mmd-dialogue-stage'])await fs.cp(path.join(root,dir),path.join(dist,dir),{recursive:true});
 for(const name of ['st.html','app.js']){
  const file=path.join(dist,'hatsu-produce-local',name);
  await fs.writeFile(file,adaptFrontend(await fs.readFile(file,'utf8'),name,origin,localMedia));
 }
 await fs.copyFile(path.join(dist,'hatsu-produce-local/st.html'),path.join(dist,'st.html'));
 const html='<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>初星育成 3D</title><script>location.replace("/hatsu-produce-local/st.html"+location.search+location.hash)</script><a href="/hatsu-produce-local/st.html">进入初星育成</a></html>\n';
 await fs.writeFile(path.join(dist,'index.html'),html);
 console.log(`Built both frontend directories${origin?' for '+origin:''}`);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await build();
