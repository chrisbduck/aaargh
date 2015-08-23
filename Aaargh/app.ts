//------------------------------------------------------------------------------
// Aaargh: LD33 entry by Schnerble
// 
// <reference path='phaser/phaser.d.ts'/>
// <reference path='map.ts'/>
// <reference path='player.ts'/>
// <reference path='utils.ts'/>
//------------------------------------------------------------------------------

var app: App = null;
var game: Phaser.Game = null;
var statusText: HTMLSpanElement = null;
var scareText: HTMLSpanElement = null;
var friendText: HTMLSpanElement = null;
var healthText: HTMLSpanElement = null;
var subheaderText: HTMLSpanElement = null;
var level: Level = null;

var TILE_SIZE: number = 32;
var NUM_TILES_X: number = 32;
var NUM_TILES_Y: number = 20;
var INITIAL_HEALTH: number = 50;

//------------------------------------------------------------------------------
// Main app
//------------------------------------------------------------------------------
class App
{
	public isRunning: boolean = false;
	public isPaused: boolean = false;
	private isAwaitingRestart: boolean = false;
	private pauseText: Phaser.Text = null;
	private scarePoints: number;
	private friendPoints: number;
	private healthPoints: number;
	private shoutHeld: boolean;
	private shouted: boolean;
	private shoutHoldStart: number;
	private hugHeld: boolean;
	private hugHoldStart: number;
	private chatterEvent: Phaser.TimerEvent;

	//------------------------------------------------------------------------------
    constructor()
	{
        game = new Phaser.Game(NUM_TILES_X * TILE_SIZE, NUM_TILES_Y * TILE_SIZE, Phaser.AUTO, 'content',
			{ preload: () => this.preload(), create: () => this.create(), update: () => this.update(), render: () => this.render() });

		statusText = document.getElementById("status");
		scareText = document.getElementById("scares");
		friendText = document.getElementById("friends");
		healthText = document.getElementById("health");
		subheaderText = document.getElementById("subheader");
    }

	//------------------------------------------------------------------------------
    public preload()
	{
    }

	//------------------------------------------------------------------------------
	public startLoad(): void
	{
		game.load.image('ground', 'data/tex/ground.jpg');
		game.load.spritesheet('monster', 'data/tex/monster2-sheet.png', 64, 64);
		game.load.spritesheet('civilian', 'data/tex/civilian-sheet.png', 32, 32);
		game.load.spritesheet('policeman', 'data/tex/policeman-sheet.png', 32, 32);

		game.load.image('tiles', 'data/tex/tiles.png');
		game.load.image('vision', 'data/tex/light-cone.jpg');
		game.load.image('scare', 'data/tex/exclamation.png');
		game.load.image('friend', 'data/tex/heart.png');
		game.load.tilemap('level', 'data/level/level.json', null, Phaser.Tilemap.TILED_JSON);

		game.load.start();
	}

	//------------------------------------------------------------------------------
    public create()
	{
		// Stop various key presses from passing through to the browser
		var kb = Phaser.Keyboard;
		game.input.keyboard.addKeyCapture([kb.LEFT, kb.RIGHT, kb.UP, kb.DOWN, kb.SPACEBAR, kb.ENTER, kb.BACKSPACE, kb.P]);

		game.physics.startSystem(Phaser.Physics.ARCADE);

		game.load.onLoadStart.add(() => this.loadStart());
		game.load.onFileComplete.add((progress) => this.fileComplete(progress));
		game.load.onLoadComplete.add(() => this.loadComplete());
		this.startLoad();

		//game.input.keyboard.onPressCallback = () => this.handleKeyPress();

		game.time.advancedTiming = true;
		this.chatterEvent = null;
    }

	//------------------------------------------------------------------------------
	private loadStart()
	{
		this.setStatus("Loading... 0%");
	}

	//------------------------------------------------------------------------------
	private fileComplete(progress: number)
	{
		this.setStatus("Loading... " + progress + "%");
	}

	//------------------------------------------------------------------------------
	private loadComplete()
	{
		this.setStatus("");
		document.getElementById("dScore").style.visibility = "visible";

		console.log("Load complete");

		this.startGame();
	}

	//------------------------------------------------------------------------------
	private startGame()
	{
		console.log("Game starting");

		level = new Level('level', 'tiles');

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
	}

	//------------------------------------------------------------------------------
	private restartGame()
	{
		console.log("Game reset");

		if (this.chatterEvent)
		{
			game.time.events.remove(this.chatterEvent);
			this.chatterEvent = null;
		}
		level.destroy();
		guardGroup.destroy();
		civilianGroup.destroy();
		this.startGame();
	}

