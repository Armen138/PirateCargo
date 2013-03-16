/*jshint newcap:false, nonew:true */
/*global console */
define("world", ["canvas", "events", "mapdata", "collisionbox", "powerup"], function(Canvas, Events, mapData, CollisionBox, PowerUp) {
    "use strict";
    var World = function(map, Resources) {
        var entities = [];
        var touches = function(ent1, ent2) {
            if (ent1 !== ent2 &&
                !ent1.noncollider &&
                !ent2.noncollider) {
                var horizontalCollision = Math.abs(ent1.position.X - ent2.position.X) < ent1.boundingbox[2] / 2 + ent2.boundingbox[2] / 2;
                var verticalCollision = Math.abs(ent1.position.Y - ent2.position.Y) < ent1.boundingbox[3] / 2 + ent2.boundingbox[3] / 2;
                if (horizontalCollision &&
                    verticalCollision) {
                    return true;
                }
            }
            return false;    
        };

        var collides = function(entity) {
            for(var i = 0; i < entities.length; i++) {
                if(touches(entities[i], entity)) {
                    return [entities[i], true, true];
                }
                // if(entities[i] !== entity && !entities[i].noncollider) {
                //     var horizontalCollision = Math.abs(entities[i].position.X - entity.position.X) < entities[i].boundingbox[2] / 2 + entity.boundingbox[2] / 2;
                //     var verticalCollision = Math.abs(entities[i].position.Y - entity.position.Y) < entities[i].boundingbox[3] / 2 + entity.boundingbox[3] / 2;
                //     if (horizontalCollision &&
                //         verticalCollision) {
                //         return [entities[i], horizontalCollision, verticalCollision];
                //     }
                // }
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

        var sign = {
            show: false,
            message: "wat",
            title: "wat"
        };
        var showSign = function(title, msg) {
            sign.show = true;
            sign.title = title;
            sign.message = msg;
            setTimeout(function() {
                sign.show = false;
            }, 2000);
        };

        var world = {
            width: 64*30,
            height: 64*30,
            add: function(e) {
                entities.push(e);
            },
            offset: {X: 0, Y: 0},
            touches: touches,
            draw: function() {
                Canvas.context.save();
                Canvas.context.drawImage(map, world.offset.X, world.offset.Y, Canvas.width, Canvas.height, 0, 0, Canvas.width, Canvas.height);
                Canvas.context.translate(-world.offset.X, -world.offset.Y);
                for(var i = entities.length - 1; i >= 0; --i) {
                    if(entities[i].draw()) {
                        entities.splice(i, 1);
                    }
                }
                Canvas.context.restore();
                if(sign.show) {
                    Canvas.context.save();
                    Canvas.context.fillStyle = "black";
                    Canvas.context.font = "60px RapscallionRegular";
                    Canvas.context.textBaseline = "middle";
                    Canvas.context.textAlign = "center";
                    Canvas.context.drawImage(Resources.bigsign, 144, 32);
                    Canvas.context.fillText(sign.title, 400, 160);
                    Canvas.context.font = "48px RapscallionRegular";
                    var words = sign.message.split(" ");
                    var sentenceWidth = 0;
                    var sentence = words.shift();
                    var top = 250;
                    while(words.length > 0) {
                        sentenceWidth = Canvas.context.measureText(sentence).width;
                        if(sentenceWidth < 300) {
                            sentence += " " + words.shift();
                        }
                        if(sentenceWidth > 300 || words.length === 0) {
                            Canvas.context.fillText(sentence, 400, top);
                            top += 48;
                            sentence = "";
                        }
                    }

                    /*
                    for(i = 0; i < words.length; i++) {
                        sentenceWidth = Canvas.context.measureText(sentence).width;
                        if(sentenceWidth < 300) {
                            sentence += " " + words[i];
                        } else {
                            Canvas.context.fillText(sentence, 400, top);
                            top += 48;
                            sentence = words[i];
                            //sentenceWidth = Canvas.context.measureText(words[i]).width;
                        }
                    }
                    if(sentence !== "") {
                        Canvas.context.fillText(sentence, 400, top);    
                    }*/
                    
                    //Canvas.context.fillText(sign.message, 400, 250);
                    Canvas.context.restore();
                }
                collision();
            }
        };
        Events.attach(world);

        var layerHandlers = {
        	collision: function(layer) {
		        for(i = 0; i < layer.objects.length; i++) {	            
		            world.add(CollisionBox(layer.objects[i]));
		        }        	
        	},
        	cargo: function(layer) {
		        for(i = 0; i < layer.objects.length; i++) {
		            world.add(PowerUp(Resources.chest, function() {}, {X: layer.objects[i].x, Y: layer.objects[i].y }, "cargo"));
		        }         		
        	},
        	signs: function(layer) {
		        for(i = 0; i < layer.objects.length; i++) {
		            (function(sign) {
		                world.add(PowerUp(Resources.sign, function() { showSign(sign.name, sign.properties.message);}, {X: sign.x, Y: sign.y }, "sign"));
		            }(layer.objects[i]));
		        }        		
        	}
        }
        function collisionLayer(layer) {
	        for(i = 0; i < layer.objects.length; i++) {	            
	            world.add(CollisionBox(layer.objects[i]));
	        }        	
        }

        function cargoLayer(layer) {
	        for(i = 0; i < layer.objects.length; i++) {
	            world.add(PowerUp(Resources.chest, function() {}, {X: layer.objects[i].x, Y: layer.objects[i].y }, "cargo"));
	        }        	
        }

        function signLayer(layer) {
        	console.log("planting signs");
	        for(i = 0; i < layer.objects.length; i++) {
	            (function(sign) {
	                world.add(PowerUp(Resources.sign, function() { showSign(sign.name, sign.properties.message);}, {X: sign.x, Y: sign.y }, "sign"));
	            }(layer.objects[i]));
	        }        	
        }
        //add world collision objects
        var i = 0;
        console.log(mapData.layers.length);
        for(i = 0; i < mapData.layers.length; i++) {
        	console.log("layer: " + mapData.layers[i].name);
        	if(layerHandlers.hasOwnProperty(mapData.layers[i].name)) {
        		layerHandlers[mapData.layers[i].name](mapData.layers[i]);	
        	}
        	
        	// switch(mapData.layers[i].name) {
        	// 	case "collision": 
        	// 		collisionLayer(mapData.layers[i]);
        	// 	break;
        	// 	case "enemies":
        	// 	break;
        	// 	case "signs":
        	// 		signLayer(mapData.layers[i]);
        	// 	break;
        	// 	case "cargo":
        	// 		cargoLayer(mapData.layers[i]);
        	// 	break;
        	// }
        }

        return world;
    };
    return World;
});