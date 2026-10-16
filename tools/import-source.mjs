import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const source=path.resolve(process.argv[2]||'G:/SillyTavern/SillyTavern/public');
if(source===path.resolve(root))throw new Error('Source must be a separate checkout');
const extensions=new Set(['.js','.mjs','.css','.html','.json','.png','.jpg','.jpeg','.svg','.webp','.gif','.woff','.woff2']);
let files=0,bytes=0;
async function copyFile(from,relative){
 if(!extensions.has(path.extname(from).toLowerCase())||/\.bak(?:\.|-|$)/i.test(from))return;
 const destination=path.join(root,relative);await fs.mkdir(path.dirname(destination),{recursive:true});
 await fs.copyFile(from,destination);files++;bytes+=(await fs.stat(from)).size;
}
async function copyTree(from,relative){
 for(const e of await fs.readdir(from,{withFileTypes:true})){
  if(e.isSymbolicLink()||e.name.startsWith('.'))continue;
  const p=path.join(from,e.name),r=relative+'/'+e.name;
  if(e.isDirectory())await copyTree(p,r);else await copyFile(p,r);
 }
}
for(const dir of ['hatsu-produce-local','mmd-dialogue-stage']){
 const src=path.join(source,dir);
 for(const e of await fs.readdir(src,{withFileTypes:true})){
  if(!e.isFile()||e.name==='worker.js')continue;
  await copyFile(path.join(src,e.name),dir+'/'+e.name);
 }
 const dirs=dir==='hatsu-produce-local'
  ?['appearance','broadcast','chronicle','nia','sandbox','shop','tasks','world','UI']
  :['vendor','ui','assets/loading-background'];
 for(const rel of dirs)await copyTree(path.join(src,rel),dir+'/'+rel);
}

// Existing frontend media use a separate public R2 bucket. Keep only files
// absent from that bucket as same-origin fallbacks, before Vercel's rewrites.
const media=[];
async function collect(p,rel='assets'){
 for(const e of await fs.readdir(p,{withFileTypes:true})){
  if(e.isSymbolicLink()||e.name.startsWith('.'))continue;
  const f=path.join(p,e.name),r=rel+'/'+e.name;
  if(e.isDirectory()){
   if(['videos','videosss','PlayList'].includes(e.name))continue;
   await collect(f,r);
  }else if(extensions.has(path.extname(f).toLowerCase()))media.push({file:f,path:r});
 }
}
await collect(path.join(source,'hatsu-produce-local/assets'));
let next=0;const missing=[],uncertain=[];
await Promise.all(Array.from({length:12},async()=>{
 while(next<media.length){
  const item=media[next++];let status;
  try{const res=await fetch('https://pub-cfdeb8f85de84d8193695eca002e7880.r2.dev/'+item.path.split('/').map(encodeURIComponent).join('/'),{method:'HEAD',signal:AbortSignal.timeout(10000)});status=res.status;}catch{status=0;}
  if(status!==200){
   await copyFile(item.file,'hatsu-produce-local/'+item.path);
   (status===404?missing:uncertain).push({path:item.path,status});
  }
 }
}));
await fs.mkdir(path.join(root,'docs'),{recursive:true});
await fs.writeFile(path.join(root,'docs/source-snapshot.json'),JSON.stringify({generatedAt:new Date().toISOString(),files,bytes,mediaChecked:media.length,mediaMissing:missing,mediaUnverified:uncertain},null,2)+'\n');
console.log(JSON.stringify({files,bytes,mediaChecked:media.length,localMediaFallbacks:missing.length+uncertain.length}));
