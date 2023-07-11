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
	static SAY_TIME_MS = 1000;
	static SAY_FADE_TIME_MS = 500;
	static SAY_SIZE_PX = 28;
	static MAX_UNSCALED_SCARE = 64;
	static MIN_UNSCALED_SCARE_SQ = Entity.MAX_UNSCALED_SCARE * Entity.MAX_UNSCALED_SCARE;
	static CLOSE_DIST = 24;
	static CLOSE_DIST_SQ = Entity.CLOSE_DIST * Entity.CLOSE_DIST;

	public sprite: Phaser.Sprite;
	public body: Phaser.Physics.Arcade.Body;
	public debugName: string;
	private saying: Phaser.Text;
	private sayingEvent: Phaser.TimerEvent;
	protected textStyle: IStrDict;
	protected prevVel: Phaser.Point;
	protected facingDir: Phaser.Point;
	protected facingAngle: number;
	protected ambientChatter: string[];
	protected animFrameOverride: number;

	protected isWatching: boolean;
	protected isBeingHugged: boolean;
	protected hugFinishTimer: Phaser.TimerEvent;
	protected hugDuration: number;
	protected hugScore: number;
	private watchingSprite: Phaser.Sprite;

	private static debugCounters: INumDict = {};
	protected static SCARED_QUOTES: string[] = ["Aaargh!", "Aargh!", "Aaaaaaargh!", "Help!", "Yikes!", "Urk!", "Waaaa!"];

	//------------------------------------------------------------------------------
	constructor(sprite: Phaser.Sprite, typeName: string, watchingDistance: number = 0, scale: number = 1)
	{
		this.sprite = sprite;
		this.sprite.anchor.set(0.5, 0.5);
		this.sprite.scale.set(scale, scale);
		var x = (this.sprite.position.x + this.sprite.width * 0.5) * scale;
		var y = (this.sprite.position.y + this.sprite.height * 0.5) * scale;
		this.sprite.position.set(x, y);
		this.body = sprite.body;
		(<IEntitySprite>sprite).entity = this;
		this.saying = null;
		this.sayingEvent = null;
		this.textStyle = { align: "center", fill: "white", textShadow: "2px 2px 5px black" };
		this.prevVel = new Phaser.Point();
		this.setFacingDir(Utils.getRandomElementFrom(DIRECTIONS));
		this.isWatching = false;
		this.isBeingHugged = false;
		this.hugFinishTimer = null;
		this.hugDuration = 0;
		this.hugScore = 0;
		this.ambientChatter = ["..."];
		this.animFrameOverride = -1;

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
	public say(text: string, held: boolean = false, scale: number = 1, sayTimeScale: number = 1)
	{
		// Remove any previous saying
		if (this.saying != null)
		{
			this.saying.destroy();
			if (this.sayingEvent)
			{
				game.time.events.remove(this.sayingEvent);
				this.sayingEvent = null;
			}
			this.saying = null;
		}

		if (!text)
			return;
		
		var fontSize = Math.round(Entity.SAY_SIZE_PX * scale);
		this.textStyle['font'] = fontSize + "px 'Comic Sans',cursive";

		var sayTimeMs = Entity.SAY_TIME_MS * sayTimeScale;

		// Add a new one
		this.saying = game.add.text(0, 0, text, this.textStyle);
		this.saying.anchor.set(0.5, 0.5);
		if (!held)
		{
			game.add.tween(this.saying.scale).to({ 'x': 0, 'y': 0 }, Entity.SAY_FADE_TIME_MS, Phaser.Easing.Quadratic.Out, true, sayTimeMs);
			this.sayingEvent = game.time.events.add(sayTimeMs + Entity.SAY_FADE_TIME_MS, () => { this.saying.destroy(); this.saying = null; });
		}
		this.updateSayTextPosition();
	}

	//------------------------------------------------------------------------------
	public handleNoise(position: Phaser.Point, loudness: number = 1)
	{
		var offset = new Phaser.Point(this.sprite.position.x, this.sprite.position.y).subtract(position.x, position.y);
		if (loudness !== 1)
			offset.divide(loudness, loudness);
		var magnitudeSq = offset.getMagnitudeSq();
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
		if (distSqToPlayer > maxSightRangeSq)
			return false;

		// Check angle
		var facingRatio = this.facingDir.dot(offsetToPlayer);
		if (facingRatio < minSightAngleRatio)
			return false;

		// Check if obscured by tiles
		if (level.getTilesBetweenPoints(thisPos, playerPos).length > 0)
			return false;

		// Check if obscured by plants
		var result = true;
		plantGroup.forEach(sprite =>
		{
			if (Utils.lineIntersectsSprite(playerPos, thisPos, sprite))
				result = false;
		}, null);

		return result;
	}

	//------------------------------------------------------------------------------
	private updateSayTextPosition()
	{
		if (!this.saying)
			return;
		
		this.saying.x = this.sprite.x;
		this.saying.y = this.sprite.y - this.sprite.height * 0.5 - <number>this.saying.fontSize * 0.7;
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
	}

	//------------------------------------------------------------------------------
	protected moveTowardsPlayer(speed: number)
	{
		this.moveTowardsPoint(player.sprite.position, speed);
	}

	//------------------------------------------------------------------------------
	protected moveTowardsPoint(point: Phaser.Point, speed: number, changeFacingDir: boolean = true)
	{
		//var angleToPoint = this.sprite.position.angle(point);
		//this.body.velocity = Utils.getPointFromPolar(angleToPoint, speed);
		//this.setFacingDir(this.body.velocity);

		this.body.velocity = Utils.offsetFromPoint1To2(this.sprite.position, point).normalize().multiply(speed, speed);
		if (changeFacingDir)
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
		this.faceTowardsPoint(player.sprite.position);
	}

	//------------------------------------------------------------------------------
	protected faceTowardsPoint(point: Phaser.Point)
	{
		var thisPos = this.sprite.position;
		var offsetToPoint = new Phaser.Point(point.x, point.y).subtract(thisPos.x, thisPos.y);
		this.setFacingDir(offsetToPoint);
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

	//------------------------------------------------------------------------------
	protected scaledScare(points: number, magnitudeSq: number, thresholdSq: number, quotes: string[] = null)
	{
		// Magnitude is best when *lowest*, so highest scale is at min unscaled scare

		var magnitudeRatio = 1 - (magnitudeSq - Entity.MIN_UNSCALED_SCARE_SQ) / (thresholdSq - Entity.MIN_UNSCALED_SCARE_SQ);
		var pointsMagnitudeScale = Phaser.Math.linear(0.3, 1.5, magnitudeRatio);
		var scaledPoints = Math.round(points * pointsMagnitudeScale);
		this.scare(scaledPoints, quotes);
	}

	//------------------------------------------------------------------------------
	protected scare(points: number, quotes: string[] = null)
	{
		if (quotes === null)
			quotes = Entity.SCARED_QUOTES;

		this.say(Utils.getRandomElementFrom(quotes));
		new ScareEmitter(this.sprite.position.x, this.sprite.position.y, points * 4);
		app.addScarePoints(points);
		Utils.playSound('scared', 1, 6);
	}

	//------------------------------------------------------------------------------
	protected hasReachedPoint(point: Phaser.Point): boolean
	{
		return Utils.distSqBetweenPoints(this.sprite.position, point) <= Entity.CLOSE_DIST_SQ;
	}

	//------------------------------------------------------------------------------
	public canBeHugged(): boolean
	{
		return false;
	}

	//------------------------------------------------------------------------------
	public startHug(): boolean
	{
		if (this.isBeingHugged)
			return false;

		this.isBeingHugged = true;
		this.hugFinishTimer = game.time.events.add(this.hugDuration, () => this.completeHug());
		return true;
	}

	//------------------------------------------------------------------------------
	protected completeHug()
	{
		this.hugFinishTimer = null;
		this.isBeingHugged = false;
		app.addFriendPoints(this.hugScore);
		this.sprite.tint = 0xFF8080;
		game.add.tween(this.sprite).to({ alpha: 0 }, 1000, Phaser.Easing.Linear.None, true);
		game.time.events.add(1000, () =>
		{
			this.sprite.destroy();
			app.checkCompletion();
		});
		this.stopWatching();
		this.sprite.alive = false;
		new FriendEmitter(this.sprite.x, this.sprite.y, this.hugScore * 3);
		Utils.playSound('hugdone', 1, 4);
	}

	//------------------------------------------------------------------------------
	public releaseHug(): boolean
	{
		if (!this.isBeingHugged)
			return false;

		this.isBeingHugged = false;
		game.time.events.remove(this.hugFinishTimer);
		this.hugFinishTimer = null;
		return true;
	}

	//------------------------------------------------------------------------------
	public triggerChatter()
	{
		if (this.ambientChatter.length <= 0)
			return;

		this.say(Utils.getRandomElementFrom(this.ambientChatter), false, 0.8, 1.4);
	}

	//------------------------------------------------------------------------------
	public canChatter(): boolean
	{
		return this.sprite.alive && !this.isBeingHugged && !this.saying && game.camera.view.intersects(
			new Phaser.Rectangle(this.sprite.x, this.sprite.y, this.sprite.width, this.sprite.height), 0);
	}

	//------------------------------------------------------------------------------
	protected handleEscaped()
	{
		this.sprite.destroy();
		app.checkCompletion();
	}

}

//------------------------------------------------------------------------------
// Guard
//------------------------------------------------------------------------------

var guardGroup: Phaser.Group;

class Guard extends Entity
{
	static PATROL_SPEED = 200;
	static CHASE_SPEED = 360;
	static FLEE_SPEED = 360;
	static ACCELERATION = 3600;
	static DRAG = 2400;
	static HIT_PAUSE_MS = 1000;
	static BEFORE_SAW_PLAYER_PAUSE_MS = 300;
	static AFTER_SAW_PLAYER_PAUSE_MS = 1000;
	static MIN_SIGHT_ANGLE_RATIO = 0.7071;		// max 45 degrees from straight on
	static MAX_SIGHT_RANGE = 400;
	static MAX_SIGHT_RANGE_SQ = Guard.MAX_SIGHT_RANGE * Guard.MAX_SIGHT_RANGE;
	static SCARE_THRESHOLD = 128;
	static SCARE_THRESHOLD_SQ = Guard.SCARE_THRESHOLD * Guard.SCARE_THRESHOLD;
	static ALERT_THRESHOLD = 256;
	static ALERT_THRESHOLD_SQ = Guard.ALERT_THRESHOLD * Guard.ALERT_THRESHOLD;
	static ALERT_PAUSE_MS = 800;
	static LOST_PLAYER_GIVE_UP_MS = 4000;
	static TOUCHING_STUCK_TIME_MS = 300;
	static OVERRIDE_TARGET_TIME_MS = 300;
	static CHASE_ANIM_SPEED = 5;

	static AMBIENT_CHATTER = ['"You can\'t handle the truth!\"', "Grrr. <cough> Grrr.", "Any evildoers here?", "It's quiet... too quiet.", "Beware, interlopers!",
		"Who you gonna call?", "Villains, watch out!", "Where's my hamster gone?", "Ack. Patrol duty again.", "<yawn>", "Dooby dee...", "Ba ba-dah ba-dah...",
		"Join the army, they said...", "Only four hours 'til tea time!", "Rats... I hate rats."];

	static STATE_STANDING = 0;
	static STATE_CHASING = 1;
	static STATE_FLEEING = 2;
	static STATE_PATROLLING = 3;

	private movePaused: boolean;
	private state: number;
	private spottedPlayerTimer: Phaser.TimerEvent;
	private alertTimer: Phaser.TimerEvent;
	private alertPosition: Phaser.Point;
	private patrolRoute: Phaser.Point[];
	private nextPatrolPointIndex: number;
	private timeLastSawPlayer: number;
	private positionLastSawPlayer: Phaser.Point;
	private lostPlayerReachedPoint: boolean;
	private touchingStartPosition: Phaser.Point;
	private touchingStartTime: number;
	private overrideTarget: Phaser.Point;
	private overrideTargetEndTime: number;

	//------------------------------------------------------------------------------
	constructor(sprite: Phaser.Sprite)
	{
		super(sprite, "guard", Guard.MAX_SIGHT_RANGE);
		this.sprite.checkWorldBounds = true;
		this.sprite.events.onOutOfBounds.add(() => this.handleEscaped());
		this.body.maxVelocity.setTo(Guard.CHASE_SPEED, Guard.CHASE_SPEED);
		this.body.drag.setTo(Guard.DRAG, Guard.DRAG);
		this.body.setSize(56, 64, 4, 0);
		this.movePaused = false;
		this.state = Guard.STATE_STANDING;
		this.spottedPlayerTimer = null;
		this.alertTimer = null;
		this.alertPosition = null;
		this.textStyle['fill'] = Utils.getRandomElementFrom(["yellow", "orange", "indianred", "coral", "darkorange", "orangered"])
		this.patrolRoute = null;
		this.timeLastSawPlayer = 0;
		this.positionLastSawPlayer = new Phaser.Point();
		this.touchingStartPosition = new Phaser.Point();
		this.touchingStartTime = 0;
		this.overrideTarget = null;
		this.hugDuration = 4000;
		this.hugScore = 20;
		this.ambientChatter = Guard.AMBIENT_CHATTER;

		var anims = this.sprite.animations;
		var animSpeed = Guard.CHASE_ANIM_SPEED;
		anims.add('chase', [1, 2], animSpeed, true);
	}

	//------------------------------------------------------------------------------
	public update()
	{
		if (!this.sprite.alive)
			return;

		// Init patrol route if needed
		if (this.patrolRoute === null)
		{
			this.patrolRoute = level.getPatrolRouteStartingAt(this.sprite.position);
			this.patrolToPointIndex(0);
		}

		var physics = game.physics.arcade;

		// Always collide with the player
		var touchingPlayer = physics.collide(this.sprite, player.sprite);

		var touchingLevel = physics.collide(this.sprite, level.layer);

		if (this.isBeingHugged)
			return;

		// Give the guard a sight distance boost when they're chasing so they don't lose the player too easily
		var maxSightRangeSq = Guard.MAX_SIGHT_RANGE_SQ;
		if (this.state === Guard.STATE_CHASING)
			maxSightRangeSq *= 2.25;	// 1.5^2

		var canSeePlayer = this.canSeePlayer(Guard.MIN_SIGHT_ANGLE_RATIO, maxSightRangeSq);
		if (canSeePlayer)
		{
			this.timeLastSawPlayer = game.time.now;
			this.positionLastSawPlayer = player.sprite.position.clone();
			this.lostPlayerReachedPoint = false;
		}

		var targetPoint: Phaser.Point = null;
		var playChasingAnim: boolean = false;

		switch (this.state)
		{
			case Guard.STATE_CHASING:
				if (!this.movePaused)
				{
					// If the guard is touching the player, hit the player, then pause them for a bit
					if (touchingPlayer)
					{
						this.movePaused = true;
						game.time.events.add(Guard.HIT_PAUSE_MS, () => this.movePaused = false);
						this.say(Utils.getRandomElementFrom(["<biff>", "<boff>", "<thump>", "<thock>", "<whump>", "<whomp>", "<bam>", "<kapow>", "<bop>"]));
						player.receiveHit(1);
					}
					else
					{
						// If the guard hasn't seen the player for too long, give up and go back to patrolling
						if (!canSeePlayer && game.time.now - this.timeLastSawPlayer >= Guard.LOST_PLAYER_GIVE_UP_MS)
						{
							this.say(Utils.getRandomElementFrom(["Lost it!", "Boring chase anyway.", "Maybe it was nothing.", "It can't hide forever.",
																"It'll turn up.", "Curses!", "Bah!", "Humbug!", "Foiled again!"]));
							this.patrolToPointIndex(this.nextPatrolPointIndex);
						}
						else
						{
							// Move towards the player if we can see them, or the place we last saw them if not
							targetPoint = canSeePlayer ? player.sprite.position : this.positionLastSawPlayer;
							if (!canSeePlayer && this.hasReachedPoint(targetPoint))
							{
								// Can't see player, and got to the last place we saw them.  Just stay still for a bit until the player turns up or we give up above
								if (!this.lostPlayerReachedPoint)
								{
									this.lostPlayerReachedPoint = true;
									this.say(Utils.getRandomElementFrom(["Hmmm...", "Where'd it go?", "I'm confused.", "What happened?", "Ummm..."]));
								}
							}
							else
								this.moveTowardsPoint(targetPoint, Guard.CHASE_SPEED);
						}
					}
				}
				else
					this.faceTowardsPlayer();

				playChasingAnim = !this.movePaused;
				break;

			case Guard.STATE_FLEEING:
				if (!this.movePaused)
					this.moveAwayFromPlayer(Guard.FLEE_SPEED);
				break;

			case Guard.STATE_PATROLLING:
				if (!this.movePaused)
				{
					targetPoint = this.patrolRoute[this.nextPatrolPointIndex];
					this.moveTowardsPoint(targetPoint, Guard.PATROL_SPEED, false);	// only change the facing dir when changing a patrol point
					if (this.hasReachedPoint(targetPoint))
						this.patrolToPointIndex(this.nextPatrolPointIndex + 1);
				}
				// Fall through and look for the player.

			default:
				if (this.spottedPlayerTimer == null && canSeePlayer)
					this.alert();
				break;
		}

		if (playChasingAnim)
			this.sprite.animations.play('chase');
		else
		{
			this.sprite.animations.stop();
			if (this.state !== Guard.STATE_CHASING)
				this.sprite.frame = 0;
		}

		super.update();

		// Update stuck status
		if (touchingLevel && !this.overrideTarget)
		{
			// Check if we just started touching something
			if (this.touchingStartTime === 0)
			{
				this.touchingStartPosition = this.sprite.position.clone();
				this.touchingStartTime = game.time.now;
			}
			// Check if we've been touching things for too long and haven't gone anywhere
			else if (game.time.now - this.touchingStartTime >= Guard.TOUCHING_STUCK_TIME_MS)
			{
				if (targetPoint != null && this.hasReachedPoint(this.touchingStartPosition))
				{
					// Stuck.  Pick a new target in a perpendicular direction for a moment
					var offsetToTarget: Phaser.Point = Utils.offsetFromPoint1To2(this.sprite.position, targetPoint);
					var perpOffset: Phaser.Point = (Math.random() < 0.5) ? offsetToTarget.perp() : offsetToTarget.rperp();
					offsetToTarget.add(perpOffset.x, perpOffset.y);
					this.overrideTarget = this.sprite.position.clone().add(offsetToTarget.x, offsetToTarget.y);
					this.overrideTargetEndTime = game.time.now + Guard.OVERRIDE_TARGET_TIME_MS;
				}
				else
				{
					// Restart sticking check
					this.touchingStartTime = 0;
				}
			}
		}
		else
		{
			// Not stuck
			this.touchingStartTime = 0;
		}
		if (this.overrideTarget && this.overrideTargetEndTime <= game.time.now)
			this.overrideTarget = null;
	}

	//------------------------------------------------------------------------------
	protected moveTowardsPoint(point: Phaser.Point, speed: number, changeFacingDir: boolean = true)
	{
		var actualTarget = this.overrideTarget ? this.overrideTarget : point;
		super.moveTowardsPoint(actualTarget, speed, changeFacingDir);
	}

	//------------------------------------------------------------------------------
	private patrolToPointIndex(firstPoint: number = null)
	{
		if (this.patrolRoute.length <= 0)
		{
			this.state = Guard.STATE_STANDING;
			return;
		}

		if (firstPoint != null)
			this.nextPatrolPointIndex = (firstPoint >= this.patrolRoute.length) ? 0 : firstPoint;

		var patrolPoint: Phaser.Point = this.patrolRoute[this.nextPatrolPointIndex];
		this.setFacingDir(Utils.offsetFromPoint1To2(this.sprite.position, patrolPoint));
		this.state = Guard.STATE_PATROLLING;
	}

	//------------------------------------------------------------------------------
	private cancelAlertTimer()
	{
		if (!this.alertTimer)
			return;

		game.time.events.remove(this.alertTimer);
		this.alertTimer = null;
	}

	//------------------------------------------------------------------------------
	protected handleNoiseMagnitudeSq(magnitudeSq: number, position: Phaser.Point)
	{
		// Ignore sounds when chasing or fleeing
		if (this.state === Guard.STATE_CHASING || this.state === Guard.STATE_FLEEING)
			return;

		// Check for scare
		if (magnitudeSq <= Guard.SCARE_THRESHOLD_SQ)
		{
			this.stopWatching();
			this.state = Guard.STATE_FLEEING;
			this.movePaused = true;
			game.time.events.add(200, () =>
			{
				this.movePaused = false;
				this.scaledScare(20, magnitudeSq, Guard.SCARE_THRESHOLD_SQ);
			});
		}
		// Check for alert
		else if (magnitudeSq <= Guard.ALERT_THRESHOLD_SQ)
		{
			// Pause for a moment, say something, pause again, then turn
			this.alertPosition = new Phaser.Point(position.x, position.y);
			this.alertTimer = game.time.events.add(Guard.ALERT_PAUSE_MS, () =>
			{
				this.say(Utils.getRandomElementFrom(["Huh?", "What?", "What was that?", "Hmmm?", "Did I hear something?", "Um...?"]));
				this.alertTimer = game.time.events.add(Guard.ALERT_PAUSE_MS, () =>
				{
					this.cancelAlertTimer();
					this.faceTowardsPoint(this.alertPosition);
				});
			});
		}
	}

	//------------------------------------------------------------------------------
	public canBeHugged(): boolean
	{
		return this.state === Guard.STATE_PATROLLING || this.state === Guard.STATE_STANDING;
	}

	//------------------------------------------------------------------------------
	public startHug(): boolean
	{
		if (!super.startHug())
			return false;

		game.time.events.add(200, () => this.say(Utils.getRandomElementFrom(["Erk!", "I say!", "What... who...", "Hmph!", "What?", "Er..."])));
		return true;
	}

	//------------------------------------------------------------------------------
	protected completeHug()
	{
		super.completeHug();
		this.say(Utils.getRandomElementFrom(["Oh - thanks, old chap!", "I needed that!", "There there...", "Jolly good, jolly good.", "Spiffing, what.", "Lovely!"]));
	}

	//------------------------------------------------------------------------------
	public releaseHug(): boolean
	{
		if (!super.releaseHug())
			return false;

		this.state = Guard.STATE_CHASING;
		this.movePaused = true;
		this.alert();
		return true;
	}

	//------------------------------------------------------------------------------
	protected alert()
	{
		if (this.spottedPlayerTimer)
			return;

		this.cancelAlertTimer();
		this.spottedPlayerTimer = game.time.events.add(Guard.BEFORE_SAW_PLAYER_PAUSE_MS, () =>
		{
			this.say(Utils.getRandomElementFrom(["Villain!", "Monster!", "Ahoy!", "Who are you?!", "Stop, creature!", "Stay where you are!", "Yarrrr!",
				"What's all this, then?", "Oi!", "Have at ye!", "Hey, you!"]));
			this.state = Guard.STATE_CHASING;
			this.movePaused = true;
			this.spottedPlayerTimer = null;
			game.time.events.add(Guard.AFTER_SAW_PLAYER_PAUSE_MS, () => this.movePaused = false);
			Utils.playSound('sawplayer', 1, 5);
		});
	}

	//------------------------------------------------------------------------------
	public canChatter(): boolean
	{
		return super.canChatter() && this.state === Guard.STATE_PATROLLING || this.state === Guard.STATE_STANDING;
	}
}

//------------------------------------------------------------------------------
// Civilian
//------------------------------------------------------------------------------

var civilianGroup: Phaser.Group;

class Civilian extends Entity
{
	static DRAG = 1200;
	static FLEE_SPEED = 440;
	static SCARE_THRESHOLD = 200;
	static SCARE_THRESHOLD_SQ = Civilian.SCARE_THRESHOLD * Civilian.SCARE_THRESHOLD;
	static MAX_SIGHT_RANGE = 240;
	static MIN_SIGHT_ANGLE_RATIO = 0.866;		// max 30 degrees from straight on
	static MAX_SIGHT_RANGE_SQ = Civilian.MAX_SIGHT_RANGE * Civilian.MAX_SIGHT_RANGE;
	static NORMAL_SPEED = 220;
	static WANDER_MIN_INTERVAL_MS = 1000;
	static WANDER_MAX_INTERVAL_MS = 7000;
	static WANDER_MIN_DIST = 48;
	static WANDER_MAX_DIST = 160;
	static WALK_ANIM_SPEED = 10;
	static AMBIENT_CHATTER = ["La la la...", "Dooby doo...", "What a lovely day!", "No scary monsters here!", "<cough>", "<sneeze>", "<sigh>",
		"<whistles>", "Zip-a-dee-doo-dah...", "I'm hungry.", "<snort>", "Ba ba ba...", "Dee dee dee...", "Hmmm... dair... dah-ray?",
		"Look... a world in the sky!", "I miss my pet rock.", "Hrmph.", "Look at the pretty bird!"];

	private isFleeing: boolean;
	private walkSpeed: number;
	private nextWander: Phaser.TimerEvent;
	private target: Phaser.Point;

	//------------------------------------------------------------------------------
	constructor(sprite: Phaser.Sprite)
	{
		super(sprite, "civilian", Civilian.MAX_SIGHT_RANGE);
		this.body.drag.setTo(Civilian.DRAG, Civilian.DRAG);
		this.body.setSize(56, 64, 4, 0);
		this.sprite.checkWorldBounds = true;
		this.sprite.events.onOutOfBounds.add(() => this.handleEscaped());
		this.isFleeing = false;
		this.walkSpeed = Civilian.NORMAL_SPEED;
		this.textStyle['fill'] = Utils.getRandomElementFrom(["aqua", "aquamarine", "cadetblue", "cyan", "darkgoldenrod", "goldenrod", "lightskyblue"]);
		this.nextWander = null;
		this.target = null;
		this.hugDuration = 2000;
		this.hugScore = 10;
		this.ambientChatter = Civilian.AMBIENT_CHATTER;

		var anims = this.sprite.animations;
		var animSpeed = Civilian.WALK_ANIM_SPEED;
		anims.add('walk', [0, 1], animSpeed, true);
	}

	//------------------------------------------------------------------------------
	public update()
	{
		if (!this.sprite.alive)
			return;

		// Always collide with the player
		game.physics.arcade.collide(this.sprite, player.sprite);

		var isMoving: boolean = false;

		if (!this.isBeingHugged)
		{
			if (this.isFleeing)
			{
				this.moveAwayFromPlayer(this.walkSpeed);
				isMoving = true;
			}
			else if (this.canSeePlayer(Civilian.MIN_SIGHT_ANGLE_RATIO, Civilian.MAX_SIGHT_RANGE_SQ))
				this.alert();
			else if (this.target != null)
			{
				this.moveTowardsPoint(this.target, Civilian.NORMAL_SPEED);
				isMoving = true;
				if (this.hasReachedPoint(this.target))
					this.target = null;
			}
			else if (this.nextWander == null)
			{
				var intervalMs = Phaser.Math.linear(Civilian.WANDER_MIN_INTERVAL_MS, Civilian.WANDER_MAX_INTERVAL_MS, Math.random());
				this.nextWander = game.time.events.add(intervalMs, () =>
				{
					this.nextWander = null;
					if (!this.isFleeing)
					{
						var angle = Phaser.Math.linear(-Math.PI, Math.PI, Math.random());
						var speed = Phaser.Math.linear(Civilian.WANDER_MIN_DIST, Civilian.WANDER_MAX_DIST, Math.random());
						var offset = Utils.getPointFromPolar(angle, speed);
						this.target = this.sprite.position.clone().add(offset.x, offset.y);
					}
				});
			}
		}

		if (isMoving)
			this.sprite.animations.play('walk', Civilian.WALK_ANIM_SPEED);
		else
			this.sprite.animations.stop();

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
				this.scaledScare(10, magnitudeSq, Civilian.SCARE_THRESHOLD_SQ);
			});
	}

	//------------------------------------------------------------------------------
	public canBeHugged(): boolean
	{
		return !this.isFleeing;
	}

	//------------------------------------------------------------------------------
	public startHug(): boolean
	{
		if (!super.startHug())
			return false;

		game.time.events.remove(this.nextWander);
		this.nextWander = null;
		game.time.events.add(200, () => this.say(Utils.getRandomElementFrom(["Oof!", "Wha...?", "Erm...", "Um...", "Huh...?", "Whoa..."])));
		return true;
	}

	//------------------------------------------------------------------------------
	protected completeHug()
	{
		super.completeHug();
		this.say(Utils.getRandomElementFrom(["What a nice monster!", "He's not so bad!", "You're not so scary!", "What a great hugger!", "You're the best monster!"]));
	}

	//------------------------------------------------------------------------------
	public releaseHug(): boolean
	{
		if (!super.releaseHug())
			return false;

		this.alert();
		return true;
	}

	//------------------------------------------------------------------------------
	protected alert()
	{
		this.isFleeing = true;
		this.walkSpeed = Civilian.NORMAL_SPEED;
		this.scare(2, ["Uh-oh...", "Hmmm...", "What's that?", "Who's that?", "Strange...", "I'm outta here..."]);
	}

	//------------------------------------------------------------------------------
	public canChatter(): boolean
	{
		return super.canChatter() && !this.isFleeing;
	}
}
