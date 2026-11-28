// 튜토리얼 1/4에서 입력 뒤 외계인이 놓이지 않았을 때의 무전 대사. DOM 없이 판별만 한다.
// 위키백과에 없는 단어(core/messages.js의 NOT_FOUND_MESSAGE)와 통신 장애를 가른다.
import {NOT_FOUND_MESSAGE} from '../core/messages.js';

export function inputRetryLine(message) {
  return !message||message===NOT_FOUND_MESSAGE
    ?'해당 외계인은 이 행성에 없다. 다른 이름을 입력하라.'
    :'통신 장애 발생. 연결을 확인하고 다시 입력하라.';
}
