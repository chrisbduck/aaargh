//------------------------------------------------------------------------------
// Aaargh: LD33 entry by Schnerble
// 
// <reference path='phaser/phaser.d.ts'/>
//------------------------------------------------------------------------------
var game = null;
var loadStatus = null;
//------------------------------------------------------------------------------
// Main app
//------------------------------------------------------------------------------
var App = (function () {
    function App() {
        var _this = this;
        game = new Phaser.Game(800, 600, Phaser.AUTO, 'content', { preload: function () { return _this.preload(); }, create: function () { return _this.create(); } });
    }
    App.prototype.preload = function () {
    };
    App.prototype.startLoad = function () {
        game.load.image('phaser_run', 'data/tex/run.png');
        game.load.start();
    };
    App.prototype.create = function () {
        var _this = this;
        var self = this;
        game.load.onLoadStart.add(function () { return _this.loadStart(); });
        game.load.onFileComplete.add(function () { return _this.fileComplete(); });
        game.load.onLoadComplete.add(function () { return _this.loadComplete(); });
        self.startLoad();
    };
    App.prototype.loadStart = function () {
        loadStatus.innerHTML = "Loading Aaargh!...";
    };
    App.prototype.fileComplete = function () {
        loadStatus.innerHTML += ".";
    };
    App.prototype.loadComplete = function () {
        loadStatus.style.visibility = "hidden";
        game.add.sprite(0, 0, 'phaser_run');
    };
    return App;
})();
window.onload = function () {
    loadStatus = document.getElementById("LoadStatus");
    var app = new App();
};
//# sourceMappingURL=app.js.map