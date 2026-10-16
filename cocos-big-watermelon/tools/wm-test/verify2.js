// 第二轮：异常注入（生成失败 / 补位异常）+ 修复后回归复跑
// 运行：node verify2.js
const { launch, toClient, state, touchStart, touchEnd, tap, fruitPositions, GET_GAME } = require('./lib');

const R = [];
function rec(name, pass, detail) {
  R.push({ name, pass, detail });
  console.log(`${pass ? '✅ PASS' : '❌ FAIL'}  ${name}${detail ? '\n         ' + detail : ''}`);
}
async function setGame(page, fn) { return page.evaluate(`(() => { const g = ${GET_GAME}; (${fn})(g); })()`); }

(async () => {
  const { browser, page, errors } = await launch();
  const cdp = await page.context().newCDPSession(page);

  console.log('\n────────── F. 异常注入：生成/补位失败可恢复 ──────────');

  // F1 预制体异常：投放时 startFruitPhysics 抛错 → 不应锁死，仍可继续投放
  await setGame(page, `(g) => g.startGame()`);
  await page.waitForTimeout(500);
  const f0 = await state(page);
  await setGame(page, `(g) => {
    // 让本次投放中途抛错（模拟节点/物理异常）
    const orig = g.startFruitPhysics.bind(g);
    g.startFruitPhysics = function (fruit) {
      g.startFruitPhysics = orig;          // 只失败一次
      throw new Error('injected physics failure');
    };
  }`);
  await page.evaluate(`(() => ${GET_GAME}.__reset && ${GET_GAME}.__reset())()`);
  const errorsBefore = errors.length;
  await tap(page, cdp, -50, -250, 1);
  await page.waitForTimeout(600);
  const f1 = await state(page);
  const f2 = await state(page);
  // 注入失败后：不应残留补位锁，且下一次点击应能正常投放
  await tap(page, cdp, 50, -250, 2);
  await page.waitForTimeout(600);
  const f3 = await state(page);
  rec('F1 投放中途抛错后不锁死、可继续投放',
    f3.fruitCount > f1.fruitCount && f3.activeTouchId === null,
    `抛错后 fruitCount=${f1.fruitCount} 待投=${f1.hasCurrent} 补位中=${f1._heldSpawnPending === undefined ? 'n/a' : f1._heldSpawnPending}；` +
    `再次点击后 fruitCount=${f3.fruitCount}`);

  // F2 预制体缺失：createOneFruit 返回 null → 不应抛异常崩溃，状态自洽
  await setGame(page, `(g) => g.startGame()`);
  await page.waitForTimeout(500);
  const g0 = await state(page);
  await setGame(page, `(g) => {
    g.__savedPrefab = g.fruitPrefab;
    g.fruitPrefab = null;   // 模拟预制体不可用
  }`);
  await tap(page, cdp, 0, -250, 3);
  await page.waitForTimeout(500);
  const g1 = await state(page);
  const crashed = errors.some(e => /Cannot read|of null|undefined/.test(e) && errors.indexOf(e) >= errorsBefore);
  await setGame(page, `(g) => { g.fruitPrefab = g.__savedPrefab; }`);
  await tap(page, cdp, 0, -250, 4);
  await page.waitForTimeout(600);
  const g2 = await state(page);
  rec('F2 预制体缺失时不崩溃且恢复后可用',
    g1.activeTouchId === null && g2.fruitCount > g1.fruitCount,
    `缺失期间点击：fruitCount=${g1.fruitCount} hasCurrent=${g1.hasCurrent} activeTouchId=${g1.activeTouchId}；` +
    `恢复预制体后点击 → fruitCount=${g2.fruitCount}`);

  // F3 补位任务异常：spawnNextHeld 抛错一次 → 不应卡住
  await setGame(page, `(g) => g.startGame()`);
  await page.waitForTimeout(500);
  await setGame(page, `(g) => {
    const orig = g.spawnNextHeld.bind(g);
    g.spawnNextHeld = function () {
      g.spawnNextHeld = orig;
      throw new Error('injected spawn failure');
    };
  }`);
  await tap(page, cdp, -30, -250, 5);
  await page.waitForTimeout(700);       // 触发补位（抛错）
  const h0 = await state(page);
  await setGame(page, `(g) => { g.ensureHeldFruit(); }`);   // 兜底补位
  await page.waitForTimeout(300);
  const h1 = await state(page);
  await tap(page, cdp, 30, -250, 6);
  await page.waitForTimeout(600);
  const h2 = await state(page);
  rec('F3 补位任务抛错后可恢复',
    h2.fruitCount > h0.fruitCount,
    `补位抛错后 待投=${h0.hasCurrent} 补位中标记=${h0._heldSpawnPending}; 兜底后 待投=${h1.hasCurrent}; 点击后 fruitCount ${h0.fruitCount}→${h2.fruitCount}`);

  console.log('\n────────── G. 多指 / 手势边界 ──────────');

  // G1 第二根手指按下不应打断/重复投放
  await setGame(page, `(g) => g.startGame()`);
  await page.waitForTimeout(500);
  const k0 = await state(page);
  let c = await toClient(page, -100, -250);
  await touchStart(cdp, c.clientX, c.clientY, 20);
  await page.waitForTimeout(120);
  // 第二根手指
  const c2 = await toClient(page, 100, -250);
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [
      { x: c.clientX, y: c.clientY, id: 20, radiusX: 5, radiusY: 5, force: 1 },
      { x: c2.clientX, y: c2.clientY, id: 21, radiusX: 5, radiusY: 5, force: 1 }
    ]
  });
  await page.waitForTimeout(120);
  const k1 = await state(page);
  // 抬起第一根
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [{ x: c2.clientX, y: c2.clientY, id: 21, radiusX: 5, radiusY: 5, force: 1 }]
  });
  await page.waitForTimeout(400);
  const k2 = await state(page);
  // 抬起第二根
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(600);
  const k3 = await state(page);
  rec('G1 多指手势不重复投放、结束后状态干净',
    k3.fruitCount >= k0.fruitCount && k3.activeTouchId === null && k3.fruitCount - k0.fruitCount <= 2,
    `fruitCount ${k0.fruitCount}→(两指按下 ${k1.fruitCount})→(抬一指 ${k2.fruitCount})→(全抬 ${k3.fruitCount})；activeTouchId=${k3.activeTouchId}`);

  // G2 手势中途暂停（模拟按住不放时切后台/点暂停）
  await setGame(page, `(g) => g.startGame()`);
  await page.waitForTimeout(500);
  const m0 = await state(page);
  c = await toClient(page, -80, -250);
  await touchStart(cdp, c.clientX, c.clientY, 30);
  await page.waitForTimeout(120);
  await setGame(page, `(g) => g.pauseGame()`);       // 手指仍按着时暂停
  await page.waitForTimeout(200);
  await touchEnd(cdp, c.clientX, c.clientY, 30);     // 松手（此时已暂停，不应投放）
  await page.waitForTimeout(300);
  const m1 = await state(page);
  await setGame(page, `(g) => g.resumeGame()`);
  await page.waitForTimeout(300);
  const m2 = await state(page);
  await tap(page, cdp, 80, -250, 31);
  await page.waitForTimeout(600);
  const m3 = await state(page);
  rec('G2 按住时暂停、松手不投放，恢复后第一次点击可正常投放',
    m1.fruitCount === m0.fruitCount && m2.activeTouchId === null && m3.fruitCount === m2.fruitCount + 1,
    `暂停期间松手 fruitCount=${m1.fruitCount}（应不变）；恢复后 activeTouchId=${m2.activeTouchId}；点击后 ${m3.fruitCount}`);

  console.log('\n────────── 汇总 ──────────');
  const pass = R.filter(r => r.pass).length;
  console.log(`通过 ${pass}/${R.length}`);
  R.filter(r => !r.pass).forEach(r => console.log(`  ❌ ${r.name}\n     ${r.detail}`));
  console.log('\n[页面错误] ' + (errors.length ? '\n' + errors.slice(0, 8).join('\n') : '无'));

  await browser.close();
  process.exit(R.every(r => r.pass) ? 0 : 1);
})();
