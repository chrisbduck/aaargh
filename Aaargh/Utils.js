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
    Utils.addCentredText = function (y, str, color) {
        var text = game.add.text(0, y, str, { font: "24px Verdana,Helvetica,sans-serif" });
        var left = (game.width - text.width) * 0.5;
        text.position.x = left;
        if (!color)
            color = '#ffff00';
        text.addColor(color, 0);
        return text;
    };
    //------------------------------------------------------------------------------
    Utils.changeCentredText = function (text, newStr) {
        text.text = newStr;
        text.position.x = (game.width - text.width) * 0.5;
    };
    //------------------------------------------------------------------------------
    Utils.getPointFromPolar = function (angle, magnitude) {
        var point = new Phaser.Point(magnitude, 0);
        return Phaser.Point.rotate(point, 0, 0, angle);
    };
    //------------------------------------------------------------------------------
    Utils.distBetweenPoints = function (point1, point2) {
        return Phaser.Math.distance(point1.x, point1.y, point2.x, point2.y);
    };
    //------------------------------------------------------------------------------
    Utils.distSqBetweenPoints = function (point1, point2) {
        return Phaser.Math.distanceSq(point1.x, point1.y, point2.x, point2.y);
    };
    //------------------------------------------------------------------------------
    Utils.offsetFromPoint1To2 = function (point1, point2) {
        return new Phaser.Point(point2.x, point2.y).subtract(point1.x, point1.y);
    };
    //------------------------------------------------------------------------------
    Utils.getRandomElementFrom = function (source) {
        if (source.length === 0)
            return source[0];
        var rand;
        do {
            rand = Math.random();
        } while (rand === 1);
        var index = Math.floor(Math.random() * source.length);
        return source[index];
    };
    //------------------------------------------------------------------------------
    Utils.randomInRange = function (min, max) {
        var val;
        do {
            val = Math.random();
        } while (val >= 1);
        return min + val * (max - min);
    };
    //------------------------------------------------------------------------------
    Utils.playSound = function (key, min, max) {
        game.add.audio(key + Math.round(Utils.randomInRange(min, max))).play();
    };
    //------------------------------------------------------------------------------
    Utils.setSpriteRotation = function (sprite, targetAngle, imageAngle) {
        sprite.rotation = targetAngle - imageAngle;
    };
    //------------------------------------------------------------------------------
    Utils.lineIntersectsLineBetweenPoints = function (line, otherPoint1, otherPoint2) {
        var otherLine = new Phaser.Line(otherPoint1.x, otherPoint1.y, otherPoint2.x, otherPoint2.y);
        var x = line.intersects(otherLine);
        return x != null;
    };
    //------------------------------------------------------------------------------
    Utils.lineIntersectsSprite = function (linePoint1, linePoint2, sprite) {
        var line = new Phaser.Line(linePoint1.x, linePoint1.y, linePoint2.x, linePoint2.y);
        var body = sprite.body;
        var bodyTL = new Phaser.Point(body.x, body.y);
        var bodyTR = new Phaser.Point(body.x + body.width, body.y);
        var bodyBL = new Phaser.Point(body.x, body.y + body.halfHeight * 2);
        var bodyBR = new Phaser.Point(body.x + body.width, body.y + body.halfHeight * 2);
        //var bodyTL = new Phaser.Point(sprite.position.x, sprite.position.y);
        //var bodyTR = new Phaser.Point(sprite.position.x + sprite.width, sprite.position.y);
        //var bodyBL = new Phaser.Point(sprite.position.x, sprite.position.y + sprite.height);
        //var bodyBR = new Phaser.Point(sprite.position.x + sprite.width, sprite.position.y + sprite.height);
        if (Utils.lineIntersectsLineBetweenPoints(line, bodyTL, bodyTR))
            return true;
        if (Utils.lineIntersectsLineBetweenPoints(line, bodyTL, bodyBL))
            return true;
        if (Utils.lineIntersectsLineBetweenPoints(line, bodyTR, bodyBR))
            return true;
        if (Utils.lineIntersectsLineBetweenPoints(line, bodyBL, bodyBR))
            return true;
        return false;
    };
    return Utils;
})();
//# sourceMappingURL=utils.js.map