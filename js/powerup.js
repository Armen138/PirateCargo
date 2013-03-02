define("powerup", ["canvas"], function(Canvas) {
	var powerup = function(image, action, position) {
		var start = Date.now();
		var lastScale = 0;
		var scaleTime = 50;
		var scale = 0.5;
		var inc = 0.1;
		var dead = false;
		function distance(p1, p2) {
			return Math.max(
					Math.abs(p1.X - p2.X),
					Math.abs(p1.Y - p2.Y)
				);
		}
		return {
			draw: function() {
				//scale = 0.5 + ((Date.now() - start) % 50 / 50);
				if(Date.now() - lastScale > scaleTime) {
					lastScale = Date.now();
					scale += inc;
					if(scale === 1.2 || scale === 0.4) {
						inc *= -1;
					}
				}
				Canvas.context.save();
				Canvas.context.translate(position.X, position.Y);
				Canvas.context.scale(scale, scale);
				Canvas.context.drawImage(image, -1 * (image.width / 2) * scale,  -1 * (image.height / 2) * scale);
				Canvas.context.restore();
				return dead;
			},
			collect: function(target) {
				if(distance(position, target) < 32) {
					dead = true;
					action.call(this);
				}
			}
		};
	};
	return powerup;
})