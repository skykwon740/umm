import fs from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
async function check(directory) {
  for(const entry of await fs.readdir(directory,{withFileTypes:true})) {
    const file=path.join(directory,entry.name);
    if(entry.isDirectory()) await check(file);
    else if(file.endsWith('.js')) {
      const result=spawnSync(process.execPath,['--check',file],{encoding:'utf8',windowsHide:true});
      if(result.status!==0) throw new Error(result.stderr);
      const source=await fs.readFile(file,'utf8');
      for(const [,dependency] of source.matchAll(/from\s+['"](\.[^'"]+)['"]/g)) await fs.access(path.resolve(path.dirname(file),dependency));
    }
  }
}
await check(path.join(root,'dist'));
const html=await fs.readFile(path.join(root,'dist/index.html'),'utf8');
if(/<script(?![^>]*\bsrc=)[^>]*>/i.test(html)) throw new Error('Application scripts must live in modules.');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
if(new Set(ids).size!==ids.length) throw new Error('Duplicate HTML id.');
console.log('All JavaScript modules, local imports and HTML structure passed.');
