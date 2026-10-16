import http from 'node:http';import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../dist/',import.meta.url));
const config=JSON.parse(await fs.readFile(new URL('../vercel.json',import.meta.url)));
const types={'.html':'text/html; charset=utf-8','.js':'application/javascript','.mjs':'application/javascript','.json':'application/json','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2'};
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');const name=decodeURIComponent(url.pathname);
  res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
  let file=path.resolve(root,'.'+name);
  if(!file.startsWith(path.resolve(root)+path.sep)&&file!==path.resolve(root)){res.writeHead(403);res.end();return;}
  try{if((await fs.stat(file)).isDirectory())file=path.join(file,'index.html');const bytes=await fs.readFile(file);res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.setHeader('Content-Length',bytes.length);res.writeHead(200);res.end(req.method==='HEAD'?undefined:bytes);return;}catch(e){if(!['ENOENT','ENOTDIR'].includes(e.code))throw e;}
  for(const route of config.routes){
   if(!route.dest)continue;const match=name.match(new RegExp('^'+route.src+'$'));if(!match)continue;
   const target=route.dest.replace(/\$(\d+)/g,(_,n)=>match[Number(n)]||'')+url.search;
   const upstream=await fetch(target,{method:req.method,signal:AbortSignal.timeout(20000)});
   res.writeHead(upstream.status,{'Content-Type':upstream.headers.get('content-type')||'application/octet-stream'});
   res.end(req.method==='HEAD'?undefined:Buffer.from(await upstream.arrayBuffer()));return;
  }
  res.writeHead(404,{'Content-Type':'text/plain'});res.end('Not found');
 }catch(e){res.writeHead(502,{'Content-Type':'text/plain'});res.end(String(e.message));}
});
server.listen(Number(process.env.PORT||8767),'127.0.0.1',()=>console.log(`Preview http://127.0.0.1:${server.address().port}`));
