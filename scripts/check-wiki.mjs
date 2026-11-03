import fs from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {inspectArchitecture,readSources} from './architecture-wiki.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
async function check(directory){
  for(const entry of await fs.readdir(directory,{withFileTypes:true})){
    const file=path.join(directory,entry.name);
    if(entry.isDirectory())await check(file);
    else if(file.endsWith('.js')){
      const result=spawnSync(process.execPath,['--check',file],{encoding:'utf8',windowsHide:true});
      if(result.status!==0)throw new Error(result.stderr);
      const source=await fs.readFile(file,'utf8');
      for(const [,dependency] of source.matchAll(/from\s+['"](\.[^'"]+)['"]/g))await fs.access(path.resolve(path.dirname(file),dependency));
    }
  }
}
await check(path.join(root,'src'));
const graph=inspectArchitecture(await readSources(path.join(root,'src')));
const html=await fs.readFile(path.join(root,'index.html'),'utf8');
if(/<style\b|<script(?![^>]*\bsrc=)[^>]*>/i.test(html))throw new Error('Keep root app scripts/styles in modules.');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
if(new Set(ids).size!==ids.length)throw new Error('Duplicate root HTML id.');
for(const [,asset]of html.matchAll(/(?:href|src)="((?:src|styles)\/[^"?#]+)"/g))await fs.access(path.join(root,asset));
console.log(`PASS: ${graph.size} modules; syntax, imports, layer boundaries, no cycles and HTML assets.`);
