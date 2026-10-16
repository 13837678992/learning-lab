# 项目审计报告（project-audit）

日期：2026-10-15
审计对象：`/Users/weicheng/code/learning-lab/cocos-big-watermelon`（来源 https://github.com/tangxiangmin/cocos-big-watermelon）

## 1. 项目概况

| 项目 | 结论 |
| --- | --- |
| 引擎 | Cocos Creator **2.4.3**（`project.json` 中 `version: 2.4.3`，engine: cocos-creator-js） |
| 语言 | JavaScript（非 TypeScript），3 个游戏脚本共约 385 行 |
| 场景 | 单场景 `assets/game.fire`（设计分辨率 640x960，竖屏设计，fitHeight） |
| 物理 | Box2D（cc.RigidBody + cc.PhysicsCircleCollider），重力 -960 |
| 资源 | 11 级水果 PNG、果汁粒子图、3 个音效（boom/knock/water）、位图数字字体 myFont |
| 预制体 | `fruit_1.prefab`（Sprite + RigidBody + PhysicsCircleCollider，TRIMMED 尺寸模式，靠替换 SpriteFrame 决定水果大小）、`juice.prefab` |
| 授权风险 | README 声明美术与音频素材来源于 wesane.com 原版在线游戏，**未获得商用授权**，仅限个人学习使用 |

## 2. 原实现审计结论

### 2.1 已实现且可复用
- 水果创建、投放（点击后横向移动 0.3s 再开启物理）、重力下落与碰撞。
- 同级水果碰撞合成（`sameContact` 事件 + `onSameFruitContact`），合成后生成下一级水果并播放果汁粒子与音效。
- 计分（`id*2` 累加），前 3 个水果固定为 1 级、第 4 个为 2 级的引导逻辑。
- 一个"金手指"道具：进入选取状态后点击水果直接移除（无限次、无货币，原项目本身没有任何广告/支付/登录/联网代码）。

### 2.2 缺失与缺陷（本次改造修复）
1. **无游戏结束判定**：水果堆到顶部不会结束。
2. **无重新开始**、无主菜单、无暂停。
3. **无最高分记录**、无下一个水果预览。
4. **两个大西瓜合成未实现**（只有 `console.log` todo）。
5. 防重复合成仅靠 `other.node.off('sameContact')`，第三方水果同帧碰撞时可能重复计分/重复销毁。
6. 边界墙厚度只有 1px 且未开 bullet CCD，高速下落的小水果有穿墙风险。
7. 水果飞出边界后无兜底清理。
8. `Juice.init` 中 `circle = data.particle` 笔误。
9. 构建配置为**横屏**（landscapeLeft/Right），与竖屏玩法不符。
10. 分数 Label 锚点/位置固定，未适配不同长宽比；道具按钮位置写死。
11. 无 Android 返回键、切后台暂停处理。
12. 无任何本地存档。

### 2.3 广告/支付/联网检查
- 全项目 `grep` 未发现广告 SDK、支付、内购、登录、统计、远程 URL、XMLHttpRequest/fetch 联网请求。
- 原"金手指"道具即为免费无限次设计，无货币系统需要移除。
- 结论：**原项目干净，无需删除付费逻辑**；本次改造继续保证零货币、零广告、零联网。

## 3. 本次改造记录

### 3.1 代码修改
| 文件 | 修改 |
| --- | --- |
| `assets/scripts/Game.js` | 全面重写：状态机（主菜单/进行中/暂停/结束）、拖拽瞄准+松手投放、游戏结束判定（危险线停留 2s）、重新开始、最高分/音效开关本地存档（cc.sys.localStorage）、下一个水果预览、大西瓜对撞消除+奖励分、合成防重入（_merging 标记）、加厚边界墙+bullet CCD、飞出边界兜底清理、4 个免费道具（消除/撤销/洗牌/瞄准，全部无限次）、竖屏自适应布局（运行时按画布实际尺寸定位所有 UI）、Android 返回键与切后台自动暂停、纯代码构建全部 UI（不修改场景序列化数据） |
| `assets/scripts/Fruit.js` | 增加 `fruitContact` 事件（用于碰撞音效节流播放）、节点有效性校验 |
| `assets/scripts/Juice.js` | 修复 `circle = data.particle` 笔误 |
| `settings/builder.json` | 改为竖屏（portrait only）、包名 `com.learning.bigwatermelon`、标题"合成大西瓜" |
| `project.json` / `*.meta` | 由 Cocos Creator 2.4.13 首次导入自动升级版本号（UUID 未变） |

