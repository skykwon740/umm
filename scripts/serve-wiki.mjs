import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=fileURLToPath(new URL('../',import.meta.url));
const port=Number(process.env.WIKI_PORT||8765);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
http.createServer(async(req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    // This preview serves the root explorer only, never .git or local records.
    if(!['GET','HEAD'].includes(req.method)) {res.writeHead(405);res.end();return;}
    if(pathname!=='/'&&pathname!=='/index.html'&&!/^\/(src|styles)\/[\w./-]+$/.test(pathname))throw new Error('not found');
    const target=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
    const relative=path.relative(root,target);
    if(relative.startsWith('..')||path.isAbsolute(relative))throw new Error('not found');
    const body=await readFile(target);
    res.writeHead(200,{'Content-Type':types[path.extname(target)]||'text/plain','Cache-Control':'no-store'});
    res.end(req.method==='HEAD'?undefined:body);
  }catch{res.writeHead(404);res.end('Not found');}
}).listen(port,'127.0.0.1',()=>console.log(`Wikipedia explorer: http://127.0.0.1:${port}`));
