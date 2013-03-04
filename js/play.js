/*jshint newcap:false, nonew:true */
/*global console */
define("play", [
        "canvas",
        "resources",
        "topbar",
        "keys",
        "ship",
        "bullet",
        "world"
    ],function(Canvas,
            Resources,
            TopBar,
            keys,
            Ship,
            Bullet,
            World) {
    "use strict";
    Resources.load({
        "ships": "images/spaceships_1.png",
        "map": "maps/test1.png"
    });
    var down = {};
    var topBar;
    var bullets = [];
    var before = Date.now();
    var ship = Ship(Resources.images.ships);
    var ship2 = Ship(Resources.images.ships);
    ship2.position.Y = 600;
    var world = World(Resources.images.map);
    world.add(ship);
    world.add(ship2);
    world.on("collision", function(c) {
        //console.log(c);
        if(c[0].type === "bullet" || c[1].type === "bullet") {
            if ((c[0].owner && c[0].owner !== c[1]) ||
                (c[1].owner && c[1].owner !== c[0])) {
                c[0].die();
                c[1].die();
            }
        } else {
            if(c[1].type === "collisionbox" && c[0].unmove) {
                c[0].unmove(c[2], c[3]);
            }
            //console.log(c[0].type + " <> " + c[1].type);
        }
    });
    var play = {
        reset: function() {
            ship.ammo = 12;
        },
        init: function() {
            topBar = TopBar([
                {
                    obj: ship,
                    prop: "ammo",
                    name: "ammo",
                    type: "string"
                }
            ]);
        },
        run: function() {
            var now = Date.now();
            var d = now - before;
            world.draw();
            if(down[keys.UP] || down[keys.W]) {
                ship.forward(d);
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
                ship.dirty = true;
            }
            for(var i = 0; i < bullets.length; i++) {
                bullets[i].draw();
            }
            topBar.draw();
            before = now;
        },
        keydown:  function(keyCode) {
            down[keyCode] = true;
        },
        keyup: function(keyCode) {
            down[keyCode] = false;
        },
        click: function(mouse) {
            //shoot something
            if(ship.ammo > 0) {
                var bullet = Bullet({X: ship.position.X, Y: ship.position.Y}, [], {angle: ship.angle});
                bullet.owner = ship;
                world.add(bullet);
                ship.ammo--;
            }
        },
        clear: function(cb) { cb(); }
    };

    window.addEventListener("mousemove", function(e) {
            var x = e.clientX - Canvas.position.X + world.offset.X;
            var y = e.clientY - Canvas.position.Y + world.offset.Y;
        ship.angle = Math.atan2((ship.position.X - x), (y - ship.position.Y)) + 1.5707963249999999;
    });
    return play;
});