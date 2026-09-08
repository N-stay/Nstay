/* 문서가 코드보다 낡지 않도록 지키는 테스트.
   CLAUDE.md / docs/ARCHITECTURE.md 에 적어둔 목록이 실제와 다르면 실패한다. */
const { read, content, reporter } = require('./helpers');

const ticks = s => (s.match(/`([^`]+)`/g) || []).map(t => t.slice(1, -1));
const between = (text, start, end) => {
  const i = text.indexOf(start);
  if(i < 0) return '';
  const j = end ? text.indexOf(end, i + start.length) : -1;
  return text.slice(i + start.length, j < 0 ? undefined : j);
};
const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
const diff = (doc, code) => `문서=[${doc.join(' ')}] 실제=[${code.join(' ')}]`;

module.exports = async function run(){
  const r = reporter('문서 최신성 (CLAUDE.md / docs/ARCHITECTURE.md)');
  const DATA = content();
  const claude = read('CLAUDE.md');
  const arch = read('docs/ARCHITECTURE.md');
  const index = read('index.html');
  const script = index.slice(index.indexOf('<script>'));

  r.group('섹션 key');
  const codeKeys = DATA.sections.map(s => s.key);
  // 문서에는 `a · b · c` 형태의 한 줄로 적혀 있다
  const archKeys = ticks(between(arch, '현재 key 순서:', '### 3.3'))
    .join(' ').split(/\s*·\s*/).map(x => x.trim()).filter(Boolean);
  r.check('ARCHITECTURE 의 key 순서가 실제와 일치', same(archKeys, codeKeys), diff(archKeys, codeKeys));

  // CLAUDE.md 의 특수 블록 표 + 그 아래 "특수 블록이 없지만" 문장에 모든 key 가 나와야 한다
  const claudeKeys = ticks(between(claude, '| key | 붙는 특수 블록 |', '**언어 공통'));
  const missing = codeKeys.filter(k => !claudeKeys.includes(k));
  r.check('CLAUDE.md 가 모든 key 를 다루고 있음', missing.length === 0, '누락: ' + missing.join(', '));

  // 화면 코드가 실제로 분기하는 key 가 문서의 특수 블록 표에 있는지
  const branchKeys = [...script.matchAll(/key === "([a-z]+)"/g)].map(m => m[1]);
  // 표의 각 줄에서 첫 번째 칸(key)만 뽑는다
  const tableKeys = between(claude, '| key | 붙는 특수 블록 |', '`house`')
    .split('\n').map(line => (line.match(/^\|\s*`([a-z]+)`\s*\|/) || [])[1]).filter(Boolean);
  const notDocumented = branchKeys.filter(k => !tableKeys.includes(k));
  r.check('특수 블록을 가진 key 가 모두 표에 있음', notDocumented.length === 0,
    '표에 없음: ' + notDocumented.join(', '));
  const notInCode = tableKeys.filter(k => !branchKeys.includes(k));
  r.check('표에 적힌 특수 블록이 실제로 코드에 있음', notInCode.length === 0,
    '코드에 없음: ' + notInCode.join(', '));

  r.group('render() 가 의존하는 DOM');
  const codeIds = [...new Set([...script.matchAll(/getElementById\("([a-zA-Z]+)"\)/g)].map(m => m[1]))].sort();
  const docIds = ticks(between(claude, '- id:', '\n')).sort();
  r.check('CLAUDE.md 의 DOM id 목록이 실제와 일치', same(docIds, codeIds), diff(docIds, codeIds));

  const codeSel = [...new Set([...script.matchAll(/querySelector(?:All)?\("([^"]+)"\)/g)].map(m => m[1]))].sort();
  const docSel = ticks(between(claude, '- 선택자:', '\n')).sort();
  r.check('CLAUDE.md 의 선택자 목록이 실제와 일치', same(docSel, codeSel), diff(docSel, codeSel));

  r.group('JS 가 만들어내는 class');
  const codeCls = [...new Set([...script.matchAll(/class="([a-z0-9 -]+)"/g)].map(m => m[1]))].sort();
  const docCls = ticks(between(claude, '### JS 템플릿이 만들어내는 class', '> 디자인만')).sort();
  r.check('CLAUDE.md 의 class 목록이 실제와 일치', same(docCls, codeCls), diff(docCls, codeCls));

  r.group('데이터 필드');
  const codeUi = Object.keys(DATA.ui.ko).sort();
  const docUi = ticks('`' + between(arch, '### 3.5 `ui[lang]` — 화면 고정 문구', '렌더러에')
    .replace(/[\n`]/g, ' ').trim().split(/\s+/).join('` `') + '`').sort();
  r.check('ARCHITECTURE 의 ui 키 목록이 실제와 일치', same(docUi, codeUi), diff(docUi, codeUi));

  const codeCfg = Object.keys(DATA.config);
  const undocumented = codeCfg.filter(k => !arch.includes('| `' + k + '`') &&
    !arch.includes('`' + k + '.') && !arch.includes('`' + k + '` '));
  r.check('config 의 모든 필드가 ARCHITECTURE 에 설명되어 있음', undocumented.length === 0,
    '누락: ' + undocumented.join(', '));

  return r.fails;
};

if(require.main === module) module.exports().then(f => process.exit(f ? 1 : 0));
