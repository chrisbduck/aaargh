//------------------------------------------------------------------------------
// Entities: Everything other than the app, the player, and the map.
// 
// <reference path='phaser/phaser.d.ts'/>
// <reference path='utils.ts'/>
//------------------------------------------------------------------------------

//------------------------------------------------------------------------------
// A Phaser sprite with an entity reference
//------------------------------------------------------------------------------

interface IEntitySprite extends Phaser.Sprite
{
	entity: Entity;
}

interface IStrDict
{
	[key: string]: string;
}

interface INumDict
{
	[key: string]: number;
}

var DIRECTIONS: Phaser.Point[] = [new Phaser.Point(1, 0), new Phaser.Point(0, 1), new Phaser.Point(-1, 0), new Phaser.Point(0, -1)];

//------------------------------------------------------------------------------
// Entity: base class.
//------------------------------------------------------------------------------
class Entity
{
	static SAY_TIME_MS = 2000;

	public sprite: Phaser.Sprite;
	public body: Phaser.Physics.Arcade.Body;
	public debugName: string;
	private saying: Phaser.Text;
	private sayingEvent: Phaser.TimerEvent;
	protected textStyle: IStrDict;
	protected prevVel: Phaser.Point;
	protected facingDir: Phaser.Point;
	protected facingAngle: number;

	protected isWatching: boolean;
	private watchingSprite: Phaser.Sprite; 

	private static debugCounters: INumDict = {};
	protected static SCARED_QUOTES: string[] = ["Aaargh!", "Aargh!", "Aaaaaaargh!", "Help!", "Yikes!", "Urk!", "Waaaa!"];

	//------------------------------------------------------------------------------
	constructor(sprite: Phaser.Sprite, typeName: string, watchingDistance: number = 0)
	{
		this.sprite = sprite;
		this.sprite.anchor.set(0.5, 0.5);
		this.sprite.position.add(this.sprite.width * 0.5, this.sprite.height * 0.5);
		this.body = sprite.body;
		(<IEntitySprite>sprite).entity = this;
		this.saying = null;
		this.sayingEvent = null;
		this.textStyle = { font: "18px 'Comic Sans',cursive", align: "center", fill: "white" };
		this.prevVel = new Phaser.Point();
		this.setFacingDir(Utils.getRandomElementFrom(DIRECTIONS));
		this.isWatching = false;

		// Debug name
		var count: number = Entity.debugCounters.hasOwnProperty(typeName) ? (Entity.debugCounters[typeName] + 1) : 1;
		Entity.debugCounters[typeName] = count;
		this.debugName = typeName + count;

		if (watchingDistance > 0)
			this.startWatching(watchingDistance);
	}

	//------------------------------------------------------------------------------
	public update()
	{
		this.updateSayTextPosition();
		this.updateVisionPosition();

		var vel = this.sprite.body.velocity;
		this.prevVel.setTo(vel.x, vel.y);
	}

	//------------------------------------------------------------------------------
	public say(text: string)
	{
		// Remove any previous saying
		if (this.saying != null)
		{
			this.saying.destroy();
			game.time.events.remove(this.sayingEvent);
			this.sayingEvent = null;
		}
		
		// Add a new one
		this.saying = game.add.text(0, 0, text, this.textStyle);
		this.saying.anchor.set(0.5, 0.0);
		this.sayingEvent = game.time.events.add(Entity.SAY_TIME_MS, () => this.saying.destroy());
		this.updateSayTextPosition();
	}

	//------------------------------------------------------------------------------
	public handleNoise(position: Phaser.Point, loudness: number = 1)
	{
		var offset = new Phaser.Point(this.sprite.position.x, this.sprite.position.y).subtract(position.x, position.y);
		if (loudness !== 1)
			offset.divide(loudness, loudness);
		var magnitudeSq = offset.getMagnitudeSq();
		//console.log(this.debugName, "handling noise msq", magnitudeSq);
		this.handleNoiseMagnitudeSq(magnitudeSq, position);
	}

