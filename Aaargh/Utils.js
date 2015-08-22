//------------------------------------------------------------------------------
// Utility functions
//
// <reference path='phaser/phaser.d.ts'/>
//------------------------------------------------------------------------------
var Utils = (function () {
    function Utils() {
    }
    //------------------------------------------------------------------------------
    Utils.trackStat = function (category, action, label, value) {
        if (label === void 0) { label = undefined; }
        if (value === void 0) { value = 0; }
        ga('send', 'event', category, action, label, value);
    };
    //------------------------------------------------------------------------------
    Utils.trackCounter = function (category, action, label, value) {
        if (label === void 0) { label = undefined; }
        if (value === void 0) { value = 0; }
        if (!label)
            label = 'total';
        var currentVal = 0;
        if (Utils.statCounters[label])
            currentVal = Utils.statCounters[label];
        currentVal += value ? value : 1;
        Utils.statCounters[label] = currentVal;
        ga('send', 'event', category, action, label, currentVal);
    };
    //------------------------------------------------------------------------------
    // Other bits and pieces
    //------------------------------------------------------------------------------
    Utils.prototype.addCentredText = function (y, str, color) {
        var text = game.add.text(0, y, str, { font: "24px Verdana,Helvetica,sans-serif" });
        var left = (game.width - text.width) * 0.5;
        text.position.x = left;
        if (!color)
            color = '#ffff00';
        text.addColor(color, 0);
        return text;
    };
    //------------------------------------------------------------------------------
    Utils.prototype.changeCentredText = function (text, newStr) {
        text.text = newStr;
        text.position.x = (game.width - text.width) * 0.5;
    };
    return Utils;
})();
//# sourceMappingURL=Utils.js.map