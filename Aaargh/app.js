//------------------------------------------------------------------------------
// Aaargh: LD33 entry by Schnerble
// 
// <reference path='phaser/phaser.d.ts'/>
// <reference path='map.ts'/>
// <reference path='player.ts'/>
// <reference path='utils.ts'/>
//------------------------------------------------------------------------------
var app = null;
var game = null;
var statusText = null;
var scareText = null;
var friendText = null;
var healthText = null;
var subheaderText = null;
var level = null;
var TILE_SIZE = 64;
var NUM_TILES_X = 32;
var NUM_TILES_Y = 20;
var INITIAL_HEALTH = 10;
var DISPLAY_TILES_X = 16;
var DISPLAY_TILES_Y = 10;
//------------------------------------------------------------------------------
// Main app
//------------------------------------------------------------------------------
var App = (function () {
    //------------------------------------------------------------------------------
    function App() {
        var _this = this;
        this.isRunning = false;
        this.isPaused = false;
        this.isAwaitingRestart = false;
        this.pauseText = null;
        game = new Phaser.Game(DISPLAY_TILES_X * TILE_SIZE, DISPLAY_TILES_Y * TILE_SIZE, Phaser.AUTO, 'content', { preload: function () { return _this.preload(); }, create: function () { return _this.create(); }, update: function () { return _this.update(); }, render: function () { return _this.render(); } });
        statusText = document.getElementById("status");
        scareText = document.getElementById("scares");
        friendText = document.getElementById("friends");
        healthText = document.getElementById("health");
        subheaderText = document.getElementById("subheader");
    }
    //------------------------------------------------------------------------------
    App.prototype.preload = function () {
    };
    //------------------------------------------------------------------------------
    App.prototype.startLoad = function () {
        game.load.image('ground', 'data/tex/ground.jpg');
        game.load.spritesheet('monster', 'data/tex/monster2-sheet.png', 64, 64);
        game.load.spritesheet('civilian', 'data/tex/bigcivilian-sheet.png', 64, 64);
        game.load.spritesheet('policeman', 'data/tex/bigpoliceman-sheet.png', 64, 64);
        game.load.image('plant', 'data/tex/bigplant.png');
        game.load.image('bigtiles', 'data/tex/bigtiles.png');
        game.load.image('vision', 'data/tex/light-cone.png');
        game.load.image('scare', 'data/tex/exclamation.png');
        game.load.image('friend', 'data/tex/heart.png');
        game.load.tilemap('biglevel', 'data/level/biglevel.json', null, Phaser.Tilemap.TILED_JSON);
        var SOUND_EFFECTS = [
            'hit1', 'hit2', 'hit3', 'hit4',
            'hugdone1', 'hugdone2', 'hugdone3', 'hugdone4',
            'hugstart1', 'hugstart2', 'hugstart3', 'hugstart4',
            'sawplayer1', 'sawplayer2', 'sawplayer3', 'sawplayer4', 'sawplayer5',
            'scared1', 'scared2', 'scared3', 'scared4', 'scared5', 'scared6',
            'scarenoise1', 'scarenoise2', 'scarenoise3', 'scarenoise4', 'scarenoise5',
        ];
        for (var index = 0; index < SOUND_EFFECTS.length; ++index) {
            var key = SOUND_EFFECTS[index];
            game.load.audio(key, 'data/sfx/' + key + '.ogg', true);
        }
        game.load.audio('broke-wall', 'data/sfx/hit1.ogg', true);
        game.load.audio('music', 'data/music/music.ogg', true);
        game.load.start();
    };
    //------------------------------------------------------------------------------
    App.prototype.create = function () {
        var _this = this;
        // Stop various key presses from passing through to the browser
        var kb = Phaser.Keyboard;
        game.input.keyboard.addKeyCapture([kb.LEFT, kb.RIGHT, kb.UP, kb.DOWN, kb.SPACEBAR, kb.ENTER, kb.BACKSPACE, kb.P, kb.CONTROL]);
        game.world.setBounds(0, 0, NUM_TILES_X * TILE_SIZE, NUM_TILES_Y * TILE_SIZE);
        game.physics.startSystem(Phaser.Physics.ARCADE);
        this.nextLevel = 'level1';
        game.load.onLoadStart.add(function () { return _this.loadStart(); });
        game.load.onFileComplete.add(function (progress) { return _this.fileComplete(progress); });
        game.load.onLoadComplete.add(function () { return _this.loadComplete(); });
        this.startLoad();
        //game.input.keyboard.onPressCallback = () => this.handleKeyPress();
        game.time.advancedTiming = true;
        this.chatterEvent = null;
        this.music = null;
    };
    //------------------------------------------------------------------------------
    App.prototype.loadStart = function () {
        this.setStatus("Loading... 0%");
    };
    //------------------------------------------------------------------------------
    App.prototype.fileComplete = function (progress) {
        this.setStatus("Loading... " + progress + "%");
    };
    //------------------------------------------------------------------------------
    App.prototype.loadComplete = function () {
        this.setStatus("");
        document.getElementById("dScore").style.visibility = "visible";
        console.log("Load complete");
        this.startGame();
    };
    //------------------------------------------------------------------------------
    App.prototype.startGame = function () {
        console.log("Game starting");
        level = new Level('biglevel', 'bigtiles', this.nextLevel);
        this.setScarePoints(0);
        this.setFriendPoints(0);
        this.setHealthPoints(INITIAL_HEALTH);
        this.isRunning = true;
        this.isPaused = false;
        this.isAwaitingRestart = false;
        this.shoutHeld = false;
        this.shouted = false;
        this.hugHeld = false;
        this.scheduleChatter();
        this.setStatus("");
        subheaderText.innerHTML = "";
        if (this.music)
            this.music.destroy();
        this.music = game.add.audio('music', 0.6, true);
        this.music.play();
        game.camera.follow(player.sprite, Phaser.Camera.FOLLOW_TOPDOWN_TIGHT);
        Utils.trackStat('game', 'start');
    };
    //------------------------------------------------------------------------------
    App.prototype.restartGame = function () {
        console.log("Game reset");
        if (this.chatterEvent) {
            game.time.events.remove(this.chatterEvent);
            this.chatterEvent = null;
        }
        level.destroy();
        level = null;
        guardGroup.destroy();
        guardGroup = null;
        civilianGroup.destroy();
        civilianGroup = null;
        plantGroup.destroy();
        plantGroup = null;
        player.sprite.destroy();
        player = null;
        this.startGame();
    };
    //------------------------------------------------------------------------------
    App.prototype.update = function () {
        if (this.isRunning && !this.isPaused)
            this.updateGame();
        var keyboard = game.input.keyboard;
        var lastKey = keyboard.lastKey;
        if (lastKey && lastKey.justDown)
            this.handleKeyPress();
        if (this.isRunning) {
            // Shout control
            var shoutHeld = !!keyboard.isDown(Phaser.Keyboard.SPACEBAR);
            var shouldShout = false;
            if (shoutHeld != this.shoutHeld) {
                if (shoutHeld) {
                    this.shoutHoldStart = game.time.now;
                    this.shouted = false;
                    player.prepareShout();
                    Utils.trackStat('player', 'shout');
                }
                else
                    shouldShout = true;
                this.shoutHeld = shoutHeld;
            }
            else if (shoutHeld && game.time.now - this.shoutHoldStart >= Player.SHOUT_HOLD_LIMIT_MS)
                shouldShout = true;
            if (shouldShout && !this.shouted) {
                player.shout(Math.min(game.time.now - this.shoutHoldStart, Player.SHOUT_HOLD_LIMIT_MS));
                this.shouted = true;
            }
            // Hug control
            var hugHeld = !!keyboard.isDown(Phaser.Keyboard.CONTROL);
            if (hugHeld != this.hugHeld) {
                // Start hugging anything unaware in range
                if (hugHeld) {
                    player.startHug();
                    Utils.trackStat('player', 'hug');
                }
                else
                    player.stopHug();
                this.hugHeld = hugHeld;
            }
        }
    };
    //------------------------------------------------------------------------------
    App.prototype.handleKeyPress = function () {
        var lastKey = game.input.keyboard.lastKey;
        // Pause
        if (this.isRunning && lastKey.keyCode === Phaser.Keyboard.P) {
            this.isPaused = !this.isPaused;
            this.setStatus(this.isPaused ? "Paused" : "");
            return;
        }
        // Restart
        if (this.isAwaitingRestart && lastKey.keyCode === Phaser.Keyboard.ENTER) {
            this.restartGame();
            return;
        }
        // Toggle music
        if (lastKey.keyCode === Phaser.Keyboard.M && this.music)
            this.music.mute = !this.music.mute;
        // Debug: win level
        if (lastKey.keyCode === Phaser.Keyboard.L && game.input.keyboard.isDown(Phaser.Keyboard.SHIFT))
            this.winLevel();
    };
    //------------------------------------------------------------------------------
    App.prototype.updateGame = function () {
        player.update();
        var physics = game.physics.arcade;
        // Guards
        physics.collide(guardGroup, guardGroup);
        physics.collide(guardGroup, civilianGroup);
        physics.collide(guardGroup, plantGroup);
        this.updateGroup(guardGroup, false);
        // Civilians
        this.updateGroup(civilianGroup, false);
        physics.collide(civilianGroup, civilianGroup);
        physics.collide(civilianGroup, plantGroup);
        physics.collide(plantGroup, plantGroup);
        level.update();
    };
    //------------------------------------------------------------------------------
    App.prototype.updateGroup = function (group, doCollide) {
        group.forEach(function (child) { return child.entity.update(); }, null);
        if (doCollide) {
            // Check for collision with the player
            game.physics.arcade.collide(group, player.sprite);
        }
    };
    //------------------------------------------------------------------------------
    App.prototype.render = function () {
        if (!this.isRunning)
            return;
        //if (player.sprite.body.enable)
        //game.debug.body(player.sprite);
        //guardGroup.forEachAlive(child => { if (child.body.enable) game.debug.body(child); }, null);
        //civilianGroup.forEachAlive(child => { if (child.body.enable) game.debug.body(child); }, null);
        //game.debug.bodyInfo(player.sprite, 10, 20);
        //game.debug.bodyInfo(<Phaser.Sprite>guardGroup.children[1], 10, 20);
    };
    //------------------------------------------------------------------------------
    App.prototype.setStatus = function (text) {
        statusText.innerHTML = text;
    };
    //------------------------------------------------------------------------------
    App.prototype.addScarePoints = function (num) {
        this.setScarePoints(this.scarePoints + num);
        Utils.trackStat('points', 'scare', '', this.friendPoints);
    };
    //------------------------------------------------------------------------------
    App.prototype.setScarePoints = function (num) {
        this.scarePoints = num;
        scareText.innerHTML = num.toString();
    };
    //------------------------------------------------------------------------------
    App.prototype.addFriendPoints = function (num) {
        this.setFriendPoints(this.friendPoints + num);
        Utils.trackStat('points', 'friend', '', this.friendPoints);
    };
    //------------------------------------------------------------------------------
    App.prototype.setFriendPoints = function (num) {
        this.friendPoints = num;
        friendText.innerHTML = num.toString();
    };
    //------------------------------------------------------------------------------
    App.prototype.subtractHealthPoints = function (num) {
        this.setHealthPoints(this.healthPoints - num);
    };
    //------------------------------------------------------------------------------
    App.prototype.setHealthPoints = function (num) {
        this.healthPoints = Math.max(num, 0);
        var healthPct = num * 100 / INITIAL_HEALTH;
        healthText.innerHTML = healthPct.toString() + "%";
        var lowHealth = healthPct < 50;
        healthText.style.color = lowHealth ? "red" : "orange";
        if (this.healthPoints === 0) {
            this.isRunning = false;
            this.isAwaitingRestart = true;
            player.halt();
            subheaderText.innerHTML = "Dead!";
            this.setStatus("Press Enter to restart");
            Utils.trackStat('game', 'death');
        }
    };
    //------------------------------------------------------------------------------
    App.prototype.checkCompletion = function () {
        if (guardGroup.children.length === 0 && civilianGroup.children.length === 0)
            this.winLevel();
    };
    //------------------------------------------------------------------------------
    App.prototype.winLevel = function () {
        this.isRunning = false;
        this.isAwaitingRestart = true;
        subheaderText.innerHTML = "You won!";
        this.setStatus("Press Enter to try the next level");
        this.nextLevel = (this.nextLevel === 'level1') ? 'level2' : 'level1';
        Utils.trackStat('level', 'won');
    };
    //------------------------------------------------------------------------------
    App.prototype.scheduleChatter = function () {
        var _this = this;
        var intervalMs = Phaser.Math.linear(300, 8000, Math.random());
        this.chatterEvent = game.time.events.add(intervalMs, function () { return _this.triggerChatter(); });
    };
    //------------------------------------------------------------------------------
    App.prototype.triggerChatter = function () {
        // Pick a guard or civilian
        var chatterers = [];
        var findChatterers = function (sprite) {
            var entity = sprite.entity;
            if (entity.canChatter())
                chatterers.push(entity);
        };
        guardGroup.forEachAlive(findChatterers, null);
        civilianGroup.forEachAlive(findChatterers, null);
        if (chatterers.length > 0)
            Utils.getRandomElementFrom(chatterers).triggerChatter();
        this.scheduleChatter(); // next event
    };
    return App;
})();
window.onload = function () {
    app = new App();
};
//# sourceMappingURL=app.js.map