	//------------------------------------------------------------------------------
	protected handleNoiseMagnitudeSq(magnitudeSq: number, position: Phaser.Point)
	{
	}

	//------------------------------------------------------------------------------
	public canSeePlayer(minSightAngleRatio: number, maxSightRangeSq: number): boolean
	{
		// Check distance first
		var playerPos = player.sprite.position;
		var thisPos = this.sprite.position;
		var offsetToPlayer = new Phaser.Point(playerPos.x, playerPos.y).subtract(thisPos.x, thisPos.y);
		var distSqToPlayer = offsetToPlayer.getMagnitudeSq();
		//if (this.debugName == 'guard1')
			//console.log("vision dist", distSqToPlayer, "dot", this.facingDir.dot(offsetToPlayer));
		if (distSqToPlayer > maxSightRangeSq)
			return false;

		// Check angle
		var facingRatio = this.facingDir.dot(offsetToPlayer);
		if (facingRatio < minSightAngleRatio)
			return false;

		return true;
	}

	//------------------------------------------------------------------------------
	private updateSayTextPosition()
	{
		if (!this.saying)
			return;
		
		this.saying.x = this.sprite.x;
		this.saying.y = this.sprite.y - this.sprite.height * 0.5 - <number>this.saying.fontSize * 1.4;
	}

	//------------------------------------------------------------------------------
	protected setFacingDir(vector: Phaser.Point)
	{
		if (vector.x === 0 && vector.y === 0)
		{
			this.facingDir = new Phaser.Point(1, 0);
			this.facingAngle = 0;
		}
		else
		{
			this.facingDir = new Phaser.Point(vector.x, vector.y).normalize();
			this.facingAngle = Phaser.Math.angleBetween(0, 0, this.facingDir.x, this.facingDir.y);
		}
		//if (this.debugName == 'guard1')
			//console.log("guard1 facing", this.facingDir);
	}

	//------------------------------------------------------------------------------
	protected moveTowardsPlayer(speed: number)
	{
		var angleToPlayer = this.sprite.position.angle(player.sprite.position);
		this.body.velocity = Utils.getPointFromPolar(angleToPlayer, speed);
		this.setFacingDir(this.body.velocity);
		//var targetVel: Phaser.Point = Utils.getPointFromPolar(angleToPlayer, Guard.NORMAL_VEL);
		//var velDiff: Phaser.Point = targetVel.subtract(this.body.velocity.x, this.body.velocity.y);
		//this.body.acceleration.setTo(velDiff.x * Guard.ACCELERATION, velDiff.y * Guard.ACCELERATION);
		//if (this.debugName == "guard1")
			//console.log("angle", angleToPlayer, "targetVel", targetVel, "velDiff", velDiff, "accel", this.body.acceleration);
	}

	//------------------------------------------------------------------------------
	protected faceTowardsPlayer()
	{
		var thisPos = this.sprite.position;
		var playerPos = player.sprite.position;
		var offsetToPlayer = new Phaser.Point(playerPos.x, playerPos.y).subtract(thisPos.x, thisPos.y);
		this.setFacingDir(offsetToPlayer);
	}

	//------------------------------------------------------------------------------
	protected moveAwayFromPlayer(speed: number)
	{
		var angleAwayFromPlayer = player.sprite.position.angle(this.sprite.position);
		this.body.velocity = Utils.getPointFromPolar(angleAwayFromPlayer, speed);
		this.setFacingDir(this.body.velocity);
	}

	//------------------------------------------------------------------------------
	protected startWatching(watchingDistance: number)
	{
		if (this.isWatching)
			return;
		this.isWatching = true;
		this.watchingSprite = game.add.sprite(0, 0, 'vision');
		this.watchingSprite.alpha = 0.3;
		this.watchingSprite.anchor.set(0.5, 1.0);
		this.watchingSprite.blendMode = PIXI.blendModes.ADD;
		var visionScale = watchingDistance / this.watchingSprite.height;
		this.watchingSprite.scale.set(visionScale, visionScale);
		this.updateVisionPosition();
	}

