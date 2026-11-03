export async function apiRequest(path,body) {
  const response=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(60000)});
  const result=await response.json();if(!response.ok)throw new Error(result.error||'검사를 완료하지 못했습니다.');return result;
}
export function openScreened(page,name='outside-expedition') {
  if(page.safety?.status!=='screened')return false;
  const tab=window.open(page.url,name);
  if(tab){try{tab.opener=null;}catch{}return true;}return false;
}
export async function checkedOpen(url,onError) {
  const tab=window.open('about:blank','outside-page');
  if(tab){try{tab.opener=null;tab.document.title='페이지 검사 중';tab.document.body.textContent='공개 주소와 도메인 평판을 검사하고 있습니다.';}catch{}}
  try {
    const result=await apiRequest('/api/check-page',{url});
    if(tab){tab.location.replace(result.url);return result;}
    onError('팝업이 차단되었습니다. 열기를 다시 눌러주세요.');return null;
  }catch(error){try{tab?.close();}catch{}onError(error.message);return null;}
}
