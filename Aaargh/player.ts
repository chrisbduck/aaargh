//------------------------------------------------------------------------------
// Player functions.
// 
// <reference path='phaser/phaser.d.ts'/>
//------------------------------------------------------------------------------

var player: Player = null;

class Player extends Entity
{
	static NORMAL_VEL = 400;
	static DIAG_FACTOR = 0.7071;
	static ACCELERATION = 4000;
	static DRAG = 2000;
	static SHOUT_HOLD_LIMIT_MS = 1000;
	static MAX_HUG_DIST = 100;
	static MAX_HUG_DIST_SQ = Player.MAX_HUG_DIST * Player.MAX_HUG_DIST;
	static WALK_ANIM_SPEED = 10;

	private canMove: boolean;
	private isHugging: boolean;
	private isShouting: boolean;
	private shoutFrame: number;
	private hugFrame: number;
	private cursorKeys: Phaser.CursorKeys;
	private hugTargets: Entity[];
	private hugEmitter: HugEmitter;

	//------------------------------------------------------------------------------
	constructor(sprite: Phaser.Sprite)
	{
		super(sprite, "player");
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

		var body: Phaser.Physics.Arcade.Body = this.sprite.body;
		this.body = body;												// not set correctly until physics enable above
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
	public update()
	{
		this.updateMoveInput();

		game.physics.arcade.collide(this.sprite, plantGroup);

		// Anim frame override
		if (this.isShouting)
			this.sprite.frame = this.shoutFrame;
		else if (this.isHugging)
			this.sprite.frame = this.hugFrame;

		if (this.hugEmitter != null)
			this.hugEmitter.setPosition(this.sprite.position);

		super.update();
	}

	//------------------------------------------------------------------------------
	private updateMoveInput()
	{
		var accel = this.sprite.body.acceleration;
		accel.x = 0;
		accel.y = 0;

		if (!this.canMove || this.isHugging)
			return;

		var animKey: string = null;

		// Check up/down
		if (this.cursorKeys.up.isDown)
		{
			accel.y = -Player.ACCELERATION;
			animKey = 'up';
			this.shoutFrame = 7;
			this.hugFrame = 17;
		}
		else if (this.cursorKeys.down.isDown)
		{
			accel.y = Player.ACCELERATION;
			animKey = 'down';
			this.shoutFrame = 3;
			this.hugFrame = 16;
		}

		// Check left/right second because its animation takes precedence
		if (this.cursorKeys.right.isDown)
		{
			accel.x = Player.ACCELERATION;
			animKey = 'right';
			this.shoutFrame = 15;
			this.hugFrame = 19;
		}
		else if (this.cursorKeys.left.isDown)
		{
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
		if (diagonal)
		{
			accel.x *= Player.DIAG_FACTOR;
			accel.y *= Player.DIAG_FACTOR;
		}

		// Set the maximum velocity
		var maxVel: number = Player.NORMAL_VEL;
		if (diagonal)
			maxVel *= Player.DIAG_FACTOR;
		this.sprite.body.maxVelocity.setTo(maxVel, maxVel);
	}

	//------------------------------------------------------------------------------
	public prepareShout()
	{
		this.say("...", true);	// hold
	}

	//------------------------------------------------------------------------------
	public shout(holdDuration: number)
	{
		var volume: number = 1 + holdDuration / Player.SHOUT_HOLD_LIMIT_MS;		// range [1, 2]

		this.say(Utils.getRandomElementFrom(["Boo!", "Raaa!", "Raaaar!", "Roooarrr!", "Grrr!", "Bwaha!", "Boogabooga!"]), false, volume);
		var noiseHandler = (entitySprite: IEntitySprite) => entitySprite.entity.handleNoise(this.sprite.position, volume);
		civilianGroup.forEachAlive(noiseHandler, null);
		guardGroup.forEachAlive(noiseHandler, null);

		Utils.playSound('scarenoise', 1, 5);

		this.isShouting = true;
		game.time.events.add(1000, () => this.isShouting = false);
	}

	//------------------------------------------------------------------------------
	public receiveHit(damage: number)
	{
		app.subtractHealthPoints(damage);
		Utils.playSound('hit', 1, 4);
	}

	//------------------------------------------------------------------------------
	public startHug(): boolean
	{
		var hugHandler = (entitySprite: IEntitySprite) =>
		{
			var entity = entitySprite.entity;
			if (Utils.distSqBetweenPoints(entity.sprite.position, this.sprite.position) > Player.MAX_HUG_DIST_SQ)
				return false;

			if (entity.canBeHugged())
			{
				entity.startHug();
				this.hugTargets.push(entity);
			}
		};
		guardGroup.forEachAlive(hugHandler, null);
		civilianGroup.forEachAlive(hugHandler, null);
		this.isHugging = true;
		Utils.playSound('hugstart', 1, 4);
		if (this.hugTargets && this.hugTargets.length > 0)
		{
			this.hugEmitter = new HugEmitter(this.sprite.position.x, this.sprite.position.y);
			this.say("<hug>", true);		// held
		}
		return true;
	}

	//------------------------------------------------------------------------------
	public stopHug()
	{
		for (var index = 0; index < this.hugTargets.length; ++index)
			this.hugTargets[index].releaseHug();
		this.hugTargets = [];
		this.say("");
		this.isHugging = false;

		var emitter = this.hugEmitter;
		this.hugEmitter = null;
		if (emitter)
		{
			emitter.stop();
			game.time.events.add(2000, () => emitter.destroy());
		}
	}

	//------------------------------------------------------------------------------
	public halt()
	{
		this.body.acceleration.set(0, 0);
		this.body.velocity.set(0, 0);
	}
}
