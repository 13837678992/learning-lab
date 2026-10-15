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
        this.isCreating = false;
        this.needSpawn = false;
        this.fruitCount = 0;
        this.score = 0;
        this.bestScore = this.saveData.bestScore || 0;
        this.soundOn = this.saveData.soundOn !== false;

        this.removeMode = false;
        this.aimEnabled = true;
        this.shuffling = false;
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
        instance.gravity = cc.v2(0, -960);

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
        this.isCreating = false;
        this.needSpawn = false;
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
        this.isCreating = false;
        this.needSpawn = false;
        this.removeMode = false;
        this.shuffling = false;
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
            this.isCreating = false;
            this.initOneFruit(this.nextFruitId);
        }
        this.drawAimLine();
    },

    gameOver() {
        if (this.state !== STATE.PLAYING) return;
        this.state = STATE.OVER;
        this.isCreating = false;
        this.needSpawn = false;
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
        this.currentFruit._birth = cc.director.getTotalTime();
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

        if (this.isCreating || this.shuffling || !this.currentFruit) return;
        this.aimX = this.clampX(this.toLocalX(e.getLocation().x), this.currentFruit);
        this.currentFruit.x = this.aimX;
        this.drawAimLine();
    },

    onTouchMove(e) {
        if (this.state !== STATE.PLAYING) return;
        if (this.activeTouchId !== e.getID()) return;
        if (this.isCreating || this.shuffling || !this.currentFruit) return;
        this.aimX = this.clampX(this.toLocalX(e.getLocation().x), this.currentFruit);
        this.currentFruit.x = this.aimX;
        this.drawAimLine();
    },

    onTouchEnd(e) {
        if (this.activeTouchId !== e.getID()) return;
        this.activeTouchId = null;
        if (this.state !== STATE.PLAYING) return;
        if (this.isCreating || this.shuffling || !this.currentFruit) return;
        this.dropFruit();
    },

    toLocalX(screenX) {
        const pos = this.node.convertToNodeSpaceAR(cc.v2(screenX, 0));
        return pos.x;
    },

    dropFruit() {
        const fruit = this.currentFruit;
        if (!fruit || !fruit.isValid) return;

        this.pushUndoSnapshot(fruit);

        this.isCreating = true;
        this.currentFruit = null;
        fruit._birth = cc.director.getTotalTime();
        this.startFruitPhysics(fruit);
        this.drawAimLine();

        this.scheduleOnce(() => {
            if (this.state !== STATE.PLAYING) {
                this.needSpawn = true;
                return;
            }
            this.isCreating = false;
            this.initOneFruit(this.nextFruitId);
        }, 0.55);
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
            newFruit._birth = cc.director.getTotalTime();
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
        const now = cc.director.getTotalTime();
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
        this.isCreating = false;
        this.needSpawn = false;
        this.removeMode = false;
        this.overTimer = 0;
        this.refreshItemHighlights();

        for (const f of snapshot.fruits) {
            const fruit = this.createFruitOnPos(f.x, f.y, f.id);
            fruit._birth = cc.director.getTotalTime();
            this.startFruitPhysics(fruit);
            const body = fruit.getComponent(cc.RigidBody);
            body.linearVelocity = cc.v2(0, 0);
            body.angularVelocity = 0;
        }

        this.score = snapshot.score;
        this.scoreLabel.string = this.score;
        this.fruitCount = snapshot.fruitCount;
        this.aimX = snapshot.aimX || 0;
        this.initOneFruit(snapshot.dropId);
        this.nextFruitId = snapshot.nextFruitId;
        this.updateNextPreview();
    },

    shuffleFruits() {
        if (this.shuffling) return;
        const fieldFruits = this.getFieldFruits();
        if (fieldFruits.length === 0) return;

        this.shuffling = true;
        this.removeMode = false;
        this.refreshItemHighlights();

        const ids = fieldFruits.map((f) => f.getComponent('Fruit').id);
        for (const f of fieldFruits) {
            f.off('sameContact');
            f.destroy();
        }

        // 按尺寸降序、自底向上网格重排，保证初始不重叠，随后由物理自然落定
        ids.sort((a, b) => b - a);
        const margin = 10;
        let rowMaxD = 0;
        let cursorX = -this.W / 2 + margin;
        let rowY = this.floorY;
        let placed = 0;

        const placeNext = () => {
            if (this.state === STATE.OVER || this.state === STATE.MENU || placed >= ids.length) {
                this.unschedule(placeNext);
                this.shuffling = false;
                return;
            }
            const id = ids[placed++];
            const fruit = this.createOneFruit(id);
            const d = fruit.width * 0.6;
            if (cursorX + d > this.W / 2 - margin) {
                cursorX = -this.W / 2 + margin;
                rowY += rowMaxD + margin;
                rowMaxD = 0;
            }
            fruit.setPosition(cursorX + d / 2, rowY + d / 2);
            cursorX += d + margin;
            rowMaxD = Math.max(rowMaxD, d);

            fruit._birth = cc.director.getTotalTime();
            this.startFruitPhysics(fruit);
        };
        // 注意：不能在 scheduleOnce 回调里用同一函数引用再次 scheduleOnce（调度器会忽略），改用重复调度
        this.schedule(placeNext, 0.06);
        placeNext();
    },

    // ---------------- 瞄准线 ----------------
    drawAimLine() {
        const gfx = this.aimGraphics;
        if (!gfx) return;
        gfx.clear();
        if (!this.aimEnabled || this.state !== STATE.PLAYING || !this.currentFruit || this.isCreating) return;

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
    update() {
        if (this.state !== STATE.PLAYING) return;

        const now = cc.director.getTotalTime();
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
