/**
Copyright (c) 2012 Karel Crombecq, Sileni Studios

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

Sileni Studios: http://www.silenistudios.com
*/
(function() {
	function ParticleSystem(effect) {

		// generate the different sprites for the particles up front, so we don't need to generate them in real-time
		this.generateSpriteSheet = function() {

			// the number of colors and sizes
			var nColors = Math.ceil(this.effect.averageLifeSpan * this.FPS);
			var nSizes = Math.ceil(this.effect.maxParticleSize - this.effect.minParticleSize) + 1; // if size goes from 3-6, we need sprites for size 3,4,5,6, so 6-3+1
			var maxSize = Math.ceil(this.effect.maxParticleSize)*2;
			this.spriteSheet = [];

			// generate the different particles
			for (var i = 0; i < nColors; ++i) {

				// initialize the array
				this.spriteSheet[i] = [];

				// time to live
				var timeToLive = i / this.FPS;

				// the color of this particle
				var color = this.interpolateColor(this.effect.startColor,  this.effect.stopColor, (this.effect.averageLifeSpan - timeToLive) / this.effect.averageLifeSpan);

				// update alpha for fade
				if (timeToLive < this.effect.particleFadeTime) color.alpha = timeToLive / this.effect.particleFadeTime;
				else color.alpha = 1.0;

				for (var j = 0; j < nSizes; ++j) {

					// calculate the size of this particle
					var size = this.effect.minParticleSize + j;

					// create a canvas element of the right size, to contain a particle of this given size and color
					var particleCanvas = document.createElement('canvas');
					particleCanvas.width = size*2;
					particleCanvas.height = size*2;
					var ctx = particleCanvas.getContext('2d');

					// draw the particle
					this.drawParticleOnCanvas(ctx, size, size, size, color.red, color.green, color.blue, color.alpha);
					this.spriteSheet[i][j] = particleCanvas;
				}
			}
		};

		// get the index for a new particle
		this.getNewParticleIndex = function() {
			if (this.nFreeParticles === 0) {
				return -1;
			}
			return this.freeParticles[--this.nFreeParticles];
		};

		// generate a new particle
		this.generateParticle = function() {

			// get a free particle index
			var idx = this.getNewParticleIndex();

			// no index available - don't generate a particle :(
			if (idx == -1) return;

			// the position is the emitter location
			//fPosition[idx] = fEmitterLocation.copy();
			this.position[idx] = {x: 0, y: 0};

			if(this.type === "relative") {
				this.position[idx].x += this.absolute.x;
				this.position[idx].y += this.absolute.y;
			}
			// offset the position by the spawn area
			this.position[idx].x += this.getDouble(-this.effect.particleSpawnArea.x/2, this.effect.particleSpawnArea.x/2);
			this.position[idx].y += this.getDouble(-this.effect.particleSpawnArea.y/2, this.effect.particleSpawnArea.y/2);

			// generate velocity
			var velocity = {x: this.effect.averageVelocity.x || this.effect.averageVelocity.horizontal,
							y: this.effect.averageVelocity.y || this.effect.averageVelocity.vertical};
			this.velocity[idx] = {
				x: this.getNormDouble(velocity.x, this.effect.velocityVariance.x),
				y: this.getNormDouble(velocity.y, this.effect.velocityVariance.y)
			};

			// generate angle
			this.angularVelocity[idx] = this.getDouble() * 2.0 - 1.0;
			this.angle[idx] = 0;

			// size
			this.size[idx] = this.getDouble(this.effect.minParticleSize, this.effect.maxParticleSize); // was getDouble(3,9)

			// time to live
			this.timeToLive[idx] = this.getNormDouble(this.effect.averageLifeSpan, this.effect.lifeSpanVariance);

			// kill back immediately - born dead particle
			if (this.timeToLive[idx] < Number.MIN_VALUE) this.killParticle(idx);

			// determine the image index
			//if (fNImagesLeft == 0) fImageIndex[idx] = fRand.getInt(0, fImages.length-1);

			// color
			//fColor[idx] = new Color(fRand.getInt(0, 255), fRand.getInt(0, 255), fRand.getInt(0, 255));

		};


		// kill a particle
		this.killParticle = function(i) {
			this.timeToLive[i] = 0.0;
			this.freeParticles[this.nFreeParticles++] = i;
		};

		// update the particle system
		this.update = function(dt) {

			// get the t value (ratio of elapsed time to total lifespan)
			var t = this.frame / this.effect.systemLifeSpan;
			if (t > 1) t = 1;

			// update our location
			this.emitterLocation.x = this.effect.emitterStartLocation.x + t * (this.effect.emitterStopLocation.x - this.effect.emitterStartLocation.x);
			this.emitterLocation.y = this.effect.emitterStartLocation.y + t * (this.effect.emitterStopLocation.y - this.effect.emitterStartLocation.y);

			// generate particles, but only if we haven't reached the end of our life
			if (this.effect.systemLifeSpan === 0 || this.frame < this.effect.systemLifeSpan) {

				// number of particles to generate
				var nParticles = this.nParticles;
				if (nParticles > this.nFreeParticles) nParticles = this.nFreeParticles;

				// generate them
				//while (nParticles-- > 0)
				//	this.generateParticle();
				var np = 40;
				for(var i = 0; i < np; i++) {
					this.generateParticle();
				}
			}

			// update all existing particles
			for (var i = 0; i < this.nParticles; ++i) {

				// live particle
				if (this.timeToLive[i] > Number.MIN_VALUE) {

					// update position
					this.position[i].x += this.velocity[i].x;
					this.position[i].y += this.velocity[i].y;
					this.angle[i] += this.angularVelocity[i];

					// update color
					this.color[i] = this.interpolateColor(this.effect.startColor, this.effect.stopColor, (this.effect.averageLifeSpan - this.timeToLive[i]) / this.effect.averageLifeSpan);

					// fade time - fade the particles at the end of their lifecycle
					if (this.timeToLive[i] < this.effect.particleFadeTime) this.color[i].alpha = this.timeToLive[i] / this.effect.particleFadeTime;
					else this.color[i].alpha = 1.0;

					// reduce life time
					this.timeToLive[i] -= dt;
					if (this.timeToLive[i] <= Number.MIN_VALUE) this.killParticle(i);
				}
			}

			// update the frame
			++this.frame;
		};


		// has the particle system reached the end of the route, and have all particles finished their lifecycle?
		this.isDone = function() {
			return this.effect.systemLifeSpan === 0 ? false : this.frame >= this.effect.systemLifeSpan && this.nFreeParticles == this.nParticles;
		};


		// at end frame?
		this.isAtEndFrame = function() {
			return this.frame >= this.effect.systemLifeSpan;
		};

		// get number of active particles
		this.getNActiveParticles = function() {
			return this.nParticles - this.nFreeParticles;
		};

		this.kill = function() {
			this.effect.systemLifeSpan = .1;
		};

		// draw
		this.draw = function(canvas, x, y, dt) {

			// dt is in ms - convert to secs
			dt /= 1000;
			this.absolute = {x: x, y: y};
			this.update(dt);
			// context
			var surface = canvas.getContext('2d');

			// move to the correct position and scale
			surface.save();
			if(this.type !== "relative") {
				surface.translate(x, y);
				//if (isFlipped()) surface.scale(-1, 1);
				//surface.scale(this.getScale());
				surface.translate(this.emitterLocation.x, this.emitterLocation.y);
			}
			surface.fillStyle = "#FF0000";

			// lighter - put in overlay blending mode
			if (this.effect.globalCompositeOperation != 'undefined') surface.globalCompositeOperation = this.effect.globalCompositeOperation;
			var nSizes = Math.ceil(this.effect.maxParticleSize - this.effect.minParticleSize);
			for (var i = 0; i < this.nParticles; ++i) {

				// particle is alive
				if (this.timeToLive[i] > Number.MIN_VALUE) {

					// map the particle to the correct color & size
					var size = Math.round(this.size[i]);
					if(this.renderType === "spriteSheet") {
					var colorIndex = Math.round(this.timeToLive[i] * this.FPS);
					if (colorIndex >= this.spriteSheet.length) colorIndex = this.spriteSheet.length-1;
						var sizeIndex = size - this.effect.minParticleSize;
						var particleCanvas = this.spriteSheet[colorIndex][sizeIndex];
						var ctx = particleCanvas.getContext('2d');
						this.drawParticleFromSheet(surface, particleCanvas, this.position[i], size);
					}
					if(this.renderType === "image" && this.image) {
						surface.save();
						surface.translate(this.position[i].x, this.position[i].y);
						surface.rotate(this.angle[i]);
						surface.globalAlpha = this.color[i].alpha;
						surface.drawImage(this.image, 0, 0, this.image.width, this.image.height, -(size / 2 | 0), -(size / 2 | 0), size, size);
						surface.restore();
					}
				}
			}

			// reset global operation
			surface.globalCompositeOperation = 'source-over';

			// done
			surface.restore();
		};


		// draw a particle from the sprite sheet
		this.drawParticleFromSheet = function(surface, particleCanvas, loc, size) {
			surface.drawImage(particleCanvas, Math.round(loc.x - size), Math.round(loc.y - size));
		};


		// draw a particle for real
		this.drawParticleOnCanvas = function(ctx, x, y, size, r, g, b, alpha) {
			var grad = ctx.createRadialGradient(x, y, 0, x, y, size);
			var a1 = alpha;
			var a2 = alpha - 0.4;
			if (a2 < 0.0) a2 = 0.0;
			grad.addColorStop(0.0, "rgba(" + r + "," + g + "," + b + ", " + a1 + ")");
			grad.addColorStop(0.5, "rgba(" + r + "," + g + "," + b + ", " + a2 + ")");
			grad.addColorStop(1.0, "rgba(" + r + "," + g + "," + b + ", 0.0)");
			ctx.fillStyle = grad;
			ctx.beginPath();
			ctx.arc(x, y, size, 0, 6.2831853, true);
			ctx.fill();
			ctx.closePath();
		};


		// color interpolation
		this.interpolateColor = function(col1, col2, d) {
			var col = {};
			col.red = Math.round(col1.red + (col2.red - col1.red) * d);
			col.green = Math.round(col1.green + (col2.green - col1.green) * d);
			col.blue = Math.round(col1.blue + (col2.blue - col1.blue) * d);
			col.alpha = Math.round(col1.alpha + (col2.alpha - col1.alpha) * d);
			return col;
		};


		// random number generation
		this.getDouble = function(min, max) {
			if (typeof min == 'undefined') min = 0;
			if (typeof max == 'undefined') max = 1;
			return min + Math.random() * (max - min);
		};
		this.getNormDouble = function(avg, variance) {
			if (typeof avg == 'undefined') avg = 0.0;
			if (typeof variance == 'undefined') variance = 1.0;
			var x1, x2, w, y1, y2;
			do {
				x1 = 2.0 * this.getDouble() - 1.0;
				x2 = 2.0 * this.getDouble() - 1.0;
				w = x1 * x1 + x2 * x2;
			} while ( w >= 1.0 );

			w = Math.sqrt( (-2.0 * Math.log( w ) ) / w );
			y1 = x1 * w;
			//y2 = x2 * w;
			return avg + y1 * variance;
		};


		// get current frame since the start of the simulation
		this.getFrame = function() {
			return this.frame;
		};


		/**
		 * CONSTRUCTOR
		 */

		// FPS
		this.FPS = 24;

		// frame
		this.frame = 0;

		// the data defining the effect
		this.effect = effect;

		// set the real emitter location
		this.emitterLocation = {
			x: effect.emitterStartLocation.x,
			y: effect.emitterStartLocation.y
		};

		// determine the max number of particles
		this.nParticles = effect.maxParticles;

		// initialize the arrays
		this.position = [];
		this.velocity = [];
		this.angle = [];
		this.angularVelocity = [];
		this.renderType = effect.renderType || "spriteSheet";
		this.image = typeof effect.image === "string" ? (function() { var img = new Image(); img.src = effect.image; return img; }()) : effect.image;
		this.color = [];
		for (var i = 0; i < this.nParticles; ++i) this.color[i] = {red: 1, green: 1, blue: 1, alpha: 1};
		this.particleSize = [];
		this.timeToLive = [];
		this.size = [];
		this.type = effect.type || "absolute";
		// all particles are dead initially
		for (i = 0; i < this.nParticles; ++i) {
			this.timeToLive[i] = 0.0;
		}

		// set all particles to free
		this.freeParticles = [];
		for (i = 0; i < this.nParticles; ++i) {
			this.freeParticles[i] = i;
		}
		this.nFreeParticles = this.nParticles;

		// generate the particle sprite sheet
		if(this.renderType === "spriteSheet") {
			this.generateSpriteSheet();
		}
		fReady = true;
	}
	if(typeof define !== "undefined") {
		define("ParticleSystem", {
			ParticleSystem: ParticleSystem
		});
	} else {
		window.ParticleSystem = ParticleSystem;
	}
}());
