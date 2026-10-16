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
        this.bestScore = this.saveData.bestScore || 0;
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

        this.currentFruit = null;
        this.nextFruitId = 1;

        this.initPhysics();

        this.node.on(cc.Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(cc.Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.on(cc.Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.on(cc.Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);

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
    },

    gameTime() {
        return cc.director.getTotalTime() / 1000;
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
        this.refreshItemHighlights();
        this.menuLayer.active = true;
        this.pauseLayer.active = false;
        this.overLayer.active = false;
        this.menuBestLabel.getComponent(cc.Label).string = '最高分 ' + this.bestScore;
        cc.director.getPhysicsManager().enabled = true;
        this.drawAimLine();
    },

    startGame() {
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
        cc.director.getPhysicsManager().enabled = false;
        this.pauseLayer.active = true;
        this.drawAimLine();
    },

    resumeGame() {
        if (this.state !== STATE.PAUSED) return;
        this.state = STATE.PLAYING;
        cc.director.getPhysicsManager().enabled = true;
        this.pauseLayer.active = false;
        if (this.needSpawn) {
            this.needSpawn = false;
            this.spawnNextHeld();
        }
        this.drawAimLine();
    },

    gameOver() {
        if (this.state !== STATE.PLAYING) return;
        this.state = STATE.OVER;
        this.needSpawn = false;
        this.finishShuffle();
        this.removeMode = false;
        this.unscheduleAllCallbacks();
        this.refreshItemHighlights();
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
        }
        this.persistSave();
        this.bestLabel.getComponent(cc.Label).string = '最高分 ' + this.bestScore;
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
        this.fruitCount++;
        this.currentFruit = this.createFruitOnPos(this.aimX, this.spawnY, id);
        this.currentFruit._birth = this.gameTime();
        this.nextFruitId = this.calcNextId();
        this.updateNextPreview();
        this.drawAimLine();
    },

    createOneFruit(num) {
        const fruit = cc.instantiate(this.fruitPrefab);
        const config = this.fruits[num - 1];

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
        fruit.on(cc.Node.EventType.TOUCH_START, (e) => {
            // 消除道具：点选一个水果将其移除
            if (this.removeMode && this.state === STATE.PLAYING && fruit !== this.currentFruit) {
                e.stopPropagation();
                this.removeFruitByItem(fruit);
            }
        }, this);

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
        fruit.setPosition(cc.v2(x, y));
        return fruit;
    },

    clampX(x, fruit) {
        const r = fruit ? fruit.width * 0.6 / 2 : 20;
        const limit = this.W / 2 - r - 4;
        return Math.max(-limit, Math.min(limit, x));
    },

    // ---------------- 触摸 ----------------
    onTouchStart(e) {
        if (this.state !== STATE.PLAYING) return;
        if (this.activeTouchId !== null) return;
        this.activeTouchId = e.getID();

        if (this.removeMode) {
            // 点空白处取消消除模式
            this.removeMode = false;
            this.refreshItemHighlights();
            this.activeTouchId = null;
            return;
        }

        if (!this.currentFruit) return;
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
        if (this.state !== STATE.PLAYING) return;
        this.tryDrop();
    },

    toLocalX(screenX) {
        const pos = this.node.convertToNodeSpaceAR(cc.v2(screenX, 0));
        return pos.x;
    },

    // 投放间隔时间锁：与场上水果是否落稳无关，只限制两次成功投放的最小间隔
    tryDrop() {
        if (this.shuffling) return;
        const now = this.gameTime();
        if (now - this.lastDropTime < DROP_INTERVAL) return;
        const fruit = this.currentFruit;
        if (!fruit || !fruit.isValid) return;

        this.lastDropTime = now;
        this.pushUndoSnapshot(fruit);

        this.currentFruit = null;
        fruit._birth = now;
        this.startFruitPhysics(fruit);
        this.drawAimLine();

        this.scheduleOnce(this.spawnNextHeld, SPAWN_DELAY);
    },

    spawnNextHeld() {
        if (this.state !== STATE.PLAYING) {
            this.needSpawn = true;
            return;
        }
        this.initOneFruit(this.nextFruitId);
    },

    // ---------------- 合成 ----------------
    onSameFruitContact({ self, other }) {
        const selfNode = self && self.node;
        const otherNode = other && other.node;
        if (!selfNode || !otherNode || !selfNode.isValid || !otherNode.isValid) return;
        if (selfNode._merging || otherNode._merging) return;
        selfNode._merging = true;
        otherNode._merging = true;
        selfNode.off('sameContact');
        otherNode.off('sameContact');

        const id = selfNode.getComponent('Fruit').id;
        const pos = cc.v2((selfNode.x + otherNode.x) / 2, (selfNode.y + otherNode.y) / 2);

        if (selfNode === this.currentFruit) this.currentFruit = null;
        if (otherNode === this.currentFruit) this.currentFruit = null;

        selfNode.destroy();
        otherNode.destroy();

        this.createFruitJuice(id, pos, Math.max(selfNode.width, otherNode.width));
        this.addScore(id);

        const nextId = id + 1;
        if (nextId <= MAX_FRUIT_ID) {
            const newFruit = this.createFruitOnPos(pos.x, pos.y, nextId);
            newFruit._birth = this.gameTime();
            newFruit._merging = false;
            this.startFruitPhysics(newFruit);

            newFruit.scale = 0;
            cc.tween(newFruit).to(0.35, { scale: 0.6 }, { easing: 'backOut' }).start();
        } else {
            // 两个大西瓜合成：直接消除并奖励大量分数
            this.createFruitJuice(MAX_FRUIT_ID, pos, 300);
            this.addScore(256);
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
        this.refreshItemHighlights();

        for (const f of snapshot.fruits) {
            const fruit = this.createFruitOnPos(f.x, f.y, f.id);
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
