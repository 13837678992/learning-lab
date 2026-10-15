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

## 4. 资源授权风险标记
- 水果/果汁图片、音效均抓取自原版在线游戏（wesane），**未获得商用授权**，本项目仅个人学习使用，不得商用发布。
- 字体 myFont 来源不明，同样仅限个人使用。
