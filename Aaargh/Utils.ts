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
	public static setSpriteRotation(sprite: Phaser.Sprite, targetAngle: number, imageAngle: number)
	{
		sprite.rotation = targetAngle - imageAngle;
	}
}
