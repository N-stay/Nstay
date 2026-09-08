/* 토큰 권한 시나리오별 접속 검사
   비개발자가 토큰을 잘못 만들었을 때, 수정을 다 끝낸 뒤가 아니라
   접속 시점에 원인을 정확히 알려주는지 확인한다. */
const { JSDOM } = require('jsdom');
const { read, content, b64, wait, reporter, stubBrowser } = require('./helpers');

module.exports = async function run(){
  const r = reporter('토큰 권한 검사 (admin/index.html)');
  const raw = JSON.stringify(content(), null, 2) + '\n';
  const deny = status => () => Promise.resolve({ ok: false, status, json: () => Promise.resolve({ message: 'denied' }) });

  const makeFetch = sc => url => {
    const u = String(url);
    const ok = data => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(data) });
    if(u.endsWith('/repos/N-stay/Nstay'))        return (sc.repo     || (() => ok({ permissions: { push: true } })))();
    if(u.endsWith('/user'))                       return ok({ login: 'tester' });
    if(u.includes('/contents/data/content.json')) return (sc.contents || (() => ok({ content: b64(raw) })))();
    if(u.includes('/git/blobs'))                  return (sc.write    || (() => ok({ sha: 'B' })))();
    if(u.includes('/pages/builds/latest'))        return (sc.pages    || (() => ok({ status: 'built', created_at: new Date().toISOString() })))();
    return deny(404)();
  };

  async function attempt(scenario){
    const dom = new JSDOM(read('admin/index.html'), {
      runScripts: 'dangerously', url: 'http://localhost/admin/',
      beforeParse(w){ stubBrowser(w); w.fetch = makeFetch(scenario); }
    });
    const d = dom.window.document;
    await wait(50);
    d.querySelector('#tok').value = 'github_pat_TEST';
    d.querySelector('#loginBtn').click();
    await wait(250);
    const out = {
      loggedIn: d.querySelector('#login').hidden,
      error: d.querySelector('#loginErr').hidden ? '' : d.querySelector('#loginErr').textContent,
      status: d.querySelector('#status') ? d.querySelector('#status').textContent : ''
    };
    dom.window.close();
    return out;
  }

  r.group('정상');
  let o = await attempt({});
  r.check('Contents: Read and write → 접속 성공', o.loggedIn && !o.error);

  r.group('접속을 막아야 하는 경우');
  o = await attempt({ write: deny(403) });
  r.check('Contents 가 Read-only → 차단하고 원인 안내', !o.loggedIn && /Read and write/.test(o.error), o.error);

  o = await attempt({ contents: deny(404) });
  r.check('Contents 권한 없음 → 차단하고 원인 안내', !o.loggedIn && /읽을 수 없습니다/.test(o.error), o.error);

  o = await attempt({ repo: deny(404) });
  r.check('Resource owner 오선택 → 차단하고 원인 안내', !o.loggedIn && /Resource owner/.test(o.error), o.error);

  o = await attempt({ repo: deny(401) });
  r.check('만료·오타 토큰 → 차단하고 원인 안내', !o.loggedIn && /만료/.test(o.error), o.error);

  r.group('막지 말아야 하는 경우');
  o = await attempt({ pages: deny(403) });
  r.check('Pages 권한만 없음 → 접속 허용 + 안내만',
    o.loggedIn && !o.error && /Pages 권한이 없어/.test(o.status), o.status);

  return r.fails;
};

if(require.main === module) module.exports().then(f => process.exit(f ? 1 : 0));
