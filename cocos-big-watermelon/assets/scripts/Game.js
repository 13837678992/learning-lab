const Fruit = cc.Class({
    name: 'FruitItem',
    properties: {
        id: 0,
        iconSF: cc.SpriteFrame
    }
});

const JuiceItem = cc.Class({
    name: 'JuiceItem',
    properties: {
        particle: cc.SpriteFrame,
        circle: cc.SpriteFrame,
        slash: cc.SpriteFrame,
    }
});

const MAX_FRUIT_ID = 11;
const STATE = { MENU: 0, PLAYING: 1, PAUSED: 2, OVER: 3 };
const SAVE_KEY = 'bigwatermelon_save_v1';

// 下落/投放/洗牌参数集中管理
const GRAVITY = 960;
const FALL_CFG = {
    v0: 60,          // 投放初始下落速度
    accel: 700,      // 下落加速度（线性加速，v = v0 + accel * t）
    vmax: 1150,      // 最大下落速度
    settleSpeed: 24, // 判定落稳的速度阈值
    settleTime: 0.25 // 持续低于阈值多久视为落稳
};
const DROP_INTERVAL = 0.3;  // 两次投放的最小时间间隔（秒）
const SPAWN_DELAY = 0.25;   // 投放后下一个待投水果出现延迟
const SHUFFLE_CFG = {
    flightMin: 0.55,   // 单个水果抛物线飞行时长下限（秒）
    flightMax: 0.75,   // 上限
    delayStep: 0.03,   // 各水果启动时间错开
    hopMin: 0.8,       // 弹起弧顶 = 水果直径的 0.8~1.5 倍
    hopMax: 1.5,
    margin: 12,        // 目标位置与边界/彼此的最小间距
    unlockDelay: 0.9,  // 全部落位后解除洗牌锁（等待自然落定）
    attempts: 6        // 布局置换择优的有限尝试次数（防无限循环）
};
const DEBUG_KEY = 'bigwatermelon_debug';

// 诊断开关：默认关闭，排查偶发问题时在 localStorage 写入
//   cc.sys.localStorage.setItem('bigwatermelon_debug', '1')
// 后重启游戏即可打开；也可在控制台直接置 game.debugOn = true。
function debugEnabled() {
    try {
        return cc.sys.localStorage.getItem(DEBUG_KEY) === '1';
    } catch (e) {
        return false;
    }
}

