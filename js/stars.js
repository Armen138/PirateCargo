define("stars", function() {
	var stars = function(Canvas) {
		var starMap = [];
		var maxStars = 100;
		var maxLayers = 4;
		for(var l = 0; l < maxLayers; l++) {
			starMap[l] = [];
			for(var i = 0; i < maxStars; i++) {
				starMap[l].push({X: Math.random() * Canvas.width | 0,
								Y: Math.random() * Canvas.height | 0});
			}
		}
		var s = {
			draw: function() {
				for(var l = 0; l < starMap.length; l++) {
					var shade = 200 / (l + 1);
					Canvas.context.fillStyle = "rgb(" + shade + "," + shade + "," + shade + ")";
					for(var i = 0; i < starMap[l].length; i++) {
						Canvas.context.fillRect(starMap[l][i].X, starMap[l][i].Y, 2, 2);
						starMap[l][i].Y += (1 / l);
						if(starMap[l][i].Y > Canvas.height) {
							starMap[l][i].Y -= Canvas.height;
						}
					}
				}
			}
		}
		return s;
	}
	return stars;
});
