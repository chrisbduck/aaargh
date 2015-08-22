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

	private static debugCounters: INumDict = {};

	//------------------------------------------------------------------------------
	constructor(sprite: Phaser.Sprite, typeName: string)
	{
		this.sprite = sprite;
		this.body = sprite.body;
		(<IEntitySprite>sprite).entity = this;
		this.saying = null;
		this.sayingEvent = null;
		this.textStyle = { font: "18px 'Comic Sans',cursive", align: "center", fill: "white" };

		// Debug name
		var count: number = Entity.debugCounters.hasOwnProperty(typeName) ? (Entity.debugCounters[typeName] + 1) : 1;
		Entity.debugCounters[typeName] = count;
		this.debugName = typeName + count;
	}

	//------------------------------------------------------------------------------
	public update()
	{
		this.updateSayTextPosition();
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
	}

	//------------------------------------------------------------------------------
	private updateSayTextPosition()
	{
		if (!this.saying)
			return;
		
		this.saying.x = this.sprite.x + this.sprite.width * 0.5;
		this.saying.y = this.sprite.y - <number>this.saying.fontSize * 1.4;
	}

	//------------------------------------------------------------------------------
	protected moveTowardsPlayer(speed: number)
	{
		var angleToPlayer = this.sprite.position.angle(player.sprite.position);
		this.body.velocity = Utils.getPointFromPolar(angleToPlayer, speed);
		//var targetVel: Phaser.Point = Utils.getPointFromPolar(angleToPlayer, Guard.NORMAL_VEL);
		//var velDiff: Phaser.Point = targetVel.subtract(this.body.velocity.x, this.body.velocity.y);
		//this.body.acceleration.setTo(velDiff.x * Guard.ACCELERATION, velDiff.y * Guard.ACCELERATION);
		//if (this.debugName == "guard1")
			//console.log("angle", angleToPlayer, "targetVel", targetVel, "velDiff", velDiff, "accel", this.body.acceleration);
	}

	//------------------------------------------------------------------------------
	protected moveAwayFromPlayer(speed: number)
	{
		var angleAwayFromPlayer = player.sprite.position.angle(this.sprite.position);
		this.body.velocity = Utils.getPointFromPolar(angleAwayFromPlayer, speed);
	}
}

//------------------------------------------------------------------------------
// Guard
//------------------------------------------------------------------------------

var guardGroup: Phaser.Group;

class Guard extends Entity
{
	static NORMAL_VEL = 180;
	static ACCELERATION = 1800;
	static DRAG = 1200;
	static HIT_PAUSE_MS = 1000;

	private movePaused: boolean;

	//------------------------------------------------------------------------------
	constructor(sprite: Phaser.Sprite)
	{
		super(sprite, "guard");
		this.body.maxVelocity.setTo(Guard.NORMAL_VEL, Guard.NORMAL_VEL);
		this.body.drag.setTo(Guard.DRAG, Guard.DRAG);
		this.movePaused = false;
		this.textStyle['fill'] = Utils.getRandomStrFrom(["yellow", "orange", "indianred", "coral", "darkorange", "orangered"])
	}

	//------------------------------------------------------------------------------
	public update()
	{
		var physics = game.physics.arcade;

		// Always collide with the player
		var touchingPlayer = physics.collide(this.sprite, player.sprite);

		if (!this.movePaused)
		{
			// If the guard is touching the player, hit the player, then pause them for a bit
			if (touchingPlayer)
			{
				this.movePaused = true;
				var unpauseEvent = game.time.events.add(Guard.HIT_PAUSE_MS, () => this.movePaused = false);
				this.say(Utils.getRandomStrFrom(["<biff>", "<boff>", "<thump>", "<thock>", "<whump>"]));
			}
			else
				this.moveTowardsPlayer(Guard.NORMAL_VEL);
		}

		super.update();
	}
}

//------------------------------------------------------------------------------
// Civilian
//------------------------------------------------------------------------------

var civilianGroup: Phaser.Group;

class Civilian extends Entity
{
	static DRAG = 600;
	static FLEE_VEL = 220;
	static SCARE_THRESHOLD_MSQ = 100 * 100;

	private isFleeing: boolean;

	//------------------------------------------------------------------------------
	constructor(sprite: Phaser.Sprite)
	{
		super(sprite, "civilian");
		this.body.drag.setTo(Civilian.DRAG, Civilian.DRAG);
		this.sprite.checkWorldBounds = true;
		this.sprite.events.onOutOfBounds.add(() => this.handleEscaped());
		this.isFleeing = false;
		this.textStyle['fill'] = Utils.getRandomStrFrom(["aqua", "aquamarine", "cadetblue", "cyan", "darkgoldenrod",
			"goldenrod", "midnightblue", "lightskyblue", "rebeccapurple"]);

	}

	//------------------------------------------------------------------------------
	public update()
	{
		if (!this.sprite.alive)
			return;

		// Always collide with the player
		game.physics.arcade.collide(this.sprite, player.sprite);

		if (this.isFleeing)
			this.moveAwayFromPlayer(Civilian.FLEE_VEL);

		super.update();
	}

	//------------------------------------------------------------------------------
	public handleNoise(position: Phaser.Point, loudness: number = 1)
	{
		var offset = new Phaser.Point(this.sprite.position.x, this.sprite.position.y).subtract(position.x, position.y);
		if (loudness !== 1)
			offset.multiply(loudness, loudness);
		var magnitudeSq = offset.getMagnitudeSq();
		if (magnitudeSq < Civilian.SCARE_THRESHOLD_MSQ)
			game.time.events.add(200, () =>
			{
				this.isFleeing = true;
				this.say(Utils.getRandomStrFrom(["Aaargh!", "Aargh!", "Aaaaaaargh!", "Help!", "Yikes!", "Urk!", "Waaaa!"]));
			});
	}

	//------------------------------------------------------------------------------
	private handleEscaped()
	{
		console.log(this.debugName, "escaped");
		this.sprite.destroy();
	}
}
