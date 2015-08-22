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

	private addCentredText(y: number, str: string, color?: string): Phaser.Text
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

	private changeCentredText(text: Phaser.Text, newStr: string)
	{
		text.text = newStr;
		text.position.x = (game.width - text.width) * 0.5;
	}

}
