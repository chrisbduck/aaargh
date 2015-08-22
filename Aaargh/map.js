//------------------------------------------------------------------------------
// Tile map management.
// 
// <reference path='phaser/phaser.d.ts'/>
//------------------------------------------------------------------------------
var Map = (function () {
    function Map(mapName, tilesetName) {
        this.tilemap = game.add.tilemap(name);
        this.tilemap.addTilesetImage(tilesetName);
        this.layer = this.tilemap.createLayer("Tile Layer 1");
    }
    return Map;
})();
//# sourceMappingURL=map.js.map