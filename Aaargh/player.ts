//------------------------------------------------------------------------------
// Player functions.
// 
// <reference path='phaser/phaser.d.ts'/>
//------------------------------------------------------------------------------

var player: Player = null;

class Player extends Entity
{
	static NORMAL_VEL = 200;
	static DIAG_FACTOR = 0.7071;
	static ACCELERATION = 2000;
	static DRAG = 1000;
	static SHOUT_HOLD_LIMIT_MS = 1000;

	private canMove: boolean;
	private cursorKeys: Phaser.CursorKeys;
	private health: number;

	//------------------------------------------------------------------------------
	constructor(sprite: Phaser.Sprite)
	{
		super(sprite, "player");
		this.cursorKeys = game.input.keyboard.createCursorKeys();
		this.prevVel = new Phaser.Point();
		this.canMove = true;
		this.textStyle['fill'] = "darkgray";
		this.health = 5;

		game.physics.arcade.enable(this.sprite);

		var body: Phaser.Physics.Arcade.Body = this.sprite.body;
		body.maxVelocity.setTo(Player.NORMAL_VEL, Player.NORMAL_VEL);
		body.drag.setTo(Player.DRAG, Player.DRAG);
		body.bounce.x = 0.2;
		body.bounce.y = 0.2;
		body.collideWorldBounds = true;
	}

	//------------------------------------------------------------------------------
	public update()
	{
		this.updateMoveInput();

		super.update();
	}

	//------------------------------------------------------------------------------
	private updateMoveInput()
	{
		var accel = this.sprite.body.acceleration;
		accel.x = 0;
		accel.y = 0;

		if (!this.canMove)
			return;

		var animKey = null;

		// Check up/down
		if (this.cursorKeys.up.isDown)
		{
			accel.y = -Player.ACCELERATION;
			animKey = 'up';
		}
		else if (this.cursorKeys.down.isDown)
		{
			accel.y = Player.ACCELERATION;
			animKey = 'down';
		}

		// Check left/right second because its animation takes precedence
		if (this.cursorKeys.right.isDown)
		{
			accel.x = Player.ACCELERATION;
			animKey = 'right';
		}
		else if (this.cursorKeys.left.isDown)
		{
			accel.x = -Player.ACCELERATION;
			animKey = 'left';
		}

		// Play animation
		/*var anims = this.sprite.animations;
		if (animKey === null)
			anims.stop();
		else
			anims.play(animKey, Player.WALK_ANIM_SPEED);*/

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
	}

	//------------------------------------------------------------------------------
	public receiveHit(damage: number)
	{
		app.subtractHealthPoints(damage);
	}
}
