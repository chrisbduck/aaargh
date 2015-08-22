//------------------------------------------------------------------------------
// Aaargh: LD33 entry by Schnerble
// 
// <reference path='phaser/phaser.d.ts'/>
// <reference path='map.ts'/>
// <reference path='player.ts'/>
// <reference path='utils.ts'/>
//------------------------------------------------------------------------------

var game: Phaser.Game = null;
var statusText: HTMLElement = null;
var level: Level = null;

var TILE_SIZE: number = 32;
var NUM_TILES_X: number = 32;
var NUM_TILES_Y: number = 20;

//------------------------------------------------------------------------------
// Main app
//------------------------------------------------------------------------------
class App
{
	public isRunning: boolean = false;
	private pauseText: Phaser.Text = null;

	//------------------------------------------------------------------------------
    constructor()
	{
        game = new Phaser.Game(NUM_TILES_X * TILE_SIZE, NUM_TILES_Y * TILE_SIZE, Phaser.AUTO, 'content',
			{ preload: () => this.preload(), create: () => this.create(), update: () => this.update(), render: () => this.render() });
    }

	//------------------------------------------------------------------------------
    public preload()
	{
    }

	//------------------------------------------------------------------------------
	public startLoad(): void
	{
		game.load.image('thief', 'data/tex/thief.png');
		game.load.image('guard', 'data/tex/guard.png');
		game.load.image('civilian', 'data/tex/dog.png');
		game.load.image('tiles', 'data/tex/tiles.png');
		game.load.image('grass', 'data/tex/grass.jpg');
		game.load.tilemap('level', 'data/level/level.json', null, Phaser.Tilemap.TILED_JSON);

		game.load.start();
	}

	//------------------------------------------------------------------------------
    public create()
	{
		// Stop various key presses from passing through to the browser
		var keyboard = Phaser.Keyboard;
		game.input.keyboard.addKeyCapture([keyboard.LEFT, keyboard.RIGHT, keyboard.UP, keyboard.DOWN, keyboard.SPACEBAR, keyboard.BACKSPACE, keyboard.K]);

		game.physics.startSystem(Phaser.Physics.ARCADE);

		game.load.onLoadStart.add(() => this.loadStart());
		game.load.onFileComplete.add(() => this.fileComplete());
		game.load.onLoadComplete.add(() => this.loadComplete());
		this.startLoad();

		game.input.keyboard.onPressCallback = () => this.handleKeyPress();

		game.time.advancedTiming = true;
    }

	//------------------------------------------------------------------------------
	private loadStart()
	{
		this.setStatus("Loading");
	}

	//------------------------------------------------------------------------------
	private fileComplete()
	{
		statusText.innerHTML += ".";
	}

	//------------------------------------------------------------------------------
	private loadComplete()
	{
		this.setStatus("");

		console.log("Load complete");

		this.startGame();
	}

	//------------------------------------------------------------------------------
	private startGame()
	{
		console.log("Game starting");

		level = new Level('level', 'tiles');

		this.isRunning = true;
	}

	//------------------------------------------------------------------------------
	public update()
	{
		if (this.isRunning)
			this.updateGame();
	}

	//------------------------------------------------------------------------------
	private handleKeyPress()		// only printable keys
	{
		Phaser.Keyboard.P;

		if (game.input.keyboard.lastKey.keyCode === Phaser.Keyboard.P)
		{
			this.isRunning = !this.isRunning;
			this.setStatus(this.isRunning ? "" : "Paused");
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
		game.debug.bodyInfo(player.sprite, 10, 20);
	}

	//------------------------------------------------------------------------------
	private setStatus(text: string)
	{
		statusText.innerHTML = text;
	}
}

window.onload = () =>
{
	statusText = document.getElementById("Status");
    var app = new App();
};
