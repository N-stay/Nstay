/* 안내 페이지(index.html) 회귀 테스트
   기대값을 코드에 박지 않고 data/content.json 에서 끌어오므로,
   섹션이나 카드를 추가해도 이 파일은 고칠 필요가 없다. */
const { JSDOM } = require('jsdom');
const { read, content, wait, LANGS, reporter, stubBrowser } = require('./helpers');

module.exports = async function run(){
  const r = reporter('안내 페이지 (index.html)');
  const DATA = content();

  const dom = new JSDOM(read('index.html'), {
    runScripts: 'dangerously',
    url: 'http://localhost/',
    beforeParse(w){
      stubBrowser(w);
      w.fetch = () => Promise.resolve({ ok: true, json: () => Promise.resolve(DATA) });
    }
  });
  const { window: w } = dom, d = w.document;
  await wait(80);

  const N = DATA.sections.length;

  r.group('데이터 정합성');
  r.check(`sections 와 4개 국어 text 의 섹션 수가 모두 ${N}개로 일치`,
    LANGS.every(l => DATA.text[l].sections.length === N),
    LANGS.map(l => `${l}=${DATA.text[l].sections.length}`).join(' '));
  r.check('모든 섹션에 key 가 있고 중복이 없음',
    DATA.sections.every(s => s.key) && new Set(DATA.sections.map(s => s.key)).size === N);
  r.check('맛집·명소의 이름/설명/링크가 4개 국어를 모두 가짐',
    ['foods', 'places'].every(k => DATA[k].every(c =>
      LANGS.every(l => l in c.name && l in c.desc && l in c.link))));
  r.check('render 가 참조하는 ui 문자열이 4개 국어에 모두 존재',
    LANGS.every(l => Object.keys(DATA.ui.ko).every(k => k in DATA.ui[l])));

  r.group('4개 국어 렌더링');
  for(const lang of LANGS){
    d.querySelector(`[data-lang="${lang}"]`).click();
    await wait(10);
    const html = d.getElementById('content').innerHTML;
    const secs = (html.match(/<section id="s\d+"/g) || []).length;
    const nav = d.getElementById('nav').querySelectorAll('button').length;
    const cards = (html.match(/class="card-item"/g) || []).length;
    r.check(`[${lang}] 섹션 ${N}개 · 메뉴 ${N}개`, secs === N && nav === N, `섹션=${secs} 메뉴=${nav}`);
    r.check(`[${lang}] 맛집+명소 카드 ${DATA.foods.length + DATA.places.length}개`,
      cards === DATA.foods.length + DATA.places.length, cards);
    r.check(`[${lang}] 빈 값이 화면에 새어나오지 않음`, !html.includes('undefined'));
    r.check(`[${lang}] 제목이 해당 언어로 표시`,
      d.getElementById('title').textContent === DATA.text[lang].title);
    r.check(`[${lang}] 주소가 해당 언어로 표시`,
      d.getElementById('maps').textContent === DATA.config.address[lang]);
  }

  r.group('key 로 붙는 특수 블록');
  d.querySelector('[data-lang="ko"]').click();
  await wait(10);
  const html = d.getElementById('content').innerHTML;
  const has = (key, sel) => {
    const i = DATA.sections.findIndex(s => s.key === key);
    if(i < 0) return null;
    const sec = d.getElementById('s' + i);
    return sec && sec.querySelector(sel);
  };
  r.check('wifi 섹션에 Wi-Fi 박스', !!has('wifi', '.wifi'));
  r.check('transit 섹션에 정류장 링크', !!has('transit', '.bus-links a'));
  r.check('food 섹션에 맛집 카드', !!has('food', '.card-item'));
  r.check('places 섹션에 명소 카드 + 안내문', !!has('places', '.card-item') && !!has('places', '.note'));
  r.check('delivery 섹션에 주소 복사 버튼', !!has('delivery', '.copy-btn'));
  const laundry = has('laundry', '.bus-links a');
  r.check('laundry 섹션에 지도 링크', !!laundry, laundry && laundry.href);
  r.check('laundry 지도 링크가 설정된 주소를 가리킴',
    !!laundry && laundry.href === DATA.config.laundry.mapUrl);
  r.check('사진이 등록된 섹션 수만큼 사진 영역 렌더',
    (html.match(/guide-photo-box/g) || []).length ===
      DATA.sections.reduce((a, s) => a + (s.photos || []).filter(p => p.src).length, 0));

  r.group('관리자 미리보기 연동');
  let ready = false;
  w.addEventListener('message', e => { if(e.data && e.data.type === 'nstay-ready') ready = true; });
  // 페이지는 부모 창이 있을 때만 준비 신호를 보낸다 (최상위 창에서는 조용해야 함)
  r.check('최상위 창에서는 준비 신호를 보내지 않음', ready === false);
  const draft = JSON.parse(JSON.stringify(DATA));
  draft.text.ko.title = '초안 제목';
  // 브라우저가 실제로 전달하는 형태(발신 창의 origin 포함)로 재현한다.
  const send = origin => w.dispatchEvent(new w.MessageEvent('message', {
    data: { type: 'nstay-preview', data: draft }, origin
  }));

  send('https://evil.example');
  await wait(20);
  r.check('다른 출처에서 온 초안은 무시',
    d.getElementById('title').textContent === DATA.text.ko.title,
    d.getElementById('title').textContent);

  send(w.location.origin);
  await wait(20);
  r.check('같은 출처의 초안은 그대로 다시 그림',
    d.getElementById('title').textContent === '초안 제목',
    d.getElementById('title').textContent);

  dom.window.close();
  return r.fails;
};

if(require.main === module) module.exports().then(f => process.exit(f ? 1 : 0));
