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
var TILE_PATH = 2;
var TILE_PLANT = 10;
var plantGroup = null;
var Level = (function () {
    function Level(mapName, tilesetName, layerName) {
        this.ground = game.add.tileSprite(0, 0, game.world.width, game.world.height, 'ground');
        this.ground.tint = 0x808080;
        this.tilemap = game.add.tilemap(mapName);
        this.tilemap.addTilesetImage(tilesetName);
        this.layer = this.tilemap.createLayer(layerName);
        this.tilemap.setCollision(TILE_WALL, true, this.layer);
        //this.layer.debug = true;
        // Player
        var tempGroup = game.add.group();
        this.tilemap.createFromTiles(TILE_PLAYER, -1, 'monster', this.layer, tempGroup);
        if (tempGroup.children.length !== 1)
            throw new Error("Should have exactly one player");
        player = new Player(tempGroup.children[0]);
        tempGroup.removeAll();
        game.world.add(player.sprite);
        // Guards
        guardGroup = game.add.group(undefined, 'guards');
        guardGroup.enableBody = true;
        //guardGroup.enableBodyDebug = true;
        this.tilemap.createFromTiles(TILE_GUARD, -1, 'policeman', this.layer, guardGroup);
        guardGroup.forEach(function (child) { return new Guard(child); }, null);
        // Civilians
        civilianGroup = game.add.group(undefined, 'civilians');
        civilianGroup.enableBody = true;
        //civilianGroup.enableBodyDebug = true;
        this.tilemap.createFromTiles(TILE_CIVILIAN, -1, 'civilian', this.layer, civilianGroup);
        civilianGroup.forEach(function (child) { return new Civilian(child); }, null);
        // Plants
        plantGroup = game.add.group(undefined, 'plants');
        plantGroup.enableBody = true;
        this.tilemap.createFromTiles(TILE_PLANT, -1, 'plant', this.layer, plantGroup);
        plantGroup.forEach(function (sprite) {
            var body = sprite.body;
            body.drag.set(500, 500);
        }, null);
    }
    //------------------------------------------------------------------------------
    Level.prototype.update = function () {
        var physics = game.physics.arcade;
        physics.collide(player.sprite, this.layer);
        //physics.collide(guardGroup, this.layer);
        physics.collide(civilianGroup, this.layer);
        physics.collide(plantGroup, this.layer);
    };
    //------------------------------------------------------------------------------
    Level.prototype.destroy = function () {
        this.layer.destroy();
        this.ground.destroy();
        this.tilemap.destroy();
    };
    //------------------------------------------------------------------------------
    Level.prototype.getPatrolRouteStartingAt = function (start) {
        var map = this.tilemap;
        var layer = this.layer;
        var path = [];
        // Get start location
        var startX = Math.floor(start.x / TILE_SIZE);
        var startY = Math.floor(start.y / TILE_SIZE);
        var x = startX;
        var y = startY;
        while (true) {
            // Find a direction with a patrol tile
            var dir;
            var newX, newY;
            var tile;
            for (var index = 0; index < DIRECTIONS.length; ++index) {
                dir = DIRECTIONS[index];
                newX = x + dir.x;
                newY = y + dir.y;
                tile = map.getTile(newX, newY, layer);
                if (tile && tile.index == TILE_PATH) {
                    map.removeTile(newX, newY, layer);
                    break;
                }
            }
            // Stop if we didn't find one
            if (index === DIRECTIONS.length) {
                // Add the reverse path back again, leaving off the last point and appending the start position, as long as there were at least some entries
                if (path.length > 0) {
                    for (var index = path.length - 2; index >= 0; --index)
                        path.push(path[index]);
                    this.addPathTilePoint(path, startX, startY);
                }
                return path;
            }
            x = newX;
            y = newY;
            // Remove all tiles in that direction until we run out of patrol tiles
            while (true) {
                newX = x + dir.x;
                newY = y + dir.y;
                // If we've ended up back at the start location, stop now (and add it in a moment)
                if (newX === startX && newY === startY) {
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
    };
    //------------------------------------------------------------------------------
    Level.prototype.addPathTilePoint = function (path, tileX, tileY) {
        var x = (tileX + 0.5) * TILE_SIZE; //
        var y = (tileY + 0.5) * TILE_SIZE; // use the middle of the tile
        path.push(new Phaser.Point(x, y));
    };
    //------------------------------------------------------------------------------
    Level.prototype.getTilesBetweenPoints = function (point1, point2) {
        var line = new Phaser.Line(point1.x, point1.y, point2.x, point2.y);
        return this.layer.getRayCastTiles(line, 4, true);
    };
    return Level;
})();
//# sourceMappingURL=level.js.map