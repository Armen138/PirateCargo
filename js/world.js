define("world", ["canvas", "events", "mapdata", "collisionbox"], function(Canvas, Events, mapData, CollisionBox) {
	"use strict";
	var World = function(map) {
		var entities = [];
		var collides = function(entity) {
			for(var i = 0; i < entities.length; i++) {
				if(entities[i] !== entity) {
					var horizontalCollision = Math.abs(entities[i].position.X - entity.position.X) < entities[i].boundingbox[2] / 2 + entity.boundingbox[2] / 2;
					var verticalCollision = Math.abs(entities[i].position.Y - entity.position.Y) < entities[i].boundingbox[3] / 2 + entity.boundingbox[3] / 2;
					if (horizontalCollision &&
						verticalCollision) {
						return [entities[i], horizontalCollision, verticalCollision];
					}
				}
			}
			return null;
		};
		var collision = function() {
			for(var i = 0; i < entities.length; i++) {
				if(entities[i].dirty) {
					var colliderData = collides(entities[i]);
					if(colliderData) {
						var collider = colliderData[0];
						if(collider.dirty) {
							collider.dirty = false;
						}
						world.fire("collision", [entities[i], collider, colliderData[1], colliderData[2]]);
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

		//add world collision objects
		for(var i = 0; i < mapData.layers[1].objects.length; i++) {
			//console.log(mapData.layers[1].objects[i]);
			world.add(CollisionBox(mapData.layers[1].objects[i]));
		}

		return world;
	};
	return World;
});