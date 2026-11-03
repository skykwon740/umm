# 위키백과 탐험 개발 가이드

팀 프로젝트의 기준은 원래 루트 `index.html`의 위키백과 탐험이다. 잘못 병합된 PR #3은 PR #5에서 제거됐다. 이 탐험은 해당 확장 앱이나 루트 패키지 설정에 의존하지 않는다.

## 실행과 확인

Node.js 22 이상. 패키지 설치나 빌드는 필요 없다.

```sh
node scripts/serve-wiki.mjs
```

<http://127.0.0.1:8765/>에서 관심사를 입력하고 출발한다. 경로 생성 후 건물에서 **위키백과** 또는 **구글 이미지**를 선택한다. 두 링크 모두 도착한 단어를 사용하며 새 탭을 연다. 구글 이미지는 외부 이미지 검색 결과 페이지를 여는 방식이고 앱 내부 결과 수집이나 임베드는 하지 않는다. 어느 쪽을 열어도 기존과 같이 방문 깃발을 표시한다.

```sh
node scripts/check-wiki.mjs
node tests/wiki-explorer.mjs
node tests/wiki-boundaries.mjs
```

루트가 ES 모듈을 사용하므로 `index.html` 더블클릭 대신 HTTP 서버로 실행한다. `src/package.json`은 Node 검사에서 이 폴더를 ES 모듈로 읽게 하는 선언이며, 루트 `package.json`이나 외부 패키지에 의존하지 않는다. GitHub Pages처럼 정적 HTTP 호스팅도 가능하지만 이번 작업에는 배포가 포함되지 않는다.

## 수정할 파일 찾기

| 수정 내용 | 파일 | 경계 |
| --- | --- | --- |
| 앱 시작·프레임 루프·모듈 연결 | `src/app.js` | 공통 연결부. 여러 PR에서 동시에 수정하지 않기 |
| 관심사 검색·연결 문서 선택 | `src/content/wikipedia.js` | 검색·요약·두 단계 연결. 화면이나 좌표를 알지 않음 |
| 위키/구글 이미지 목적지 URL | `src/content/result-links.js` | 도착한 단어 → 외부 URL만 담당 |
| 경로 생성·순차 공개·재출발 | `src/journey.js` | 상태 액션·위키 연결만 사용. UI·카메라는 콜백으로 요청 |
| 상태 변경·기존 저장 형식 | `src/core/state.js` | 변경 함수의 단일 소유자. 외부에서는 중첩 배열·노드까지 읽기 전용 |
| 구면 좌표·타일 계산 | `src/core/grid.js` | DOM에 의존하지 않는 수학 함수 |
| 픽셀 지구·건물·캐릭터 그리기 | `src/world/renderer.js`, `styles/world.css` | 화면 투영과 픽셀 표현 |
| 카메라 회전·확대·추적 | `src/world/camera.js` | 읽기 전용 카메라 값과 전용 변경 함수 |
| 걷기·클릭 경로 계산 | `src/world/navigation.js` | 이동 규칙, 도착 콜백 |
| 키보드·드래그·휠 | `src/world/input.js` | 입력을 이동/카메라 명령으로 변환 |
| 루트 목록·발견율·힌트·상태 메시지 | `src/ui/panel.js`, `styles/panel.css` | 패널 표현 |
| 두 결과 버튼·도착 단어 라벨·방문 깃발 | `src/ui/results.js`, `styles/results.css` | 외부 열기와 재출발 연결 |
| 공통 색·글꼴·기본 컨트롤 | `styles/base.css` | 공통 스타일. 화면 전용 규칙을 넣지 않기 |
| 문서 뼈대·모듈 진입점 | `index.html` | 공통 HTML. 기능 구현 코드를 다시 넣지 않기 |

순서에 의존하는 전역 스크립트 대신 `import`/`export`를 사용한다. `app.js`가 실제 UI·카메라·탐험의 연결을 담당한다. `journey.js`는 UI나 렌더러를 import하지 않으며, DOM 없는 Node 테스트에서도 실행된다. 이동 입력의 기본 링크 열기도 `app.js`가 콜백으로 연결한다.

## 상태 변경 규칙

`state`는 새 상태를 가리키는 읽기 전용 스냅샷이다. 배열 원소·배열 메서드·중첩 노드·캐릭터 좌표까지 동결되므로 `state.here = ...`, `state.route.push(...)`, `state.nodes[0].d = ...`는 ES 모듈에서 오류가 난다. 변경 후에도 이전 스냅샷 값은 유지된다. 렌더링은 읽기 전용 배열을 직접 인덱싱하며, 매 픽셀 Proxy를 거치지 않는다.

