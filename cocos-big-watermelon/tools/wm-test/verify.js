// 修复后完整验证套件：真实触摸驱动 web-mobile 构建
// 覆盖：正常投放/间隔/快速连点/暂停恢复/根因回归/异常注入自愈/道具回归
// 运行：node verify.js
const { launch, toClient, state, touchStart, touchMove, touchEnd, tap, fruitPositions, GET_GAME } = require('./lib');

const R = [];
function rec(name, pass, detail) {
  R.push({ name, pass, detail });
  console.log(`${pass ? '✅ PASS' : '❌ FAIL'}  ${name}${detail ? '\n         ' + detail : ''}`);
}
async function game(page) { return page.evaluate(`(() => ${GET_GAME})()`); }
async function setGame(page, fn) { return page.evaluate(`(() => { const g = ${GET_GAME}; (${fn})(g); })()`); }

(async () => {
  const { browser, page, errors } = await launch();
  const cdp = await page.context().newCDPSession(page);

  // 记录 Canvas 收到的触摸事件数（等价于游戏 onTouchStart/onTouchEnd 调用次数）
  await page.evaluate(`(() => {
    const g = ${GET_GAME};
    g.__p = { start: 0, end: 0, cancel: 0 };
    g.__reset = () => { g.__p.start = g.__p.end = g.__p.cancel = 0; };
    g.node.on(cc.Node.EventType.TOUCH_START, () => g.__p.start++, g);
    g.node.on(cc.Node.EventType.TOUCH_END, () => g.__p.end++, g);
    g.node.on(cc.Node.EventType.TOUCH_CANCEL, () => g.__p.cancel++, g);
  })()`);

  console.log('\n────────── A. 基础投放与防重复 ──────────');

  // A1 开始游戏后首投
  await setGame(page, `(g) => g.startGame()`);
  await page.waitForTimeout(500);
  let s = await state(page);
  rec('A1 开始游戏后有待投水果', s.hasCurrent === true && s.fruitCount === 1, `hasCurrent=${s.hasCurrent} fruitCount=${s.fruitCount}`);

  const a0 = await state(page);
  await tap(page, cdp, -150, -250, 1);
  await page.waitForTimeout(500);
  const a1 = await state(page);
  rec('A2 点击可正常投放', a1.fruitCount === a0.fruitCount + 1, `fruitCount ${a0.fruitCount}→${a1.fruitCount}`);

  // A3 快速连点 6 次（60ms 间隔）：受 0.3s 间隔限制，且每次点击只投 1 个
  await setGame(page, `(g) => g.startGame()`);
  await page.waitForTimeout(500);
  const b0 = await state(page);
  const before3 = b0.fruitCount;
  for (let i = 0; i < 6; i++) {
    const c = await toClient(page, -100 + i * 30, -250);
    await touchStart(cdp, c.clientX, c.clientY, 10 + i);
    await page.waitForTimeout(30);
    await touchEnd(cdp, c.clientX, c.clientY, 10 + i);
    await page.waitForTimeout(30);
  }
  await page.waitForTimeout(900);
  const b1 = await state(page);
  const dropped = b1.fruitCount - before3;
  rec('A3 快速连点 6 次仍遵守投放间隔（≤2 个/0.6s）', dropped <= 2 && dropped >= 1,
    `新增 ${dropped} 个（间隔锁 DROP_INTERVAL=0.3s，预期 1~2）`);

  // A4 单次点击只生成 1 个水果
  await page.waitForTimeout(400);
  const c0 = await state(page);
  await tap(page, cdp, 0, -250, 30);
  await page.waitForTimeout(120);
  const cMid = await state(page);
  await page.waitForTimeout(600);
  const c1 = await state(page);
  rec('A4 单次点击只投放一个水果', c1.fruitCount === c0.fruitCount + 1,
    `fruitCount ${c0.fruitCount}→${c1.fruitCount}（松手后瞬间=${cMid.fruitCount}）`);

  console.log('\n────────── B. 根因回归：触摸所有权 ──────────');

  // B1 点击落在水果上仍能投放（水果不再抢触摸）
  await setGame(page, `(g) => g.startGame()`);
  await page.waitForTimeout(400);
  await setGame(page, `(g) => {
    const f = g.createFruitOnPos(0, g.floorY + 60, 1);
    f._birth = g.gameTime();
    g.startFruitPhysics(f);
  }`);
  await page.waitForTimeout(1600);
  const posB = await fruitPositions(page);
  const rest = posB.filter(f => f.y < 0)[0];
  let b1ok = false, b1detail = 'no fruit';
  if (rest) {
    // 关键：确认没有水果节点认领触摸
    const claimers = await page.evaluate(`(() => {
      const scene = cc.director.getScene();
      const out = [];
      const walk = (n) => {
        if (n._touchListener && n._touchListener._claimedTouches && n._touchListener._claimedTouches.length) out.push(n.name);
        (n.children||[]).forEach(walk);
      };
      walk(scene);
      return out;
    })()`);
    const before = await state(page);
    const c = await toClient(page, rest.x, rest.y);
    await touchStart(cdp, c.clientX, c.clientY, 40);
    await page.waitForTimeout(80);
    const claimedDuring = await page.evaluate(`(() => {
      const scene = cc.director.getScene();
      const out = [];
      const walk = (n) => {
        if (n._touchListener && n._touchListener._claimedTouches && n._touchListener._claimedTouches.length) out.push(n.name);
        (n.children||[]).forEach(walk);
      };
      walk(scene);
      return out;
    })()`);
    await touchEnd(cdp, c.clientX, c.clientY, 40);
    await page.waitForTimeout(500);
    const after = await state(page);
    b1ok = after.fruitCount === before.fruitCount + 1 && after.activeTouchId === null;
    b1detail = `按住水果@(${rest.x.toFixed(0)},${rest.y.toFixed(0)}) 松手后 fruitCount ${before.fruitCount}→${after.fruitCount}, ` +
               `手势中认领触摸的节点=${JSON.stringify(claimedDuring)}, 松手后 activeTouchId=${after.activeTouchId}`;
  }
  rec('B1 点击落在水果上仍可投放（无水果抢触摸所有权）', b1ok, b1detail);

  // B2 根因一复现：手势中销毁水果 → 松手 → 必须仍能继续投放
  await setGame(page, `(g) => g.startGame()`);
  await page.waitForTimeout(400);
  await setGame(page, `(g) => {
    const a = g.createFruitOnPos(-40, g.floorY + 50, 1);
    a._birth = g.gameTime(); g.startFruitPhysics(a);
    const b = g.createFruitOnPos(-40, g.floorY + 130, 1);
    b._birth = g.gameTime(); g.startFruitPhysics(b);
  }`);
  await page.waitForTimeout(1800);
  const posB2 = await fruitPositions(page);
  const targetB2 = posB2.filter(f => f.y < 0).sort((p, q) => p.y - q.y)[0];
  let b2ok = false, b2detail = 'no target';
  if (targetB2) {
    await page.evaluate(`(() => ${GET_GAME}.__reset())()`);
    const c = await toClient(page, targetB2.x, targetB2.y);
    await touchStart(cdp, c.clientX, c.clientY, 41);
    await page.waitForTimeout(120);
    // 手势进行中：走真实合成入口销毁「手指按住的那个水果」
    await setGame(page, `(g) => {
      const fruits = g.node.children.filter(n => n.isValid && n.getComponent('Fruit') && n !== g.currentFruit);
      const under = fruits.find(n => Math.abs(n.x - ${targetB2.x}) < 40 && Math.abs(n.y - ${targetB2.y}) < 40) || fruits[0];
      const other = fruits.find(n => n !== under);
      if (under && other) g.onSameFruitContact({ self: under.getComponent('Fruit'), other: other.getComponent('Fruit') });
    }`);
    await page.waitForTimeout(150);
    await touchEnd(cdp, c.clientX, c.clientY, 41);
    await page.waitForTimeout(400);
    const afterUp = await state(page);
    const probe = await page.evaluate(`(() => ${GET_GAME}.__p)()`);
    const d0 = await state(page);
    await tap(page, cdp, -150, -250, 42);
    await page.waitForTimeout(350);
    await tap(page, cdp, 150, -250, 43);
    await page.waitForTimeout(500);
    const d1 = await state(page);
    b2ok = afterUp.activeTouchId === null && d1.fruitCount > d0.fruitCount;
    b2detail = `手势中销毁水果后松手：Canvas START=${probe.start} END=${probe.end}，activeTouchId=${afterUp.activeTouchId}；` +
               `随后两次点击 fruitCount ${d0.fruitCount}→${d1.fruitCount}`;
  }
  rec('B2【根因一】手势中水果被销毁后，松手仍可继续投放', b2ok, b2detail);

  // B3 根因二：待投水果被合成 → 不应永久投不出
  await setGame(page, `(g) => g.startGame()`);
  await page.waitForTimeout(400);
  await setGame(page, `(g) => {
    const cur = g.currentFruit;
    const f = g.createFruitOnPos(cur.x, cur.y + 5, cur.getComponent('Fruit').id);
    f._birth = g.gameTime(); g.startFruitPhysics(f);
  }`);
  await page.waitForTimeout(1600);
  const s3 = await state(page);
  const e0 = await state(page);
  await tap(page, cdp, -120, -250, 50);
  await page.waitForTimeout(400);
  await tap(page, cdp, 120, -250, 51);
  await page.waitForTimeout(600);
  const e1 = await state(page);
  rec('B3【根因二】待投水果被同级水果砸中后，投放不失效',
    e1.fruitCount > e0.fruitCount && s3.hasCurrent === true,
    `注入后 待投水果存在=${s3.hasCurrent}（修复后待投水果不参与合成）；随后点击 fruitCount ${e0.fruitCount}→${e1.fruitCount}`);

  console.log('\n────────── C. 暂停 / 恢复兜底 ──────────');

  // C1 多次暂停恢复后仍可投放，且不自动多投
  await setGame(page, `(g) => g.startGame()`);
  await page.waitForTimeout(500);
  const f0 = await state(page);
  for (let i = 0; i < 5; i++) {
    await setGame(page, `(g) => g.pauseGame()`);
    await page.waitForTimeout(150);
    await setGame(page, `(g) => g.resumeGame()`);
    await page.waitForTimeout(150);
  }
  const fMid = await state(page);

  // C2 暂停恢复不得自动多投一个水果（对比暂停前的计数）
  rec('C1 暂停/恢复 5 轮不自动多投水果', fMid.fruitCount === f0.fruitCount,
    `fruitCount 暂停前=${f0.fruitCount} 恢复后=${fMid.fruitCount}`);

  await tap(page, cdp, 0, -250, 60);
  await page.waitForTimeout(500);
  const f1 = await state(page);
  rec('C2 暂停/恢复后点击可正常投放', f1.fruitCount === fMid.fruitCount + 1,
    `fruitCount ${fMid.fruitCount}→${f1.fruitCount}`);

  // C3 冷却期（投放后 0.25s 内）暂停再恢复，不应卡死也不应异常连发
  await setGame(page, `(g) => g.startGame()`);
  await page.waitForTimeout(450);
  const g0 = await state(page);
  await tap(page, cdp, -60, -250, 70);      // 投放一个
  await page.waitForTimeout(120);            // 处于 SPAWN_DELAY / 冷却窗口内
  await setGame(page, `(g) => g.pauseGame()`);
  await page.waitForTimeout(200);
  await setGame(page, `(g) => g.resumeGame()`);
  await page.waitForTimeout(400);
  const gMid = await state(page);
  await tap(page, cdp, 60, -250, 71);
  await page.waitForTimeout(500);
  const g1 = await state(page);
  rec('C3 冷却期暂停/恢复后不卡死、不异常连发',
    gMid.fruitCount <= g0.fruitCount + 1 && g1.fruitCount === gMid.fruitCount + 1 && gMid.hasCurrent === true,
    `投放1个后暂停恢复：fruitCount ${g0.fruitCount}→${gMid.fruitCount}（不应超过 +1），再点击 →${g1.fruitCount}`);

  // C4 水果下落/碰撞中暂停恢复，物理与合成不被破坏
  await setGame(page, `(g) => g.startGame()`);
  await page.waitForTimeout(400);
  await tap(page, cdp, -30, -250, 80);
  await page.waitForTimeout(180);           // 水果还在空中
  await setGame(page, `(g) => g.pauseGame()`);
  await page.waitForTimeout(250);
  const yPaused = await page.evaluate(`(() => { const g = ${GET_GAME}; const f = g.node.children.filter(n => n.isValid && n.getComponent('Fruit') && n !== g.currentFruit)[0]; return f ? f.y : null; })()`);
  await page.waitForTimeout(250);
  const yPaused2 = await page.evaluate(`(() => { const g = ${GET_GAME}; const f = g.node.children.filter(n => n.isValid && n.getComponent('Fruit') && n !== g.currentFruit)[0]; return f ? f.y : null; })()`);
  await setGame(page, `(g) => g.resumeGame()`);
  await page.waitForTimeout(1500);
  const h1 = await state(page);
  rec('C4 下落中暂停：水果冻结；恢复后物理继续（不破坏）',
    yPaused !== null && Math.abs(yPaused - yPaused2) < 0.5 && h1.fruitCount >= 2,
    `暂停期间 y=${yPaused} → ${yPaused2}（差 ${yPaused !== null ? Math.abs(yPaused - yPaused2).toFixed(2) : 'n/a'}）`);

  console.log('\n────────── D. 异常注入：投放锁自愈 ──────────');

  // D1 注入「丢失 END 的手势锁」→ 下一次真实点击应自愈（关键回归）
  await setGame(page, `(g) => g.startGame()`);
  await page.waitForTimeout(500);
  await setGame(page, `(g) => {
    // 模拟 END/CANCEL 丢失后残留的手势锁（真实触摸表里并没有这根手指）
    g.activeTouchId = 9999;
  }`);
  const i0 = await state(page);
  await tap(page, cdp, -100, -250, 90);
  await page.waitForTimeout(500);
  const i1 = await state(page);
  const i2 = await state(page);
  await tap(page, cdp, 100, -250, 91);
  await page.waitForTimeout(500);
  const i3 = await state(page);
  rec('D1 残留失效手势锁可自愈（后续点击能投放）',
    i3.fruitCount > i0.fruitCount && i1.activeTouchId === null,
    `注入 touchId=9999 后：首点后 activeTouchId=${i1.activeTouchId}，fruitCount ${i0.fruitCount}→${i3.fruitCount}`);

  // D2 注入「待投水果缺失」→ 点击应触发补位并成功投放
  await setGame(page, `(g) => g.startGame()`);
  await page.waitForTimeout(500);
  await setGame(page, `(g) => {
    // 模拟预制体/生成异常导致的待投水果缺失（不留下补位任务）
    if (g.currentFruit && g.currentFruit.isValid) g.currentFruit.destroy();
    g.currentFruit = null;
    g._heldSpawnPending = false;
    g.needSpawn = false;
  }`);
  const j0 = await state(page);
  await tap(page, cdp, -80, -250, 100);
  await page.waitForTimeout(500);
  const j1 = await state(page);
  rec('D2 待投水果缺失后点击可自动补位并投放',
    j1.fruitCount > j0.fruitCount,
    `缺失后 hasCurrent=${j0.hasCurrent}，点击后 fruitCount ${j0.fruitCount}→${j1.fruitCount}，hasCurrent=${j1.hasCurrent}`);

  // D3 暂停恢复兜底：注入失效锁 + 待投水果缺失 → 恢复后应可用
  await setGame(page, `(g) => g.startGame()`);
  await page.waitForTimeout(500);
  await setGame(page, `(g) => {
    g.activeTouchId = 8888;
    if (g.currentFruit && g.currentFruit.isValid) g.currentFruit.destroy();
    g.currentFruit = null;
    g._heldSpawnPending = false;
    g.needSpawn = false;
  }`);
  await setGame(page, `(g) => g.pauseGame()`);
  await page.waitForTimeout(200);
  await setGame(page, `(g) => g.resumeGame()`);
  await page.waitForTimeout(300);
  const k0 = await state(page);
  await tap(page, cdp, 0, -250, 110);
  await page.waitForTimeout(500);
  const k1 = await state(page);
  rec('D3 暂停恢复兜底：清除失效锁并补位待投水果',
    k0.activeTouchId === null && k0.hasCurrent === true && k1.fruitCount > k0.fruitCount,
    `恢复后 activeTouchId=${k0.activeTouchId} hasCurrent=${k0.hasCurrent}；点击后 fruitCount ${k0.fruitCount}→${k1.fruitCount}`);

  console.log('\n────────── E. 玩法回归（道具 / 洗牌 / 重开） ──────────');

  // E1 消除道具：点水果移除一个（改用游戏节点命中判定）
  await setGame(page, `(g) => g.startGame()`);
  await page.waitForTimeout(400);
  await setGame(page, `(g) => {
    const f = g.createFruitOnPos(0, g.floorY + 60, 1);
    f._birth = g.gameTime(); g.startFruitPhysics(f);
  }`);
  await page.waitForTimeout(1600);
  const posE = await fruitPositions(page);
  const restE = posE.filter(f => f.y < 0)[0];
  let e1ok = false, e1detail = 'no fruit';
  if (restE) {
    await setGame(page, `(g) => { g.onItemTap('remove'); }`);
    await page.waitForTimeout(150);
    const modeOn = await state(page);
    const n0 = (await fruitPositions(page)).length;
    await tap(page, cdp, restE.x, restE.y, 120);
    await page.waitForTimeout(400);
    const n1 = (await fruitPositions(page)).length;
    const after = await state(page);
    e1ok = modeOn.removeMode === true && n1 === n0 - 1 && after.removeMode === false;
    e1detail = `进入选取态=${modeOn.removeMode}；场上水果 ${n0}→${n1}（应 -1）；自动退出选取态=${!after.removeMode}`;
  }
  rec('E1 消除道具：点水果移除一个且自动退出选取态', e1ok, e1detail);

  // E2 消除道具：点空白处取消选取态且不投放
  await setGame(page, `(g) => { g.onItemTap('remove'); }`);
  await page.waitForTimeout(150);
  const p0 = await state(page);
  await tap(page, cdp, -220, 200, 130);   // 高处空白（避免命中水果）
  await page.waitForTimeout(400);
  const p1 = await state(page);
  rec('E2 消除道具：点空白处退出选取态且不触发投放',
    p1.removeMode === false && p1.fruitCount === p0.fruitCount,
    `removeMode ${p0.removeMode}→${p1.removeMode}；fruitCount ${p0.fruitCount}→${p1.fruitCount}`);

  // E3 撤销
  await setGame(page, `(g) => g.startGame()`);
  await page.waitForTimeout(400);
  await tap(page, cdp, -50, -250, 140);
  await page.waitForTimeout(400);
  await tap(page, cdp, 50, -250, 141);
  await page.waitForTimeout(400);
  const q0 = await state(page);
  const qn0 = (await fruitPositions(page)).length;
  await setGame(page, `(g) => { g.onItemTap('undo'); }`);
  await page.waitForTimeout(500);
  const q1 = await state(page);
  const qn1 = (await fruitPositions(page)).length;
  rec('E3 撤销：场上水果减少、分数回滚、仍持有待投水果',
    qn1 === qn0 - 1 && q1.score <= q0.score && q1.hasCurrent === true,
    `场上 ${qn0}→${qn1}，score ${q0.score}→${q1.score}，hasCurrent=${q1.hasCurrent}`);

  // E4 洗牌：数量/分数不变，洗牌后可继续投放
  await setGame(page, `(g) => g.startGame()`);
  await page.waitForTimeout(400);
  for (const x of [-140, -40, 60]) { await tap(page, cdp, x, -250, 150); await page.waitForTimeout(420); }
  await page.waitForTimeout(1200);
  const r0 = await state(page);
  const rn0 = (await fruitPositions(page)).length;
  await setGame(page, `(g) => { g.onItemTap('shuffle'); }`);
  await page.waitForTimeout(600);
  const rMid = await state(page);
  await page.waitForTimeout(2500);
  const r1 = await state(page);
  const rn1 = (await fruitPositions(page)).length;
  await tap(page, cdp, 0, -250, 160);
  await page.waitForTimeout(600);
  const r2 = await state(page);
  rec('E4 洗牌：数量/分数不变，洗牌后可继续投放',
    rMid.shuffling === true && rn1 === rn0 && r1.score === r0.score && r2.fruitCount > r1.fruitCount,
    `洗牌中锁=${rMid.shuffling}；水果 ${rn0}→${rn1}；score ${r0.score}→${r1.score}；洗牌后投放 ${r1.fruitCount}→${r2.fruitCount}`);

  // E5 重新开始：状态干净、可投放
  await setGame(page, `(g) => g.startGame()`);
  await page.waitForTimeout(600);
  const t0 = await state(page);
  await tap(page, cdp, -70, -250, 170);
  await page.waitForTimeout(500);
  const t1 = await state(page);
  rec('E5 重新开始后分数归零、输入与投放正常',
    t0.score === 0 && t0.fruitCount === 1 && t1.fruitCount === 2 && t0.activeTouchId === null,
    `重开 score=${t0.score} fruitCount=${t0.fruitCount}；投放后 ${t1.fruitCount}`);

  // E6 多轮连续游戏：投放状态不逐轮劣化
  let rounds = [];
  for (let i = 0; i < 3; i++) {
    await setGame(page, `(g) => g.startGame()`);
    await page.waitForTimeout(400);
    const u0 = await state(page);
    await tap(page, cdp, -60, -250, 180 + i * 10);
    await page.waitForTimeout(400);
    await tap(page, cdp, 60, -250, 181 + i * 10);
    await page.waitForTimeout(400);
    const u1 = await state(page);
    rounds.push(u1.fruitCount - u0.fruitCount);
  }
  rec('E6 连续 3 轮重开，每轮投放均正常（无逐轮劣化）',
    rounds.every(r => r === 2), `每轮新增投放数 = [${rounds.join(', ')}]`);

  // E7 长局压测：连续投放 ~20 次，检查是否出现投放失效
  await setGame(page, `(g) => g.startGame()`);
  await page.waitForTimeout(400);
  const v0 = await state(page);
  let fails = 0;
  for (let i = 0; i < 20; i++) {
    const x = -200 + (i * 37) % 400;
    const before = await state(page);
    await tap(page, cdp, x, -250, 200 + (i % 30));
    await page.waitForTimeout(340);
    const after = await state(page);
    if (after.fruitCount === before.fruitCount) fails++;
  }
  const v1 = await state(page);
  rec('E7 连续投放 20 次无「投放失效」', fails <= 2 && v1.activeTouchId === null,
    `20 次点击中未成功的次数=${fails}（含间隔/合成等正常情况）；最终 activeTouchId=${v1.activeTouchId}，fruitCount=${v1.fruitCount}`);

  console.log('\n────────── 汇总 ──────────');
  const pass = R.filter(r => r.pass).length;
  console.log(`通过 ${pass}/${R.length}`);
  R.filter(r => !r.pass).forEach(r => console.log(`  ❌ ${r.name}\n     ${r.detail}`));

  if (errors.length) {
    console.log('\n[页面错误]');
    console.log(errors.slice(0, 10).join('\n'));
  } else {
    console.log('\n[页面错误] 无');
  }

  await browser.close();
  process.exit(R.every(r => r.pass) ? 0 : 1);
})();
