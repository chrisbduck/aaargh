//------------------------------------------------------------------------------
// Player functions.
// 
// <reference path='phaser/phaser.d.ts'/>
//------------------------------------------------------------------------------
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var player = null;
var Player = (function (_super) {
    __extends(Player, _super);
    //------------------------------------------------------------------------------
    function Player(sprite) {
        _super.call(this, sprite, "player");
        this.cursorKeys = game.input.keyboard.createCursorKeys();
        this.prevVel = new Phaser.Point();
        this.canMove = true;
        this.isHugging = false;
        this.textStyle['fill'] = "darkgray";
        this.hugTargets = [];
        this.hugEmitter = null;
        this.isShouting = false;
        this.shoutFrame = 0;
        this.hugFrame = 0;
        game.physics.arcade.enable(this.sprite);
        var body = this.sprite.body;
        this.body = body; // not set correctly until physics enable above
        body.maxVelocity.setTo(Player.NORMAL_VEL, Player.NORMAL_VEL);
        body.drag.setTo(Player.DRAG, Player.DRAG);
        body.bounce.x = 0.2;
        body.bounce.y = 0.2;
        body.collideWorldBounds = true;
        body.setSize(48, 64, 8, 0);
        var anims = this.sprite.animations;
        var animSpeed = Player.WALK_ANIM_SPEED;
        anims.add('down', [0, 1, 2, 1], animSpeed, true);
        anims.add('up', [4, 5, 6, 5], animSpeed, true);
        anims.add('left', [8, 9, 10, 9], animSpeed, true);
        anims.add('right', [12, 13, 14, 13], animSpeed, true);
    }
    //------------------------------------------------------------------------------
    Player.prototype.update = function () {
        this.updateMoveInput();
        game.physics.arcade.collide(this.sprite, plantGroup);
        // Anim frame override
        if (this.isShouting)
            this.sprite.frame = this.shoutFrame;
        else if (this.isHugging)
            this.sprite.frame = this.hugFrame;
        if (this.hugEmitter != null)
            this.hugEmitter.setPosition(this.sprite.position);
        _super.prototype.update.call(this);
    };
    //------------------------------------------------------------------------------
    Player.prototype.updateMoveInput = function () {
        var accel = this.sprite.body.acceleration;
        accel.x = 0;
        accel.y = 0;
        if (!this.canMove || this.isHugging)
            return;
        var animKey = null;
        // Check up/down
        if (this.cursorKeys.up.isDown) {
            accel.y = -Player.ACCELERATION;
            animKey = 'up';
            this.shoutFrame = 7;
            this.hugFrame = 17;
        }
        else if (this.cursorKeys.down.isDown) {
            accel.y = Player.ACCELERATION;
            animKey = 'down';
            this.shoutFrame = 3;
            this.hugFrame = 16;
        }
        // Check left/right second because its animation takes precedence
        if (this.cursorKeys.right.isDown) {
            accel.x = Player.ACCELERATION;
            animKey = 'right';
            this.shoutFrame = 15;
            this.hugFrame = 19;
        }
        else if (this.cursorKeys.left.isDown) {
            accel.x = -Player.ACCELERATION;
            animKey = 'left';
            this.shoutFrame = 11;
            this.hugFrame = 18;
        }
        // Play animation
        var anims = this.sprite.animations;
        if (this.isShouting || this.isHugging || animKey === null)
            anims.stop();
        else
            anims.play(animKey, Player.WALK_ANIM_SPEED);
        // Diagonal scaling
        var diagonal = accel.x !== 0 && accel.y !== 0;
        if (diagonal) {
            accel.x *= Player.DIAG_FACTOR;
            accel.y *= Player.DIAG_FACTOR;
        }
        // Set the maximum velocity
        var maxVel = Player.NORMAL_VEL;
        if (diagonal)
            maxVel *= Player.DIAG_FACTOR;
        this.sprite.body.maxVelocity.setTo(maxVel, maxVel);
    };
    //------------------------------------------------------------------------------
    Player.prototype.prepareShout = function () {
        this.say("...", true); // hold
    };
    //------------------------------------------------------------------------------
    Player.prototype.shout = function (holdDuration) {
        var _this = this;
        var volume = 1 + holdDuration / Player.SHOUT_HOLD_LIMIT_MS; // range [1, 2]
        this.say(Utils.getRandomElementFrom(["Boo!", "Raaa!", "Raaaar!", "Roooarrr!", "Grrr!", "Bwaha!", "Boogabooga!"]), false, volume);
        var noiseHandler = function (entitySprite) { return entitySprite.entity.handleNoise(_this.sprite.position, volume); };
        civilianGroup.forEachAlive(noiseHandler, null);
        guardGroup.forEachAlive(noiseHandler, null);
        Utils.playSound('scarenoise', 1, 5);
        this.isShouting = true;
        game.time.events.add(1000, function () { return _this.isShouting = false; });
    };
    //------------------------------------------------------------------------------
    Player.prototype.receiveHit = function (damage) {
        app.subtractHealthPoints(damage);
        Utils.playSound('hit', 1, 4);
    };
    //------------------------------------------------------------------------------
    Player.prototype.startHug = function () {
        var _this = this;
        var hugHandler = function (entitySprite) {
            var entity = entitySprite.entity;
            if (Utils.distSqBetweenPoints(entity.sprite.position, _this.sprite.position) > Player.MAX_HUG_DIST_SQ)
                return false;
            if (entity.canBeHugged()) {
                entity.startHug();
                _this.hugTargets.push(entity);
            }
        };
        guardGroup.forEachAlive(hugHandler, null);
        civilianGroup.forEachAlive(hugHandler, null);
        this.isHugging = true;
        Utils.playSound('hugstart', 1, 4);
        if (this.hugTargets && this.hugTargets.length > 0) {
            this.hugEmitter = new HugEmitter(this.sprite.position.x, this.sprite.position.y);
            this.say("<hug>", true); // held
        }
        return true;
    };
    //------------------------------------------------------------------------------
    Player.prototype.stopHug = function () {
        for (var index = 0; index < this.hugTargets.length; ++index)
            this.hugTargets[index].releaseHug();
        this.hugTargets = [];
        this.say("");
        this.isHugging = false;
        var emitter = this.hugEmitter;
        this.hugEmitter = null;
        if (emitter) {
            emitter.stop();
            game.time.events.add(2000, function () { return emitter.destroy(); });
        }
    };
    //------------------------------------------------------------------------------
    Player.prototype.halt = function () {
        this.body.acceleration.set(0, 0);
        this.body.velocity.set(0, 0);
    };
    Player.NORMAL_VEL = 400;
    Player.DIAG_FACTOR = 0.7071;
    Player.ACCELERATION = 4000;
    Player.DRAG = 2000;
    Player.SHOUT_HOLD_LIMIT_MS = 1000;
    Player.MAX_HUG_DIST = 100;
    Player.MAX_HUG_DIST_SQ = Player.MAX_HUG_DIST * Player.MAX_HUG_DIST;
    Player.WALK_ANIM_SPEED = 10;
    return Player;
})(Entity);
//# sourceMappingURL=player.js.map