### 3.2 道具设计（全部免费、无限次、无任何消耗）
- **消除**：按钮进入选取态（高亮），点击一个场上水果移除并播放果汁特效；点空白处或再次点按钮取消；一次点击只移除一个水果。
- **撤销**：快照式回滚。每次投放前记录场上所有水果（id/坐标）、分数、待投放与下一个水果 id；撤销时销毁当前场面并按快照重建，可连续多级撤销（栈深 50）。
- **洗牌**：将场上水果按尺寸降序在底部网格无重叠重排，逐个（60ms 间隔）重建并交由物理自然落定，不会飞出边界。
- **瞄准**：默认开启的落点虚线 + 落点参考圈，随手指移动实时更新，可随时开关，不影响碰撞规则。

### 3.3 引擎版本说明
- 项目原版本 2.4.3；官方 CDN 已无法直接下载 2.4.3 安装包（403/404），采用同系列最终版 **2.4.13**（官方 download.cocos.com 直链），与 2.4.3 项目完全兼容，meta/项目文件自动升级且 UUID 不变。
- 2.4.13 的 Android 模板已升级为 AGP 8.0.2 / Gradle 8.0.2，需要 JDK 17；NDK 使用 r21e（arm64 主机需给 ndk-build 打 arm64→x86_64 映射补丁）。
- 产出 Debug 与 Release 两个 APK；Release 使用自签名 keystore 并仅构建主模块（instantapp 模块签名配置与自定义 keystore 不兼容）。
- Android 返回键由原生模板 Java 层处理为退后台，JS 层 EVENT_HIDE 同步自动暂停，回前台显示暂停面板。

## 4. v1.0.1 增量改造记录

| 需求 | 实现 |
| --- | --- |
| 下落线性加速 | 水果为 Box2D 刚体，不叠加第二套重力：投放时给初速 `v0=60`，用 `gravityScale = accel/GRAVITY`（700/960）使 v = v0 + a·t 线性增长；达到 `vmax=1150` 后 gravityScale=0 停止加速；落稳（速度<24 持续 0.25s）后 gravityScale 恢复 1 交还默认物理，不再干预。参数集中于 `FALL_CFG` |
| 固定投放间隔 | 移除"等待生成/落稳"的 `isCreating` 锁，改为独立时间锁 `lastDropTime` + `DROP_INTERVAL=0.3s`（游戏时间秒级）；投放后 `SPAWN_DELAY=0.25s` 生成下一个待投水果；空中可连投、多次同时下落；点击无待投水果或间隔不足时忽略且不误记时间；暂停/结束禁止、重开重置 |
| 洗牌改向上抖动 | 删除排序/网格重排逻辑；改为对场上刚体施加统一向上速度（280）+ 随机自旋的冲量式抖动，由物理自然回落；统一速度避免水果间相对运动导致意外合成；0.5s 防连点冷却（非次数限制） |
| 版本号 | 新增 `version.json`（1.0.1 / 2）为唯一版本源；`tools/build_android.sh` 构建前注入生成工程 `app/build.gradle`；aapt2 校验 APK 元数据一致 |

## 5. 资源授权风险标记
- 水果/果汁图片、音效均抓取自原版在线游戏（wesane），**未获得商用授权**，本项目仅个人学习使用，不得商用发布。
- 字体 myFont 来源不明，同样仅限个人使用。

