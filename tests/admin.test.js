/* 관리자 페이지(admin/index.html) 전 과정 회귀 테스트
   GitHub API 는 흉내내되, 실제로 보내는 요청 내용을 그대로 검사한다. */
const { JSDOM } = require('jsdom');
const { read, content, b64, wait, LANGS, reporter, stubBrowser } = require('./helpers');

module.exports = async function run(){
  const r = reporter('관리자 페이지 (admin/index.html)');
  const DATA = content();
  const raw = JSON.stringify(DATA, null, 2) + '\n';
  const calls = [];

  const fetchMock = (url, opts = {}) => {
    const u = String(url), method = (opts.method || 'GET').toUpperCase();
    calls.push({ method, url: u, body: opts.body ? JSON.parse(opts.body) : null });
    const ok = data => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(data) });
    if(u.endsWith('/repos/N-stay/Nstay'))        return ok({ permissions: { push: true } });
    if(u.endsWith('/user'))                       return ok({ login: 'tester' });
    if(u.includes('/contents/data/content.json')) return ok({ content: b64(raw) });
    if(u.includes('/git/ref/heads/main'))         return ok({ object: { sha: 'BASE' } });
    if(u.includes('/git/commits/BASE'))           return ok({ tree: { sha: 'TREE0' } });
    if(u.includes('/git/blobs'))                  return ok({ sha: 'BLOB' });
    if(u.includes('/git/trees'))                  return ok({ sha: 'TREE1' });
    if(u.includes('/git/commits'))                return ok({ sha: 'COMMIT1' });
    if(u.includes('/git/refs/heads/main'))        return ok({});
    if(u.includes('/pages/builds/latest'))        return ok({ status: 'built', created_at: new Date().toISOString() });
    return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({ message: 'mock 없음: ' + u }) });
  };

  const dom = new JSDOM(read('admin/index.html'), {
    runScripts: 'dangerously',
    url: 'http://localhost/admin/',
    beforeParse(w){ stubBrowser(w, { canvas: true }); w.fetch = fetchMock; }
  });
  const { window: w } = dom, d = w.document;
  const $ = s => d.querySelector(s);
  const tab = k => d.querySelector(`#tabs [data-tab="${k}"]`).click();
  const N = DATA.sections.length;
  await wait(60);

  r.group('접속');
  r.check('접속 전에는 편집기가 보이지 않음', !$('#login').hidden && $('#app').hidden);
  $('#tok').value = 'github_pat_TEST';
  $('#loginBtn').click();
  await wait(200);
  r.check('접속 후 편집기 표시', $('#login').hidden && !$('#app').hidden);
  r.check('접속 시 읽기·쓰기 권한을 실제로 확인',
    calls.some(c => c.url.includes('/contents/')) &&
    calls.some(c => c.method === 'POST' && c.url.includes('/git/blobs')));

  r.group('탭 렌더링');
  tab('basic');
  r.check('기본 정보: config 의 모든 항목이 편집 가능',
    ['name','area','checkIn','checkOut','wifiName','wifiPassword','mapUrl','airbnbUrl','baeminUrl',
     'busStops.bosu','busStops.bupyeong','laundry.address','laundry.mapUrl',
     ...LANGS.map(l => 'address.' + l)]
      .every(k => !!$(`#pane [data-path="config.${k}"]`)));
  tab('photos');
  r.check(`사진: 섹션 ${N}개마다 추가 영역`, d.querySelectorAll('#pane .dropzone').length === N,
    d.querySelectorAll('#pane .dropzone').length);
  r.check('사진: 등록된 사진이 모두 표시',
    d.querySelectorAll('#pane .photo').length ===
      DATA.sections.reduce((a, s) => a + (s.photos || []).length, 0));
  tab('text');
  r.check(`안내 문구: 섹션 ${N}개 표시`,
    d.querySelectorAll('#pane [data-path^="text.ko.sections."]').length > 0 &&
    d.querySelectorAll('#pane [data-act="additem"]').length === N);
  tab('cards');
  r.check('맛집·명소: 카드 수 일치',
    d.querySelectorAll('#pane [data-act="delcard"]').length === DATA.foods.length + DATA.places.length);

  r.group('언어 전환');
  tab('text');
  d.querySelector('#pane [data-lang="ja"]').click();
  r.check('일본어 문구가 로드됨',
    $('#pane input[data-path="text.ja.title"]').value === DATA.text.ja.title);
  d.querySelector('#pane [data-lang="ko"]').click();

  r.group('편집');
  r.check('수정 전에는 저장 버튼 잠김', $('#saveBtn').disabled);
  const titleInput = $('#pane input[data-path="text.ko.title"]');
  titleInput.value = '테스트 제목';
  titleInput.dispatchEvent(new w.Event('input', { bubbles: true }));
  r.check('수정하면 저장 버튼 열림', !$('#saveBtn').disabled);
  r.check('저장 안 한 상태를 표시', $('#status').className.includes('dirty'));

  const itemsOf = i => DATA.sections.length && d.querySelectorAll(`#pane [data-act="delitem"][data-arg^="${i}:"]`).length;
  const before = itemsOf(0);
  d.querySelector('#pane [data-act="additem"][data-arg="0"]').click();
  await wait(20);
  r.check('항목 추가', itemsOf(0) === before + 1, `${before} → ${itemsOf(0)}`);
  d.querySelector(`#pane [data-act="delitem"][data-arg="0:${before}"]`).click();
  await wait(20);
  r.check('항목 삭제', itemsOf(0) === before);

  r.group('사진 업로드');
  tab('photos');
  const photosBefore = d.querySelectorAll('#pane .photo').length;
  await w.eval('acceptImage')(new w.File(['x'], 'p.jpg', { type: 'image/jpeg' }), 'secnew:0');
  await wait(60);
  r.check('사진이 목록에 추가됨', d.querySelectorAll('#pane .photo').length === photosBefore + 1);
  r.check('저장 전이라는 표시', !!$('#pane .badge'));
  const pend = w.eval('Object.keys(pending)');
  r.check('업로드 경로 규칙 준수', pend.length === 1 && /^images\/up\/\d{8}-\d{6}-\w+\.jpg$/.test(pend[0]), pend[0]);

  r.group('저장 = 커밋 1개');
  calls.length = 0;
  $('#saveBtn').click();
  await wait(400);
  const blobs = calls.filter(c => c.method === 'POST' && c.url.includes('/git/blobs'));
  const trees = calls.filter(c => c.method === 'POST' && c.url.includes('/git/trees'));
  const commits = calls.filter(c => c.method === 'POST' && c.url.includes('/git/commits'));
  const patch = calls.find(c => c.method === 'PATCH');
  r.check('blob 2개(사진 + content.json)', blobs.length === 2, blobs.length);
  r.check('트리·커밋 각 1개', trees.length === 1 && commits.length === 1);
  r.check('부모 커밋을 지정해 덮어쓰기 방지', commits[0].body.parents[0] === 'BASE');
  r.check('기존 트리를 이어받아 다른 파일 보존', trees[0].body.base_tree === 'TREE0');
  r.check('브랜치를 새 커밋으로 이동', !!patch && patch.body.sha === 'COMMIT1');
  const paths = trees[0].body.tree.map(t => t.path);
  r.check('커밋에 content.json 포함', paths.includes('data/content.json'));
  r.check('커밋에 새 사진 포함', paths.some(p => p.startsWith('images/up/')), paths.join(', '));

  r.group('저장되는 데이터');
  const saved = JSON.parse(Buffer.from(
    blobs.find(b => b.body.content.length > 1000).body.content, 'base64').toString('utf8'));
  r.check('유효한 JSON', saved.version === DATA.version);
  r.check('수정 내용 반영', saved.text.ko.title === '테스트 제목');
  r.check('새 사진 경로 반영', saved.sections[0].photos.length === (DATA.sections[0].photos || []).length + 1);
  r.check(`4개 국어 · 섹션 ${N}개 유지`, LANGS.every(l => saved.text[l].sections.length === N));
  r.check('섹션 key 보존', saved.sections.map(s => s.key).join() === DATA.sections.map(s => s.key).join());
  r.check('관리자가 편집하지 않는 값(ui) 보존',
    JSON.stringify(saved.ui) === JSON.stringify(DATA.ui));

  r.group('저장 후');
  await wait(200);
  r.check('저장 버튼 다시 잠김', $('#saveBtn').disabled);
  r.check('완료 안내 표시', $('#status').className.includes('ok') && /저장 완료/.test($('#status').textContent),
    $('#status').textContent);

  dom.window.close();
  return r.fails;
};

if(require.main === module) module.exports().then(f => process.exit(f ? 1 : 0));
