﻿//------------------------------------------------------------------------------
// Tile map management.
// 
// <reference path='phaser/phaser.d.ts'/>
// <reference path='player.ts'/>
//------------------------------------------------------------------------------

var TILE_PLAYER = 9;
var TILE_GUARD = 3;
var TILE_WALL = 1;
var TILE_CIVILIAN = 7;
var TILE_PATH = 2;
var TILE_PLANT = 10;

var plantGroup: Phaser.Group = null;

class Level
{
	private tilemap: Phaser.Tilemap;
	public layer: Phaser.TilemapLayer;
	private ground: Phaser.TileSprite;

	constructor(mapName: string, tilesetName: string, layerName: string)
	{
		this.ground = game.add.tileSprite(0, 0, game.world.width, game.world.height, 'ground');
		this.ground.tint = 0x808080;

		this.tilemap = game.add.tilemap(mapName);
		this.tilemap.addTilesetImage(tilesetName);
		this.layer = this.tilemap.createLayer(layerName);
		this.tilemap.setCollision(TILE_WALL, true, this.layer);
		//this.layer.debug = true;

		// Player
		var tempGroup: Phaser.Group = game.add.group();
		this.tilemap.createFromTiles(TILE_PLAYER, -1, 'monster', this.layer, tempGroup);
		if (tempGroup.children.length !== 1)
			throw new Error("Should have exactly one player");
		player = new Player(<Phaser.Sprite>tempGroup.children[0]);
		tempGroup.removeAll();
		game.world.add(player.sprite);

		// Guards
		guardGroup = game.add.group(undefined, 'guards');
		guardGroup.enableBody = true;
		//guardGroup.enableBodyDebug = true;
		this.tilemap.createFromTiles(TILE_GUARD, -1, 'policeman', this.layer, guardGroup);
		guardGroup.forEach(child => new Guard(child), null);

		// Civilians
		civilianGroup = game.add.group(undefined, 'civilians');
		civilianGroup.enableBody = true;
		//civilianGroup.enableBodyDebug = true;
		this.tilemap.createFromTiles(TILE_CIVILIAN, -1, 'civilian', this.layer, civilianGroup);
		civilianGroup.forEach(child => new Civilian(child), null);

		// Plants
		plantGroup = game.add.group(undefined, 'plants');
		plantGroup.enableBody = true;
		this.tilemap.createFromTiles(TILE_PLANT, -1, 'plant', this.layer, plantGroup);
		plantGroup.forEach((sprite: Phaser.Sprite) =>
		{
			var body: Phaser.Physics.Arcade.Body = sprite.body;
			body.drag.set(500, 500);
		}, null);
	}

	//------------------------------------------------------------------------------
	public update()
	{
		var physics = game.physics.arcade;
		physics.collide(player.sprite, this.layer);
		//physics.collide(guardGroup, this.layer);
		physics.collide(civilianGroup, this.layer);
		physics.collide(plantGroup, this.layer);
	}

	//------------------------------------------------------------------------------
	public destroy()
	{
		this.layer.destroy();
		this.ground.destroy();
		this.tilemap.destroy();
	}

	//------------------------------------------------------------------------------
	public getPatrolRouteStartingAt(start: Phaser.Point): Phaser.Point[]
	{
		var map = this.tilemap;
		var layer = this.layer;
		var path: Phaser.Point[] = [];

		// Get start location
		var startX = Math.floor(start.x / TILE_SIZE);
		var startY = Math.floor(start.y / TILE_SIZE);
		var x = startX;
		var y = startY;

		while (true)
		{
			// Find a direction with a patrol tile
			var dir: Phaser.Point;
			var newX, newY: number;
			var tile: Phaser.Tile;
			for (var index = 0; index < DIRECTIONS.length; ++index)
			{
				dir = DIRECTIONS[index];
				newX = x + dir.x;
				newY = y + dir.y;
				tile = map.getTile(newX, newY, layer);
				if (tile && tile.index == TILE_PATH)
				{
					map.removeTile(newX, newY, layer);
					break;
				}
			}
			// Stop if we didn't find one
			if (index === DIRECTIONS.length)
			{
				// Add the reverse path back again, leaving off the last point and appending the start position, as long as there were at least some entries
				if (path.length > 0)
				{
					for (var index = path.length - 2; index >= 0; --index)
						path.push(path[index]);
					this.addPathTilePoint(path, startX, startY);
				}
				return path;
			}

			x = newX;
			y = newY;

			// Remove all tiles in that direction until we run out of patrol tiles
			while (true)
			{
				newX = x + dir.x;
				newY = y + dir.y;

				// If we've ended up back at the start location, stop now (and add it in a moment)
				if (newX === startX && newY === startY)
				{
					this.addPathTilePoint(path, startX, startY);
					return path;
				}

				tile = map.getTile(newX, newY, layer);
				if (!tile || tile.index !== TILE_PATH)
					break;
				
				map.removeTile(newX, newY, layer);
				x = newX;
				y = newY;
			}

			// Add a patrol route point
			this.addPathTilePoint(path, x, y);
		}
	}

	//------------------------------------------------------------------------------
	private addPathTilePoint(path: Phaser.Point[], tileX: number, tileY: number)
	{
		var x = (tileX + 0.5) * TILE_SIZE;		//
		var y = (tileY + 0.5) * TILE_SIZE;		// use the middle of the tile
		path.push(new Phaser.Point(x, y));
	}

	//------------------------------------------------------------------------------
	public getTilesBetweenPoints(point1: Phaser.Point, point2: Phaser.Point): Phaser.Tile[]
	{
		var line = new Phaser.Line(point1.x, point1.y, point2.x, point2.y);
		return this.layer.getRayCastTiles(line, 4, true);
	}
}
