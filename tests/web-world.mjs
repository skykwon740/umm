import assert from 'node:assert/strict';
import {normalizeRecords,parseHistory,summarizeHistory,safeURL,searchTerm,mergeHistory} from '../dist/content/history.js';
import {buildWebWorld} from '../dist/content/web-world.js';
import {webCatalog} from '../dist/content/web-catalog.js';

const records=normalizeRecords([
  {url:'https://www.google.com/search?q=pixel+art&token=private',title:'pixel art',dateVisited:'2026-11-01'},
  {url:'https://github.com/example/repo',title:'Example repository'},
  {url:'https://github.com/example/another',title:'Another repository'},
  {url:'javascript:alert(1)',title:'Bad'},
  {url:'http://127.0.0.1:4173/',title:'Local preview'},
]);
assert.equal(records.length,3);
assert(!records[0].url.includes('token='));
assert.equal(records[0].query,'pixel art');
assert.equal(searchTerm('https://www.google.com/search?q=rhdiddl','고양이 - Google 검색'),'고양이');
assert.equal(mergeHistory(records,records).length,records.length);
assert.equal(searchTerm('https://search.naver.com/search.naver?query=테라리움'),'테라리움');
assert.equal(safeURL('https://user:password@example.com/'),null);
assert.equal(parseHistory('url,title\r\nhttps://example.com/,"A, B"')[0].title,'A, B');
assert.equal(parseHistory('https://example.com/\n픽셀 아트').length,2);
assert.equal(parseHistory(JSON.stringify({'Browser History':[{url:'https://example.com',time_usec:'1793505600000000'}]})).length,1);
assert.equal(parseHistory(JSON.stringify([{titleUrl:'https://example.com/',title:'Viewed example',time:'2026-11-01T00:00:00Z'}])).length,1);
const profile=summarizeHistory(records);
assert.equal(profile.find(site=>site.domain==='github.com').count,2);
const world=buildWebWorld(records);
const home=world.territories[0];
assert.equal(home.name,'내 영토');
assert.equal(home.items.length,2);
assert(home.items.every(site=>site.personal));
assert.equal(home.profile.reduce((sum,topic)=>sum+topic.count,0),records.length);
assert(world.territories.slice(1).every(t=>t.items.every(site=>!site.personal)));
assert(!world.territories.slice(1).some(t=>t.items.some(site=>site.domain==='github.com')));
assert.equal(new Set(world.sites.map(site=>site.id)).size,world.sites.length,'One site must not become multiple buildings.');
assert(world.sites.length>=60);
assert(buildWebWorld([...records,...records]).territories[0].radiusX>home.radiusX);
assert.equal(buildWebWorld([],[{url:'https://a-new-site.example/',title:'New site',topic:'other'}]).sites.find(site=>site.domain==='a-new-site.example').origin,'added');
assert.equal(new Set(webCatalog.map(site=>site.url)).size,webCatalog.length);
console.log('History formats, unsafe URLs, search extraction, ownership, density and arbitrary-site expansion passed.');
