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
var INITIAL_HEALTH: number = 10;

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
	private music: Phaser.Sound;
	private nextLevel: string;

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

		game.load.image('plant', 'data/tex/plant.png');
		game.load.image('tiles', 'data/tex/tiles.png');
		game.load.image('vision', 'data/tex/light-cone.png');
		game.load.image('scare', 'data/tex/exclamation.png');
		game.load.image('friend', 'data/tex/heart.png');
		game.load.tilemap('level', 'data/level/level.json', null, Phaser.Tilemap.TILED_JSON);

		var SOUND_EFFECTS = [
			'hit1', 'hit2', 'hit3', 'hit4',
			'hugdone1', 'hugdone2', 'hugdone3', 'hugdone4',
			'hugstart1', 'hugstart2', 'hugstart3', 'hugstart4',
			'sawplayer1', 'sawplayer2', 'sawplayer3', 'sawplayer4', 'sawplayer5', 
			'scared1', 'scared2', 'scared3', 'scared4', 'scared5', 'scared6', 
			'scarenoise1', 'scarenoise2', 'scarenoise3', 'scarenoise4', 'scarenoise5', 
		];
		for (var index = 0; index < SOUND_EFFECTS.length; ++index)
		{
			var key = SOUND_EFFECTS[index];
			game.load.audio(key, 'data/sfx/' + key + '.ogg', true);
		}

		game.load.audio('broke-wall', 'data/sfx/hit1.ogg', true);

		game.load.audio('music', 'data/music/music.ogg', true);

		game.load.start();
	}

	//------------------------------------------------------------------------------
    public create()
	{
		// Stop various key presses from passing through to the browser
		var kb = Phaser.Keyboard;
		game.input.keyboard.addKeyCapture([kb.LEFT, kb.RIGHT, kb.UP, kb.DOWN, kb.SPACEBAR, kb.ENTER, kb.BACKSPACE, kb.P, kb.CONTROL]);

		game.physics.startSystem(Phaser.Physics.ARCADE);

		game.load.onLoadStart.add(() => this.loadStart());
		game.load.onFileComplete.add((progress) => this.fileComplete(progress));
		game.load.onLoadComplete.add(() => this.loadComplete());
		this.startLoad();

		//game.input.keyboard.onPressCallback = () => this.handleKeyPress();

		game.time.advancedTiming = true;
		this.chatterEvent = null;
		this.music = null;
		this.nextLevel = 'level1';
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

		level = new Level('level', 'tiles', this.nextLevel);

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

		Utils.trackStat('game', 'start');
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
		plantGroup.destroy();
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
					Utils.trackStat('player', 'shout');
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
				{
					player.startHug();
					Utils.trackStat('player', 'hug');
				}
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

		if (lastKey.keyCode === Phaser.Keyboard.M && this.music)
			this.music.mute = !this.music.mute;
	}

	//------------------------------------------------------------------------------
	private updateGame()
	{
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
		//game.debug.bodyInfo(<Phaser.Sprite>guardGroup.children[1], 10, 20);
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
		Utils.trackStat('points', 'scare', '', this.friendPoints);
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
		Utils.trackStat('points', 'friend', '', this.friendPoints);
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
			Utils.trackStat('game', 'death');
		}
	}

	//------------------------------------------------------------------------------
	public checkCompletion()
	{
		if (guardGroup.children.length === 0 && civilianGroup.children.length === 0)
			this.winLevel();
	}

	//------------------------------------------------------------------------------
	public winLevel()
	{
		this.isRunning = false;
		this.isAwaitingRestart = true;
		subheaderText.innerHTML = "You won!";
		this.setStatus("Press Enter to try the next level");
		this.nextLevel = (this.nextLevel === 'level1') ? 'level2' : 'level1';
			
		Utils.trackStat('level', 'won');
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
