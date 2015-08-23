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
		emitter.minParticleSpeed.setTo(-300, -190);
		emitter.maxParticleSpeed.setTo(300, 0);
		emitter.minParticleScale = 0.5;
		emitter.maxParticleScale = 1;
		emitter.gravity = 300;
		emitter.autoAlpha = true;
		emitter.setAlpha(1, 0, 3000, Phaser.Easing.Quadratic.In);

		emitter.explode(3000, count);

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
		emitter.maxParticleSpeed.setTo(300, 0);
		emitter.minParticleScale = 0.5;
		emitter.maxParticleScale = 1;
		emitter.gravity = 300;
		emitter.autoAlpha = true;
		emitter.setAlpha(1, 0, 3000, Phaser.Easing.Quadratic.In);

		emitter.explode(3000, count);

		this.emitter = emitter;
	}

	private emitter: Phaser.Particles.Arcade.Emitter;
}

//------------------------------------------------------------------------------
