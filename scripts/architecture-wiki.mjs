import fs from 'node:fs/promises';
import path from 'node:path';

const layer=file=>file==='app.js'?'app':file==='journey.js'?'journey':file.split('/')[0];
const allowed={core:['core'],content:['core','content'],world:['core','world'],
  ui:['core','content','world','ui'],journey:['core','content'],app:['core','content','world','ui','journey']};

export function inspectArchitecture(sources) {
  const graph=new Map();
  for(const [file,source] of sources) {
    if(/\bimport\s*\(/.test(source))throw new Error(`${file}: use explicit static module boundaries`);
    if(['core','content','journey'].includes(layer(file))&&/\b(?:document|window)\s*\./.test(source))throw new Error(`${file}: domain modules cannot access the DOM`);
    const dependencies=[];
    for(const [,specifier]of source.matchAll(/\b(?:from\s*|import\s*)['"]([^'"]+)['"]/g)) {
      if(!specifier.startsWith('.'))throw new Error(`${file}: unexpected external module ${specifier}`);
      const target=path.posix.normalize(path.posix.join(path.posix.dirname(file),specifier));
      if(!sources.has(target))throw new Error(`${file}: missing module ${target}`);
      if(!allowed[layer(file)]?.includes(layer(target)))throw new Error(`${file}: forbidden dependency on ${target}`);
      dependencies.push(target);
    }
    graph.set(file,dependencies);
  }
  const done=new Set(),active=new Set();
  function visit(file,trail=[]) {
    if(active.has(file))throw new Error(`Circular dependency: ${[...trail,file].join(' -> ')}`);
    if(done.has(file))return;
    active.add(file);for(const next of graph.get(file))visit(next,[...trail,file]);
    active.delete(file);done.add(file);
  }
  for(const file of graph.keys())visit(file);
  return graph;
}
export async function readSources(root) {
  const sources=new Map();
  async function walk(directory) {
    for(const entry of await fs.readdir(directory,{withFileTypes:true})) {
      const file=path.join(directory,entry.name);
      if(entry.isDirectory())await walk(file);
      else if(entry.name.endsWith('.js'))sources.set(path.relative(root,file).split(path.sep).join('/'),await fs.readFile(file,'utf8'));
    }
  }
  await walk(root);return sources;
}
