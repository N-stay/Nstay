# N STAY 안내 페이지 — 상세 명세

> 요약과 작업 규칙은 [../CLAUDE.md](../CLAUDE.md) 에 있다. 이 문서는 참조용 상세 명세다.

## 1. 설계 배경

두 가지 제약에서 출발했다.

1. **서버와 데이터베이스가 없다.** GitHub Pages 로만 운영한다.
2. **실제로 내용을 수정하는 사람이 비개발자다.** GitHub 웹에서 JSON 을 직접 고치게 하면
   오타 하나로 페이지 전체가 깨지고, 본인이 복구할 수 없다.

그래서 **저장소 자체를 데이터베이스로 쓰고, 브라우저에서 GitHub API 로 직접 커밋하는**
관리자 페이지를 붙였다. 별도로 배포·운영할 서버가 하나도 없다.

인증은 fine-grained PAT 붙여넣기 방식이다. "GitHub 으로 로그인" 버튼 방식이 사용자 경험은
더 낫지만 OAuth 중계 서버를 따로 배포해야 해서 제외했다.

## 2. 전체 흐름

```
   게스트                                        운영자(비개발자)
     │                                                │
     ▼                                                ▼
  index.html                                   admin/index.html
     │  fetch(no-cache)                               │  ① 읽기: GET contents
     ▼                                                │  ② 사진 축소(캔버스)
  data/content.json  ◄───── 같은 파일 ─────────────────┤  ③ blob→tree→commit→ref
  images/**                                           │     (변경분 전체가 커밋 1개)
     ▲                                                ▼
     └────────── GitHub Pages 자동 재배포 (1~2분) ─────┘
```

## 3. 데이터 명세 (`data/content.json`)

최상위: `version` `config` `sections` `text` `foods` `places` `ui`

### 3.1 `config` — 언어 무관한 숙소 정보

| 필드 | 타입 | 쓰이는 곳 |
|---|---|---|
| `name` | string | 헤더 제목, 로고 글자(첫 글자), 브라우저 탭 제목 |
| `area` | string | 헤더 상단 작은 글씨 |
| `address` | {ko,en,ja,zh} | 히어로 영역, 배달 안내 주소 박스 |
| `checkIn` / `checkOut` | string | 히어로 영역 |
| `wifiName` / `wifiPassword` | string | `wifi` 섹션 박스 |
| `airbnbUrl` | string | `airbnb` 섹션 버튼. **빈 문자열이면 버튼이 나오지 않는다** |
| `mapUrl` | string | 히어로 길찾기 링크 |
| `baeminUrl` | string | `delivery` 섹션 버튼 |
| `busStops.bosu` / `.bupyeong` | string | `transit` 섹션 버튼 2개 |
| `laundry.address` / `.mapUrl` | string | `laundry` 섹션 주소 + 지도 버튼 |

### 3.2 `sections[]` — 언어 무관한 섹션 뼈대

```json
{ "key": "laundry", "icon": "🧺", "photos": [
    { "src": "images/up/20260908-214500-a1b2c.jpg",
      "caption": { "ko": "...", "en": "...", "ja": "...", "zh": "..." } }
] }
```

- `key` — 특수 블록을 붙이는 기준. **화면 코드와 맺은 계약이므로 이름을 바꾸면 안 된다.**
- `icon` — 이모지. 메뉴 버튼과 섹션 제목에 함께 쓰인다.
- `photos` — **개수 제한 없음.** `src` 가 비면 렌더링에서 제외된다.
  파일이 아직 없으면 화면에 `ui.photoPending` 안내가 뜬다.

현재 key 순서:
`house · wifi · transit · food · places · ac · kitchen · bath · laundry · trash · safety · delivery · checkout · airbnb`

### 3.3 `text[lang]` — 언어별 문구

```json
{ "title": "...", "sub": "...", "intro": "...",
  "sections": [ { "menu": "메뉴 버튼 이름", "title": "섹션 제목",
                  "items": [ { "b": "소제목", "p": "설명" } ] } ] }
```

`sections` 는 `3.2` 의 배열과 **인덱스로 짝지어진다.** 길이와 순서가 반드시 같아야 한다.

> 참고: 일본어·중국어는 한국어·영어보다 항목 수가 적다. 원본 HTML 이 그렇게 작성돼 있었고
> 그대로 옮겼다. 부족한 언어는 관리자 페이지에서 채울 수 있다.

### 3.4 `foods[]` / `places[]` — 카드

```json
{ "img": "images/...",                       // 언어 공통
  "name": {ko,en,ja,zh},
  "desc": {ko,en,ja,zh},
  "link": {ko,en,ja,zh} }                    // 언어별 (한국어는 한글 검색어를 쓴다)
```

