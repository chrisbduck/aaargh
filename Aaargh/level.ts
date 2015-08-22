//------------------------------------------------------------------------------
// Tile map management.
// 
// <reference path='phaser/phaser.d.ts'/>
//------------------------------------------------------------------------------

class Level
{
	private tilemap: Phaser.Tilemap;
	private layer: Phaser.TilemapLayer;

	constructor(mapName: string, tilesetName: string)
	{
		this.tilemap = game.add.tilemap(mapName, TILE_SIZE, TILE_SIZE, NUM_TILES, NUM_TILES);
		this.tilemap.addTilesetImage(tilesetName);
		console.log("1");
		this.layer = this.tilemap.createLayer("Tile Layer 1");
		console.log("2");
	}
}
