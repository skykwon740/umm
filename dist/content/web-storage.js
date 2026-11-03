import {normalizeRecords,safeURL} from './history.js';
const KEY='outside-web-world-v1';
export function loadWebState() {
  try {
    const value=JSON.parse(localStorage.getItem(KEY)||'{}');
    return {
      records:normalizeRecords(value.records||[]),
      added:Array.isArray(value.added)?value.added.filter(site=>safeURL(site.url)):[],
      saved:Array.isArray(value.saved)?value.saved.filter(site=>safeURL(site.url)):[],
      visited:Array.isArray(value.visited)?value.visited:[],
      seeded:Boolean(value.seeded),
    };
  } catch {return {records:[],added:[],saved:[],visited:[],seeded:false};}
}
export function saveWebState(value) {
  try {localStorage.setItem(KEY,JSON.stringify(value));return true;}catch{return false;}
}