- `img` 는 저장소 상대 경로와 외부 URL 을 모두 허용한다. 초기 데이터는 Unsplash 스톡 사진이다.
- **`places[].desc` 는 HTML 로 그대로 출력되고, `foods[].desc` 는 이스케이프된다.**
  명소 설명에 `<br>` `<b>` 로 교통편을 넣기 위한 의도적 차이다.
- 이미지 로딩에 실패하면 이름이 적힌 회색 대체 박스가 뜬다.

### 3.5 `ui[lang]` — 화면 고정 문구

`checkIn` `checkOut` `mapTitle` `openBaemin` `viewMap` `copied` `copyAddr` `bosuStop`
`bupyeongStop` `password` `footer` `placesNote` `deliveryDesc` `photoPending` `airbnbBtn` `laundryMap`

렌더러에 하드코딩돼 있던 문구를 전부 여기로 모았다.
**관리자 페이지에서는 편집하지 않는다** — 자주 바뀌지 않고, 편집 화면만 복잡해지기 때문이다.
새로 추가할 때는 4개 국어를 모두 채울 것. 빠지면 `pick()` 이 한국어로 대체한다.

## 4. 안내 페이지 (`index.html`)

`<style>` 과 마크업은 원본 그대로이고, `<script>` 만 데이터 기반으로 다시 작성했다.

| 함수 | 역할 |
|---|---|
| `pick(obj, lang)` | 다국어 필드에서 값 선택. 비었으면 `ko` → `en` 순으로 대체 |
| `esc(s)` | HTML 이스케이프 |
| `sectionPhotos(i, lang, u)` | 섹션 사진들. `src` 가 없으면 건너뛰고, 로딩 실패 시 안내 박스 |
| `cardGrid(list, lang, u, icon, rawDesc)` | 맛집·명소 카드. `rawDesc=true` 면 설명을 HTML 로 출력 |
| `render(lang)` | 전체 그리기. `key` 로 특수 블록을 붙인다 |
| `setLang(lang)` | 언어 저장(localStorage `nStayLang`) 후 재렌더 |

데이터는 `fetch("data/content.json", { cache: "no-cache" })` 로 받는다.
`no-cache` 는 캐시를 끄는 게 아니라 **ETag 재검증**을 강제한다 — 바뀌지 않았으면 304 로 끝나
빠르고, 바뀌었으면 즉시 최신을 받는다. 실패하면 화면에 오류 섹션을 그린다.

## 5. 관리자 페이지 (`admin/index.html`)

### 5.1 화면 구성

로그인 화면(토큰 발급 8단계 안내 + 입력) → 편집기(탭 4개 + 하단 고정 저장 바).

| 탭 | 편집 대상 |
|---|---|
| 기본 정보 | `config` 전체 (주소·세탁방 포함) |
| 사진 | `sections[].photos` 전체 — 추가·교체·삭제, 설명은 언어별 |
| 안내 문구 | `text[lang]` 전체 + `sections[].icon` |
| 맛집 & 명소 | `foods` `places` 전체 — 카드 추가·삭제 포함 |

편집하지 않는 값: `version`, `sections[].key`, `ui`.
**단 저장 시 그대로 보존된다** (JSON 전체를 읽어 통째로 다시 쓰기 때문).

### 5.2 상태

| 변수 | 내용 |
|---|---|
| `original` | 서버에서 받은 원본. "되돌리기" 의 기준 |
| `draft` | 편집 중인 사본. 화면은 항상 이걸 그린다 |
| `pending` | 아직 커밋되지 않은 사진 `{ 저장경로: dataURL }` |
| `isDirty` | 저장 버튼·이탈 경고·상태 표시를 좌우 |

폼은 `data-path="config.wifiName"` 같은 경로 문자열로 `draft` 에 직접 연결된다.
입력 이벤트를 위임으로 받아 `setPath(draft, path, value)` 를 호출한다.
배열을 추가·삭제하면 해당 탭을 통째로 다시 그린다.

### 5.3 사진 처리

`createImageBitmap(file, { imageOrientation: "from-image" })` 로 디코딩(회전 정보 반영)한 뒤
캔버스에서 **긴 변 1600px · JPEG 0.82** 로 축소한다. 실패하면 `<img>` 경로로 대체한다.
투명 PNG 는 흰 배경을 깔고 합성한다. 결과는 dataURL 로 `pending` 에 담기고, 저장할 때 커밋된다.

저장 경로는 `images/up/<YYYYMMDD-HHMMSS>-<랜덤5자>.jpg` 다.
**항상 새 파일명을 쓴다** — 같은 이름으로 덮으면 브라우저와 CDN 캐시 때문에 옛날 사진이 남는다.