	//------------------------------------------------------------------------------
	protected stopWatching()
	{
		if (!this.isWatching)
			return;
		this.isWatching = false;
		this.watchingSprite.destroy();
	}

	//------------------------------------------------------------------------------
	private updateVisionPosition()
	{
		if (!this.isWatching)
			return;

		this.watchingSprite.x = this.sprite.x;
		this.watchingSprite.y = this.sprite.y;
		var imageAngle = Math.PI * -0.5;
		Utils.setSpriteRotation(this.watchingSprite, this.facingAngle, imageAngle);
	}
}

//------------------------------------------------------------------------------
// Guard
//------------------------------------------------------------------------------

var guardGroup: Phaser.Group;

class Guard extends Entity
{
	static CHASE_SPEED = 180;
	static FLEE_SPEED = 180;
	static ACCELERATION = 1800;
	static DRAG = 1200;
	static HIT_PAUSE_MS = 1000;
	static ALERT_PAUSE_MS = 1000;
	static MIN_SIGHT_ANGLE_RATIO = 0.5;		// max 60 degrees from straight on
	static MAX_SIGHT_RANGE = 200;
	static MAX_SIGHT_RANGE_SQ = Guard.MAX_SIGHT_RANGE * Guard.MAX_SIGHT_RANGE;
	static SCARE_THRESHOLD = 64;
	static SCARE_THRESHOLD_SQ = Guard.SCARE_THRESHOLD * Guard.SCARE_THRESHOLD;

	private movePaused: boolean;
	private isChasing: boolean;
	private isFleeing: boolean;

	//------------------------------------------------------------------------------
	constructor(sprite: Phaser.Sprite)
	{
		super(sprite, "guard", Guard.MAX_SIGHT_RANGE);
		this.body.maxVelocity.setTo(Guard.CHASE_SPEED, Guard.CHASE_SPEED);
		this.body.drag.setTo(Guard.DRAG, Guard.DRAG);
		this.movePaused = false;
		this.isChasing = false;
		this.isFleeing = false;
		this.textStyle['fill'] = Utils.getRandomElementFrom(["yellow", "orange", "indianred", "coral", "darkorange", "orangered"])
	}

	//------------------------------------------------------------------------------
	public update()
	{
		var physics = game.physics.arcade;

		// Always collide with the player
		var touchingPlayer = physics.collide(this.sprite, player.sprite);

		// Chasing
		if (this.isChasing)
		{
			if (!this.movePaused)
			{
				// If the guard is touching the player, hit the player, then pause them for a bit
				if (touchingPlayer)
				{
					this.movePaused = true;
					game.time.events.add(Guard.HIT_PAUSE_MS, () => this.movePaused = false);
					this.say(Utils.getRandomElementFrom(["<biff>", "<boff>", "<thump>", "<thock>", "<whump>"]));
					player.hit(1);
				}
				else
					this.moveTowardsPlayer(Guard.CHASE_SPEED);
			}
			else
				this.faceTowardsPlayer();
		}
		// Fleeing
		else if (this.isFleeing)
		{
			if (!this.movePaused)
				this.moveAwayFromPlayer(Guard.FLEE_SPEED);
		}
		// Watching
		else if (this.canSeePlayer(Guard.MIN_SIGHT_ANGLE_RATIO, Guard.MAX_SIGHT_RANGE_SQ))
		{
			this.say(Utils.getRandomElementFrom(["Villain!", "Monster!", "Ahoy!", "Who are you?!", "Stop, creature!", "Stay where you are!"]));
			this.isChasing = true;
			this.movePaused = true;
			game.time.events.add(Guard.ALERT_PAUSE_MS, () => this.movePaused = false);
		}

		super.update();
	}

