# 投放输入回归测试（wm-test）

用 Playwright + CDP 真实触摸事件驱动 **web-mobile 构建**，复现/回归「点击投放失效」类问题。
脚本只读取运行中的游戏（通过 `cc.find('Canvas')` 上带 `tryDrop` 的组件定位 Game 脚本），
不改动游戏源码。

## 依赖

需要 `playwright-core` 与已下载的 Chromium。本机通过软链复用现有安装：

```bash
mkdir -p /tmp/wm-test
ln -sfn <某个已装 playwright-core 的 node_modules> /tmp/wm-test/node_modules
cp tools/wm-test/*.js /tmp/wm-test/
```

`lib.js` 顶部 `PW_ROOT` 指向可用的 `playwright-core`；`WM_URL` 可用环境变量覆盖。

## 用法

```bash
# 1) 先构建（测试的是构建产物，不是源码）
~/tools/creator/CocosCreator.app/Contents/MacOS/CocosCreator --path . --build "platform=web-mobile;debug=true"

# 2) 起静态服务器（Cocos 需 http 协议）
node server.js /path/to/cocos-big-watermelon/build/web-mobile 8199

# 3) 跑测试
node verify.js     # 21 项：基础投放/根因回归/暂停恢复/异常注入自愈/玩法回归
node verify2.js    #  5 项：生成与补位失败注入、多指与暂停边界
node stress.js     # 长局压力：6 轮 × 25 次点击，检查投放是否逐渐失效
```

## 用例分布

| 文件 | 覆盖 |
| --- | --- |
| `verify.js` | 投放间隔与防重复、点水果上投放、**根因一**（手势中销毁水果）、**根因二**（待投水果被合成）、暂停/恢复兜底、注入失效手势锁与缺失待投水果、消除/撤销/洗牌/重开回归 |
| `verify2.js` | 投放中途抛错、预制体缺失、补位任务抛错、多指手势、按住时暂停 |
| `stress.js` | 长时间连续多轮对局，投放率是否随时间劣化、是否残留手势锁 |

## 说明

- 触摸用 CDP `Input.dispatchTouchEvent` 注入，因此可以按住不放、多指、精确控制抬起时机。
- `state(page)` 返回投放相关状态（`activeTouchId` / `currentFruit` / `fruitCount` / 洗牌锁等）；
  `tap()` 按 Canvas 本地坐标换算到客户端像素，坐标换算已用「点已知 x 读回 aimX」校准。
