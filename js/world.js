define("world", ["canvas", "events"], function(Canvas, Events) {
	"use strict";
	var World = function(map) {
		var entities = [];
		var collides = function(entity) {
			for(var i = 0; i < entities.length; i++) {
				if(entities[i] !== entity) {
					if (Math.abs(entities[i].position.X - entity.position.X) < entities[i].boundingbox[2] / 2 + entity.boundingbox[2] / 2 &&
						Math.abs(entities[i].position.Y - entity.position.Y) < entities[i].boundingbox[3] / 2 + entity.boundingbox[3] / 2) {
						return entities[i];
					}
				}
			}
			return null;
		};
		var collision = function() {
			for(var i = 0; i < entities.length; i++) {
				if(entities[i].dirty) {
					var collider = collides(entities[i]);
					if(collider) {
						if(collider.dirty) {
							collider.dirty = false;
						}
						world.fire("collision", [entities[i], collider]);
					}
					entities[i].dirty = false;
				}
			}
		};
		var world = {
			width: 64*30,
			height: 64*30,
			add: function(e) {
				entities.push(e);
			},
			offset: {X: 0, Y: 0},
			draw: function() {
				Canvas.context.save();
				Canvas.context.drawImage(map, world.offset.X, world.offset.Y, Canvas.width, Canvas.height, 0, 0, Canvas.width, Canvas.height);
				Canvas.context.translate(-world.offset.X, -world.offset.Y);
				for(var i = entities.length - 1; i >= 0; --i) {
					if(entities[i].draw(true)) {
						entities.splice(i, 1);
					}
				}
				Canvas.context.restore();
				collision();
			}
		};
		Events.attach(world);
		return world;
	};
	return World;
});