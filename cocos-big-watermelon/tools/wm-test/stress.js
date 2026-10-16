// 长局/长时间压力测试：连续多轮 + 大量投放 + 频繁暂停，检查投放是否逐渐失效
// 运行：node stress.js
const { launch, toClient, state, touchStart, touchEnd, tap, fruitPositions, GET_GAME } = require('./lib');
async function setGame(page, fn) { return page.evaluate(`(() => { const g = ${GET_GAME}; (${fn})(g); })()`); }

(async () => {
  const { browser, page, errors } = await launch();
  const cdp = await page.context().newCDPSession(page);

  let totalDrops = 0, totalClicks = 0, staleLocks = 0;
  const perRound = [];

  // 6 轮完整对局，每轮大量投放 + 周期性暂停恢复 + 道具穿插
  for (let round = 1; round <= 6; round++) {
    await setGame(page, `(g) => g.startGame()`);
    await page.waitForTimeout(400);
    const start = await state(page);
    let dropped = 0;

    for (let i = 0; i < 25; i++) {
      const x = -190 + (i * 53) % 380;
      const before = await state(page);
      totalClicks++;
      await tap(page, cdp, x, -250, 300 + (i % 40));
      await page.waitForTimeout(260);
      const after = await state(page);
      if (after.fruitCount > before.fruitCount) { dropped++; totalDrops++; }
      else if (after.activeTouchId !== null) staleLocks++;

      // 每 6 次投放穿插一次暂停恢复
      if (i % 6 === 5) {
        await setGame(page, `(g) => g.pauseGame()`);
        await page.waitForTimeout(120);
        await setGame(page, `(g) => g.resumeGame()`);
        await page.waitForTimeout(120);
        const s = await state(page);
        if (s.activeTouchId !== null) staleLocks++;
      }
      // 每 10 次穿插一次洗牌
      if (i % 10 === 9) {
        await setGame(page, `(g) => { g.onItemTap('shuffle'); }`);
        await page.waitForTimeout(2600);
      }
    }

    const end = await state(page);
    perRound.push({ round, dropped, score: end.score, fruits: end.fruitNodes, touchLock: end.activeTouchId });
    console.log(`第 ${round} 轮：投放 ${dropped}/25 次，分数 ${end.score}，场上水果 ${end.fruitNodes}，残留手势锁=${end.activeTouchId}`);
  }

  console.log(`\n合计：点击 ${totalClicks} 次，成功投放 ${totalDrops} 次，检测到残留手势锁次数=${staleLocks}`);

  // 判定：每轮投放率应保持稳定（不随时间劣化），且无残留手势锁
  const rates = perRound.map(r => r.dropped);
  const firstHalf = rates.slice(0, 3).reduce((a, b) => a + b, 0);
  const secondHalf = rates.slice(3).reduce((a, b) => a + b, 0);
  const stable = secondHalf >= firstHalf * 0.7;
  console.log(`投放率：前半 ${firstHalf} vs 后半 ${secondHalf} → ${stable ? '稳定（未劣化）' : '劣化!'}`);
  console.log(`最终残留手势锁：${(await state(page)).activeTouchId}（应为 null）`);
  console.log(`页面错误：${errors.length ? errors.slice(0, 5).join(' | ') : '无'}`);

  await browser.close();
  const ok = stable && staleLocks === 0 && errors.length === 0;
  console.log(ok ? '\n✅ 长局压力测试通过' : '\n❌ 长局压力测试未通过');
  process.exit(ok ? 0 : 1);
})();