### 5.4 저장 — 커밋 1개

Contents API 로 파일을 하나씩 올리면 사진 개수만큼 커밋이 생기고 중간에 실패하면 어중간한
상태가 된다. 그래서 Git Data API 로 묶는다.

```
GET  /git/ref/heads/main            → 현재 마지막 커밋(BASE)
GET  /git/commits/{BASE}            → 그 시점의 트리
POST /git/blobs        × (사진 + content.json)
POST /git/trees        base_tree=이전 트리, 변경 파일만 얹기
POST /git/commits      parents=[BASE]
PATCH /git/refs/heads/main
```

`parents` 를 명시하므로 그사이 다른 사람이 커밋했다면 fast-forward 가 아니라서 GitHub 이
거절한다(422). 남의 수정을 조용히 덮어쓰는 사고가 구조적으로 불가능하다.
사용자에게는 "새로고침 후 다시 시도" 로 안내한다.

`base_tree` 를 이어받으므로 **커밋에 넣지 않은 파일은 그대로 유지된다.**

저장 후 `GET /pages/builds/latest` 를 3초 간격으로 확인해 실제 반영까지 상태를 보여준다.
Pages 권한이 없으면 조용히 시간 안내로 대체한다.

### 5.5 접속 시 권한 검사

저장소 조회만으로는 부족하다. `permissions.push` 는 **토큰이 아니라 사용자**의 권한이라,
Contents 를 Read-only 로 만든 토큰도 통과해 버린다. 그러면 수정을 다 끝낸 뒤 저장 단계에서야
실패한다. 그래서 세 가지를 실제로 호출해 확인한다.

1. `GET /repos/{o}/{r}` — Metadata
2. `GET /contents/data/content.json` — Contents read
3. `POST /git/blobs` — Contents **write**. 어떤 커밋에도 연결되지 않는 임시 blob 이라
   저장소 어디에도 나타나지 않고, GitHub 이 나중에 정리한다.

실패 상태코드별로 무엇을 고쳐야 하는지 한국어로 안내한다(`friendlyError`).

### 5.6 미리보기

`../index.html` 을 iframe 으로 띄우고 `postMessage` 로 초안을 넘긴다.

```
iframe → 부모 :  { type: "nstay-ready" }      데이터 로딩이 끝났음을 알림
부모 → iframe :  { type: "nstay-preview", data }
```

양쪽 모두 `event.origin !== location.origin` 이면 무시한다.
아직 커밋되지 않은 사진은 넘기기 직전에 `pending` 의 dataURL 로 바꿔치기해서,
**저장 전에도 올린 사진이 그대로 보인다.**

## 6. 토큰 권한

| 권한 | 수준 | 근거 |
|---|---|---|
| Metadata | read | `GET /repos/{owner}/{repo}` — 자동으로 켜지는 필수 항목 |
| **Contents** | **read and write** | 내용 읽기, blob·tree·commit 생성, ref 이동 전부 |
| Pages | read | `GET /pages/builds/latest` — 반영 상태 표시용. 없어도 저장은 된다 |

GitHub 문서는 `PATCH /git/refs` 에 "추가 권한" 표시를 달아두었지만, 이는
`.github/workflows/` 아래 파일을 건드리는 커밋에 해당한다.
관리자 페이지는 `data/content.json` 과 `images/` 만 쓰므로 해당되지 않는다.

## 7. 보안 / 운영

- 토큰은 운영자 브라우저의 `localStorage` 에만 있다. 어디로도 전송되지 않는다.
  공용 PC 를 대비해 "연결 해제" 버튼을 뒀다.
- `/admin/` 은 누구나 열 수 있지만 토큰 없이는 아무것도 못 한다.
  `robots.txt` 와 `<meta name="robots" content="noindex,nofollow">` 로 색인은 막아뒀다.
- 저장소가 public 이므로 **올린 사진은 공개된다.** 무료 조직 플랜에서 Pages 는 public 에서만 된다.
- 잘못 저장해도 커밋 기록에서 되돌릴 수 있다. 사진 파일은 목록에서 빼도 저장소에 남는다.

## 8. 배포

`main` 브랜치 루트를 그대로 서빙하는 legacy(브랜치) 빌드다. `.nojekyll` 로 Jekyll 처리를 껐다.
push 후 1~2분이면 반영된다.

**Actions 워크플로 방식으로 바꾸지 말 것.** 관리자 페이지 토큰에 Workflows 권한이 추가로
필요해지고, 운영자가 만든 토큰으로는 저장이 실패하게 된다.
