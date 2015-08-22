//------------------------------------------------------------------------------
// Tile map management.
// 
// <reference path='phaser/phaser.d.ts'/>
// <reference path='player.ts'/>
//------------------------------------------------------------------------------

var TILE_PLAYER = 9;
var TILE_GUARD = 3;
var TILE_WALL = 1;
var TILE_CIVILIAN = 7;

class Level
{
	private tilemap: Phaser.Tilemap;
	private layer: Phaser.TilemapLayer;
	private grass: Phaser.TileSprite;

	constructor(mapName: string, tilesetName: string)
	{
		this.grass = game.add.tileSprite(0, 0, game.world.width, game.world.height, 'grass');

		this.tilemap = game.add.tilemap(mapName);
		this.tilemap.addTilesetImage(tilesetName);
		this.tilemap.setCollision(TILE_WALL);
		this.layer = this.tilemap.createLayer("Tile Layer 1");
		this.layer.debug = true;

		// Player
		var tempGroup: Phaser.Group = game.add.group();
		this.tilemap.createFromTiles(TILE_PLAYER, -1, 'thief', this.layer, tempGroup);
		if (tempGroup.children.length !== 1)
			throw new Error("Should have exactly one player");
		player = new Player(<Phaser.Sprite>tempGroup.children[0]);
		tempGroup.removeAll();
		game.world.add(player.sprite);

		// Guards
		guardGroup = game.add.group(undefined, 'guards');
		guardGroup.enableBody = true;
		guardGroup.enableBodyDebug = true;
		this.tilemap.createFromTiles(TILE_GUARD, -1, 'guard', this.layer, guardGroup);
		guardGroup.forEach(child => new Guard(child), null);

		// Civilians
		civilianGroup = game.add.group(undefined, 'civilians');
		civilianGroup.enableBody = true;
		civilianGroup.enableBodyDebug = true;
		this.tilemap.createFromTiles(TILE_CIVILIAN, -1, 'civilian', this.layer, civilianGroup);
		civilianGroup.forEach(child => new Civilian(child), null);
	}

	//------------------------------------------------------------------------------
	public update()
	{
		game.physics.arcade.collide(player.sprite, this.layer);
	}

	//------------------------------------------------------------------------------
	public destroy()
	{
		this.layer.destroy();
		this.grass.destroy();
		this.tilemap.destroy();
	}
}
