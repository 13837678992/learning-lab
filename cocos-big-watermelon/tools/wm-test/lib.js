// 通用辅助：启动游戏、坐标换算、触摸注入、状态查询
const { chromium } = require('playwright-core');
const PW_ROOT = '/Users/weicheng/code/learning-lab/large-qrcode-transfer/node_modules/playwright-core';

const URL = process.env.WM_URL || 'http://127.0.0.1:8199/index.html';

async function launch() {
  const browser = await chromium.launch({
    executablePath: PW_ROOT.replace('node_modules/playwright-core', '') + 'node_modules/playwright-core/.local-browsers/chromium-1234/chrome-mac-arm64/Chromium.app/Contents/MacOS/Chromium',
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox']
  }).catch(async () => {
    // 回退：用 Playwright 缓存中的默认 chromium
    return chromium.launch({
      headless: true,
      args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox']
    });
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push('console.error: ' + m.text());
  });
  await page.goto(URL, { waitUntil: 'domcontentloaded' });

  // 等待引擎与 Game 组件就绪
  await page.waitForFunction(() => {
    if (!window.cc || !cc.director || !cc.director.getScene()) return false;
    const canvas = cc.find('Canvas');
    if (!canvas) return false;
    const comps = canvas.getComponents(cc.Component);
    return comps.some((c) => c && typeof c.tryDrop === 'function');
  }, null, { timeout: 60000 });
  await page.waitForTimeout(600);

  return { browser, context, page, errors };
}

// 在页面内取到 Game 组件（用鸭子类型定位，避免依赖类名）
const GET_GAME = `(() => {
  const canvas = cc.find('Canvas');
  return canvas.getComponents(cc.Component).find((c) => c && typeof c.tryDrop === 'function');
})()`;

// Canvas 本地坐标(中心为原点) → 客户端 CSS 坐标
async function toClient(page, x, y) {
  return page.evaluate(({ x, y }) => {
    const game = (() => {
      const canvas = cc.find('Canvas');
      return canvas.getComponents(cc.Component).find((c) => c && typeof c.tryDrop === 'function');
    })();
    const W = game.W, H = game.H;
    const rect = cc.game.canvas.getBoundingClientRect();
    // Canvas 节点中心对应可见区中心，控件坐标以中心为原点
    const u = (x + W / 2) / W;
    const v = (y + H / 2) / H;
    return {
      clientX: rect.left + u * rect.width,
      clientY: rect.top + (1 - v) * rect.height,
      rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
      W, H
    };
  }, { x, y });
}

async function state(page) {
  return page.evaluate(`(() => {
    const game = ${GET_GAME};
    const fruits = game.node.children.filter((c) => c.isValid && c.getComponent('Fruit'));
    return {
      state: game.state,
      activeTouchId: game.activeTouchId,
      hasCurrent: !!(game.currentFruit && game.currentFruit.isValid),
      fruitNodes: fruits.length,
      fruitCount: game.fruitCount,
      score: game.score,
      needSpawn: game.needSpawn,
      shuffling: game.shuffling,
      removeMode: game.removeMode,
      lastDropTime: game.lastDropTime,
      now: game.gameTime(),
      pauseLayerActive: !!(game.pauseLayer && game.pauseLayer.active),
      menuLayerActive: !!(game.menuLayer && game.menuLayer.active),
      overLayerActive: !!(game.overLayer && game.overLayer.active),
      listenerOK: {
        start: game.node.hasEventListener(cc.Node.EventType.TOUCH_START),
        move: game.node.hasEventListener(cc.Node.EventType.TOUCH_MOVE),
        end: game.node.hasEventListener(cc.Node.EventType.TOUCH_END),
        cancel: game.node.hasEventListener(cc.Node.EventType.TOUCH_CANCEL)
      }
    };
  })()`);
}

// 用 CDP 注入真实触摸事件（可按住不放，id 稳定）
async function touchStart(cdp, x, y, id = 1) {
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x, y, id, radiusX: 5, radiusY: 5, force: 1 }]
  });
}
async function touchMove(cdp, x, y, id = 1) {
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x, y, id, radiusX: 5, radiusY: 5, force: 1 }]
  });
}
async function touchEnd(cdp, x, y, id = 1) {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

async function tap(page, cdp, x, y, id = 1) {
  const c = await toClient(page, x, y);
  await touchStart(cdp, c.clientX, c.clientY, id);
  await page.waitForTimeout(60);
  await touchEnd(cdp, c.clientX, c.clientY, id);
  await page.waitForTimeout(120);
}

// 场上所有水果的 Canvas 本地坐标
async function fruitPositions(page) {
  return page.evaluate(`(() => {
    const game = ${GET_GAME};
    return game.node.children
      .filter((c) => c.isValid && c.getComponent('Fruit') && c !== game.currentFruit)
      .map((c) => ({ x: c.x, y: c.y, id: c.getComponent('Fruit').id, w: c.width }));
  })()`);
}

module.exports = { launch, toClient, state, touchStart, touchMove, touchEnd, tap, fruitPositions, GET_GAME };
