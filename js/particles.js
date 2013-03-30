define("particles", ["canvas", "resources", "events"], function(Canvas, Resources, Events) {
	var Position = function(x, y) {
		return {X: x, Y: y};
	}

	Position.copy = function(position) {
		return {X: position.X, Y: position.Y};
	}

	function createParticle(options) {
		var dead = false;
		var particle = {
			then: Date.now(),
			birth: Date.now(),
			angle: 0,
			unborn: true,
			ttl: Math.random() * (options.ttl.max - options.ttl.min),
			reset: function(position) {
				if(particle.dead) {
					particle.unborn = true;
					return;
				}
				var now = Date.now();
				var direction = Math.random() * (2 * Math.PI);
				particle.position = Position.copy(options.position);
				particle.startPosition = Position.copy(options.position);
				particle.birth = now;
				particle.alpha = 1.0;
				particle.unborn = false;
				particle.then = now;
				particle.image = Resources[options.image];
				particle.direction = Position(Math.cos(direction), Math.sin(direction));
				particle.scale = Math.random() * (options.scale.max - options.scale.min) + options.scale.min;
				particle.speed = Math.random() * (options.speed.max - options.speed.min) + options.speed.min;
				particle.ttl = Math.random() * (options.ttl.max - options.ttl.min) + options.ttl.min
				//console.log(particle.direction);
			},
			die: function() {
				particle.dead = true;
			},
			update: function(position) {
				var now = Date.now();
				var life = now - particle.birth;
				if(life > particle.ttl) {
					particle.reset(options.position);
				} else {
					if(!particle.unborn) {
						var distance = life * particle.speed;
						//console.log(distance);
						particle.position.X = particle.startPosition.X + distance * particle.direction.X;
		                particle.position.Y = particle.startPosition.Y + distance * particle.direction.Y;					
		                particle.angle += 0.1;
		                particle.alpha = 1 - (life / particle.ttl);
		                //console.log(particle.startPosition);
		                // particle.scale -= 0.01;
		                // if(particle.scale < 0) particle.scale = 0;
		            }
				}
				particle.then = now;
			},
			draw: function() {
				if(!particle.unborn) {
	                Canvas.context.save();
	                //Canvas.context.globalCompositeOperation = "lighter";
	                Canvas.context.translate(particle.position.X, particle.position.Y);
	                Canvas.context.scale(particle.scale, particle.scale);
	                Canvas.context.rotate(particle.angle);
	                Canvas.context.globalAlpha = particle.alpha;
	                Canvas.context.drawImage(particle.image, -particle.image.width / 2, -particle.image.height / 2);                
	                Canvas.context.restore();								
				}
			}
		};
		return particle;
	}
	var particles = function(options) {
		var ttl = options.systemTtl || 0;
		var birth = Date.now();
		var position = {X: 100, Y:100};
		var angle = 1;
		// var options = {
		// 	position: position,
		// 	image: image,
		// 	scale: {min: 0.1, max: 0.4},
		// 	speed: {min: 0.01, max:0.04},
		// 	ttl: {min: 30, max: 1000},
		// 	count: 50
		// };
		var particleList = [];
		// for(var i = 0; i < options.count; i++) {
		// 	particleList.push(createParticle(options));
		// }
		var direction = {X: 4, Y: 4};
		var p = {
			position: options.position,
			draw: function() {
				p.run();
			},
			keyup: function(key) {
				if(key === 32) {
					p.kill();
				}
			},
			kill: function() {
				ttl = 1;
			},
			run: function() {
				if(p.dead) {
					return;
				}
				if(options.count > particleList.length) {
					for(var i = 0; i < options.count - particleList.length; i++){
						particleList.push(createParticle(options));
					}
				}
				if(options.count < particleList.length) {
					particleList.length = options.count | 0;
				}
				var now = Date.now();
				var deadParticles = 0;
				for(var i = 0; i < particleList.length; i++) {
					particleList[i].update();
					particleList[i].draw();
					if(ttl !== 0 && now - birth > ttl) {
						particleList[i].die();
					}
					if(particleList[i].dead && particleList[i].unborn) {
						deadParticles++;
					}
					if(deadParticles === particleList.length) {
						p.fire("death");
						p.dead = true;
					}
				}
			},
			init: function() {
				console.log("init particles");
			}
		};
		Events.attach(p);
		return p;		
	}
	return particles;
});