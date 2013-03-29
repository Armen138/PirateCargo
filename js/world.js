/*jshint newcap:false, nonew:true */
/*global console */
define("world", [
    "canvas",
    "events",
    "mapdata",
    "collisionbox",
    "powerup",
    "ship",
    "resources"],
    function(
        Canvas,
        Events,
        mapData,
        CollisionBox,
        PowerUp,
        Ship,
        Resources) {
    "use strict";


    var World = function(map, Resources, player) {
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
            var collisionObjects = [];
            for(var i = 0; i < entities.length; i++) {
                if(touches(entities[i], entity)) {
                    collisionObjects.push(entities[i]);
                }
            }
            return collisionObjects;
        };

        var exitPortal = function() {
            if(touches(player, world.exit)) {
                world.fire("exit");
            }
        };

        var collision = function() {
            for(var i = 0; i < entities.length; i++) {
                if(entities[i].dirty) {
                    var colliderData = collides(entities[i]);
                    if(colliderData.length > 0) {
                        for(var c = 0; c < colliderData.length; c++) {
                            var collider = colliderData[c];
                            if(collider.dirty) {
                                collider.dirty = false;
                            }
                            world.fire("collision", [entities[i], collider]);
                        }
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
            powerupCount: 0,
            width: 64 * mapData.layers[0].width,
            height: 64 * mapData.layers[0].height,
            remove: function(item) {
                for(var i = entities.length -1; i >= 0; i++) {
                    if(entities[i] === item) {
                        entities.splice(i, 1);
                        break;
                    }
                }
            },
            add: function(e) {
                entities.push(e);
            },
            offset: {X: 0, Y: 0},
            touches: touches,
            draw: function() {
                collision();
                exitPortal();
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
            }
        };
        Events.attach(world);

        var dummy = function() {};

        var layerHandlers = {
            collision: function(layer) {
                for(var i = 0; i < layer.objects.length; i++) {
                    world.add(CollisionBox(layer.objects[i]));
                }
            },
            cargo: function(layer) {
                for(var i = 0; i < layer.objects.length; i++) {
                    console.log(layer.objects[i]);
                    if(layer.objects[i].name !== "") {
                        if(layer.objects[i].name === "startposition" || layer.objects[i].name === "start") {
                            player.position.X = layer.objects[i].x;
                            player.position.Y = layer.objects[i].y;
                        }
                        if(layer.objects[i].name === "exit") {
                            world.exit = CollisionBox(layer.objects[i]);
                        }
                    } else {                        
                        world.powerupCount++;
                        world.add(PowerUp(Resources.chest, dummy, {X: layer.objects[i].x, Y: layer.objects[i].y }, "cargo"));                        
                    }
                }
            },
            signs: function(layer) {
                for(var i = 0; i < layer.objects.length; i++) {
                    (function(sign) {
                        world.add(PowerUp(Resources.sign, function() { showSign(sign.name, sign.properties.message);}, {X: sign.x, Y: sign.y }, "sign"));
                    }(layer.objects[i]));
                }
            },
            enemies: function(layer) {
                for(var i = 0; i < layer.objects.length; i++) {
                    console.log(layer.objects[i].polyline.length);

                    var pos = {
                        X: layer.objects[i].x + layer.objects[i].polyline[0].x,
                        Y: layer.objects[i].y + layer.objects[i].polyline[0].y
                    };
                    var sprite = [Resources.ships, 233, 923, 31, 39, -15, -19, 31, 39];
                    var sprite1 = [Resources.ships, 264, 887, 31, 33, -15, -16, 31, 33];
                    var ship = Ship(sprite1, world);
                    ship.speed = 0.1;
                    ship.position = pos;
                    ship.enemy = player;
                    world.add(ship);
                    ship.waypoints = [];
                    for(var w = 0; w < layer.objects[i].polyline.length; w++) {
                        ship.waypoints.push({
                            X: layer.objects[i].x + layer.objects[i].polyline[w].x,
                            Y: layer.objects[i].y + layer.objects[i].polyline[w].y
                        });
                    }
                }
            }
        };

        //add world collision objects
        console.log(mapData.layers.length);
        for(var i = 0; i < mapData.layers.length; i++) {
            console.log("layer: " + mapData.layers[i].name);
            if(layerHandlers.hasOwnProperty(mapData.layers[i].name)) {
                layerHandlers[mapData.layers[i].name](mapData.layers[i]);
            }
        }

        return world;
    };
    return World;
});
