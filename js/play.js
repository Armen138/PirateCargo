/*jshint newcap:false, nonew:true */
/*global console, alert */
define("play", [
        "canvas",
        "resources",
        "topbar",
        "keys",
        "ship",
        "bullet",
        "world",
        "container",
        "quickbuttons"
    ],function(Canvas,
            Resources,
            TopBar,
            keys,
            Ship,
            Bullet,
            World,
            Container,
            QuickButtons) {
    "use strict";

    var down = {};
    var topBar;
    var bullets = [];
    var before = Date.now();
    var ship;
    var world;
    var enemies = Container();


    var collision = function(c) {
        function killemall(e1, e2) {
            e1.die();
            e2.die();
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
                if(c[0].owner) {
                    c[0].owner.kills++;
                } else {
                    c[1].owner.kills++;
                }
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
                // if(world.touches(moveable, collisionbox)) {
                //     moveable.unmove(true, false);
                //     console.log("corner unmove");
                // }
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
            ship.inventory[c[1].name].count += 1;
            ship.cargo++;
            ship.inventory[c[1].name].button.label = ship.inventory[c[1].name].count + "";
            //QuickButtons.buttons[0].label = ship.cargo + "";
            c[1].collect();
        }
    };
    // function shoot() {
    //     if(ship.ammo > 0) {
    //         var bullet = Bullet({X: ship.position.X, Y: ship.position.Y}, [], {angle: ship.angle});
    //         bullet.owner = ship;
    //         world.add(bullet);
    //         ship.ammo--;
    //     }
    // }
    function worldScroll(ship, world) {
        if(ship.position.X - world.offset.X < 200) {
            world.offset.X -= (200 - (ship.position.X - world.offset.X));
            if(world.offset.X < 0) world.offset.X = 0;
        }
        if(ship.position.X - world.offset.X > 600) {
            world.offset.X += ship.position.X - world.offset.X - 600;
            if(world.offset.X > world.width - 800) {
                world.offset.X = world.width - 800;
            }
        }
        if(ship.position.Y - world.offset.Y < 200) {
            world.offset.Y -= (200 - (ship.position.Y - world.offset.Y));
            if(world.offset.Y < 0) world.offset.Y = 0;
        }
        if(ship.position.Y - world.offset.Y > 400) {
            world.offset.Y += ship.position.Y - world.offset.Y - 400;
            if(world.offset.Y > world.height - 600) {
                world.offset.Y = world.height - 600;
            }
        }
    }
    var play = {
        cargo: 6,
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
            /*world.remove(ship);
            ship = Ship([Resources.ships, 264, 945, 22, 25, -11, -12, 22, 25], world);
            ship.player = true;            
            ship.setWorld(world);
            world.add(ship);*/
            ship = Ship([Resources.ships, 264, 945, 22, 25, -11, -12, 22, 25], world);
            ship.player = true;
            world = World(Resources.map, Resources, ship);
            ship.setWorld(world);
            ship.on("death", function() {
                console.log("player died");
            });
            world.add(enemies);
            world.add(ship);
            world.on("collision", collision);
            world.on("exit", function() {
                if(ship.cargo < world.powerupCount) {
                    console.log("You require at least " + world.powerupCount + " pieces of cargo to exit the level");
                } else {
                    if(ship.kills > 0) {
                        if(ship.kills == enemies.count()) {
                            console.log("massacre: killed all enemies");
                        }
                    } else {
                        console.log("pacifist: no kills");
                    }
                    if(!ship.seen) {
                        console.log("ghost: never seen by an enemy");
                    }
                    console.log("level complete");
                }
                //console.log("exit");
            });
            worldScroll(ship, world);
            topBar = TopBar([
                {
                    obj: ship,
                    prop: "ammo",
                    name: "ammo",
                    type: "string"
                },
                {
                    obj: ship,
                    prop: "cargo",
                    name: "cargo",
                    type: "string"
                }
            ]);
            QuickButtons.buttons = [];
        },
        init: function() {
            if(!ship) {
                play.respawn();
            }
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

            if(down[keys.UP] || down[keys.W]) {
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
            // enemies.each(function(enemy) {
            //     enemy.angle = Math.atan2((enemy.position.X - ship.position.X), (ship.position.Y - enemy.position.Y)) + 1.5707963249999999;
            // });
            for(var i = 0; i < bullets.length; i++) {
                bullets[i].draw();
            }
            topBar.draw();
            QuickButtons.draw();
            Canvas.context.fillRect(play.mouse.X, play.mouse.Y, 10, 10);
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
        click: function(mouse) {
            //shoot something
            //shoot();
            QuickButtons.click(mouse);
        },
        mousemove: function(mouse) {
            play.mouse = mouse;
        },
        clear: function(cb) { cb(); }
    };

    /*
    window.addEventListener("mousemove", function(e) {
            var x = e.clientX - Canvas.position.X + world.offset.X;
            var y = e.clientY - Canvas.position.Y + world.offset.Y;
        ship.angle = Math.atan2((ship.position.X - x), (y - ship.position.Y)) + 1.5707963249999999;
    });*/
    
    return play;
});