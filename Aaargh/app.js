//------------------------------------------------------------------------------
// Aaargh: LD33 entry by Schnerble
// 
// <reference path='phaser/phaser.d.ts'/>
// <reference path='map.ts'/>
// <reference path='player.ts'/>
// <reference path='utils.ts'/>
//------------------------------------------------------------------------------
var game = null;
var loadStatus = null;
var level = null;
var TILE_SIZE = 32;
var NUM_TILES = 22; // in each dimension
//------------------------------------------------------------------------------
// Main app
//------------------------------------------------------------------------------
var App = (function () {
    function App() {
        var _this = this;
        game = new Phaser.Game(NUM_TILES * TILE_SIZE, NUM_TILES * TILE_SIZE, Phaser.AUTO, 'content', { preload: function () { return _this.preload(); }, create: function () { return _this.create(); } });
    }
    App.prototype.preload = function () {
    };
    App.prototype.startLoad = function () {
        game.load.image('phaser_run', 'data/tex/run.png');
        game.load.image('tiles', 'data/tex/tiles.png');
        game.load.tilemap('level', 'data/level/level.json', null, Phaser.Tilemap.TILED_JSON);
        game.load.start();
    };
    App.prototype.create = function () {
        var _this = this;
        var self = this;
        game.load.onLoadStart.add(function () { return _this.loadStart(); });
        game.load.onFileComplete.add(function () { return _this.fileComplete(); });
        game.load.onLoadComplete.add(function () { return _this.loadComplete(); });
        self.startLoad();
        game.time.advancedTiming = true;
    };
    App.prototype.loadStart = function () {
        loadStatus.innerHTML = "Loading Aaargh!...";
    };
    App.prototype.fileComplete = function () {
        loadStatus.innerHTML += ".";
    };
    App.prototype.loadComplete = function () {
        loadStatus.style.visibility = "hidden";
        console.log("Load complete");
        this.startGame();
    };
    App.prototype.startGame = function () {
        console.log("Game starting");
        //var sprite = game.add.sprite(0, 0, 'phaser_run');
        level = new Level('level', 'tiles');
    };
    return App;
})();
window.onload = function () {
    loadStatus = document.getElementById("LoadStatus");
    var app = new App();
};
//# sourceMappingURL=app.js.map