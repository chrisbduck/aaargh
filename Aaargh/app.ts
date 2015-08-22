//------------------------------------------------------------------------------
// Aaargh: LD33 entry by Schnerble
// 
// <reference path='phaser/phaser.d.ts'/>
// <reference path='map.ts'/>
// <reference path='player.ts'/>
// <reference path='utils.ts'/>
//------------------------------------------------------------------------------

var game: Phaser.Game = null;
var loadStatus: HTMLElement = null;
var level: Level = null;

var TILE_SIZE: number = 32;
var NUM_TILES: number = 22;		// in each dimension

//------------------------------------------------------------------------------
// Main app
//------------------------------------------------------------------------------
class App
{
    constructor()
	{
        game = new Phaser.Game(NUM_TILES * TILE_SIZE, NUM_TILES * TILE_SIZE, Phaser.AUTO, 'content',
			{ preload: () => this.preload(), create: () => this.create() });
    }

    public preload()
	{
    }

	public startLoad(): void
	{
        game.load.image('phaser_run', 'data/tex/run.png');
		game.load.image('tiles', 'data/tex/tiles.png');
		game.load.tilemap('level', 'data/level/level.json', null, Phaser.Tilemap.TILED_JSON);

		game.load.start();
	}

    public create()
	{
		var self = this;

		game.load.onLoadStart.add(() => this.loadStart());
		game.load.onFileComplete.add(() => this.fileComplete());
		game.load.onLoadComplete.add(() => this.loadComplete());
		self.startLoad();

		game.time.advancedTiming = true;
    }

	private loadStart()
	{
		loadStatus.innerHTML = "Loading Aaargh!...";
	}

	private fileComplete()
	{
		loadStatus.innerHTML += ".";
	}

	private loadComplete()
	{
		loadStatus.style.visibility = "hidden";

		console.log("Load complete");

		this.startGame();
	}

	private startGame()
	{
		console.log("Game starting");

		//var sprite = game.add.sprite(0, 0, 'phaser_run');
		level = new Level('level', 'tiles');
	}
}

window.onload = () =>
{
	loadStatus = document.getElementById("LoadStatus");
    var app = new App();
};
