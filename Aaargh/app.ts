//------------------------------------------------------------------------------
// Aaargh: LD33 entry by Schnerble
// 
// <reference path='phaser/phaser.d.ts'/>
//------------------------------------------------------------------------------

var game: Phaser.Game = null;
var loadStatus: HTMLElement = null;

//------------------------------------------------------------------------------
// Main app
//------------------------------------------------------------------------------
class App
{
    constructor()
	{
        game = new Phaser.Game(800, 600, Phaser.AUTO, 'content', { preload: () => this.preload(), create: () => this.create() });
    }

    public preload()
	{
    }

	public startLoad(): void
	{
        game.load.image('phaser_run', 'data/tex/run.png');

		game.load.start();
	}

    public create()
	{
		var self = this;

		game.load.onLoadStart.add(() => this.loadStart());
		game.load.onFileComplete.add(() => this.fileComplete());
		game.load.onLoadComplete.add(() => this.loadComplete());
		self.startLoad();
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
		game.add.sprite(0, 0, 'phaser_run');
	}
}

window.onload = () =>
{
	loadStatus = document.getElementById("LoadStatus");
    var app = new App();
};
