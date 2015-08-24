//------------------------------------------------------------------------------
// Utility functions
//
// <reference path='phaser/phaser.d.ts'/>
//------------------------------------------------------------------------------

interface GoogleAnalyticsEntryPoint
{
	(operation: string, opParam: string, category: string, action: string, label: string, value: number): void;
}
declare var ga: GoogleAnalyticsEntryPoint;
declare var game: Phaser.Game;

class Utils
{
	//------------------------------------------------------------------------------
	// Google Analytics simplifiers
	//
	// Category: game, level, player, stats
	// Action: start, collect-item
	// Label: key5, rock7
	// Value: Google means this as "monetisable value" I think, which doesn't matter
	//        here, so maybe just % completion ?
	//------------------------------------------------------------------------------

	private static statCounters: {};

	//------------------------------------------------------------------------------

	public static trackStat(category: string, action: string, label: string = undefined, value: number = 0)
	{
		ga('send', 'event', category, action, label, value);
	}

	//------------------------------------------------------------------------------

	public static trackCounter(category: string, action: string, label: string = undefined, value: number = 0)
	{
		if (!label)
			label = 'total';

		var currentVal = 0;
		if (Utils.statCounters[label])
			currentVal = Utils.statCounters[label];

		currentVal += value ? value : 1;
		Utils.statCounters[label] = currentVal;
		ga('send', 'event', category, action, label, currentVal);
	}

	//------------------------------------------------------------------------------
	// Other bits and pieces
	//------------------------------------------------------------------------------

	public static addCentredText(y: number, str: string, color?: string): Phaser.Text
	{
		var text = game.add.text(0, y, str, { font: "24px Verdana,Helvetica,sans-serif" });
		var left = (game.width - text.width) * 0.5;
		text.position.x = left;
		if (!color)
			color = '#ffff00';
		text.addColor(color, 0);
		return text;
	}

	//------------------------------------------------------------------------------
	public static changeCentredText(text: Phaser.Text, newStr: string)
	{
		text.text = newStr;
		text.position.x = (game.width - text.width) * 0.5;
	}

	//------------------------------------------------------------------------------
	public static getPointFromPolar(angle: number, magnitude: number): Phaser.Point
	{
		var point = new Phaser.Point(magnitude, 0);
		return Phaser.Point.rotate(point, 0, 0, angle);
	}

	//------------------------------------------------------------------------------
	public static distBetweenPoints(point1: Phaser.Point, point2: Phaser.Point): number
	{
		return Phaser.Math.distance(point1.x, point1.y, point2.x, point2.y);
	}

	//------------------------------------------------------------------------------
	public static distSqBetweenPoints(point1: Phaser.Point, point2: Phaser.Point): number
	{
		return Phaser.Math.distanceSq(point1.x, point1.y, point2.x, point2.y);
	}

	//------------------------------------------------------------------------------
	public static offsetFromPoint1To2(point1: Phaser.Point, point2: Phaser.Point): Phaser.Point
	{
		return new Phaser.Point(point2.x, point2.y).subtract(point1.x, point1.y);
	}

	//------------------------------------------------------------------------------
	public static getRandomElementFrom(source: any[])
	{
		if (source.length === 0)
			return source[0];

		var rand: number;
		do
		{
			rand = Math.random();
		} while (rand === 1);
		var index: number = Math.floor(Math.random() * source.length);
		return source[index];
	}

	//------------------------------------------------------------------------------
	public static randomInRange(min: number, max: number)
	{
		var val: number;
		do
		{
			val = Math.random();
		} while (val >= 1);
		return min + val * (max - min);
	}

	//------------------------------------------------------------------------------
	public static playSound(key: string, min: number, max: number)
	{
		game.add.audio(key + Math.round(Utils.randomInRange(min, max))).play();
	}

	//------------------------------------------------------------------------------
	public static setSpriteRotation(sprite: Phaser.Sprite, targetAngle: number, imageAngle: number)
	{
		sprite.rotation = targetAngle - imageAngle;
	}

	//------------------------------------------------------------------------------
	public static lineIntersectsLineBetweenPoints(line: Phaser.Line, otherPoint1: Phaser.Point, otherPoint2: Phaser.Point): boolean
	{
		var otherLine = new Phaser.Line(otherPoint1.x, otherPoint1.y, otherPoint2.x, otherPoint2.y);
		var x = line.intersects(otherLine);
		return x != null;
	}

	//------------------------------------------------------------------------------
	public static lineIntersectsSprite(linePoint1: Phaser.Point, linePoint2: Phaser.Point, sprite: Phaser.Sprite): boolean
	{
		var line = new Phaser.Line(linePoint1.x, linePoint1.y, linePoint2.x, linePoint2.y);

		var body: Phaser.Physics.Arcade.Body = sprite.body;
		var bodyTL = new Phaser.Point(body.x, body.y);
		var bodyTR = new Phaser.Point(body.x + body.width, body.y);
		var bodyBL = new Phaser.Point(body.x, body.y + body.halfHeight * 2);
		var bodyBR = new Phaser.Point(body.x + body.width, body.y + body.halfHeight * 2);
		//var bodyTL = new Phaser.Point(sprite.position.x, sprite.position.y);
		//var bodyTR = new Phaser.Point(sprite.position.x + sprite.width, sprite.position.y);
		//var bodyBL = new Phaser.Point(sprite.position.x, sprite.position.y + sprite.height);
		//var bodyBR = new Phaser.Point(sprite.position.x + sprite.width, sprite.position.y + sprite.height);
		if (Utils.lineIntersectsLineBetweenPoints(line, bodyTL, bodyTR)) return true;
		if (Utils.lineIntersectsLineBetweenPoints(line, bodyTL, bodyBL)) return true;
		if (Utils.lineIntersectsLineBetweenPoints(line, bodyTR, bodyBR)) return true;
		if (Utils.lineIntersectsLineBetweenPoints(line, bodyBL, bodyBR)) return true;

		return false;
	}
}