cc.Class({
    extends: cc.Component,

    properties: {
        fruits: {
            default: [],
            type: Fruit
        },

        juices: {
            default: [],
            type: JuiceItem
        },

        fruitPrefab: {
            default: null,
            type: cc.Prefab
        },

        juicePrefab: {
            default: null,
            type: cc.Prefab
        },

        boomAudio: {
            default: null,
            type: cc.AudioClip
        },
        knockAudio: {
            default: null,
            type: cc.AudioClip
        },
        waterAudio: {
            default: null,
            type: cc.AudioClip
        },
        scoreLabel: {
            default: null,
            type: cc.Label
        },
        fingerBtn: {
            default: null,
            type: cc.Button
        }
    },

    onLoad() {
        this.loadSave();

        this.state = STATE.MENU;
        this.needSpawn = false;
        this.fruitCount = 0;
        this.score = 0;
        const savedBest = Number(this.saveData.bestScore);
        this.bestScore = (isFinite(savedBest) && savedBest > 0) ? Math.floor(savedBest) : 0;
        this.soundOn = this.saveData.soundOn !== false;

        this.removeMode = false;
        this.aimEnabled = true;
        this.lastDropTime = -1000;
        this.shuffling = false;
        this._shuffleFlights = null;
        this.undoStack = [];
        this.overTimer = 0;
        this.lastKnockTime = 0;
        this.activeTouchId = null;
        this.aimX = 0;
        this._heldSpawnPending = false;
        this._heldSpawnAt = 0;

        this.currentFruit = null;
        this.nextFruitId = 1;

        this.debugOn = debugEnabled();
        this.initPhysics();

        // 触摸只在游戏节点（全屏 Canvas）注册：水果等子节点不再抢触摸所有权。
        // 若由水果节点认领触摸，一旦该水果在手势结束前被销毁（合成/消除/越界回收），
        // 引擎不会再把 TOUCH_END/CANCEL 送到任何节点，手势将永远无法收尾。
        this.node.on(cc.Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(cc.Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.on(cc.Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.on(cc.Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
        this.log('输入', '监听注册完成 TOUCH_START/MOVE/END/CANCEL');

        cc.systemEvent.on(cc.SystemEvent.EventType.KEYDOWN, this.onKeyDown, this);
        cc.systemEvent.on(cc.SystemEvent.EventType.KEYUP, this.onKeyDown, this);
        cc.game.on(cc.game.EVENT_HIDE, this.onGameHide, this);
        cc.game.on(cc.game.EVENT_SHOW, this.onGameShow, this);
    },

    start() {
        if (this.fingerBtn && this.fingerBtn.node) {
            this.fingerBtn.node.active = false;
        }
        const size = this.node.getContentSize();
        this.W = size.width;
        this.H = size.height;
        this.floorY = -this.H / 2 + 110;
        this.lineY = this.H / 2 - 150;
        this.spawnY = this.H / 2 - 90;

        this.buildBounds();
        this.buildUI();
        this.showMenu();
    },

    onDestroy() {
        cc.systemEvent.off(cc.SystemEvent.EventType.KEYDOWN, this.onKeyDown, this);
        cc.systemEvent.off(cc.SystemEvent.EventType.KEYUP, this.onKeyDown, this);
        cc.game.off(cc.game.EVENT_HIDE, this.onGameHide, this);
        cc.game.off(cc.game.EVENT_SHOW, this.onGameShow, this);
        this.log('输入', '监听清理完成');
    },

    gameTime() {
        return cc.director.getTotalTime() / 1000;
    },

    // ---------------- 诊断日志 ----------------
    // 默认关闭：仅当 localStorage['bigwatermelon_debug']==='1' 时输出，
    // 用于复现偶发的投放失效问题；不在每帧输出。
    log(tag, msg) {
        if (!this.debugOn) return;
        cc.log('[投放诊断][' + tag + '] ' + msg);
    },

    // 投放相关状态快照（用于日志定位，不影响逻辑）
    dropSnapshot() {
        return 'state=' + this.state +
            ' touchId=' + this.activeTouchId +
            ' 待投=' + (this.currentFruit && this.currentFruit.isValid ? '有' : '无') +
            ' 补位中=' + this._heldSpawnPending +
            ' needSpawn=' + this.needSpawn +
            ' 洗牌中=' + this.shuffling +
            ' 距上次投放=' + (this.gameTime() - this.lastDropTime).toFixed(2) + 's';
    },

    // ---------------- 存档 ----------------
    loadSave() {
        this.saveData = {};
        try {
            const raw = cc.sys.localStorage.getItem(SAVE_KEY);
            if (raw) this.saveData = JSON.parse(raw) || {};
        } catch (e) {
            this.saveData = {};
        }
    },
    persistSave() {
        try {
            cc.sys.localStorage.setItem(SAVE_KEY, JSON.stringify({
                bestScore: this.bestScore,
                soundOn: this.soundOn
            }));
        } catch (e) { /* 存储不可用时忽略 */ }
    },

    // 最高分统一入口：每次得分变化、重新开始、游戏结束都经由此方法
    // 比较（严格大于才更新）、持久化并刷新 UI，避免多处实现不一致
    updateBest() {
        const s = Number(this.score);
        const cur = isFinite(s) && s > 0 ? Math.floor(s) : 0;
        if (cur > this.bestScore) {
            this.bestScore = cur;
            this.persistSave();
        }
        this.refreshBestUI();
    },

    refreshBestUI() {
        if (this.bestLabel) {
            this.bestLabel.getComponent(cc.Label).string = '最高分 ' + this.bestScore;
        }
        if (this.menuBestLabel) {
            this.menuBestLabel.getComponent(cc.Label).string = '最高分 ' + this.bestScore;
        }
    },

    // ---------------- 物理 ----------------
    initPhysics() {
        const instance = cc.director.getPhysicsManager();
        instance.enabled = true;
        instance.gravity = cc.v2(0, -GRAVITY);

        const collisionManager = cc.director.getCollisionManager();
        collisionManager.enabled = true;
    },

    buildBounds() {
        const w = this.W;
        const h = this.H;
        const floorY = this.floorY;
        const t = 20; // 墙体厚度，防止高速穿透

        const node = new cc.Node('bounds');
        const body = node.addComponent(cc.RigidBody);
        body.type = cc.RigidBodyType.Static;

        const addBound = (x, y, width, height) => {
            const collider = node.addComponent(cc.PhysicsBoxCollider);
            collider.offset.x = x;
            collider.offset.y = y;
            collider.size.width = width;
            collider.size.height = height;
            collider.friction = 0.3;
            collider.restitution = 0;
        };

        // 底面 top 对齐 floorY；左右墙 inner face 对齐 ±w/2；顶墙 bottom 对齐 +h/2
        addBound(0, floorY - t / 2, w + t * 2, t);
        addBound(0, h / 2 + t / 2, w + t * 2, t);
        addBound(-w / 2 - t / 2, 0, t, h + t * 2);
        addBound(w / 2 + t / 2, 0, t, h + t * 2);

        node.parent = this.node;
        this.boundsNode = node;
    },

    // ---------------- UI ----------------
    drawRoundRect(gfx, w, h, color, radius) {
        gfx.clear();
        gfx.fillColor = color;
        gfx.roundRect(-w / 2, -h / 2, w, h, radius === undefined ? 8 : radius);
        gfx.fill();
    },

    makeButton(parent, text, width, height, color, textColor, fontSize, callback) {
        const node = new cc.Node('btn');
        node.setContentSize(width, height);
        node.parent = parent;
        const gfx = node.addComponent(cc.Graphics);
        this.drawRoundRect(gfx, width, height, color);

        const labelNode = new cc.Node('label');
        labelNode.parent = node;
        const label = labelNode.addComponent(cc.Label);
        label.string = text;
        label.fontSize = fontSize;
        label.lineHeight = fontSize + 4;
        label.horizontalAlign = cc.Label.HorizontalAlign.CENTER;
        label.verticalAlign = cc.Label.VerticalAlign.CENTER;
        labelNode.color = textColor;

        node.on(cc.Node.EventType.TOUCH_START, (e) => { e.stopPropagation(); }, this);
        node.on(cc.Node.EventType.TOUCH_CANCEL, (e) => { e.stopPropagation(); }, this);
        node.on(cc.Node.EventType.TOUCH_END, (e) => {
            e.stopPropagation();
            if (callback) callback();
        }, this);
        return node;
    },

    makeText(parent, text, fontSize, color) {
        const node = new cc.Node('text');
        node.parent = parent;
        const label = node.addComponent(cc.Label);
        label.string = text;
        label.fontSize = fontSize;
        label.lineHeight = fontSize + 6;
        node.color = color || cc.color(90, 60, 20);
        return node;
    },

    makeLayer(name) {
        const layer = new cc.Node(name);
        layer.parent = this.node;
        // 弹窗层永远渲染在水果等游戏内容之上（水果为后添加的子节点，默认兄弟序会盖住弹窗）
        layer.zIndex = 1000;
        layer.setContentSize(this.W, this.H);
        const gfx = layer.addComponent(cc.Graphics);
        gfx.fillColor = cc.color(0, 0, 0, 170);
        gfx.rect(-this.W / 2, -this.H / 2, this.W, this.H);
        gfx.fill();
        layer.on(cc.Node.EventType.TOUCH_START, (e) => { e.stopPropagation(); }, this);
        layer.on(cc.Node.EventType.TOUCH_MOVE, (e) => { e.stopPropagation(); }, this);
        layer.on(cc.Node.EventType.TOUCH_END, (e) => { e.stopPropagation(); }, this);
        layer.active = false;
        return layer;
    },

    buildUI() {
        const w = this.W;
        const h = this.H;
        const CREAM = cc.color(252, 244, 214);
        const DARK = cc.color(120, 80, 30);

        // 分数（场景已有的 bitmap font label）
        if (this.scoreLabel && this.scoreLabel.node) {
            const n = this.scoreLabel.node;
            n.anchorX = 0;
            n.setPosition(-w / 2 + 18, h / 2 - 42);
        }

        // 最高分
        this.bestLabel = this.makeText(this.node, '最高分 ' + this.bestScore, 22, DARK);
        this.bestLabel.anchorX = 0;
        this.bestLabel.setPosition(-w / 2 + 20, h / 2 - 78);

        // 下一个水果预览
        const nextTip = this.makeText(this.node, '下一个', 20, DARK);
        nextTip.anchorX = 1;
        nextTip.setPosition(w / 2 - 18, h / 2 - 34);

        this.nextPreview = new cc.Node('nextPreview');
        this.nextPreviewSprite = this.nextPreview.addComponent(cc.Sprite);
        this.nextPreviewSprite.sizeMode = cc.Sprite.SizeMode.TRIMMED;
        this.nextPreview.parent = this.node;
        this.nextPreview.setPosition(w / 2 - 62, h / 2 - 95);

        // 暂停按钮
        this.pauseBtn = this.makeButton(this.node, '暂停', 84, 48, CREAM, DARK, 24, () => {
            if (this.state === STATE.PLAYING) this.pauseGame();
        });
        this.pauseBtn.setPosition(w / 2 - 60, h / 2 - 168);

        // 音效开关
        this.soundBtn = this.makeButton(this.node, this.soundOn ? '音效:开' : '音效:关', 110, 48, CREAM, DARK, 22, () => {
            this.soundOn = !this.soundOn;
            this.persistSave();
            this.refreshSoundBtn();
            this.refreshPauseSoundBtn();
        });
        this.soundBtn.setPosition(w / 2 - 178, h / 2 - 168);

        // 危险线
        this.dangerGfx = new cc.Node('danger');
        this.dangerGfx.parent = this.node;
        const dg = this.dangerGfx.addComponent(cc.Graphics);
        dg.strokeColor = cc.color(220, 60, 40, 90);
        dg.lineWidth = 2;
        dg.moveTo(-w / 2, this.lineY);
        dg.lineTo(w / 2, this.lineY);
        dg.stroke();

        // 瞄准辅助线
        this.aimGfx = new cc.Node('aim');
        this.aimGfx.parent = this.node;
        this.aimGraphics = this.aimGfx.addComponent(cc.Graphics);

        // 道具栏（全部免费、无限次）
        const barY = -h / 2 + 52;
        const gap = 8;
        const btnW = (w - 24 - gap * 3) / 4;
        const itemDefs = [
            { text: '消除', key: 'remove' },
            { text: '撤销', key: 'undo' },
            { text: '洗牌', key: 'shuffle' },
            { text: '瞄准', key: 'aim' },
        ];
        this.itemBtns = {};
        itemDefs.forEach((def, i) => {
            const btn = this.makeButton(this.node, def.text, btnW, 56, CREAM, DARK, 24, () => {
                this.onItemTap(def.key);
            });
            btn.setPosition(-w / 2 + 12 + btnW / 2 + i * (btnW + gap), barY);
            this.itemBtns[def.key] = { node: btn, gfx: btn.getComponent(cc.Graphics), w: btnW, h: 56 };
        });
        this.refreshItemHighlights();

        // ---- 主菜单 ----
        this.menuLayer = this.makeLayer('menuLayer');
        const title = this.makeText(this.menuLayer, '合成大西瓜', 64, cc.color(255, 240, 200));
        title.setPosition(0, 180);
        this.menuBestLabel = this.makeText(this.menuLayer, '最高分 ' + this.bestScore, 28, cc.color(255, 240, 200));
        this.menuBestLabel.setPosition(0, 90);
        const tip = this.makeText(this.menuLayer, '拖动瞄准，松手投放\n两个相同水果碰撞即可合成', 24, cc.color(230, 220, 190));
        tip.setPosition(0, 10);
        const startBtn = this.makeButton(this.menuLayer, '开始游戏', 260, 84, cc.color(255, 200, 80), DARK, 36, () => {
            this.startGame();
        });
        startBtn.setPosition(0, -120);
        const freeTip = this.makeText(this.menuLayer, '所有道具免费无限次使用', 20, cc.color(200, 200, 180));
        freeTip.setPosition(0, -230);

        // ---- 暂停面板 ----
        this.pauseLayer = this.makeLayer('pauseLayer');
        const pauseTitle = this.makeText(this.pauseLayer, '已暂停', 48, cc.color(255, 240, 200));
        pauseTitle.setPosition(0, 220);
        const resumeBtn = this.makeButton(this.pauseLayer, '继续游戏', 240, 72, cc.color(255, 200, 80), DARK, 30, () => {
            this.resumeGame();
        });
        resumeBtn.setPosition(0, 90);
        const restartBtn1 = this.makeButton(this.pauseLayer, '重新开始', 240, 72, CREAM, DARK, 30, () => {
            this.startGame();
        });
        restartBtn1.setPosition(0, -10);
        const menuBtn1 = this.makeButton(this.pauseLayer, '返回主菜单', 240, 72, CREAM, DARK, 30, () => {
            this.showMenu();
        });
        menuBtn1.setPosition(0, -110);
        this.pauseSoundBtn = this.makeButton(this.pauseLayer, this.soundOn ? '音效:开' : '音效:关', 240, 72, CREAM, DARK, 30, () => {
            this.soundOn = !this.soundOn;
            this.persistSave();
            this.refreshSoundBtn();
            this.refreshPauseSoundBtn();
        });
        this.pauseSoundBtn.setPosition(0, -210);

        // ---- 结算面板 ----
        this.overLayer = this.makeLayer('overLayer');
        const overTitle = this.makeText(this.overLayer, '游戏结束', 48, cc.color(255, 220, 180));
        overTitle.setPosition(0, 220);
        this.overScoreLabel = this.makeText(this.overLayer, '得分 0', 36, cc.color(255, 240, 200));
        this.overScoreLabel.setPosition(0, 120);
        this.overBestLabel = this.makeText(this.overLayer, '最高分 0', 28, cc.color(255, 240, 200));
        this.overBestLabel.setPosition(0, 60);
        const restartBtn2 = this.makeButton(this.overLayer, '重新开始', 240, 72, cc.color(255, 200, 80), DARK, 30, () => {
            this.startGame();
        });
        restartBtn2.setPosition(0, -60);
        const menuBtn2 = this.makeButton(this.overLayer, '返回主菜单', 240, 72, CREAM, DARK, 30, () => {
            this.showMenu();
        });
        menuBtn2.setPosition(0, -160);
    },

    refreshSoundBtn() {
        const label = this.soundBtn.getChildByName('label').getComponent(cc.Label);
        label.string = this.soundOn ? '音效:开' : '音效:关';
    },
    refreshPauseSoundBtn() {
        const label = this.pauseSoundBtn.getChildByName('label').getComponent(cc.Label);
        label.string = this.soundOn ? '音效:开' : '音效:关';
    },

    refreshItemHighlights() {
        const CREAM = cc.color(252, 244, 214);
        const ACTIVE = cc.color(255, 170, 60);
        for (const key in this.itemBtns) {
            const item = this.itemBtns[key];
            const active = (key === 'remove' && this.removeMode) || (key === 'aim' && this.aimEnabled);
            this.drawRoundRect(item.gfx, item.w, item.h, active ? ACTIVE : CREAM);
        }
    },

    updateNextPreview() {
        const config = this.fruits[this.nextFruitId - 1];
        if (!config || !this.nextPreviewSprite) return;
        this.nextPreviewSprite.spriteFrame = config.iconSF;
        this.nextPreview.scale = 56 / Math.max(this.nextPreview.width, 1);
    },

    // ---------------- 状态切换 ----------------
    showMenu() {
        this.state = STATE.MENU;
        this.clearField();
        this.unscheduleAllCallbacks();
        this.needSpawn = false;
        this.lastDropTime = -1000;
        this.shuffling = false;
        this._shuffleFlights = null;
        this.removeMode = false;
        this.activeTouchId = null;
        this._heldSpawnPending = false;
        this._heldSpawnAt = 0;
        this.refreshItemHighlights();
        this.menuLayer.active = true;
        this.pauseLayer.active = false;
        this.overLayer.active = false;
        this.menuBestLabel.getComponent(cc.Label).string = '最高分 ' + this.bestScore;
        cc.director.getPhysicsManager().enabled = true;
        this.drawAimLine();
    },

    startGame() {
        // 重置本局前，先确保已达到的最高分已比较并保存（覆盖"超过最高分后立即重新开始"路径）
        this.updateBest();
        this.unscheduleAllCallbacks();
        this.clearField();
        this.state = STATE.PLAYING;
        this.score = 0;
        this.fruitCount = 0;
        this.needSpawn = false;
        this.lastDropTime = -1000;
        this.shuffling = false;
        this._shuffleFlights = null;
        this.removeMode = false;
        this.undoStack = [];
        this.overTimer = 0;
        this.activeTouchId = null;
        this._heldSpawnPending = false;
        this._heldSpawnAt = 0;
        this.aimX = 0;
        this.scoreLabel.string = '0';
        this.menuLayer.active = false;
        this.pauseLayer.active = false;
        this.overLayer.active = false;
        cc.director.getPhysicsManager().enabled = true;
        this.refreshItemHighlights();
        this.initOneFruit(1);
    },

    pauseGame() {
        if (this.state !== STATE.PLAYING) return;
        this.state = STATE.PAUSED;
        // 暂停期间不会有新的投放，进行中的手势也不可能继续；
        // 这里只记录状态用于诊断，收尾统一由 resumeGame → resetDropInput 处理。
        this.log('暂停', '暂停时投放状态：' + this.dropSnapshot());
        cc.director.getPhysicsManager().enabled = false;
        this.pauseLayer.active = true;
        this.drawAimLine();
    },

    resumeGame() {
        if (this.state !== STATE.PAUSED) return;
        this.state = STATE.PLAYING;
        cc.director.getPhysicsManager().enabled = true;
        this.pauseLayer.active = false;
        // 兜底：恢复交互时重置「投放输入 / 投放锁 / 补位任务」这一组状态，
        // 修复暂停前后可能残留的失效手势锁，保证继续后第一次点击即可按正常规则投放。
        // 注意：不触碰场上水果、分数、进度与洗牌结果。
        this.resetDropInput('暂停恢复');
        this.drawAimLine();
    },

    gameOver() {
        if (this.state !== STATE.PLAYING) return;
        this.state = STATE.OVER;
        this.needSpawn = false;
        this.finishShuffle();
        this.removeMode = false;
        this.unscheduleAllCallbacks();
        this._heldSpawnPending = false;
        this._heldSpawnAt = 0;
        this.activeTouchId = null;
        this.refreshItemHighlights();
        this.updateBest();
        this.overScoreLabel.getComponent(cc.Label).string = '得分 ' + this.score;
        this.overBestLabel.getComponent(cc.Label).string = '最高分 ' + this.bestScore;
        this.overLayer.active = true;
        this.drawAimLine();
    },

    // ---------------- 生命周期 ----------------
    onGameHide() {
        cc.audioEngine.pauseAll();
        if (this.state === STATE.PLAYING) {
            this.pauseGame();
        }
    },
    onGameShow() {
        // 恢复前台后保持暂停，由玩家手动继续
    },
    onKeyDown(e) {
        const KEY_BACK = 6;
        if (e.keyCode !== KEY_BACK) return;
        // KEYDOWN/KEYUP 可能都触发，防抖避免连续切换两次
        const now = Date.now();
        if (now - (this._lastBackKey || 0) < 500) return;
        this._lastBackKey = now;
        if (this.state === STATE.PLAYING) {
            this.pauseGame();
        } else if (this.state === STATE.PAUSED) {
            this.resumeGame();
        } else if (this.state === STATE.MENU) {
            cc.game.end();
        }
    },

    // ---------------- 水果管理 ----------------
    clearField() {
        const children = this.node.children.slice();
        for (const child of children) {
            if (child.getComponent('Fruit') || child.getComponent('Juice')) {
                child.off('sameContact');
                child.destroy();
            }
        }
        this.currentFruit = null;
    },

    getFieldFruits() {
        const list = [];
        for (const child of this.node.children) {
            if (child.getComponent('Fruit') && child !== this.currentFruit && child.isValid) {
                list.push(child);
            }
        }
        return list;
    },

    calcNextId() {
        if (this.fruitCount < 3) return 1;
        if (this.fruitCount === 3) return 2;
        return Math.floor(Math.random() * 5) + 1;
    },

    initOneFruit(id) {
        const fruit = this.createFruitOnPos(this.aimX, this.spawnY, id);
        if (!fruit || !fruit.isValid) {
            // 预制体/节点创建失败：不推进计数与预览，保持「无待投水果」状态，
            // 由 ensureHeldFruit 在下次点击或恢复时重试。
            this.currentFruit = null;
            cc.error('[投放] 待投水果创建失败，id=' + id);
            return;
        }
        this.fruitCount++;
        this.currentFruit = fruit;
        this.currentFruit._birth = this.gameTime();
        this.nextFruitId = this.calcNextId();
        this.updateNextPreview();
        this.drawAimLine();
    },

    createOneFruit(num) {
        const config = this.fruits[num - 1];
        if (!this.fruitPrefab || !config) {
            cc.error('[投放] 缺少水果预制体或配置，num=' + num);
            return null;
        }
        const fruit = cc.instantiate(this.fruitPrefab);
        if (!fruit) return null;

        fruit.getComponent('Fruit').init({
            id: config.id,
            iconSF: config.iconSF
        });

        fruit.getComponent(cc.RigidBody).type = cc.RigidBodyType.Static;
        fruit.getComponent(cc.PhysicsCircleCollider).radius = 0;

        this.node.addChild(fruit);
        fruit.scale = 0.6;

        fruit.on('sameContact', this.onSameFruitContact.bind(this));
        fruit.on('fruitContact', this.onFruitKnock, this);
        // 水果节点不注册触摸监听（消除道具的命中判定由游戏节点统一处理）：
        // 一旦水果认领了触摸又在手势结束前被销毁，TOUCH_END 将永远丢失，
        // 导致 activeTouchId 卡死、后续点击全部无效。

        return fruit;
    },

    startFruitPhysics(fruit) {
        const body = fruit.getComponent(cc.RigidBody);
        body.type = cc.RigidBodyType.Dynamic;
        body.bullet = true; // 连续碰撞检测，防止穿墙
        const collider = fruit.getComponent(cc.PhysicsCircleCollider);
        collider.radius = fruit.height / 2;
        collider.apply();

        // 线性加速下落：用 gravityScale 控制加速度（不叠加第二套重力），
        // 使 v = v0 + accel * t，达到 vmax 后停止加速
        fruit._fallTime = 0;
        fruit._settled = false;
        fruit._slowTimer = 0;
        fruit._capped = false;
        body.gravityScale = FALL_CFG.accel / GRAVITY;
        body.linearVelocity = cc.v2(0, -FALL_CFG.v0);
    },

    createFruitOnPos(x, y, type) {
        const fruit = this.createOneFruit(type);
        if (!fruit) return null;
        fruit.setPosition(cc.v2(x, y));
        return fruit;
    },

    clampX(x, fruit) {
        const r = fruit ? fruit.width * 0.6 / 2 : 20;
        const limit = this.W / 2 - r - 4;
        return Math.max(-limit, Math.min(limit, x));
    },

    // ---------------- 触摸 ----------------
    // 输入所有权：只有游戏节点认领触摸，水果节点不注册任何触摸监听。
    // 这样即使手势过程中水果被销毁（合成/消除/越界回收），也不会丢失 TOUCH_END。
    onTouchStart(e) {
        if (this.state !== STATE.PLAYING) {
            this.log('点击', '忽略：非进行中（' + this.dropSnapshot() + '）');
            return;
        }
        if (this.activeTouchId !== null) {
            // 上一次手势的结束事件曾丢失（切后台、系统手势、触摸被系统抢占等），
            // 确认该触摸已不存在时判定为失效锁并自动释放，否则维持防重复点击。
            if (this.isStaleTouchLock(e.getID())) {
                this.log('输入', '检测到失效触摸锁 touchId=' + this.activeTouchId + '，已自动释放');
                this.resetDropInput('触摸失活');
            } else {
                this.log('点击', '忽略：另一手势进行中（touchId=' + this.activeTouchId + '）');
                return;
            }
        }
        this.activeTouchId = e.getID();

        if (this.removeMode) {
            // 消除道具：在游戏节点上自行命中判定，不再依赖水果节点的触摸事件
            const target = this.pickFruitAt(this.toLocalPos(e.getLocation()));
            if (target) {
                this.activeTouchId = null;
                this.removeFruitByItem(target);
                return;
            }
            // 点空白处取消消除模式
            this.removeMode = false;
            this.refreshItemHighlights();
            this.activeTouchId = null;
            return;
        }

        if (!this.currentFruit) {
            this.log('点击', '未瞄准：当前无待投水果（' + this.dropSnapshot() + '）');
            return;
        }
        this.aimX = this.clampX(this.toLocalX(e.getLocation().x), this.currentFruit);
        this.currentFruit.x = this.aimX;
        this.drawAimLine();
    },

    onTouchMove(e) {
        if (this.state !== STATE.PLAYING) return;
        if (this.activeTouchId !== e.getID()) return;
        if (!this.currentFruit) return;
        this.aimX = this.clampX(this.toLocalX(e.getLocation().x), this.currentFruit);
        this.currentFruit.x = this.aimX;
        this.drawAimLine();
    },

    onTouchEnd(e) {
        if (this.activeTouchId !== e.getID()) return;
        this.activeTouchId = null;
        if (this.state !== STATE.PLAYING) {
            this.log('点击', '松手忽略：非进行中（' + this.dropSnapshot() + '）');
            return;
        }
        this.tryDrop();
    },

    // 引擎维护的活跃触摸表（cc.internal.inputManager）：
    // 用于判断残留的 activeTouchId 是否真的还有手指按着。
    // 只有「本次 TOUCH_START 的触摸确实能在表中查到」时才认为该表可信，
    // 否则不做任何推断，避免误判导致同一次点击被处理两次。
    touchRegistryHas(touchId) {
        const im = cc.internal && cc.internal.inputManager;
        if (!im || typeof im.getGlobalTouches !== 'function') return false;
        const touches = im.getGlobalTouches() || {};
        for (const key in touches) {
            const t = touches[key];
            if (t && typeof t.getID === 'function' && t.getID() === touchId) return true;
        }
        return false;
    },

    liveTouchCount() {
        const im = cc.internal && cc.internal.inputManager;
        if (!im || typeof im.getGlobalTouchCount !== 'function') return -1;
        return im.getGlobalTouchCount();
    },

    // 判断残留的 activeTouchId 是否已经失效（对应手指早已抬起，END/CANCEL 丢失）。
    // 判据一：当前这次 TOUCH_START 已被引擎触摸表收录（表可信），且表中只有这一根手指
    //         —— 说明旧的触摸必然已经结束（否则表中会是 2 根）。
    // 该判据不依赖 touchId 本身，因此不受 Android 复用 pointerId 的影响。
    // 判据二：表可信，且旧的 touchId 已不在表中。
    isStaleTouchLock(currentTouchId) {
        if (!this.touchRegistryHas(currentTouchId)) return false; // 表不可信，不做推断
        const live = this.liveTouchCount();
        if (live === 1) return true;
        return !this.touchRegistryHas(this.activeTouchId);
    },

    toLocalX(screenX) {
        const pos = this.node.convertToNodeSpaceAR(cc.v2(screenX, 0));
        return pos.x;
    },

    toLocalPos(screenPos) {
        return this.node.convertToNodeSpaceAR(cc.v2(screenPos.x, screenPos.y));
    },

    // 命中判定：返回点击位置下最上层的场上水果（用于消除道具）
    pickFruitAt(localPos) {
        const fruits = this.getFieldFruits();
        for (let i = fruits.length - 1; i >= 0; i--) {
            const fruit = fruits[i];
            const r = fruit.width * 0.6 / 2;
            const dx = localPos.x - fruit.x;
            const dy = localPos.y - fruit.y;
            if (dx * dx + dy * dy <= r * r) return fruit;
        }
        return null;
    },

    // 投放间隔时间锁：与场上水果是否落稳无关，只限制两次成功投放的最小间隔
    tryDrop() {
        if (this.shuffling) {
            this.log('投放', '忽略：洗牌进行中');
            return;
        }
        const now = this.gameTime();
        if (now - this.lastDropTime < DROP_INTERVAL) {
            this.log('投放', '忽略：间隔未到（还需 ' + (DROP_INTERVAL - (now - this.lastDropTime)).toFixed(2) + 's）');
            return;
        }
        const fruit = this.currentFruit;
        if (!fruit || !fruit.isValid) {
            // 待投水果缺失（例如被下落水果接触合成）：立即补位，避免投放永久失效
            this.log('投放', '待投水果缺失，触发补位（' + this.dropSnapshot() + '）');
            this.ensureHeldFruit();
            return;
        }

        this.lastDropTime = now;
        this.pushUndoSnapshot(fruit);

        try {
            this.currentFruit = null;
            fruit._birth = now;
            this.startFruitPhysics(fruit);
            this.drawAimLine();

            // 补位：SPAWN_DELAY 后取出下一个待投水果
            this._heldSpawnPending = true;
            this._heldSpawnAt = now;
            this.scheduleOnce(this.spawnNextHeld, SPAWN_DELAY);
            this.log('投放', '成功投放 id=' + fruit.getComponent('Fruit').id + '（' + this.dropSnapshot() + '）');
        } catch (err) {
            // 投放中途异常（组件缺失、物理异常等）：释放全部投放锁并回到可用状态，
            // 避免 currentFruit/补位任务停在中间态导致之后永远投不出。
            this._heldSpawnPending = false;
            this._heldSpawnAt = 0;
            this.currentFruit = null;
            if (fruit && fruit.isValid) fruit.destroy();
            this.ensureHeldFruit();
            cc.error('[投放] 投放失败，已释放投放状态：' + err);
        }
    },

    // 补位任务：无论成功、失败还是提前返回，都先清掉「补位中」标记，
    // 保证投放锁不会停在中间态导致之后永远投不出。
    spawnNextHeld() {
        this._heldSpawnPending = false;
        this._heldSpawnAt = 0;
        try {
            if (this.state !== STATE.PLAYING) {
                // 暂停/结算期间不生成，等恢复或重新开始时补
                this.needSpawn = true;
                this.log('投放', '补位延后（非进行中，needSpawn=true）');
                return;
            }
            // 已经有待投水果时不再生成（例如补位任务超时被接管后，旧回调迟到）：
            // 保证「有且仅有一个」，避免一次投放变成两个。
            if (this.currentFruit && this.currentFruit.isValid) {
                this.log('投放', '补位跳过：已存在待投水果');
                return;
            }
            this.initOneFruit(this.nextFruitId);
            this.log('投放', '补位完成 next=' + this.nextFruitId);
        } catch (err) {
            cc.error('[投放] 补位失败，已释放补位状态：' + err);
        }
    },

    // 统一的待投水果补位入口：保证 PLAYING 状态下「有且仅有一个」待投水果。
    // 补位任务在途时不重复生成，避免一次点击投出两个水果。
    ensureHeldFruit() {
        if (this.state !== STATE.PLAYING) return;
        if (this.currentFruit && this.currentFruit.isValid) return;
        if (this._heldSpawnPending) {
            // 补位任务在途：正常只持续 SPAWN_DELAY（0.25s）。
            // 若远超预期仍未落地（回调抛错导致标记未清），视为失效任务并接管。
            const pendingFor = this.gameTime() - (this._heldSpawnAt || 0);
            if (pendingFor < SPAWN_DELAY * 4) return;
            this._heldSpawnPending = false;
            this._heldSpawnAt = 0;
            this.log('投放', '补位任务已失效（' + pendingFor.toFixed(2) + 's 未完成），重新补位');
        }
        if (this.needSpawn) {
            this.needSpawn = false;
            this.spawnNextHeld();
            return;
        }
        this.initOneFruit(this.nextFruitId);
        this.log('投放', '兜底补位待投水果 next=' + this.nextFruitId);
    },

    // 输入监听健康检查：仅在确认监听器确实缺失时补挂（不无条件重复注册）。
    // node.on 对同一 callback+target 是幂等的，这里再加 hasEventListener 前置判断，
    // 保证正常情况下完全不做多余操作。
    ensureInputListeners() {
        const T = cc.Node.EventType;
        const missing = [];
        if (!this.node.hasEventListener(T.TOUCH_START)) missing.push('TOUCH_START');
        if (!this.node.hasEventListener(T.TOUCH_MOVE)) missing.push('TOUCH_MOVE');
        if (!this.node.hasEventListener(T.TOUCH_END)) missing.push('TOUCH_END');
        if (!this.node.hasEventListener(T.TOUCH_CANCEL)) missing.push('TOUCH_CANCEL');
        if (missing.length === 0) return;
        if (missing.indexOf('TOUCH_START') >= 0) this.node.on(T.TOUCH_START, this.onTouchStart, this);
        if (missing.indexOf('TOUCH_MOVE') >= 0) this.node.on(T.TOUCH_MOVE, this.onTouchMove, this);
        if (missing.indexOf('TOUCH_END') >= 0) this.node.on(T.TOUCH_END, this.onTouchEnd, this);
        if (missing.indexOf('TOUCH_CANCEL') >= 0) this.node.on(T.TOUCH_CANCEL, this.onTouchEnd, this);
        this.log('输入', '检测到监听缺失并补挂：' + missing.join('/'));
    },

    // 投放输入与投放锁的安全重置（仅投放相关状态，不触碰水果/分数/进度）。
    // 用于：触摸失活自愈、暂停恢复兜底。
    // 待投水果的补位交给 ensureHeldFruit 统一处理：
    //   - 已有待投水果 → 什么都不做（不重复生成）
    //   - 补位任务在途   → 等待该任务完成（不重复生成）
    //   - 确实缺失       → 补一个，保证恢复后第一次点击能正常投放
    resetDropInput(reason) {
        const wasLocked = this.activeTouchId !== null;
        this.activeTouchId = null;
        const hadHeld = !!(this.currentFruit && this.currentFruit.isValid);
        this.ensureInputListeners();
        this.ensureHeldFruit();
        this.log('恢复', '投放输入重置（原因：' + reason + '，' +
            '释放手势锁=' + (wasLocked ? '是' : '否') +
            '，重置前待投=' + (hadHeld ? '有' : '无') + '，' + this.dropSnapshot() + '）');
    },

    // ---------------- 合成 ----------------
    onSameFruitContact({ self, other }) {
        const selfNode = self && self.node;
        const otherNode = other && other.node;
        if (!selfNode || !otherNode || !selfNode.isValid || !otherNode.isValid) return;
        // 待投水果（手中的水果）不参与合成：它是尚未投出的预览对象，
        // 一旦被合成销毁，currentFruit 会变成 null 且没有任何补位任务，
        // 之后 tryDrop 会在「无待投水果」处永久提前返回（点击再也不能投放）。
        if (selfNode === this.currentFruit || otherNode === this.currentFruit) {
            this.log('合成', '忽略涉及待投水果的接触（' + this.dropSnapshot() + '）');
            return;
        }
        if (selfNode._merging || otherNode._merging) return;
        selfNode._merging = true;
        otherNode._merging = true;
        selfNode.off('sameContact');
        otherNode.off('sameContact');

        const id = selfNode.getComponent('Fruit').id;
        const pos = cc.v2((selfNode.x + otherNode.x) / 2, (selfNode.y + otherNode.y) / 2);

        selfNode.destroy();
        otherNode.destroy();

        this.createFruitJuice(id, pos, Math.max(selfNode.width, otherNode.width));
        this.addScore(id);

        const nextId = id + 1;
        if (nextId <= MAX_FRUIT_ID) {
            const newFruit = this.createFruitOnPos(pos.x, pos.y, nextId);
            if (newFruit) {
                newFruit._birth = this.gameTime();
                newFruit._merging = false;
                this.startFruitPhysics(newFruit);

                newFruit.scale = 0;
                cc.tween(newFruit).to(0.35, { scale: 0.6 }, { easing: 'backOut' }).start();
            }
        } else {
            // 两个大西瓜合成：直接消除并奖励大量分数
            this.createFruitJuice(MAX_FRUIT_ID, pos, 300);
            this.addScore(256);
        }

        // 合成不应影响待投水果；若因异常情况缺失，这里补位，避免投放锁死
        if (!this.currentFruit || !this.currentFruit.isValid) {
            this.ensureHeldFruit();
        }
    },

    onFruitKnock() {
        if (!this.soundOn) return;
        const now = this.gameTime();
        if (now - this.lastKnockTime < 0.12) return;
        this.lastKnockTime = now;
        this.playSfx(this.knockAudio, 0.25);
    },

    createFruitJuice(id, pos, n) {
        this.playSfx(this.boomAudio, 1);
        this.playSfx(this.waterAudio, 1);

        const juice = cc.instantiate(this.juicePrefab);
        this.node.addChild(juice);

        const config = this.juices[Math.min(id, this.juices.length) - 1];
        const instance = juice.getComponent('Juice');
        instance.init(config);
        instance.showJuice(pos, n);

        // 动画结束后销毁果汁节点，避免长局节点堆积
        this.scheduleOnce(() => {
            if (juice.isValid) juice.destroy();
        }, 2.0);
    },

    playSfx(clip, volume) {
        if (!this.soundOn || !clip) return;
        cc.audioEngine.play(clip, false, volume);
    },

    addScore(fruitId) {
        this.score += fruitId * 2;
        this.scoreLabel.string = this.score;
        this.updateBest();
    },

    // ---------------- 道具（全部免费无限次） ----------------
    onItemTap(key) {
        if (this.state !== STATE.PLAYING) return;
        switch (key) {
            case 'remove':
                this.removeMode = !this.removeMode;
                this.refreshItemHighlights();
                break;
            case 'undo':
                this.undoLastDrop();
                break;
            case 'shuffle':
                this.shuffleFruits();
                break;
            case 'aim':
                this.aimEnabled = !this.aimEnabled;
                this.refreshItemHighlights();
                this.drawAimLine();
                break;
        }
    },

    removeFruitByItem(fruit) {
        if (!fruit || !fruit.isValid || fruit._merging) return;
        const id = fruit.getComponent('Fruit').id;
        const pos = cc.v2(fruit.x, fruit.y);
        const width = fruit.width;
        fruit.destroy();
        this.createFruitJuice(id, pos, width);
        this.removeMode = false;
        this.refreshItemHighlights();
    },

    // 快照式撤销：记录投放前的场上状态，回滚时重建
    pushUndoSnapshot(droppingFruit) {
        const snapshot = {
            fruits: this.getFieldFruits().map((f) => ({
                id: f.getComponent('Fruit').id,
                x: f.x,
                y: f.y
            })),
            score: this.score,
            dropId: droppingFruit.getComponent('Fruit').id,
            nextFruitId: this.nextFruitId,
            fruitCount: this.fruitCount,
            aimX: this.aimX
        };
        this.undoStack.push(snapshot);
        if (this.undoStack.length > 50) this.undoStack.shift();
    },

    undoLastDrop() {
        if (this.shuffling) return;
        if (this.undoStack.length === 0) return;
        const snapshot = this.undoStack.pop();

        this.unscheduleAllCallbacks();
        this.clearField();
        this.needSpawn = false;
        this.lastDropTime = -1000;
        this.removeMode = false;
        this.overTimer = 0;
        // 补位任务随 unscheduleAllCallbacks 一并取消，避免它之后又生成一个待投水果
        this._heldSpawnPending = false;
        this._heldSpawnAt = 0;
        this.refreshItemHighlights();

        for (const f of snapshot.fruits) {
            const fruit = this.createFruitOnPos(f.x, f.y, f.id);
            if (!fruit) continue;
            fruit._birth = this.gameTime();
            this.startFruitPhysics(fruit);
            const body = fruit.getComponent(cc.RigidBody);
            body.linearVelocity = cc.v2(0, 0);
            body.angularVelocity = 0;
            // 快照中的水果按落稳状态恢复，避免回滚后集体下坠
            fruit._settled = true;
            body.gravityScale = 1;
        }

        this.score = snapshot.score;
        this.scoreLabel.string = this.score;
        this.fruitCount = snapshot.fruitCount;
        this.aimX = snapshot.aimX || 0;
        this.initOneFruit(snapshot.dropId);
        this.nextFruitId = snapshot.nextFruitId;
        this.updateNextPreview();
    },

    // 洗牌：安全布局 + 抛物线飞行 + 物理恢复。
    // 1) 收集有效水果（排除持有/合成中/非动态），随机置换生成目标布局：
    //    行打包保证互不重叠与容器内，同 ID 左右不相邻，行内均匀展开到全宽；
    //    有限次置换择优，最大化"真实移动"的水果数量（不为变化牺牲安全）
    // 2) 全部水果置为 Static（静态体之间无接触，飞行期间不会触发合成），
    //    由 update 驱动二次贝塞尔抛物线飞行：弹起→空中移动→落到新位置，
    //    各水果启动时间小幅错开；update 仅在 PLAYING 推进，暂停天然冻结
    // 3) 全部落位后统一转回 Dynamic、清空旧速度、恢复下落加速管理
    shuffleFruits() {
        if (this.state !== STATE.PLAYING || this.shuffling) return;
        const fruits = this.getFieldFruits().filter((f) => {
            if (!f.isValid || f._merging) return false;
            const body = f.getComponent(cc.RigidBody);
            return body && body.type === cc.RigidBodyType.Dynamic;
        });
        if (fruits.length === 0) return;

        this.shuffling = true;
        this.removeMode = false;
        this.refreshItemHighlights();

        const items = fruits.map((f) => ({ f, id: f.getComponent('Fruit').id, d: f.width * 0.6, x0: f.x, y0: f.y }));

        // 有限次置换，选让最多水果明显移动的一组目标布局
        let bestTargets = null;
        let bestMoved = -1;
        for (let attempt = 0; attempt < SHUFFLE_CFG.attempts; attempt++) {
            const perm = items.slice();
            for (let i = perm.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                const tmp = perm[i]; perm[i] = perm[j]; perm[j] = tmp;
            }
            const targets = this.buildShuffleTargets(perm);
            let moved = 0;
            for (const t of targets) {
                const dx = t.x - t.f.x;
                const dy = t.y - t.f.y;
                if (Math.sqrt(dx * dx + dy * dy) > Math.max(20, t.d * 0.3)) moved++;
            }
            if (moved > bestMoved) { bestMoved = moved; bestTargets = targets; }
            if (moved === targets.length) break;
        }

        // 冻结全部参与水果并生成飞行数据
        const flights = [];
        bestTargets.forEach((t, i) => {
            if (!t.f.isValid) return;
            const body = t.f.getComponent(cc.RigidBody);
            body.type = cc.RigidBodyType.Static;
            body.linearVelocity = cc.v2(0, 0);
            body.angularVelocity = 0;
            const hop = t.d * (SHUFFLE_CFG.hopMin + Math.random() * (SHUFFLE_CFG.hopMax - SHUFFLE_CFG.hopMin));
            flights.push({
                f: t.f, d: t.d,
                x0: t.f.x, y0: t.f.y, x1: t.x, y1: t.y,
                ax: (t.f.x + t.x) / 2,
                // 二次贝塞尔曲线顶点约为控制点高度的一半，故控制点取 2 倍弹起高度
                ay: Math.max(t.f.y, t.y) + hop * 2,
                t: -i * SHUFFLE_CFG.delayStep,
                dur: SHUFFLE_CFG.flightMin + Math.random() * (SHUFFLE_CFG.flightMax - SHUFFLE_CFG.flightMin),
                done: false
            });
        });
        this._shuffleFlights = flights;
    },

    // 行打包 + 均匀展开生成目标位置（纯计算，可多次尝试）
    buildShuffleTargets(order) {
        const margin = SHUFFLE_CFG.margin;
        const distributeRow = (row) => {
            const k = row.length;
            if (k === 0) return;
            if (k === 1) { row[0].x = 0; return; }
            const usable = this.W - margin * 2;
            const s = usable / k;
            for (let j = 1; j < k; j++) {
                if (s < (row[j - 1].d + row[j].d) / 2 + 4) return; // 展开会重叠则保留紧凑布局
            }
            row.forEach((t, j) => { t.x = -this.W / 2 + margin + s * (j + 0.5); });
        };
        const targets = [];
        const pool = order.slice();
        let cursorX = -this.W / 2 + margin;
        let rowY = this.floorY;
        let rowMaxD = 0;
        let prevRow = [];
        let curRow = [];
        while (pool.length > 0) {
            const slotX = cursorX;
            // 避免与左侧及正下方水果同 ID（接触可能性范围内）
            const forbidden = {};
            const left = curRow[curRow.length - 1];
            if (left) forbidden[left.id] = true;
            for (const p of prevRow) {
                if (p.x + p.d / 2 + margin > slotX && p.x - p.d / 2 - margin < slotX + pool[0].d) forbidden[p.id] = true;
            }
            let pickIdx = pool.findIndex((it) => !forbidden[it.id]);
            if (pickIdx < 0) pickIdx = 0;
            const it = pool.splice(pickIdx, 1)[0];
            if (cursorX + it.d > this.W / 2 - margin && curRow.length > 0) {
                distributeRow(curRow);
                prevRow = curRow;
                curRow = [];
                cursorX = -this.W / 2 + margin;
                rowY += rowMaxD + margin;
                rowMaxD = 0;
            }
            const t = { f: it.f, id: it.id, d: it.d, x: cursorX + it.d / 2, y: rowY + it.d / 2 };
            targets.push(t);
            curRow.push(t);
            cursorX += it.d + margin;
            rowMaxD = Math.max(rowMaxD, it.d);
        }
        distributeRow(curRow);
        return targets;
    },

    // update 驱动的飞行推进：暂停（非 PLAYING）时 update 不执行，飞行自然冻结
    stepShuffleFlight(dt) {
        const flights = this._shuffleFlights;
        if (!flights) return;
        let allDone = true;
        for (const fl of flights) {
            if (fl.done) continue;
            fl.t += dt;
            if (fl.t < 0) { allDone = false; continue; }
            const p = Math.min(fl.t / fl.dur, 1);
            const q = 1 - p;
            if (fl.f.isValid) {
                fl.f.setPosition(
                    q * q * fl.x0 + 2 * q * p * fl.ax + p * p * fl.x1,
                    q * q * fl.y0 + 2 * q * p * fl.ay + p * p * fl.y1
                );
            }
            if (p >= 1) {
                fl.done = true;
                if (fl.f.isValid) fl.f.setPosition(fl.x1, fl.y1);
            } else {
                allDone = false;
            }
        }
        if (allDone) {
            this._shuffleFlights = null;
            // 恢复物理：全部转回动态、清空旧速度、重新进入下落加速管理
            for (const fl of flights) {
                if (!fl.f.isValid) continue;
                const body = fl.f.getComponent(cc.RigidBody);
                body.type = cc.RigidBodyType.Dynamic;
                body.linearVelocity = cc.v2(0, 0);
                body.angularVelocity = 0;
                fl.f._settled = false;
                fl.f._fallTime = 0;
                fl.f._slowTimer = 0;
                fl.f._capped = false;
                body.gravityScale = FALL_CFG.accel / GRAVITY;
            }
            this.scheduleOnce(this.finishShuffle, SHUFFLE_CFG.unlockDelay);
        }
    },

    finishShuffle() {
        this.unschedule(this.finishShuffle);
        // 兜底：中止场景（游戏结束等）下把仍为 Static 的飞行水果恢复为动态
        const flights = this._shuffleFlights;
        if (flights) {
            for (const fl of flights) {
                if (!fl.f.isValid) continue;
                const body = fl.f.getComponent(cc.RigidBody);
                if (body.type === cc.RigidBodyType.Static) {
                    body.type = cc.RigidBodyType.Dynamic;
                    body.linearVelocity = cc.v2(0, 0);
                    body.gravityScale = 1;
                    fl.f._settled = false;
                }
            }
        }
        this._shuffleFlights = null;
        this.shuffling = false;
    },

    // ---------------- 瞄准线 ----------------
    drawAimLine() {
        const gfx = this.aimGraphics;
        if (!gfx) return;
        gfx.clear();
        if (!this.aimEnabled || this.state !== STATE.PLAYING || !this.currentFruit) return;

        const x = this.currentFruit.x;
        const r = this.currentFruit.width * 0.6 / 2;
        gfx.strokeColor = cc.color(150, 100, 40, 110);
        gfx.lineWidth = 3;

        // 虚线
        let y = this.currentFruit.y - r - 10;
        const endY = this.floorY + r;
        const dash = 14;
        const gap = 10;
        while (y - dash > endY) {
            gfx.moveTo(x, y);
            gfx.lineTo(x, y - dash);
            y -= dash + gap;
        }
        gfx.stroke();

        // 落点参考圈
        gfx.strokeColor = cc.color(150, 100, 40, 90);
        gfx.lineWidth = 2;
        gfx.circle(x, this.floorY + r, r);
        gfx.stroke();
    },

    // ---------------- 每帧检查 ----------------
    update(dt) {
        if (this.state !== STATE.PLAYING) return;

        if (this._shuffleFlights) this.stepShuffleFlight(dt);

        const now = this.gameTime();
        let anyAbove = false;
        const halfW = this.W / 2;
        const children = this.node.children;

        for (let i = children.length - 1; i >= 0; i--) {
            const child = children[i];
            if (!child.getComponent('Fruit') || !child.isValid) continue;
            if (child === this.currentFruit) continue;

            // 安全网：飞出边界的水果直接移除
            if (Math.abs(child.x) > halfW + 80 || child.y < this.floorY - 100 || child.y > this.H / 2 + 150) {
                child.destroy();
                continue;
            }

            const body = child.getComponent(cc.RigidBody);
            if (!body || body.type !== cc.RigidBodyType.Dynamic) continue;
            if (child._merging) continue;

            // 下落管理：自由下落阶段按 v = v0 + accel*t 线性加速（经 gravityScale），
            // 达到 vmax 停止加速；落稳后交还默认重力，不再干预
            if (!child._settled) {
                child._fallTime = (child._fallTime || 0) + dt;
                const v = body.linearVelocity;
                if (!child._capped && -v.y >= FALL_CFG.vmax) {
                    child._capped = true;
                    body.gravityScale = 0;
                }
                if (v.x * v.x + v.y * v.y < FALL_CFG.settleSpeed * FALL_CFG.settleSpeed) {
                    child._slowTimer = (child._slowTimer || 0) + dt;
                    if (child._slowTimer >= FALL_CFG.settleTime) {
                        child._settled = true;
                        body.gravityScale = 1;
                    }
                } else {
                    child._slowTimer = 0;
                }
            }

            const birth = child._birth || 0;
            if (now - birth < 1.2) continue;

            const top = child.y + child.height * 0.6 / 2;
            if (top > this.lineY) {
                anyAbove = true;
            }
        }

        if (anyAbove) {
            this.overTimer += cc.director.getDeltaTime();
            if (this.overTimer >= 2.0) {
                this.gameOver();
            }
        } else {
            this.overTimer = 0;
        }
    }
});
