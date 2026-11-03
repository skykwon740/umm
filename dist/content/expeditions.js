import {canonicalPage} from './persona-world.js';
export const EXPLORE_MS=10*60*1000;
const KEY='outside-expedition-archive-v1';
export function loadExpeditions(){try{const value=JSON.parse(localStorage.getItem(KEY)||'{}');return {active:value.active||null,entries:Array.isArray(value.entries)?value.entries:[]};}catch{return {active:null,entries:[]};}}
export function saveExpeditions(value){localStorage.setItem(KEY,JSON.stringify(value));}
export function remainingTime(active,now=Date.now()){return active?.deadline?Math.max(0,active.deadline-now):EXPLORE_MS;}
export function createArchiveEntry(active,{summary,evidence,question},persona,now=Date.now()) {
  if(String(summary).trim().length<40)throw new Error('발견한 내용을 자기 말로 조금 더 구체적으로 적어주세요.');
  return {id:crypto.randomUUID(),authorKind:'user',personaId:persona.id,authorName:'나 · '+persona.name+'의 영토에서 출발',
    url:canonicalPage(active.target.url),title:active.target.title,createdAt:new Date(now).toISOString(),
    intention:active.intention||'',startedAt:active.startedAt,elapsedSeconds:Math.max(0,Math.floor((now-(active.startedAt||now))/1000)),
    summary:summary.trim(),evidence:String(evidence||'').trim(),question:String(question||'').trim(),
    discovery:active.target.discovery,safety:active.target.safety,evaluation:null,evaluationStatus:'not-requested',fictional:false};
}
export function evaluationPrompt(entry) {
  return '아래 웹 탐방 기록을 평가해 주세요. 먼저 원문 URL을 확인하고, 확인하지 못한 내용은 미확인으로 표시하세요. 글에 없는 사실을 추측하지 마세요. 문장 다듬기나 모범 답안 작성보다 핵심 이해·관찰 근거·사실과 해석의 구분·새로운 질문을 다뤄 주세요. 사람의 능력이나 성향을 점수화하지 마세요.\n\n'+JSON.stringify({url:entry.url,title:entry.title,intention:entry.intention,elapsedSeconds:entry.elapsedSeconds,summary:entry.summary,evidence:entry.evidence,question:entry.question},null,2)+'\n\n결과는 핵심을 잘 잡은 부분 / 근거가 필요한 부분 / 놓친 맥락 / 다음 질문으로 구분해 주세요.';
}
export function comparisonsFor(entry,entries){return entries.filter(other=>other.id!==entry.id&&canonicalPage(other.url)===canonicalPage(entry.url));}
