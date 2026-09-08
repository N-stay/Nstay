# N STAY — 작업 전에 반드시 읽을 것

부산 남포동 숙소의 게스트 안내 페이지. **서버도 데이터베이스도 빌드도 없다.**
GitHub Pages에 올라간 정적 파일 3개가 전부다.

- 안내 페이지: https://n-stay.github.io/Nstay/
- 관리자 페이지: https://n-stay.github.io/Nstay/admin/
- 상세 명세: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

```
index.html          안내 페이지 — data/content.json 을 읽어서 그리기만 한다
data/content.json   모든 문구·사진 경로·링크. 유일한 데이터 원본
images/             사진 (관리자가 올리면 images/up/ 아래에 쌓인다)
admin/index.html    관리자 페이지 — content.json 을 고쳐서 GitHub 에 커밋한다
tests/              회귀 테스트 (cd tests && npm install && npm test)
```

---

## 가장 중요한 3가지

**1. `data/content.json` 은 살아있는 운영 데이터다.**
숙소 운영자가 관리자 페이지로 수시로 직접 수정한다. 로컬 파일이 최신이라고 가정하지 말 것.
**작업 시작 전 `git pull --rebase`, push 전에도 한 번 더.** 덮어쓰면 운영자의 수정이 사라진다.

**2. 문구를 HTML 에 적지 말 것.**
화면에 보이는 글자는 전부 `content.json` 에서 와야 한다. HTML 에 직접 쓰면
운영자가 관리자 페이지에서 고칠 수 없게 되고, 4개 국어 중 하나만 바뀌는 버그가 된다.

**3. 화면을 고치면 관리자 페이지도 같이 고쳐야 한다.**
데이터 구조를 바꾸는 순간 두 파일이 짝을 이룬다. 아래 표를 볼 것.

---

## 무엇을 고치면 무엇이 깨지는가

| 하려는 일 | 같이 고쳐야 하는 곳 | 위험도 |
|---|---|---|
| 색·여백·폰트·그림자 등 **CSS 값만** 변경 | 없음 | 안전 |
| **class 이름** 변경 | `index.html` 의 JS 템플릿 문자열 (아래 목록) | 높음 |
| **HTML 마크업 구조** 변경 | `render()` 가 쓰는 DOM id·선택자 (아래 목록) | 높음 |
| **섹션 추가/삭제/순서 변경** | `content.json` 의 배열 5개를 동시에 | 높음 |
| 섹션에 **특수 블록** 추가 | `index.html` 의 `key` 분기 + `ui` 문자열 4개 국어 | 중간 |
| `config` 에 **필드 추가** | `admin/index.html` 기본 정보 탭에 입력칸 추가 | 중간 |
| 맛집·명소 **카드 필드 추가** | `index.html` 의 `cardGrid()` + `admin` 의 `cardList()` | 중간 |
| **저장 로직** 변경 | `tests/admin.test.js` | 높음 |

### render() 가 의존하는 DOM (마크업 바꿀 때 유지하거나 같이 고칠 것)

- id: `ey` `title` `sub` `intro` `ci` `co` `cil` `col` `mapTitle` `maps` `map` `foot` `nav` `content`
- 선택자: `.heroBox h2` · `.logo` · `.nav-wrap` · `[data-lang]` · `.copy-btn`

### JS 템플릿이 만들어내는 class (CSS 에서 이름을 바꾸려면 JS 도 같이)

`wifi` `bus-links` `bus-btn` `cards-grid` `card-item` `card-thumb` `card-body` `fallback`
`guide-photo-box` `guide-photo` `ph` `item` `note` `black` `addr-box` `addr-text` `copy-btn` `btn` `btn gold`

> 디자인만 바꾸고 싶다면 **CSS 값만 손대는 것이 가장 안전하다.**
> class 이름과 마크업 뼈대는 그대로 두고 스타일만 바꾸면 기능은 절대 깨지지 않는다.

---

## 절대 규칙

**섹션 인덱스 정렬** — 아래 5개 배열은 항상 **같은 길이, 같은 순서**여야 한다.
하나만 고치면 제목과 내용이 서로 어긋난다.

```
sections[]            ← 언어 무관 (key, icon, photos)
text.ko.sections[]
text.en.sections[]
text.ja.sections[]
text.zh.sections[]
```

**특수 블록은 인덱스가 아니라 `key` 로 붙는다.** 예전에는 `if(i === 3)` 처럼 번호로 붙어 있어서
섹션 하나만 끼워 넣어도 전부 어긋났다. 지금은 `if(key === "food")` 이다. **번호로 되돌리지 말 것.**

