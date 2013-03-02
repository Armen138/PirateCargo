define("effects", function() {
	var enableComposite = true;
	return function(effect, image) {
		var e = {};
		switch(effect) {
			case "bullet":
				e = {"emitterStartLocation":{"x":0,"y":0},"emitterStopLocation":{"x":0,"y":0},"systemLifeSpan":0,"particleSpawnArea":{"x":0,"y":0},"maxParticles":300,"averageLifeSpan":0.3,"lifeSpanVariance":0.1,"startColor":{"red":255,"green":167,"blue":63,"alpha":1},"stopColor":{"red":0,"green":0,"blue":0,"alpha":1},"averageVelocity":{"horizontal":0,"vertical":0},"velocityVariance":{"x":0.3,"y":0.3},"minParticleSize":2,"maxParticleSize":4,"particleFadeTime":0.6,"globalCompositeOperation":"lighter","renderType":"spriteSheet","type":"relative"};
			break;
			case "shield":
				e = {"emitterStartLocation":{"x":0,"y":0},"emitterStopLocation":{"x":0,"y":0},"systemLifeSpan":0,"particleSpawnArea":{"x":0,"y":0},"maxParticles":300,"averageLifeSpan":0.3,"lifeSpanVariance":0.1,"startColor":{"red":63,"green":167,"blue":255,"alpha":1},"stopColor":{"red":0,"green":0,"blue":0,"alpha":1},"averageVelocity":{"horizontal":0,"vertical":0},"velocityVariance":{"x":0.3,"y":0.3},"minParticleSize":2,"maxParticleSize":4,"particleFadeTime":0.6,"globalCompositeOperation":"lighter","renderType":"spriteSheet","type":"relative"};
			break;
			case "powerup":
				e = {"emitterStartLocation":{"x":0,"y":0},"emitterStopLocation":{"x":0,"y":0},"systemLifeSpan":1,"particleSpawnArea":{"x":32,"y":32},"maxParticles":100,"averageLifeSpan":0.4,"lifeSpanVariance":0.1,"startColor":{"red":255,"green":167,"blue":63,"alpha":1},"stopColor":{"red":13,"green":141,"blue":0,"alpha":1},"averageVelocity":{"horizontal":0,"vertical":0},"velocityVariance":{"x":2,"y":2},"minParticleSize":5,"maxParticleSize":10,"particleFadeTime":0.5,"globalCompositeOperation":"lighter","renderType":"image","image":image || "images/star.png","type":"absolute"};
			break;
			case "explosion":
				e = {"emitterStartLocation":{"x":0,"y":0},"emitterStopLocation":{"x":0,"y":0},"systemLifeSpan":1,"particleSpawnArea":{"x":0,"y":0},"maxParticles":100,"averageLifeSpan":1,"lifeSpanVariance":0.1,"startColor":{"red":255,"green":167,"blue":63,"alpha":1},"stopColor":{"red":0,"green":0,"blue":0,"alpha":1},"averageVelocity":{"horizontal":0,"vertical":0},"velocityVariance":{"x":0.4,"y":0.4},"minParticleSize":5,"maxParticleSize":15,"particleFadeTime":1,"globalCompositeOperation":"lighter","renderType":"spriteSheet","type":"absolute"};
			break;
			case "afterburner":
				e = {"emitterStartLocation":{"x":0,"y":0},"emitterStopLocation":{"x":0,"y":0},"systemLifeSpan":0,"particleSpawnArea":{"x":0,"y":0},"maxParticles":100,"averageLifeSpan":0.3,"lifeSpanVariance":0.1,"startColor":{"red":255,"green":167,"blue":63,"alpha":1},"stopColor":{"red":0,"green":0,"blue":0,"alpha":1},"averageVelocity":{"horizontal":0,"vertical":1.0},"velocityVariance":{"x":0.3,"y":0.3},"minParticleSize":2,"maxParticleSize":4,"particleFadeTime":0.6,"globalCompositeOperation":"lighter","renderType":"spriteSheet","type":"absolute"};
			break;
		}
		if(!enableComposite) {
			if(e.globalCompositeOperation) {
				delete e.globalCompositeOperation;
			}
		}
		return e;
	};
});
