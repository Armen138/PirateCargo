define("collisionbox", function() {
	var CollisionBox = function(data) {
		"use strict";
		var collisionbox = {
			dirty: false,
			die: function() {
				return false;
			},
			position: { X: data.x + data.width / 2, Y: data.y + data.height / 2 },
			draw: function() { return false; },
			boundingbox: [-(data.width / 2),
						  -(data.height / 2),
						  data.width,
						  data.height],
			type: "collisionbox"
		}
		return collisionbox;
	}
	return CollisionBox;
});