	//------------------------------------------------------------------------------
	public update()
	{
		if (this.isRunning && !this.isPaused)
			this.updateGame();

		var keyboard = game.input.keyboard;
		var lastKey = keyboard.lastKey;
		if (lastKey && lastKey.justDown)
			this.handleKeyPress();

		if (this.isRunning)
		{
			// Shout control
			var shoutHeld = !!keyboard.isDown(Phaser.Keyboard.SPACEBAR);
			var shouldShout = false;
			if (shoutHeld != this.shoutHeld)
			{
				if (shoutHeld)
				{
					this.shoutHoldStart = game.time.now;
					this.shouted = false;
					player.prepareShout();
				}
				else
					shouldShout = true;
				this.shoutHeld = shoutHeld;
			}
			else if (shoutHeld && game.time.now - this.shoutHoldStart >= Player.SHOUT_HOLD_LIMIT_MS)
				shouldShout = true;

			if (shouldShout && !this.shouted)
			{
				player.shout(Math.min(game.time.now - this.shoutHoldStart, Player.SHOUT_HOLD_LIMIT_MS));
				this.shouted = true;
			}

			// Hug control
			var hugHeld = !!keyboard.isDown(Phaser.Keyboard.CONTROL);
			if (hugHeld != this.hugHeld)
			{
				// Start hugging anything unaware in range
				if (hugHeld)
					player.startHug();
				else
					player.stopHug();

				this.hugHeld = hugHeld;
			}
		}
	}

	//------------------------------------------------------------------------------
	private handleKeyPress()		// only printable keys
	{
		var lastKey = game.input.keyboard.lastKey;

		// Pause
		if (this.isRunning && lastKey.keyCode === Phaser.Keyboard.P)
		{
			this.isPaused = !this.isPaused;
			this.setStatus(this.isPaused ? "Paused" : "");
			return;
		}

		// Restart
		if (this.isAwaitingRestart && lastKey.keyCode === Phaser.Keyboard.ENTER)
		{
			this.restartGame();
			return;
		}
	}

	//------------------------------------------------------------------------------
	private updateGame()
	{
		player.update();

		var physics = game.physics.arcade;

		// Guards
		physics.collide(guardGroup, guardGroup);
		physics.collide(guardGroup, civilianGroup);
		this.updateGroup(guardGroup, false);

		// Civilians
		this.updateGroup(civilianGroup, false);
		physics.collide(civilianGroup, civilianGroup);

		level.update();
	}

	//------------------------------------------------------------------------------
	private updateGroup(group: Phaser.Group, doCollide: boolean)
	{
		group.forEach(child => (<IEntitySprite>child).entity.update(), null);

		if (doCollide)
		{
			// Check for collision with the player
			game.physics.arcade.collide(group, player.sprite);
		}
	}

	//------------------------------------------------------------------------------
	public render()
	{
		if (!this.isRunning)
			return;

		//if (player.sprite.body.enable)
			//game.debug.body(player.sprite);
		//guardGroup.forEachAlive(child => { if (child.body.enable) game.debug.body(child); }, null);
		//civilianGroup.forEachAlive(child => { if (child.body.enable) game.debug.body(child); }, null);
		//game.debug.bodyInfo(player.sprite, 10, 20);
		game.debug.bodyInfo(<Phaser.Sprite>guardGroup.children[1], 10, 20);
	}

	//------------------------------------------------------------------------------
	private setStatus(text: string)
	{
		statusText.innerHTML = text;
	}

	//------------------------------------------------------------------------------
	public addScarePoints(num: number)
	{
		this.setScarePoints(this.scarePoints + num);
	}

	//------------------------------------------------------------------------------
	private setScarePoints(num: number)
	{
		this.scarePoints = num;
		scareText.innerHTML = num.toString();
	}

	//------------------------------------------------------------------------------
	public addFriendPoints(num: number)
	{
		this.setFriendPoints(this.friendPoints + num);
	}

	//------------------------------------------------------------------------------
	private setFriendPoints(num: number)
	{
		this.friendPoints = num;
		friendText.innerHTML = num.toString();
	}

	//------------------------------------------------------------------------------
	public subtractHealthPoints(num: number)
	{
		this.setHealthPoints(this.healthPoints - num);
	}

	//------------------------------------------------------------------------------
	private setHealthPoints(num: number)
	{
		this.healthPoints = Math.max(num, 0);
		var healthPct: number = num * 100 / INITIAL_HEALTH;
		healthText.innerHTML = healthPct.toString() + "%";

		var lowHealth: boolean = healthPct < 50;
		healthText.style.color = lowHealth ? "red" : "orange";

		if (this.healthPoints === 0)
		{
			this.isRunning = false;
			this.isAwaitingRestart = true;
			subheaderText.innerHTML = "Dead!";
			this.setStatus("Press Enter to restart");
		}
	}

	//------------------------------------------------------------------------------
	private scheduleChatter()
	{
		var intervalMs = Phaser.Math.linear(300, 8000, Math.random());
		this.chatterEvent = game.time.events.add(intervalMs, () => this.triggerChatter());
	}

	//------------------------------------------------------------------------------
	private triggerChatter()
	{
		// Pick a guard or civilian
		var chatterers: Entity[] = [];
		var findChatterers = sprite =>
		{
			var entity = (<IEntitySprite>sprite).entity;
			if (entity.canChatter())
				chatterers.push(entity);
		}
		guardGroup.forEachAlive(findChatterers, null);
		civilianGroup.forEachAlive(findChatterers, null);
		if (chatterers.length <= 0)
			return;

		Utils.getRandomElementFrom(chatterers).triggerChatter();

		this.scheduleChatter();		// next event
	}
}

window.onload = () =>
{
    app = new App();
};
