//------------------------------------------------------------------------------
// Entities: Everything other than the app, the player, and the map.
// 
// <reference path='phaser/phaser.d.ts'/>
//------------------------------------------------------------------------------

class ScareEmitter
{
	constructor(x: number, y: number, count: number)
	{
		var emitter = game.add.emitter(x, y, count);
		emitter.makeParticles('scare');
		emitter.lifespan = 500;
		emitter.minParticleSpeed.setTo(-150, -90);
		emitter.maxParticleSpeed.setTo(150, 90);
		emitter.minParticleScale = 0.2;
		emitter.maxParticleScale = 0.4;
		emitter.minRotation = -0.3;
		emitter.maxRotation = 0.3;
		emitter.autoAlpha = true;
		emitter.setAlpha(1, 0, 2000, Phaser.Easing.Quadratic.In);

		emitter.explode(2000, count);

		this.emitter = emitter;
	}

	private emitter: Phaser.Particles.Arcade.Emitter;
}

//------------------------------------------------------------------------------

class FriendEmitter
{
	constructor(x: number, y: number, count: number)
	{
		var emitter = game.add.emitter(x, y, count);
		emitter.makeParticles('friend');
		emitter.lifespan = 500;
		emitter.minParticleSpeed.setTo(-300, -190);
		emitter.maxParticleSpeed.setTo(300, 190);
		emitter.minParticleScale = 0.25;
		emitter.maxParticleScale = 0.5;
		emitter.autoAlpha = true;
		emitter.setAlpha(1, 0, 3000, Phaser.Easing.Quadratic.In);

		emitter.explode(3000, count);

		this.emitter = emitter;
	}

	private emitter: Phaser.Particles.Arcade.Emitter;
}

//------------------------------------------------------------------------------

class HugEmitter
{
	constructor(x: number, y: number)
	{
		var emitter = game.add.emitter(x, y, 30);
		emitter.makeParticles('friend');
		emitter.lifespan = 500;
		emitter.minParticleSpeed.setTo(-70, -25);
		emitter.maxParticleSpeed.setTo(70, 25);
		emitter.minParticleScale = 0.25;
		emitter.maxParticleScale = 0.5;
		emitter.gravity = 0;
		emitter.autoAlpha = true;
		emitter.autoScale = true;
		emitter.setAlpha(1, 0, 3000, Phaser.Easing.Quadratic.In);
		emitter.setScale(0.5, 0, 0.5, 0, 3000, Phaser.Easing.Quadratic.In);

		emitter.start(false, 3000, 150);

		this.emitter = emitter;
	}

	public stop()
	{
		this.emitter.on = false;
	}

	public destroy()
	{
		this.emitter.destroy();
	}

	public setPosition(point: Phaser.Point)
	{
		this.emitter.x = point.x;
		this.emitter.y = point.y;
	}

	private emitter: Phaser.Particles.Arcade.Emitter;
}

//------------------------------------------------------------------------------