| 작업 | 사용할 함수 |
| --- | --- |
| 탐험 시작·단어 추가·경로 공개·완료 | `beginJourney`, `addJourneyNode`, `revealRoute`, `completeJourney` |
| 이동 예약·다음 이동·위치 변경 | `queueWalk`, `nextWalkStep`, `stepTo`, `jumpTo` |
| 방문 깃발·설명 보충 | `visitCurrent`, `updateNodeDescription` |
| 캐릭터 보간·화면 갱신 | `tickAnimation`, `requestRedraw`, `consumeRedraw` |
| 카메라 목표·회전·확대 | `focusCamera`, `rotateCamera`, `zoomCamera` (`world/camera.js`) |

새 상태 변경이 필요하면 담당자가 `state.js`에 의미가 분명한 함수를 추가한다. 임의 필드를 쓰는 공통 setter는 제공하지 않는다. 공유 상태 계약을 수정하는 PR은 조율이 필요하다.

## 의존 관계 검사

`node scripts/check-wiki.mjs`는 구문·HTML 검사와 함께 `scripts/architecture-wiki.mjs`의 아래 경계를 검사한다.

- `core` → `core`
- `content` → `core`, `content`
- `journey.js` → `core`, `content`
- `world` → `core`, `world`
- `ui` → `core`, `content`, `world`, `ui`
- `app.js` → 각 모듈을 연결

순환 참조와 경계를 넘는 import, 도메인 모듈의 직접 DOM 접근은 검사 실패다. 실행 중 상태 수정 방지는 동결된 스냅샷이 담당하며, 테스트는 실제로 금지된 쓰기가 실패하는지도 확인한다.

`createJourney`는 `onStart`, `onChange`, `onFocus`, `onArrive`, `onMessage`, `onFinish`를 받는다. 각 UI 구현은 이 콜백을 `app.js`에서 연결한다. 경로 테스트는 위키 응답과 시간 진행을 주입해 실제 애니메이션 대기 없이 성공·실패·재시도·중복 출발을 검사한다.

## 팀 작업과 PR

- 회의 분담: 이창윤은 리팩토링·위키 페이지·구글 결과, 권나연/이예령/정예원은 마지막 페이지 논의 후 한 명이 구현, 최주현은 발표.
- 이번 공통 파일 분리를 먼저 합친 뒤 각 기능 브랜치를 최신 `main`에서 시작한다. 분리 전 `index.html`을 기준으로 동시에 수정하면 이동된 코드와 충돌할 수 있다.
- 기능 PR에는 위 표의 담당 파일만 포함한다. 다른 담당자의 화면·스타일을 함께 정리하지 않는다. 공유 연결부를 수정해야 하면 먼저 파일과 변경점을 알린다.
- 마지막 페이지는 논의 결과가 확정된 뒤 자체 UI 모듈과 스타일 파일에 구현하고, 필요한 진입점만 `app.js`에 연결한다. 이번 변경은 마지막 페이지의 기능이나 디자인을 결정하지 않는다.
- 자동 검사는 이동·URL·저장 회귀를 확인한다. PR 설명에는 실제 브라우저에서 확인한 사용자 경로도 적는다. 모든 충돌을 없애는 구조는 아니며 같은 파일·같은 계약을 동시에 바꾸면 조율이 필요하다.

## 저장과 브라우저 회귀 확인

`src/core/state.js`는 기존 `webglobe3` 키와 `{c,n,r,t,h,g}` 형식을 유지한다. 모듈 분리 자체가 저장 기록을 초기화하지 않는다. 저장은 같은 브라우저·같은 origin 단위이며, 포트를 바꾸면 별도 저장 공간으로 보인다.

1. 관심사 입력 → 출발 → 두 단계 경로와 한 줄 설명 확인.
2. 방향키/WASD 또는 지구 타일 클릭 → 도착 단어가 결과 버튼 위에 표시되는지 확인.
3. 위키백과/구글 이미지 각각 열기 → 새 탭의 단어와 결과 종류 확인 → 돌아와 깃발 확인.
4. Tab으로 두 링크에 접근하고 Enter로 선택. 캔버스에서 Enter는 기존처럼 위키백과 열기.
5. 새로고침 → 위치·경로·방문 상태 복원 → 이 주소에서 다시 출발 → 새 관심사 출발.
6. 드래그 회전·휠 확대, 좁은 화면의 두 버튼, 문서가 없는 입력과 네트워크 실패 후 재시도 확인.
