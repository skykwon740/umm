import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {buildPersonaWorld,canonicalPage,makePage} from '../dist/content/persona-world.js';
import {remainingTime,EXPLORE_MS,createArchiveEntry,comparisonsFor,evaluationPrompt} from '../dist/content/expeditions.js';
const {personas}=JSON.parse(await fs.readFile(new URL('../dist/data/personas.json',import.meta.url),'utf8'));
assert.equal(personas.length,5);assert.equal(personas.reduce((sum,p)=>sum+p.events.length,0),246);
for(const persona of personas){
  assert(persona.background.length>60&&persona.constraints.length>=3&&persona.habits.length>=3);
  const ids=new Set(persona.events.map(event=>event.id));
  for(const event of persona.events){assert(event.fictional);assert(new URL(event.url));if(event.from)assert(ids.has(event.from),'Missing referrer');assert(event.dwellSeconds>=0);}
  const model=buildPersonaWorld(personas,persona.id);
  assert.equal(model.active.id,persona.id);assert.equal(model.territories[0].personaId,persona.id);
  const expected=new Set(persona.events.filter(event=>event.type==='visit').map(event=>canonicalPage(event.url)));
  assert.equal(model.territories[0].items.length,expected.size,'Each exact page must have its own building.');
  assert.equal(new Set(model.sites.map(page=>page.id)).size,model.sites.length);
}
assert(buildPersonaWorld(personas,'yunseo').sites.some(page=>page.youtubeId),'Individual video pages must be supported.');
assert.equal(canonicalPage('https://www.youtube.com/shorts/dwTGhkArV7Q'),'https://www.youtube.com/watch?v=dwTGhkArV7Q');
assert.notEqual(makePage({url:'https://example.com/a'}).id,makePage({url:'https://example.com/b'}).id);
const sharedModel=buildPersonaWorld(personas,'yunseo');
const osm=sharedModel.pages.get('https://www.openstreetmap.org/about');
assert.equal(osm.owners.length,5,'A shared page must count people, not visits.');
assert.equal(new Set(osm.owners.map(owner=>owner.personaId)).size,5);
const instances=sharedModel.sites.filter(page=>page.url===osm.url);
assert(instances.every(instance=>instance.sharedPage===osm),'Territory traces must reference one shared page.');
assert.equal(new Set(instances.map(instance=>instance.id)).size,5,'Person-specific records must remain independent.');
assert(instances.some(instance=>instance.context!==instances[0].context),'Different purposes must survive consolidation.');
assert.equal(remainingTime({deadline:600000},1000),599000);assert.equal(remainingTime({deadline:1},2),0);assert.equal(EXPLORE_MS,600000);
const active={target:{url:'https://example.com/a',title:'A'},startedAt:1000};
assert.throws(()=>createArchiveEntry(active,{summary:'short'},personas[0]),/구체적/);
const entry=createArchiveEntry(active,{summary:'이 페이지에서 실제로 관찰한 내용을 내 말로 정리한 기록입니다. 짧은 인용과 나의 해석을 구분합니다.'},personas[0],601000);
assert.equal(entry.elapsedSeconds,600);assert.equal(entry.evaluation,null);assert.equal(entry.fictional,false);assert(evaluationPrompt(entry).includes('미확인'));
assert.equal(comparisonsFor(entry,[entry,{id:'other',url:entry.url},{id:'else',url:'https://example.com/b'}]).length,1);
console.log('Five detailed fictional personas, 246 events, individual-page ownership, videos, timer, own summary and comparison passed.');
