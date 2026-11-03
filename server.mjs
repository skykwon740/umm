import http from 'node:http';
import {readFile,stat,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {inspectPage,publicURL} from './server/safe-web.mjs';
import {findUnexpectedPage} from './server/wander.mjs';
const root = fileURLToPath(new URL('./dist/',import.meta.url));
const port = Number(process.env.PORT || 4173);
const blockedFile=fileURLToPath(new URL('./.local/blocked-domains.json',import.meta.url));
async function readBlocked(){try{return JSON.parse(await readFile(blockedFile,'utf8'));}catch{return [];}}
async function jsonBody(req){
  if(!String(req.headers['content-type']).startsWith('application/json'))throw new Error('JSON 요청이 필요합니다.');
  let body='';for await(const chunk of req){body+=chunk;if(body.length>65536)throw new Error('요청이 너무 큽니다.');}
  return JSON.parse(body||'{}');
}
function sendJSON(res,status,value){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));}
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png'};
http.createServer(async(req,res)=>{
  try {
    const pathname = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if(['/api/check-page','/api/wander','/api/report'].includes(pathname)) {
      if(req.method!=='POST'){sendJSON(res,405,{error:'POST 요청이 필요합니다.'});return;}
      if(!['http://127.0.0.1:'+port,'http://localhost:'+port].includes(req.headers.origin)||req.headers['sec-fetch-site']==='cross-site'){sendJSON(res,403,{error:'다른 출처의 요청입니다.'});return;}
      try {
        const body=await jsonBody(req);const blockedDomains=await readBlocked();
        if(pathname==='/api/report') {
          const host=publicURL(body.url).hostname;
          if(!blockedDomains.includes(host))blockedDomains.push(host);
          await mkdir(path.dirname(blockedFile),{recursive:true});await writeFile(blockedFile,JSON.stringify(blockedDomains));
          sendJSON(res,200,{blocked:true,domain:host});return;
        }
        const result=pathname==='/api/wander'?await findUnexpectedPage({exclude:Array.isArray(body.exclude)?body.exclude.slice(0,1000):[],blockedDomains}):await inspectPage(body.url,{blockedDomains});
        sendJSON(res,200,result);
      }catch(error){sendJSON(res,422,{error:error.message});}
      return;
    }
    if(!['GET','HEAD'].includes(req.method)) {res.writeHead(405);res.end();return;}
    const target = path.resolve(root,`.${pathname === '/' ? '/index.html' : pathname}`);
    const relative=path.relative(root,target);
    if(relative.startsWith('..')||path.isAbsolute(relative)) {res.writeHead(403);res.end();return;}
    if(!(await stat(target)).isFile()) throw new Error('missing');
    res.writeHead(200,{'Content-Type':types[path.extname(target)] || 'application/octet-stream','Cache-Control':'no-store','Referrer-Policy':'strict-origin-when-cross-origin'});
    res.end(await readFile(target));
  } catch {res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end('페이지를 찾을 수 없습니다.');}
}).listen(port,'127.0.0.1',()=>console.log(`Local: http://127.0.0.1:${port}`));
