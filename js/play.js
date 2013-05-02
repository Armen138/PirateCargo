/*jshint newcap:false, nonew:true */
/*global console, alert */
define("play", [
        "canvas",
        "resources",
        "keys",
        "ship",
        "bullet",
        "world",
        "container",
        "quickbuttons",
        "events"        
    ],function(Canvas,
            Resources,
            keys,
            Ship,
            Bullet,
            World,
            Container,
            QuickButtons,
            Events) {
    "use strict";

    var down = {};
    var bullets = [];
    var before = Date.now();
    var ship;
    var world;  

    var collision = function(c) {
        function killemall(e1, e2) {
            if(e1.type !== "powerup") { e1.die(); }
            if(e2.type !== "powerup") { e2.die(); }
            if(e1.player || e2.player) {
                setTimeout(function() {
                    play.respawn();
                }, 1000);
            }
        }
        if(c[0].type === "ship" && c[1].type === "ship") {
            killemall(c[0], c[1]);
            return;
        }
        if(c[0].type === "bullet" || c[1].type === "bullet") {
            if ((c[0].owner && c[0].owner !== c[1]) ||
                (c[1].owner && c[1].owner !== c[0])) {
                killemall(c[0], c[1]);
            }
        } else {
            var collisionbox = null;
            var moveable = null;
            if(c[1].type === "collisionbox") {
                collisionbox = c[1];
                moveable = c[0];
            } else if(c[0].type === "collisionbox") {
                collisionbox = c[0];
                moveable = c[1];
            }
            if(collisionbox) {
                var collisionPosition = {X: moveable.position.X, Y: moveable.position.Y};
                moveable.unmove(true, false);
                if(world.touches(moveable, collisionbox)) {
                    moveable.position.X  = collisionPosition.X;
                    moveable.position.Y  = collisionPosition.Y;
                    moveable.unmove(false, true);
                }
            }
        }
        if(c[1].type === "powerup" && c[0].player) {
            if(!ship.inventory[c[1].name]) {
                ship.inventory[c[1].name] = {};
                ship.inventory[c[1].name].count = 0;
                ship.inventory[c[1].name].button = {
                    label: 0,
                    icon: c[1].image,
                    action: c[1].collect
                };
                QuickButtons.buttons.push(ship.inventory[c[1].name].button);                
            }            
            Resources.pickup.play();
            ship.inventory[c[1].name].count += 1;
            if(c[1].name === "cargo") {
                ship.cargo++;
                if(ship.cargo === world.powerupCount) {
                    world.exit.active = true;
                }                
            }
            ship.inventory[c[1].name].button.label = ship.inventory[c[1].name].count + "";
            c[1].collect();
        }
    };

    var levelCache = {};
    function fetchLevel(level, callback) {
        if(levelCache[level]) {
            callback(levelCache[level]);
            return;            
        }
        var xhr = new XMLHttpRequest();
        xhr.open("GET", "maps/" + level + ".json", true);
        xhr.onload = function() {            
            levelCache[level] = JSON.parse(xhr.responseText);
            callback(levelCache[level]);
        };
        xhr.send(null);
    }

    function worldScroll(ship, world) {
        var edgeScroll =  {
            X: Canvas.width / 2,
            Y: Canvas.height / 2
        };
        if(ship.position.X - world.offset.X < edgeScroll.X && world.width - Canvas.width > 0) {
            world.offset.X -= (edgeScroll.X - (ship.position.X - world.offset.X));
            if(world.offset.X < 0) world.offset.X = 0;
        }
        if(ship.position.X - world.offset.X > Canvas.width - edgeScroll.X && world.width - Canvas.width > 0) {
            world.offset.X += ship.position.X - world.offset.X - (Canvas.width - edgeScroll.X);
            if(world.offset.X > world.width - Canvas.width) {
                world.offset.X = world.width - Canvas.width;
            }
        }
        if(ship.position.Y - world.offset.Y < edgeScroll.Y && world.height - Canvas.height > 0) {
            world.offset.Y -= (edgeScroll.Y - (ship.position.Y - world.offset.Y));
            if(world.offset.Y < 0) world.offset.Y = 0;
        }
        if(ship.position.Y - world.offset.Y > Canvas.height - edgeScroll.Y && world.height - Canvas.height > 0) {
            world.offset.Y += ship.position.Y - world.offset.Y - (Canvas.height - edgeScroll.Y);
            if(world.offset.Y > world.height - Canvas.height) {
                world.offset.Y = world.height - Canvas.height;
            }
        }
    }
    var play = {
        cargo: 6,
        level: "intro",
        mouse: {X: 0, Y: 0},
        getWorld: function() {
            return world;
        },
        reset: function() {
            /*if(ship) {
                ship.ammo = 12;
            }*/
        },
        respawn: function() {
            down = {};
            ship = Ship([Resources.ships, 264, 945, 22, 25, -11, -12, 22, 25], world);
            ship.player = true;
            ship.inventory.bullets = {
                "count" : 12,
                "button": {
                    "label": 12,
                    "icon": Resources.bullets,
                    "action": function() {
                        ship.shoot();
                    }
                }
            };                   
            fetchLevel(play.level, function(mapData) {
                world = World(mapData, ship);
                ship.setWorld(world);
                ship.on("death", function() {
                    console.log("player died");
                });
                //world.add(enemies);
                world.add(ship);
                world.on("collision", collision);
                world.on("exit", function() {
                    if(ship.cargo === world.powerupCount) {
                        var badges = [];
                        console.log("kills: " + ship.kills + ", enemies: " + world.enemyCount);
                        if(ship.kills > 0) {
                            if(world.enemyCount === ship.kills) {                            
                                badges.push("butcher");
                            }
                        } else {
                            badges.push("pacifist");
                        }
                        if(!ship.seen) {
                            badges.push("ghost");
                        }
                        console.log("level complete");
                        play.fire("win", {
                            badges: badges
                        });                    
                    }
                    //console.log("exit");
                });
                worldScroll(ship, world);
                QuickButtons.buttons = [];
                QuickButtons.buttons.push(ship.inventory.bullets.button);                
            });
        },
        init: function() {
            if(!ship) {
                play.respawn();
            }
            Resources.music.play(true);
        },
        run: function() {
            var now = Date.now();
            var d = now - before;
            if(d > 64) {
                d = 17;
            }
            world.draw();
            if(down[keys.LEFT] || down[keys.A]) {
                ship.angle -= 0.1;
            }
            if(down[keys.RIGHT] || down[keys.D]) {
                ship.angle += 0.1;
            }

            if(play.targetActive) {
                ship.target = {X: play.mouse.X + world.offset.X,
                    Y: play.mouse.Y + world.offset.Y };                
            }

            if(down[keys.UP] || down[keys.W] || play.targetActive) {
                ship.forward(d);
                worldScroll(ship, world);
                ship.dirty = true;
            } else {
                if(ship.currentSpeed > 0) {
                    ship.currentSpeed -= d / 5000;
                    ship.forward(d, ship.currentSpeed);
                    worldScroll(ship, world);
                    ship.dirty = true;
                }
            }
            QuickButtons.draw();
            before = now;
        },
        keydown:  function(keyCode) {
            down[keyCode] = true;
            if(keyCode === keys.SPACE) {
                ship.shoot();
            }
        },
        keyup: function(keyCode) {
            down[keyCode] = false;
        },
        mousedown: function(mouse) {
            play.targetActive = true;
            play.mouse = mouse;
        },
        mouseup: function(mouse) {
            play.targetActive = false;
            play.mouse = mouse;
        },
        click: function(mouse) {
            //shoot something
            //shoot();
            if(!QuickButtons.click(mouse)) {
                /*ship.target = {X: mouse.X + world.offset.X,
                    Y: mouse.Y + world.offset.Y };*/
                    ship.shoot();
            }
            play.mouse = mouse;
        },
        mousemove: function(mouse) {
            play.mouse = mouse;
        },
        clear: function(cb) { 
            Resources.music.stop();
            cb(); 
        }
    };

    Events.attach(play);
    
    return play;
});