/* 전체 테스트 실행: cd tests && npm install && npm test */
(async () => {
  const suites = ['./render.test.js', './admin.test.js', './permissions.test.js', './docs.test.js'];
  let total = 0;
  for(const s of suites) total += await require(s)();
  console.log(total ? `\n❌ 실패 ${total}건\n` : '\n✅ 전체 통과\n');
  process.exit(total ? 1 : 0);
})();
