import {parseHistory} from '../content/history.js';
export function setupHistoryImport({dialog,input,fileInput,status,onApply,onClear}) {
  fileInput.addEventListener('change',async()=>{
    const file=fileInput.files[0];if(!file)return;
    try {
      if(file.size>5*1024*1024)throw new Error('5MB 이하 파일을 선택하세요.');
      const records=parseHistory(await file.text());
      if(!records.length)throw new Error('가져올 기록이 없습니다.');
      onApply(records);status.textContent=records.length+'개 기록을 가져왔습니다.';dialog.close();
    } catch(error){status.textContent=error.message;}
    fileInput.value='';
  });
  dialog.querySelector('[data-import-file]').addEventListener('click',()=>fileInput.click());
  dialog.querySelector('[data-import-text]').addEventListener('click',()=>{
    try {
      const records=parseHistory(input.value);
      if(!records.length)throw new Error('URL 또는 검색어를 입력하세요.');
      onApply(records);input.value='';dialog.close();
    }catch(error){status.textContent=error.message;}
  });
  dialog.querySelector('[data-clear-history]').addEventListener('click',()=>{
    onClear();status.textContent='기록을 비웠습니다.';
  });
}
