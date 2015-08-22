//------------------------------------------------------------------------------
// Tile map management.
// 
// <reference path='phaser/phaser.d.ts'/>
//------------------------------------------------------------------------------
var Level = (function () {
    function Level(mapName, tilesetName) {
        this.tilemap = game.add.tilemap(mapName, TILE_SIZE, TILE_SIZE, NUM_TILES, NUM_TILES);
        this.tilemap.addTilesetImage(tilesetName);
        console.log("1");
        this.layer = this.tilemap.createLayer("Tile Layer 1");
        console.log("2");
    }
    return Level;
})();
//# sourceMappingURL=level.js.map