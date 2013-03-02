define("enemy", ["canvas", "events"], function(Canvas, events) {
	var enemy = function(image, position, weapon, bullets, tile, options, sound) {
		var start = Date.now();
		var speed = options.speed || 0.2;
		var dead = false;
		tile = tile || {
			width: 22,
			height: 25,
			X: 264,
			Y: 945
		};
		var hp = options.hp || 2;
		var lastShot = 0;
		var lastFrame = 0;
		var startPosition = {X: position.X, Y: position.Y};
		var e = {
			width: tile.width,
			height: tile.height,
			score: options.score || 10,
			position: position,
			hit: function(damage) {
				hp -= damage;
				if(hp < 0) {
					e.die();
				}
			},
			die: function() {
				dead = true;
				e.fire("death");
			},
			draw: function() {
				var now = Date.now();
				var delta = lastFrame === 0 ? 0 : now - lastFrame;
				if(options.movePattern) {
					options.movePattern(startPosition, position, start, speed, delta);
				} else {
					position.Y = startPosition.Y + ((Date.now() - start) * speed);
				}
				Canvas.context.save();
				var angle = 90 * 0.0174532925;
				Canvas.context.translate(position.X, position.Y);
				Canvas.context.rotate(angle);
				Canvas.context.drawImage(image, tile.X, tile.Y, tile.width, tile.height, -tile.width / 2,  -tile.height / 2, tile.width, tile.height);
				Canvas.context.restore();

				if(Date.now() - lastShot > weapon.loadTime) {
					lastShot = Date.now();
					bullets.push(weapon.ammo({X: position.X, Y: position.Y}));
					sound.play();
				}
				lastFrame = now;
				if(position.Y > Canvas.height || dead) {
					return true;
				}
				return false;
			}
		};
		events.attach(e);
		return e;
	};
	return enemy;
});