## 6. v1.0.4 投放输入修复记录

### 6.1 根因（已实测复现，非推测）

| # | 根因 | 触发条件 | 后果 |
| --- | --- | --- | --- |
| 1 | 水果节点注册 `TOUCH_START` 并认领（claim + swallow）触摸，游戏节点只靠事件冒泡收到 | 手势进行中该水果被销毁（合成 `onSameFruitContact` 销毁两个节点、消除道具、`update` 越界安全网） | 引擎 `_onPreDestroy → removeListeners` 移除该 listener，`TOUCH_END`/`CANCEL` 不再送达任何节点 → `activeTouchId` 永久残留 → 后续每次 `TOUCH_START` 在 `activeTouchId !== null` 处提前返回。暂停/恢复不清理该变量，故「恢复后仍不能投」 |
| 2 | 待投水果 `currentFruit` 会被下落水果同级接触合成（待投水果是 Static + 半径 0 刚体，仍参与接触） | 水果堆到投放口、或被注入同级水果 | `onSameFruitContact` 销毁两者并置 `currentFruit = null`，且补位只由 `tryDrop` 末尾触发 → `tryDrop` 在 `!fruit` 处永久提前返回 |

复现方法：Playwright（Chromium）+ CDP `Input.dispatchTouchEvent` 驱动 web-mobile 构建，注入真实触摸。根因一的证据是「按住静止水果时认领触摸的节点是 `fruit_1`、Canvas 的 `_claimedTouches` 为空；手势中销毁它后松手，Canvas 收到 `START=1 END=0`」。

### 6.2 修复

| 位置 | 修改 |
| --- | --- |
| 输入所有权 | 水果不再注册任何触摸监听；消除道具改由游戏节点 `pickFruitAt()` 自行命中判定（与原有圆形判定一致：`width*0.6/2`） |
| 投放状态机 | 新增统一补位入口 `ensureHeldFruit()`（有则不生成、补位在途则等待、缺失才补），保证 PLAYING 下「待投水果有且仅有一个」；`tryDrop` 在缺待投水果时触发补位而非静默返回 |
| 合成 | 涉及 `currentFruit` 的接触直接忽略（待投水果属未投出的预览对象）；合成后仍校验并在缺失时补位 |
| 手势锁自愈 | `activeTouchId` 残留时，用引擎触摸表（`cc.internal.inputManager.getGlobalTouches/getGlobalTouchCount`）判断旧触摸是否已消失；仅当本次触摸确实被表收录（表可信）且表中只剩一根手指时才释放，避免误判导致同一次点击被处理两次 |
| 暂停恢复兜底 | `resumeGame` → `resetDropInput('暂停恢复')`：清 `activeTouchId`、按需补位、并校验输入监听是否缺失（缺失才补挂，不无条件重复注册） |
| 异常路径 | `tryDrop` / `spawnNextHeld` / `createOneFruit` 增加失败保护：生成失败不推进计数、补位失败释放补位锁、投放中途抛错回滚并补位；补位锁带时间戳，超时视为失效并被接管（旧回调迟到时会跳过生成，避免重复投放） |
| 诊断日志 | 新增默认关闭的日志（`localStorage['bigwatermelon_debug']='1'` 开启），覆盖点击忽略原因、投放成功/失败、暂停恢复状态变化、监听注册/清理时机；不逐帧输出 |

未改动：投放间隔（0.3s）、生成规则、合成规则、暂停菜单、洗牌与全部道具行为。

验证：Web 自动化 26 项断言 + 长局压力（6 轮 × 25 次点击，150/150 投放成功、无残留锁、投放率不劣化）+ Android 模拟器 adb 真实触摸（投放/点水果上投放/暂停恢复 5 轮/消除/洗牌/切后台回前台，无崩溃）。详见 `docs/test-report.md` 第 5.1 节。测试脚本在 `tools/wm-test/`。

