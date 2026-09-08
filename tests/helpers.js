/* 테스트 공용 유틸 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const content = () => JSON.parse(read('data/content.json'));
const b64 = s => Buffer.from(s, 'utf8').toString('base64');
const wait = ms => new Promise(r => setTimeout(r, ms));
const LANGS = ['ko', 'en', 'ja', 'zh'];

function reporter(title){
  let fails = 0;
  console.log(`\n${title}`);
  return {
    group: name => console.log(`\n  ${name}`),
    check(name, cond, detail){
      console.log(`    ${cond ? '✓' : '✗'} ${name}`);
      if(!cond){ fails++; if(detail !== undefined) console.log(`        → ${detail}`); }
      return cond;
    },
    get fails(){ return fails; }
  };
}

/* jsdom 에 없는 브라우저 기능 최소 스텁 */
function stubBrowser(w, { canvas = false } = {}){
  w.confirm = () => true;
  w.alert = () => {};
  w.TextEncoder = TextEncoder;
  w.TextDecoder = TextDecoder;
  w.URL.createObjectURL = () => 'blob:stub';
  w.URL.revokeObjectURL = () => {};
  w.scrollTo = () => {};
  if(canvas){
    w.createImageBitmap = () => Promise.resolve({ width: 4000, height: 3000, close(){} });
    w.HTMLCanvasElement.prototype.getContext = () => ({ fillRect(){}, drawImage(){}, set fillStyle(v){} });
    w.HTMLCanvasElement.prototype.toDataURL = () => 'data:image/jpeg;base64,' + b64('FAKEJPEG');
  }
}

module.exports = { ROOT, read, content, b64, wait, LANGS, reporter, stubBrowser };