	//------------------------------------------------------------------------------
	protected handleNoiseMagnitudeSq(magnitudeSq: number, position: Phaser.Point)
	{
		if (this.isChasing || this.isFleeing || magnitudeSq > Guard.SCARE_THRESHOLD_SQ)
			return;

		this.stopWatching();
		this.isFleeing = true;
		this.movePaused = true;
		game.time.events.add(200, () =>
		{
			this.movePaused = false;
			this.say(Utils.getRandomElementFrom(Entity.SCARED_QUOTES));
			app.addScarePoints(10);
		});
	}
}

//------------------------------------------------------------------------------
// Civilian
//------------------------------------------------------------------------------

var civilianGroup: Phaser.Group;

class Civilian extends Entity
{
	static DRAG = 600;
	static FLEE_SPEED = 220;
	static SCARE_THRESHOLD = 100;
	static SCARE_THRESHOLD_SQ = Civilian.SCARE_THRESHOLD * Civilian.SCARE_THRESHOLD;
	static MAX_SIGHT_RANGE = 120;
	static MIN_SIGHT_ANGLE_RATIO = 0.7071;		// max 45 degrees from straight on
	static MAX_SIGHT_RANGE_SQ = Civilian.MAX_SIGHT_RANGE * Civilian.MAX_SIGHT_RANGE;
	static NORMAL_SPEED = 110;

	private isFleeing: boolean;
	private walkSpeed: number;

	//------------------------------------------------------------------------------
	constructor(sprite: Phaser.Sprite)
	{
		super(sprite, "civilian", Civilian.MAX_SIGHT_RANGE);
		this.body.drag.setTo(Civilian.DRAG, Civilian.DRAG);
		this.sprite.checkWorldBounds = true;
		this.sprite.events.onOutOfBounds.add(() => this.handleEscaped());
		this.isFleeing = false;
		this.walkSpeed = Civilian.NORMAL_SPEED;
		this.textStyle['fill'] = Utils.getRandomElementFrom(["aqua", "aquamarine", "cadetblue", "cyan", "darkgoldenrod", "goldenrod", "lightskyblue"]);
		//console.log(this.debugName, this.textStyle['fill']);

	}

	//------------------------------------------------------------------------------
	public update()
	{
		if (!this.sprite.alive)
			return;

		// Always collide with the player
		game.physics.arcade.collide(this.sprite, player.sprite);

		if (this.isFleeing)
			this.moveAwayFromPlayer(this.walkSpeed);
		else if (this.canSeePlayer(Civilian.MIN_SIGHT_ANGLE_RATIO, Civilian.MAX_SIGHT_RANGE_SQ))
		{
			this.say(Utils.getRandomElementFrom(["Uh-oh...", "Hmmm...", "What's that?", "Who's that?", "Strange...", "I'm outta here..."]));
			this.isFleeing = true;
			this.walkSpeed = Civilian.NORMAL_SPEED;
			app.addScarePoints(1);
		}

		super.update();
	}

	//------------------------------------------------------------------------------
	protected handleNoiseMagnitudeSq(magnitudeSq: number, position: Phaser.Point)
	{
		if (magnitudeSq > Civilian.SCARE_THRESHOLD_SQ)
			return;
		
		// Civilian was walking away; give points for making them run
		if (this.isFleeing && this.walkSpeed === Civilian.NORMAL_SPEED)
			app.addScarePoints(1);

		this.walkSpeed = Civilian.FLEE_SPEED;
		this.stopWatching();

		if (!this.isFleeing)
			game.time.events.add(200, () =>
			{
				this.isFleeing = true;
				this.say(Utils.getRandomElementFrom(Entity.SCARED_QUOTES));
				app.addScarePoints(5);
			});
	}

	//------------------------------------------------------------------------------
	private handleEscaped()
	{
		console.log(this.debugName, "escaped");
		this.sprite.destroy();
	}
}