| key | 붙는 특수 블록 |
|---|---|
| `wifi` | Wi-Fi 이름·비밀번호 박스 |
| `transit` | 버스 정류장 지도 버튼 2개 |
| `food` | 맛집 카드 그리드 |
| `places` | 명소 카드 그리드 + 주의 문구 |
| `laundry` | 코인세탁방 주소 + 구글 지도 버튼 |
| `delivery` | 배달 주소 박스 + 복사 버튼 |
| `airbnb` | Airbnb 메시지 버튼 (`config.airbnbUrl` 이 있을 때만) |

`house` `ac` `kitchen` `bath` `trash` `safety` `checkout` 은 특수 블록이 없지만 key 는 유지할 것.

**언어 공통 / 언어별 구분**

| 공통 (한 번 바꾸면 4개 국어 전부) | 언어별 (각각 채워야 함) |
|---|---|
| `sections[].icon`, `sections[].photos[].src` | `text.*` 전체 |
| `foods[].img`, `places[].img` | `sections[].photos[].caption` |
| `config` 의 시간·Wi-Fi·링크 | `foods/places[].name` `.desc` `.link` |
| | `config.address`, `ui.*` |

**`places[].desc` 는 HTML 을 그대로 출력하고, `foods[].desc` 는 이스케이프한다.**
명소 설명에 `<br>` `<b>` 를 쓰기 위한 의도된 차이다. 바꾸지 말 것.

**관리자 페이지는 모르는 필드도 보존한다.** JSON 전체를 읽어 통째로 다시 쓰기 때문에,
새 필드를 넣어도 저장할 때 사라지지 않는다. 다만 **편집 UI 는 따로 만들어야 한다.**

---

## 자주 하는 작업

### 섹션 추가하기

1. `content.json` 의 `sections` 에 `{ key, icon, photos: [] }` 삽입 (key 는 새 이름)
2. `text.ko/en/ja/zh` 각각의 `sections` **같은 위치**에 `{ menu, title, items: [] }` 삽입
3. 특수 블록이 필요하면 `index.html` 의 `render()` 에 `if(key === "새이름")` 분기 추가
4. 그 블록에 글자가 들어가면 `ui` 에 4개 국어 모두 추가
5. `cd tests && npm test`

관리자 페이지는 `sections` 를 순회하므로 **자동으로 새 섹션의 사진·문구 편집칸이 생긴다.**
(단 섹션 추가·삭제 자체는 관리자 페이지에서 못 한다. 의도된 제한이다.)

### 사진 다루기

- 관리자가 올리면 `images/up/<날짜시각>-<랜덤>.jpg` 로 저장된다.
- 브라우저에서 **긴 변 1600px · JPEG 품질 0.82** 로 줄인 뒤 올린다.
- 사진을 "삭제"해도 JSON 에서만 빠지고 **파일은 저장소에 남는다.** 실수 복구를 위한 의도된 동작이다.

---

## 테스트

```bash
cd tests
npm install     # 최초 1회 (jsdom)
npm test
```

jsdom 으로 두 페이지를 실제로 띄워서 검사한다.

- `render.test.js` — 4개 국어 렌더링, key 별 특수 블록, 데이터 정합성, 미리보기 연동(다른 출처 차단 포함)
- `admin.test.js` — 접속·편집·사진 업로드·저장까지 전 과정, 실제로 보내는 커밋 내용 검증
- `permissions.test.js` — 토큰 권한을 잘못 만든 6가지 경우의 안내 문구

기대값을 코드에 박지 않고 `content.json` 에서 끌어오므로, **섹션이나 카드를 추가해도
테스트 파일은 고칠 필요가 없다.** 구조를 바꿨다면 테스트도 같이 고칠 것.

---

## 배포

`main` 에 push 하면 GitHub Pages 가 1~2분 안에 자동 반영한다. 빌드 단계는 없다.

**GitHub Actions 워크플로를 추가하지 말 것.** 브랜치 직접 빌드(legacy)로 동작 중인데,
Actions 로 바꾸면 관리자 페이지의 토큰에 Workflows 권한이 추가로 필요해져서 저장이 깨진다.

관리자 페이지 토큰에 필요한 권한: **Metadata: read**(자동) · **Contents: read and write**(필수) · **Pages: read**(선택)

---

## 하지 말 것

- 외부 라이브러리·CDN·폰트 추가 (지금 의존성 0개다. 게스트가 해외에서 느린 회선으로 연다)
- 문구를 HTML 이나 JS 에 하드코딩
- 특수 블록을 섹션 번호로 다시 붙이기
- 4개 국어 중 일부만 채우고 끝내기
- `content.json` 을 확인 없이 로컬 버전으로 덮어쓰기
- 관리자 페이지에 새 필드를 추가하고 편집 UI 를 안 만들기
